import type { AttendanceRowDto } from "@/lib/types/attendance.types";
import type { TaskGroupDto } from "@/lib/types/task.types";
import { normalizeStatus } from "@/lib/types/task.types";
import type { WorkerRowDto } from "@/lib/types/worker.types";
import type { DayKey } from "@/lib/ui/week";

/**
 * Workers × week, **reading A — booked work**.
 *
 * The whole grid is built here so the components only draw. Two sources meet:
 *
 * - **Seven attendance reads**, one per day, platform-wide. They carry the chips:
 *   who is on what, whether they turned up, and whether a check-in was refused.
 * - **One task-groups read.** Attendance has no `requiredWorkerCount`, and a task
 *   **nobody is assigned to produces no attendance row at all** — so without this
 *   the open-shifts row and the short-staffed fraction are both unbuildable.
 *
 * ⚠ The groups read is unbounded and undated (`ListAllGroupsAsync`), so the week
 * filter is applied here, client-side.
 */

/** What a single chip in a day cell says. */
export interface MatrixChip {
  taskId: string;
  groupId: string;
  /** `08:00` — from `scheduledAt`. */
  from: string;
  /** `15:30`, or `""` when the task carries no deadline. */
  to: string;
  propertyName: string;
  taskTitle: string;
  kind: ChipKind;
  /**
   * Assigned / required for the task, whatever the chip's kind. Drawn as the
   * `1/2` tag. `null` when the task wants exactly one worker — a `1/1` on every
   * chip would be noise on the majority of rows.
   */
  staffing: { assigned: number; required: number } | null;
  /**
   * Metres from the site on the latest refused check-in.
   *
   * ⚠ `null` even on a refused chip whenever the reason was not
   * `OutsideGeofence` — the other two refuse before a distance can be computed.
   * A refused chip with no number is a normal case.
   */
  refusedDistanceMeters: number | null;
  /** `GpsRequired` | `OutsideGeofence` | `GeofenceTargetMissing`, or `null`. */
  refusedReason: string | null;
  /** Hours between start and deadline, or `null` when there is no deadline. */
  hours: number | null;
}

/**
 * The chip's kind is **this worker's own relationship to this task**, not the
 * task's health — the cell belongs to one worker.
 *
 * Precedence, highest first, and each rung exists because the one below it would
 * otherwise say something untrue:
 *
 * 1. `cancelled` — the task is off. Nothing else about it matters.
 * 2. `done` — checked out. The shared task duration is the tag.
 * 3. `present` — checked in. ⚠ **This beats `refused`**: a worker who was turned
 *    away twice and then got in *is there*, and drawing them red would let a
 *    historical fact override a present one.
 * 4. `refused` — tried and the geofence said no, and has not since got in.
 * 5. `short` — nobody has turned up yet **and the task still wants more people**.
 *    The one rung that is about the task rather than the worker, because it is
 *    the only one an admin can act on from this cell.
 * 6. `scheduled` — booked, nothing has happened yet. The quiet default, so a wall
 *    of them reads as a covered week rather than as an alarm.
 */
export type ChipKind =
  | "cancelled"
  | "done"
  | "present"
  | "refused"
  | "short"
  | "scheduled";

export interface MatrixCell {
  chips: MatrixChip[];
}

export interface MatrixRow {
  worker: WorkerRowDto;
  cells: MatrixCell[];
  /** Booked tasks this week, across all seven days. */
  taskCount: number;
  /**
   * Total booked hours, or `null` when **no** task that week carries a deadline.
   *
   * ⚠ The design draws `38:30 / 36 h` with a `+2:30` delta. **There is no
   * contracted-hours field anywhere in the API** — not on the row, not on the
   * contract DTO this app reads — so the target and the delta are omitted rather
   * than invented. Filed as a backend ask; see the Matrix plan.
   */
  hours: number | null;
  /** Tasks whose window is unknown, so `hours` is a floor rather than a total. */
  untimedCount: number;
}

/** One column head: the date, and what happened on it. */
export interface MatrixDay {
  key: DayKey;
  /** Bookings across the platform that day — not only the rows on screen. */
  booked: number;
  refused: number;
  /** The seven reads are independent; this one did not land. */
  failed: boolean;
}

/** The aggregate row above the workers: what the week needs. */
export interface DemandCell {
  /** Every task that day is counted, not only the ones a visible worker is on. */
  assigned: number;
  required: number;
  /** Earliest start – latest deadline across the day, e.g. `08:30–15:00`. */
  window: string;
  /** The property when the day has only one, else how many. */
  label: string;
  propertyCount: number;
  taskCount: number;
}

