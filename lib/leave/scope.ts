import { activeWorkers } from "@/lib/tasks/staffing";
import {
  normalizeStatus,
  type TaskGroupDto,
  type TaskItemDto,
  type TaskWorkerDto,
} from "@/lib/types/task.types";
import type { WorkerLeaveRequestDto } from "@/lib/types/leave.types";

/**
 * What approving a leave request does to one date.
 *
 * - `vacated` — the assignment row is deleted; the shift is one body short.
 * - `noshow`  — the row survives with `outcome=NoShow`, which is a permanent
 *   mark against the worker's rating. This is the one the old table hid.
 * - `kept`    — the backend does not touch it.
 */
export type LeaveScopeEffect = "vacated" | "noshow" | "kept";

export interface LeaveScopeRow {
  taskId: string;
  scheduledAt: string;
  propertyName: string | null;
  status: string;
  effect: LeaveScopeEffect;
  /** Bodies still on the shift once the decision has been applied. */
  filledAfter: number;
  required: number;
}

/** Server refusals this can rule out before the click. */
export type LeaveBlocker = "task_already_started" | "worker_already_checked_in";

export interface LeaveScope {
  /** False when the group has not loaded, or the request points outside it. */
  resolved: boolean;
  rows: LeaveScopeRow[];
  vacated: number;
  noShow: number;
  blockers: LeaveBlocker[];
  /**
   * Whether the client could evaluate the server's gates at all. True only for a
   * `Task` target: `TaskGroup` approval's single gate is `no_active_enrolment`,
   * and `TaskGroupDto.isEnrolled` is emitted neutrally (`true`) at admin call
   * sites, so there is nothing to read. On a group the refusal is still the
   * first news — the UI must not draw a green tick it cannot back.
   */
  gatesPrecheckable: boolean;
}

const EMPTY: LeaveScope = {
  resolved: false,
  rows: [],
  vacated: 0,
  noShow: 0,
  blockers: [],
  gatesPrecheckable: false,
};

function assignmentOf(task: TaskItemDto, workerId: string): TaskWorkerDto | undefined {
  return (task.workers ?? []).find((w) => w.workerId === workerId);
}

/**
 * ⚠ Upper bound, not a count.
 *
 * Both backend mechanics filter on `TaskWorker.TaskGroupWorkerId == tgw.Id`, so a
 * **one-off admin fill** (`task:assign_worker_any`, which writes
 * `TaskGroupWorkerId = null`) is left untouched by a group leave. `TaskWorkerDto`
 * carries no `taskGroupWorkerId`, so from here the two are indistinguishable, and
 * a group whose worker was filled onto an extra date will over-count. It is
 * reachable: `groups/{id}/join` fans out only over contract-covered dates, so an
 * admin filling an uncovered date of a group the worker is already enrolled in
 * produces exactly that mix. Copy must say "up to".
 *
 * See BACKEND-ASKS.md → #29.
 */
function groupEffect(
  task: TaskItemDto,
  assignment: TaskWorkerDto,
  now: number,
): LeaveScopeEffect {
  const started = Date.parse(task.scheduledAt) < now;
  const taskStatus = normalizeStatus(task.status);

  // DeactivateGroupWorkerAsync: Task.Status == Pending && Task.ScheduledAt > now.
  if (!started && taskStatus === "pending") return "vacated";

  // OnTaskGroupWorkerExitedAsync: Outcome == Pending && ScheduledAt < now
  // && Status != Done && Status != Cancelled. Both status arms matter — without
  // them a finished shift would be drawn as a no-show that never happens.
  if (
    started &&
    normalizeStatus(assignment.outcome) === "pending" &&
    taskStatus !== "done" &&
    taskStatus !== "cancelled"
  ) {
    return "noshow";
  }

  return "kept";
}

function toRow(
  task: TaskItemDto,
  assignment: TaskWorkerDto,
  effect: LeaveScopeEffect,
): LeaveScopeRow {
  // A NoShow outcome is itself a vacating outcome, so both non-kept effects take
  // the leaver out of the staffing count.
  const filledNow = activeWorkers(task).length;
  return {
    taskId: task.id,
    scheduledAt: task.scheduledAt,
    propertyName: task.propertyName,
    status: task.status,
    effect,
    filledAfter: effect === "kept" ? filledNow : Math.max(0, filledNow - 1),
    required: task.requiredWorkerCount,
  };
}

/**
 * What approving this request would do, read off the group the request points at.
 *
 * Pure, and `now` is a parameter — the component passes `useClock()`, the tests
 * pass a fixed instant. Same split as `relativeAge`.
 */
export function computeLeaveScope(
  request: WorkerLeaveRequestDto,
  group: TaskGroupDto | null | undefined,
  now: number,
): LeaveScope {
  if (!group || !now) return EMPTY;

  const tasks = group.tasks ?? [];

  if (request.targetType === "Task") {
    const task = tasks.find((t) => t.id === request.taskId);
    const assignment = task ? assignmentOf(task, request.workerId) : undefined;
    if (!task || !assignment) return EMPTY;

    // The two gates ApproveAsync re-runs on the TASK branch, in its own order.
    const blockers: LeaveBlocker[] = [];
    if (normalizeStatus(task.status) !== "pending") blockers.push("task_already_started");
    if (assignment.checkinAt) blockers.push("worker_already_checked_in");

    // A blocked approve changes nothing, so nothing is vacated. Reporting a 1
    // here would put "1 shift vacated" directly above a box saying the server
    // will refuse — and the chip would be the half that is wrong.
    const blocked = blockers.length > 0;
    const row = toRow(task, assignment, blocked ? "kept" : "vacated");
    return {
      resolved: true,
      rows: [row],
      vacated: blocked ? 0 : 1,
      noShow: 0,
      blockers,
      gatesPrecheckable: true,
    };
  }

  const rows: LeaveScopeRow[] = [];
  for (const task of tasks) {
    const assignment = assignmentOf(task, request.workerId);
    if (!assignment) continue;
    rows.push(toRow(task, assignment, groupEffect(task, assignment, now)));
  }
  rows.sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));

  return {
    resolved: true,
    rows,
    vacated: rows.filter((r) => r.effect === "vacated").length,
    noShow: rows.filter((r) => r.effect === "noshow").length,
    blockers: [],
    gatesPrecheckable: false,
  };
}
