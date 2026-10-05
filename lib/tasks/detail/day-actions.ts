import { outcomeChoices } from "@/lib/tasks/outcome-override";
import { activeWorkers, VACATED_OUTCOMES } from "@/lib/tasks/staffing";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import { canRateTeam } from "@/lib/tasks/team-rating";
import {
  normalizeStatus,
  type TaskItemDto,
  type TaskWorkerDto,
} from "@/lib/types/task.types";

export type DayActionKey = "supervisor" | "forceClose" | "assign" | "openComplaint" | "rateTeam";

/**
 * The selected day's buttons, in display order (primary last) — spec §6 as
 * narrowed by the plan. Permissions are NOT decided here; each button is still
 * wrapped in `<Can>`.
 *
 * - Supervisor / force close: CheckedIn and InReview only. Both server guards
 *   also accept Pending, but the design offers neither there: the supervisor is
 *   set at first check-in, and a pending day past start cancels itself.
 * - Assign: Pending and CheckedIn only. ⚠ Our rule, not the server's —
 *   admin-assign has no state guard (`GT_AdminFillHasNoDateOrStatusGuard`),
 *   so this function is the only thing stopping a fill on a handed-in day.
 */
export function dayActions(task: TaskItemDto): DayActionKey[] {
  const state = canonicalTaskStatus(task.status);
  const out: DayActionKey[] = [];
  if (state === "checkedIn" || state === "inReview") out.push("supervisor", "forceClose");
  if (state === "pending" || state === "checkedIn") out.push("assign");
  if (state === "rejected") out.push("openComplaint");
  if (canRateTeam(task)) out.push("rateTeam");
  return out;
}

/** The `<Can>` code behind each day button — `null` means the target page gates itself. */
export const DAY_ACTION_PERMISSION: Record<DayActionKey, string | null> = {
  supervisor: "task:supervisor_override_any",
  forceClose: "task:force_close_any",
  assign: "task:assign_worker_any",
  openComplaint: null,
  rateTeam: "task_worker:rate_any",
};

/**
 * The buttons this admin will actually see. "No actions" is decided on this
 * list — spec §6 says "no *visible* button".
 */
export function visibleDayActions(
  actions: DayActionKey[],
  can: (permission: string) => boolean,
): DayActionKey[] {
  return actions.filter((a) => {
    const p = DAY_ACTION_PERMISSION[a];
    return p === null || can(p);
  });
}

export type RowActionKey = "rate" | "outcome" | "unassign";

/**
 * One worker row's icons.
 * - rate: `Completed` only — any other outcome answers `task_worker_not_completed`.
 * - outcome: wherever §0j accepts some value (`outcomeChoices`).
 * - unassign: an active worker on Pending/CheckedIn — the server refuses
 *   Review/Done/Cancelled with `task_not_unassignable`.
 */
export function rowActions(task: TaskItemDto, worker: TaskWorkerDto, now: number): RowActionKey[] {
  const state = canonicalTaskStatus(task.status);
  const outcome = normalizeStatus(worker.outcome);
  const out: RowActionKey[] = [];
  if (outcome === "completed") out.push("rate");
  if (outcomeChoices(task, worker.outcome, now).length > 0) out.push("outcome");
  if ((state === "pending" || state === "checkedIn") && !VACATED_OUTCOMES.has(outcome)) {
    out.push("unassign");
  }
  return out;
}

/** "Open slot" rows — Pending/CheckedIn only; never negative (limit can drop under the count). */
export function openSlots(task: TaskItemDto): number {
  const state = canonicalTaskStatus(task.status);
  if (state !== "pending" && state !== "checkedIn") return 0;
  return Math.max(0, task.requiredWorkerCount - activeWorkers(task).length);
}

/** Shows "No actions — this day is closed" when no button is visible. */
export function isClosedDay(task: TaskItemDto): boolean {
  const state = canonicalTaskStatus(task.status);
  return state === "done" || state === "cancelled";
}