/**
 * One task a free day's Assign popover can offer — the same fields a chip
 * carries, minus this-worker's-relationship-to-it, since there isn't one yet.
 *
 * ⚠ **No eligibility here, on purpose.** `GET /api/tasks/admin/groups` carries
 * no profession or rating-floor field on the task it hands back — only the
 * *create* request (`CreateTaskGroupRequest.eligibleProfessionIds`) has one, and
 * it is not echoed back. So "which jobs fit" cannot be honestly pre-filtered
 * client-side; every task still short a worker is offered, and the real assign
 * call is the judge — same as the existing short-staffed sheet already does for
 * "which workers fit".
 */
export interface OpenTaskCandidate {
  taskId: string;
  groupId: string;
  from: string;
  to: string;
  propertyName: string;
  taskTitle: string;
  assigned: number;
  required: number;
}

export interface MatrixWeek {
  days: MatrixDay[];
  demand: DemandCell[];
  /** Tasks that day with nobody at all on them — invisible to attendance. */
  openShifts: number[];
  /** Index-aligned with `days`: every task that day still short a worker. */
  openTasksByDay: OpenTaskCandidate[][];
  rows: MatrixRow[];
  /** Rows dropped by `hideUnbooked`. */
  hiddenCount: number;
}

/** A worker who left a task no longer occupies its slot. */
const VACATED = new Set(["removed", "cancelled", "noshow"]);

/** These never count as demand — nobody is expected to staff them. */
const DEAD_TASK = new Set(["cancelled", "completed"]);

interface TaskFacts {
  required: number;
  assigned: number;
  deadline: string | null;
  scheduledAt: string;
  scheduledDate: string;
  propertyName: string;
  title: string;
  groupId: string;
  status: string;
}

/**
 * Everything the grid needs about the week's tasks, keyed by task id.
 *
 * Exported for the demand row's sake as much as the chips': it is the only source
 * that knows a task exists when nobody is on it.
 */
export function indexTasks(
  groups: TaskGroupDto[],
  dayKeys: DayKey[],
): Map<string, TaskFacts> {
  const week = new Set(dayKeys);
  const out = new Map<string, TaskFacts>();

  for (const group of groups) {
    for (const task of group.tasks ?? []) {
      // Client-side week filter: the endpoint is undated and returns every group
      // ever created.
      if (!week.has(task.scheduledDate)) continue;
      const assigned = (task.workers ?? []).filter(
        (w) => !VACATED.has(normalizeStatus(w.outcome)),
      ).length;
      out.set(task.id, {
        required: task.requiredWorkerCount,
        assigned,
        deadline: task.deadline,
        scheduledAt: task.scheduledAt,
        scheduledDate: task.scheduledDate,
        propertyName: task.propertyName ?? "",
        title: group.title ?? "",
        groupId: group.id,
        status: normalizeStatus(task.status),
      });
    }
  }
  return out;
}

export interface BuildMatrixInput {
  workers: WorkerRowDto[];
  dayKeys: DayKey[];
  /** Index-aligned with `dayKeys`. `null` for a day whose read failed. */
  attendance: (AttendanceRowDto[] | null)[];
  groups: TaskGroupDto[];
  /** Default on — the design's "n workers with no booking this week are hidden". */
  hideUnbooked: boolean;
}

