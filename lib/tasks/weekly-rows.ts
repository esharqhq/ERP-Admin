import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import { normalizeStatus } from "@/lib/types/task.types";
import type { TaskGroupDto, TaskWorkerDto } from "@/lib/types/task.types";
import { buildRegisterRows, type RegisterRow } from "@/lib/tasks/register/rows";

/**
 * One booked job, flattened out of its group.
 *
 * All of this lives in `lib/` because every function here fails by showing
 * *less* rather than by throwing — a row that quietly drops out of a schedule
 * looks exactly like a quiet week, and nothing downstream would notice.
 */
export interface WeeklyTaskRow {
  taskId: string;
  groupId: string;
  groupTitle: string;
  propertyId: string;
  propertyName: string;
  /** `"yyyy-MM-dd"`, local, as the server sends it. */
  scheduledDate: string;
  scheduledAt: string;
  status: string;
  requiredWorkerCount: number;
  workers: TaskWorkerDto[];
}

/**
 * Outcomes that mean the worker is no longer on the job. The calendar already
 * excludes these from its per-cell count; the table must agree, or two views of
 * the same data would disagree about who is staffed.
 */
const VACATED = new Set(["removed", "cancelled", "noshow"]);

/**
 * Local date key. Built from local parts rather than `toISOString()` — a
 * late-evening local date in a positive-offset zone would otherwise serialise
 * as tomorrow and put the job on the wrong day.
 */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function flattenTaskRows(
  groups: TaskGroupDto[],
  propertyNames: Record<string, string>,
): WeeklyTaskRow[] {
  const rows: WeeklyTaskRow[] = [];

  for (const group of groups) {
    for (const task of group.tasks ?? []) {
      rows.push({
        taskId: task.id,
        groupId: group.id,
        // The group's title is the only thing on a task that describes the
        // work: the API has no service type and no service catalogue.
        groupTitle: group.title ?? "",
        propertyId: task.propertyId,
        // `propertyName` comes back as "" on at least one documented route, so
        // an empty string must not beat a name we can actually resolve.
        propertyName:
          (task.propertyName && task.propertyName.trim()) ||
          propertyNames[task.propertyId] ||
          "",
        scheduledDate: task.scheduledDate,
        scheduledAt: task.scheduledAt,
        status: task.status,
        requiredWorkerCount: task.requiredWorkerCount,
        workers: task.workers ?? [],
      });
    }
  }

  return rows.sort((a, b) =>
    a.scheduledDate === b.scheduledDate
      ? a.scheduledAt.localeCompare(b.scheduledAt)
      : a.scheduledDate.localeCompare(b.scheduledDate),
  );
}

/**
 * Week membership by exact string match on `"yyyy-MM-dd"`.
 *
 * Deliberately not a timestamp range. The server's own `scheduledTo` filter is
 * inclusive on a *timestamp*, so a week whose end bound is Sunday `00:00` — the
 * shape `useWeekNavigation.weekEnd` has — silently deletes every Sunday with no
 * error at all. Comparing date keys has no boundary to get wrong.
 */
export function rowsInWeek(rows: WeeklyTaskRow[], dateKeys: string[]): WeeklyTaskRow[] {
  const week = new Set(dateKeys);
  return rows.filter((r) => week.has(r.scheduledDate));
}

/**
 * `"all"`, or one of the six day states.
 *
 * ⚠ Both sides go through `canonicalTaskStatus`, not a lowercased compare. The
 * card's tabs used to offer `"Active"` and `"Review"`, which F-07 ·0 renamed on
 * 2026-09-17 — after that, picking either matched no row the server sends and
 * the table silently emptied rather than failing. Canonicalising both sides also
 * keeps a row a stale cache spelled the old way in its right tab.
 *
 * ⚠ A word neither side knows filters everything out. That is deliberate: ·5
 * adds a disputed state, and showing every row under a tab whose name nothing
 * matches would misreport the table as unfiltered.
 */
export function filterRowsByStatus(
  rows: WeeklyTaskRow[],
  status: string,
): WeeklyTaskRow[] {
  if (status === "all") return rows;
  const want = canonicalTaskStatus(status);
  return rows.filter((r) => canonicalTaskStatus(r.status) === want);
}

/**
 * A task has many workers, not one: `workers` is an array beside
 * `requiredWorkerCount`. Two names plus a count keeps the column narrow without
 * pretending a two-person job is a one-person job.
 */
export function workerSummary(row: WeeklyTaskRow): { names: string[]; extra: number } {
  const active = row.workers.filter(
    (w) => !VACATED.has(normalizeStatus(w.outcome)) && !!w.workerName?.trim(),
  );
  return {
    names: active.slice(0, 2).map((w) => w.workerName as string),
    extra: Math.max(0, active.length - 2),
  };
}

