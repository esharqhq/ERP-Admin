import type { TaskGroupDayCountsDto } from "@/lib/types/task.types";

/**
 * What a booking-cancel actually did.
 *
 * ⚠⚠ `POST /api/tasks/admin/groups/{id}/cancel` answers **`204` even when it
 * cancelled nothing** (`task-lifecycle.md` §0d). It cancels the days that
 * qualify and silently skips the rest — and since F-07 ·3 (2026-09-21) widened
 * the single-day window from one hour to **three**, "nothing qualifies" is no
 * longer rare. A UI that reports "booking cancelled" on the `204` is now
 * routinely lying, so the reading comes from the day counts either side of the
 * call, never from the status code.
 *
 * ⚠ Deliberately no clock arithmetic here. The three-hour rule is the server's
 * and has already moved once; a copy of it in this repo would be a second
 * source of truth that drifts silently.
 */
export type GroupCancelOutcome =
  | { kind: "all"; cancelled: number; remaining: number }
  | { kind: "some"; cancelled: number; remaining: number }
  | { kind: "none"; cancelled: 0; remaining: number }
  | { kind: "unknown"; cancelled: 0; remaining: 0 };

const settled = (d: TaskGroupDayCountsDto) => d.done + d.cancelled + d.rejected;

export function describeGroupCancel(
  before: TaskGroupDayCountsDto | null | undefined,
  after: TaskGroupDayCountsDto | null | undefined,
): GroupCancelOutcome {
  // Without both readings there is nothing honest to say, and "unknown" is a
  // better answer than a confident wrong one.
  if (!before || !after) return { kind: "unknown", cancelled: 0, remaining: 0 };

  const cancelled = Math.max(0, after.cancelled - before.cancelled);
  const remaining = Math.max(0, after.total - settled(after));

  if (cancelled === 0) return { kind: "none", cancelled: 0, remaining };
  return { kind: remaining === 0 ? "all" : "some", cancelled, remaining };
}
