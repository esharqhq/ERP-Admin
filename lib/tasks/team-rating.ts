// lib/tasks/team-rating.ts

import { getApiErrorCode } from "@/lib/http/api-error";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import {
  normalizeStatus,
  type TaskItemDto,
  type TaskWorkerDto,
} from "@/lib/types/task.types";

/**
 * Who `PUT /api/tasks/{taskId}/rating` will score — `task-lifecycle.md` §0c·8
 * (F-07 ·4). The server writes the one score onto every worker whose outcome is
 * `Completed` and leaves every other row (no-show, removed, cancelled, still
 * undecided) untouched, so this is the list the dialog names.
 *
 * ⚠ It is a preview, not the server's answer: an outcome can change between
 * render and click. The response lists who was actually scored.
 */
export function teamRatingTargets(
  task: Pick<TaskItemDto, "workers">,
): TaskWorkerDto[] {
  return (task.workers ?? []).filter(
    (tw) => normalizeStatus(tw.outcome) === "completed",
  );
}

/**
 * Whether to offer "Rate the team" on this day.
 *
 * ⚠ The server does not check the day's state — it checks `outcome`. But an
 * outcome is only decided when the day is accepted, auto-accepted or
 * force-closed, so in practice only a `Done` day has anyone to score: on
 * `InReview` every row is still `Pending` and the route answers
 * `409 no_completed_workers` ("accept first, then rate"). A `Done` day where
 * everyone was a no-show answers the same `409`, so it is hidden too.
 */
export function canRateTeam(task: Pick<TaskItemDto, "status" | "workers">): boolean {
  return (
    canonicalTaskStatus(task.status) === "done" &&
    teamRatingTargets(task).length > 0
  );
}

export type RatingErrorKey =
  | "no_completed_workers"
  | "task_worker_not_completed"
  | "task_worker_not_found"
  | "forbidden";

const KNOWN: ReadonlySet<string> = new Set<RatingErrorKey>([
  "no_completed_workers",
  "task_worker_not_completed",
  "task_worker_not_found",
]);

/**
 * The refusal of either star route, keyed on the `error` string. The team route
 * (§0c·8) sends all three codes; the per-worker route
 * (`PUT …/workers/{workerId}/rating`) sends the last two — it loops the same
 * service call, so the codes mean the same thing on both.
 *
 * - `409 no_completed_workers` — team route only: nobody on the day is
 *   `Completed`. ⚠ Also what an unknown `taskId` answers for an admin (the
 *   permission check never reads the row), where the per-worker route says 404.
 * - `409 task_worker_not_completed` — on the team route only defensive (its
 *   query pre-filters to `Completed`); on the per-worker route, the normal
 *   refusal for a worker who did not complete the day.
 * - `404 task_worker_not_found` — the row is gone.
 * - empty `403` — the caller holds neither `task_worker:rate` nor `:rate_any`.
 *
 * `null` for anything else — the caller falls back to the validation bag
 * (stars out of 1–5 is a problem-details 400), then a generic line.
 */
export function ratingErrorKey(err: unknown): RatingErrorKey | null {
  if (isPermissionDenied(err)) return "forbidden";
  const code = getApiErrorCode(err);
  return code && KNOWN.has(code) ? (code as RatingErrorKey) : null;
}