export function buildMatrixWeek({
  workers,
  dayKeys,
  attendance,
  groups,
  hideUnbooked,
}: BuildMatrixInput): MatrixWeek {
  const tasks = indexTasks(groups, dayKeys);

  /* ── the columns ──────────────────────────────────────────────────────── */
  const days: MatrixDay[] = dayKeys.map((key, i) => {
    const rows = attendance[i];
    if (rows === null) return { key, booked: 0, refused: 0, failed: true };
    return {
      key,
      booked: rows.length,
      // A worker who was refused and then got in is not a refusal any more.
      refused: rows.filter((r) => r.refusedCheckinCount > 0 && !r.checkinAt).length,
      failed: false,
    };
  });

  /* ── the two aggregate rows, from the tasks rather than from attendance ── */
  const demand: DemandCell[] = [];
  const openShifts: number[] = [];
  const openTasksByDay: OpenTaskCandidate[][] = [];

  for (const key of dayKeys) {
    const dayEntries = [...tasks.entries()].filter(
      ([, t]) => t.scheduledDate === key && !DEAD_TASK.has(t.status),
    );
    const dayTasks = dayEntries.map(([, t]) => t);
    const properties = new Set(dayTasks.map((t) => t.propertyName).filter(Boolean));
    demand.push({
      assigned: sum(dayTasks.map((t) => t.assigned)),
      required: sum(dayTasks.map((t) => t.required)),
      window: dayWindow(dayTasks),
      label:
        properties.size === 1 ? [...properties][0] : "",
      propertyCount: properties.size,
      taskCount: dayTasks.length,
    });
    // Zero assigned means zero attendance rows, so this number cannot come from
    // the seven reads. It is the whole reason the groups read exists.
    openShifts.push(dayTasks.filter((t) => t.assigned === 0).length);
    openTasksByDay.push(
      dayEntries
        .filter(([, t]) => t.assigned < t.required)
        .map(([taskId, t]) => ({
          taskId,
          groupId: t.groupId,
          from: clockOf(t.scheduledAt),
          to: t.deadline ? clockOf(t.deadline) : "",
          propertyName: t.propertyName,
          taskTitle: t.title,
          assigned: t.assigned,
          required: t.required,
        }))
        .sort((a, b) => a.from.localeCompare(b.from)),
    );
  }

  /* ── one row per worker ───────────────────────────────────────────────── */
  const byWorker = new Map<string, AttendanceRowDto[][]>();
  attendance.forEach((rows, dayIndex) => {
    for (const row of rows ?? []) {
      let week = byWorker.get(row.workerId);
      if (!week) {
        week = dayKeys.map(() => []);
        byWorker.set(row.workerId, week);
      }
      week[dayIndex].push(row);
    }
  });

  const all: MatrixRow[] = workers.map((worker) => {
    const week = byWorker.get(worker.id) ?? dayKeys.map(() => []);
    const cells = week.map((rows) => ({
      chips: rows
        .map((row) => toChip(row, tasks.get(row.taskId)))
        .sort((a, b) => a.from.localeCompare(b.from)),
    }));
    const chips = cells.flatMap((c) => c.chips);
    const timed = chips.filter((c) => c.hours !== null);
    return {
      worker,
      cells,
      taskCount: chips.length,
      hours: timed.length > 0 ? sum(timed.map((c) => c.hours as number)) : null,
      untimedCount: chips.length - timed.length,
    };
  });

  /*
    Hiding the unbooked is the design's own row-reduction, and it is why a window
    of five is not absurd: on a real page most of the directory has no work in any
    given week, and a grid of empty rows is a grid nobody can read.
  */
  const rows = hideUnbooked ? all.filter((r) => r.taskCount > 0) : all;

  return {
    days,
    demand,
    openShifts,
    openTasksByDay,
    rows,
    hiddenCount: all.length - rows.length,
  };
}

function toChip(row: AttendanceRowDto, facts: TaskFacts | undefined): MatrixChip {
  const required = facts?.required ?? 1;
  const assigned = facts?.assigned ?? 1;
  const deadline = facts?.deadline ?? null;

  return {
    taskId: row.taskId,
    groupId: row.taskGroupId,
    from: clockOf(row.scheduledAt),
    to: deadline ? clockOf(deadline) : "",
    propertyName: row.propertyName,
    taskTitle: facts?.title || row.taskGroupTitle || "",
    kind: chipKind(row, assigned, required),
    staffing: required > 1 ? { assigned, required } : null,
    refusedDistanceMeters: row.lastRefusalDistanceMeters,
    refusedReason: row.lastRefusalReason,
    hours: deadline ? hoursBetween(row.scheduledAt, deadline) : null,
  };
}

/** The precedence documented on `ChipKind`. Read that comment before changing it. */
export function chipKind(
  row: AttendanceRowDto,
  assigned: number,
  required: number,
): ChipKind {
  if (normalizeStatus(row.taskStatus) === "cancelled") return "cancelled";
  if (row.checkoutAt) return "done";
  if (row.checkinAt) return "present";
  if (row.refusedCheckinCount > 0) return "refused";
  if (assigned < required) return "short";
  return "scheduled";
}

/** `2026-09-01T08:00:00Z` → `08:00`, in the reader's own zone. */
function clockOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function hoursBetween(from: string, to: string): number | null {
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return null;
  return (b - a) / 3_600_000;
}

/**
 * The day's span — earliest start to latest deadline.
 *
 * ⚠ Deliberately **not** one task's window. The design's artboard shows a single
 * job per day; a real day holds several, and printing the first one's hours as
 * "what the week needs" would understate every other. A day whose tasks carry no
 * deadline shows only the start.
 */
function dayWindow(dayTasks: TaskFacts[]): string {
  if (dayTasks.length === 0) return "";
  const starts = dayTasks.map((t) => clockOf(t.scheduledAt)).filter(Boolean).sort();
  const ends = dayTasks
    .map((t) => (t.deadline ? clockOf(t.deadline) : ""))
    .filter(Boolean)
    .sort();
  if (starts.length === 0) return "";
  const first = starts[0];
  const last = ends.length > 0 ? ends[ends.length - 1] : "";
  return last ? `${first}–${last}` : first;
}

function sum(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0);
}

/** `38.5` → `38:30`. Hours are read as clock time on this screen, not as decimals. */
export function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  // 59.6 minutes must not print as `:60`.
  if (minutes === 60) return `${whole + 1}:00`;
  return `${whole}:${String(minutes).padStart(2, "0")}`;
}
