import { normalizeStatus } from "@/lib/types/task.types";
import type { TaskGroupDto, TaskWorkerDto } from "@/lib/types/task.types";

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

/** `"all"`, or a task status name matched case-insensitively. */
export function filterRowsByStatus(
  rows: WeeklyTaskRow[],
  status: string,
): WeeklyTaskRow[] {
  if (status === "all") return rows;
  const want = normalizeStatus(status);
  return rows.filter((r) => normalizeStatus(r.status) === want);
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