/**
 * Where a row opens. `/dashboard/tasks/[id]` is keyed by the **group**, and
 * `?day=` picks the day inside it — the same address `tasks/day/[taskId]`
 * redirects to. The table used to link `/dashboard/tasks/<taskId>`, which asked
 * the group page for a group that does not exist.
 */
export function weeklyRowHref(row: WeeklyTaskRow): string {
  return `/dashboard/tasks/${row.groupId}?day=${row.taskId}`;
}

/**
 * Free-text search over what the table prints: the property, the booking title
 * and the names of the workers actually on the job. `needle` arrives lower-cased
 * and trimmed (the shell's contract). A vacated worker is not on screen, so it
 * does not match either — a hit on a name the row does not show reads as a bug.
 */
export function matchesWeeklyRow(row: WeeklyTaskRow, needle: string): boolean {
  if (!needle) return true;
  const active = row.workers
    .filter((w) => !VACATED.has(normalizeStatus(w.outcome)))
    .map((w) => w.workerName ?? "");
  return [row.propertyName, row.groupTitle, ...active].some((s) =>
    s.toLowerCase().includes(needle),
  );
}

/** Day, then start time — the order `flattenTaskRows` already returns. */
export function compareWeeklySchedule(a: WeeklyTaskRow, b: WeeklyTaskRow): number {
  return (
    a.scheduledDate.localeCompare(b.scheduledDate) ||
    a.scheduledAt.localeCompare(b.scheduledAt)
  );
}

/** Text columns, compared in the reading locale; an empty value sorts last. */
export function compareText(a: string, b: string): number {
  if (!a || !b) return a ? -1 : b ? 1 : 0;
  return a.localeCompare(b);
}

/**
 * How many rows each status tab would show, `all` included. Counted with
 * `filterRowsByStatus` itself rather than a second canonicalisation, so a tab's
 * number can never disagree with what pressing it shows.
 */
export function countRowsByStatus<S extends string>(
  rows: WeeklyTaskRow[],
  statuses: readonly S[],
): Record<S, number> {
  const out = {} as Record<S, number>;
  for (const s of statuses) out[s] = filterRowsByStatus(rows, s).length;
  return out;
}

/**
 * What needs a person first, in the register's spirit (disputed and running
 * before scheduled, closed days last), over the six raw day states this table
 * prints. A word neither vocabulary knows sorts after all of them; ties fall
 * back to the schedule.
 */
const STATUS_ORDER = ["rejected", "checkedIn", "inReview", "pending", "done", "cancelled"];

export function compareWeeklyStatus(a: WeeklyTaskRow, b: WeeklyTaskRow): number {
  const rank = (r: WeeklyTaskRow) => {
    const i = STATUS_ORDER.indexOf(canonicalTaskStatus(r.status) ?? "");
    return i === -1 ? STATUS_ORDER.length : i;
  };
  return rank(a) - rank(b) || compareWeeklySchedule(a, b);
}

/**
 * What both views of the card show: the week's rows, narrowed by the status tab
 * and the search box — the same two steps the table shell runs before it sorts
 * and pages. The calendar draws exactly this set, so switching views never
 * changes what is on screen, only how it is laid out.
 */
export function visibleWeeklyRows(
  weekRows: WeeklyTaskRow[],
  tab: string,
  search: string,
): WeeklyTaskRow[] {
  const needle = search.trim().toLowerCase();
  return filterRowsByStatus(weekRows, tab).filter((r) => matchesWeeklyRow(r, needle));
}

/**
 * This owner's days as the Tasks register's rows, so the card can draw the
 * register's own week grid (`RegisterCalendar`) instead of a second calendar.
 *
 * The owner read nests each day inside its booking, where the register reads a
 * flat day list and joins the bookings in — so this flattens and joins from the
 * same response. A blank `propertyName` (one documented route sends `""`) is
 * filled from the owner's property list, as `flattenTaskRows` does, so the two
 * views name a property the same way.
 */
export function ownerRegisterRows(
  groups: TaskGroupDto[],
  propertyNames: Record<string, string>,
  now: Date,
): RegisterRow[] {
  const byId = new Map(groups.map((g) => [g.id, g]));
  const tasks = groups.flatMap((g) =>
    (g.tasks ?? []).map((task) => ({
      ...task,
      groupId: task.groupId || g.id,
      propertyName:
        (task.propertyName && task.propertyName.trim()) ||
        propertyNames[task.propertyId] ||
        task.propertyName,
    })),
  );
  return buildRegisterRows(tasks, byId, now);
}
