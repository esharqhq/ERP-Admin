import {
  normalizeStatus,
  type TaskGroupDto,
  type TaskItemDto,
  type TaskWorkerDto,
} from "@/lib/types/task.types";

/**
 * A worker whose outcome is one of these no longer occupies a slot — the task is
 * effectively short that body even though the row still exists.
 *
 * Lives here rather than in a page because two screens compute staffing from it
 * (Dispatch and the Walk-In orders list) and a naive `workers.length` in either
 * one makes them contradict each other on the same task.
 */
export const VACATED_OUTCOMES = new Set(["removed", "cancelled", "noshow"]);

/**
 * Only PENDING / ACTIVE tasks can still take a worker. REVIEW (work submitted)
 * and the terminal DONE / CANCELLED states are not dispatch targets.
 *
 * The backend does **not** enforce this: `POST /api/tasks/{id}/admin-assign/{workerId}`
 * has no task-date or task-status guard, so an elapsed, Done or Cancelled task can
 * still be filled (`GT_AdminFillHasNoDateOrStatusGuard`). This is the client-side
 * guard that keeps that out of reach.
 */
export const OPEN_STATUSES = new Set(["pending", "active"]);

export function activeWorkers(task: TaskItemDto): TaskWorkerDto[] {
  return (task.workers ?? []).filter(
    (w) => !VACATED_OUTCOMES.has(normalizeStatus(w.outcome)),
  );
}

export function isOpen(task: TaskItemDto): boolean {
  return OPEN_STATUSES.has(normalizeStatus(task.status));
}

export function needsWorkers(task: TaskItemDto): boolean {
  return isOpen(task) && activeWorkers(task).length === 0;
}

/**
 * Group-wide staffing, for the `3/4` on an orders-list row.
 *
 * `required` reads `requiredWorkerCount` — the name on `TaskItemDto`. It is
 * **not** `workerLimit`, which is the name the create *request* uses for the
 * same quantity.
 */
export function groupStaffing(tasks: TaskItemDto[]): { filled: number; required: number } {
  return (tasks ?? []).reduce(
    (acc, t) => ({
      filled: acc.filled + activeWorkers(t).length,
      required: acc.required + t.requiredWorkerCount,
    }),
    { filled: 0, required: 0 },
  );
}

/**
 * A group is "active" while it is PENDING or ACTIVE. `TaskGroupStatus` has
 * exactly four members — PENDING / ACTIVE / DONE / CANCELLED — so this and its
 * negation are exhaustive.
 *
 * Shared for the same reason `OPEN_STATUSES` is: the Walk-In orders list (its
 * Active/History split), the Walk-In order sheet (whether Cancel can even be
 * offered) and the Dispatch task-detail page (`groupCancellable`) all need the
 * same answer, and the backend's cancel flow enforces it server-side — it
 * rejects `CANCELLED` with `task_group_already_cancelled` and `DONE` with
 * `task_group_already_done`. A second, drifted copy of this check in any one
 * of those screens would offer Cancel on a group the backend will refuse.
 */
export function isGroupActive(group: TaskGroupDto): boolean {
  const s = normalizeStatus(group.status);
  return s === "pending" || s === "active";
}
