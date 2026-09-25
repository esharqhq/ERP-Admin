import {
  normalizeStatus,
  type TaskGroupDto,
  type TaskItemDto,
  type TaskWorkerDto,
} from "@/lib/types/task.types";
import { canonicalTaskStatus, type TaskStateKey } from "@/lib/tasks/status-vocab";

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
 * The day states a dispatcher may still fill: not started, or started. Handed-in
 * (`InReview`), disputed (`Rejected`) and the terminal DONE / CANCELLED states are
 * not dispatch targets.
 *
 * The backend does **not** enforce this: `POST /api/tasks/{id}/admin-assign/{workerId}`
 * has no task-date or task-status guard, so an elapsed, Done or Cancelled task can
 * still be filled (`GT_AdminFillHasNoDateOrStatusGuard`). This is the client-side
 * guard that keeps that out of reach.
 *
 * ⚠ An allowlist over the canonical key, never a raw lowercase word list: the
 * states were renamed on 2026-09-17 (`Active` → `CheckedIn`) and a word list
 * silently closed every checked-in day. An unknown future state is `null` here,
 * so it reads as closed rather than as open.
 */
const OPEN_STATES: ReadonlySet<TaskStateKey> = new Set(["pending", "checkedIn"]);

export function activeWorkers(task: TaskItemDto): TaskWorkerDto[] {
  return (task.workers ?? []).filter(
    (w) => !VACATED_OUTCOMES.has(normalizeStatus(w.outcome)),
  );
}

export function isOpen(task: TaskItemDto): boolean {
  const state = canonicalTaskStatus(task.status);
  return state !== null && OPEN_STATES.has(state);
}

export function needsWorkers(task: TaskItemDto): boolean {
  return isOpen(task) && activeWorkers(task).length === 0;
}

/**
 * Open, **partly** crewed, and still a body short — the reading the v1 board
 * could not show at all.
 *
 * `needsWorkers` only answers *zero*: a task 1-of-4 staffed looked identical to
 * one fully covered, because nothing on the row compared `activeWorkers` against
 * `requiredWorkerCount`. This is the comparison, and it is the one behaviour the
 * v2 design adds rather than redraws.
 *
 * ⚠ **Deliberately disjoint from `needsWorkers`.** A task with nobody on it is
 * Unstaffed, not Short, so the two counts never double-count the same row and
 * "14 unstaffed · 9 short" adds up to 23 distinct tasks. The design's own numbers
 * imply this split — a Short that included the unstaffed set could not be smaller
 * than it — and its `1 / 3` legend row names it: *"partly covered, still needs
 * bodies."*
 *
 * Over-staffing is not short: the server allows `activeWorkers` above
 * `requiredWorkerCount` (a `PATCH` can lower the limit under the assigned count),
 * so the comparison is `<`, never `!==`.
 */
export function isShortOfCrew(task: TaskItemDto): boolean {
  if (!isOpen(task)) return false;
  const filled = activeWorkers(task).length;
  return filled > 0 && filled < task.requiredWorkerCount;
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
 * A booking is "active" while at least one of its days is still unsettled.
 *
 * Shared for the same reason `isOpen` is: the Walk-In orders list (its
 * Active/History split), the Walk-In order sheet (whether Cancel can even be
 * offered) and the Dispatch task-detail page (`groupCancellable`) all need the
 * same answer, and the backend's cancel flow enforces it server-side — it
 * rejects `CANCELLED` with `task_group_already_cancelled` and `DONE` with
 * `task_group_already_done`. A second, drifted copy of this check in any one
 * of those screens would offer Cancel on a group the backend will refuse.
 *
 * ⚠ It used to read `group.status`, which F-07 ·0 (2026-09-17) deleted. With the
 * field gone the read was `undefined`, this returned `false` for every booking,
 * and Cancel disappeared from all three screens while every booking filed as
 * History. The counts replaced the word.
 *
 * ⚠⚠ **This definition is ours, not the backend's.** The guide rules only that
 * the counts replace the word; where the line falls is our call. `inReview`
 * counts as UNSETTLED on purpose — that day is waiting on somebody, and it is
 * the row an admin most needs to see. `rejected` counts as settled, against the
 * day ·5 starts filling it.
 *
 * ⚠ A missing or empty `days` reads active. Cancel offered on a finished booking
 * is a refused request; Cancel hidden on a live one is a support ticket. Open is
 * the safe default, and it is the opposite of what the old unknown-word arm did.
 */
export function isGroupActive(group: TaskGroupDto): boolean {
  const d = group.days;
  if (!d || d.total <= 0) return true;
  return d.done + d.cancelled + d.rejected < d.total;
}

/**
 * How many of a booking's days have stopped moving. The counterpart to
 * `isGroupActive`, kept beside it so the two cannot drift.
 */
export function settledDays(group: TaskGroupDto): number {
  const d = group.days;
  if (!d) return 0;
  return d.done + d.cancelled + d.rejected;
}

/** The four buckets the tasks list's tabs offer. */
export type GroupBucket = "Pending" | "Active" | "Done" | "Cancelled";

/**
 * Which tab a booking files under, derived from its day counts.
 *
 * ⚠ This is a reconstruction, not a contract. Until F-07 ·0 the server sent a
 * `TaskGroupStatus` word and these tabs compared against it; the word is gone and
 * the backend offers no replacement for a *booking*-level state, so the buckets
 * are ours. Keep them here rather than in the page — the same question is asked
 * by the tab filter and by the Active/History split, and two copies would drift.
 *
 * `Cancelled` means EVERY settled day was cancelled — a booking with three done
 * days and one cancelled is `Done`, not `Cancelled`, because calling it cancelled
 * would deny work that happened.
 */
export function groupBucket(group: TaskGroupDto): GroupBucket {
  const d = group.days;
  if (!d || d.total <= 0) return "Pending";
  if (isGroupActive(group)) {
    return d.pending === d.total ? "Pending" : "Active";
  }
  return d.cancelled === d.total ? "Cancelled" : "Done";
}
