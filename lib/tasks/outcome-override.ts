// lib/tasks/outcome-override.ts

import { getApiErrorCode } from "@/lib/http/api-error";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import {
  normalizeStatus,
  type OverrideOutcomeTarget,
  type TaskItemDto,
} from "@/lib/types/task.types";

const DONE_TARGETS: OverrideOutcomeTarget[] = ["Completed", "NoShow", "Removed"];
const NOT_STARTED_TARGETS: OverrideOutcomeTarget[] = ["Removed"];

/**
 * Which results `PATCH /api/tasks/{taskId}/workers/{workerId}/outcome` will
 * accept for this worker on this day — `task-lifecycle.md` §0j (2026-09-25).
 *
 * ⚠ The route used to take any value on any day. Since the rating card it
 * accepts a change in two places only:
 * - a `Done` day — `Completed`, `NoShow` or `Removed`;
 * - a `Pending` day whose start has not come — `Removed` only.
 *
 * Every other state refuses (`outcome_not_overridable`, or
 * `decide_the_complaint_first` on a disputed day), and `Cancelled` is refused
 * everywhere. An empty list means the button is hidden.
 *
 * The result already held is left out: offering "Removed" to a worker who is
 * already removed would send a change that changes nothing.
 *
 * ⚠ `complaint_already_decided` binds the **owner** only — an admin may still
 * correct a result on a day whose complaint was decided, so it is not gated here.
 *
 * `now` is `useClock()`: `0` before the clock is known, and a not-started day
 * cannot be told apart from a started one until it is.
 */
export function outcomeChoices(
  task: Pick<TaskItemDto, "status" | "scheduledAt">,
  current: string,
  now: number,
): OverrideOutcomeTarget[] {
  const held = normalizeStatus(current);
  const without = (targets: OverrideOutcomeTarget[]) =>
    targets.filter((t) => normalizeStatus(t) !== held);

  switch (canonicalTaskStatus(task.status)) {
    case "done":
      return without(DONE_TARGETS);
    case "pending": {
      if (!now) return [];
      const start = new Date(task.scheduledAt).getTime();
      if (Number.isNaN(start) || start <= now) return [];
      return without(NOT_STARTED_TARGETS);
    }
    default:
      return [];
  }
}

export type OutcomeErrorKey =
  | "outcome_target_not_allowed"
  | "outcome_not_overridable"
  | "decide_the_complaint_first"
  | "complaint_already_decided"
  | "cannot_override_to_pending"
  | "task_worker_not_found"
  | "forbidden";

const KNOWN: ReadonlySet<string> = new Set<OutcomeErrorKey>([
  "outcome_target_not_allowed",
  "outcome_not_overridable",
  "decide_the_complaint_first",
  "complaint_already_decided",
  "cannot_override_to_pending",
  "task_worker_not_found",
]);

/**
 * The refusal, keyed on the `error` string (every one is `400 {error}` except
 * `404 task_worker_not_found` and the empty-bodied `403`). `null` for anything
 * else — the caller falls back to the validation bag, then a generic line.
 *
 * `outcome_not_overridable` and `decide_the_complaint_first` are reachable only
 * in a race: `outcomeChoices` never offers the button on those days, but a day
 * can start, or be disputed, between render and click.
 */
export function outcomeErrorKey(err: unknown): OutcomeErrorKey | null {
  if (isPermissionDenied(err)) return "forbidden";
  const code = getApiErrorCode(err);
  return code && KNOWN.has(code) ? (code as OutcomeErrorKey) : null;
}
