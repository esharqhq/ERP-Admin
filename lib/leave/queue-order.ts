import type { WorkerLeaveRequestDto } from "@/lib/types/leave.types";

/**
 * The queue's order: the shift that happens soonest, first.
 *
 * The table this screen replaces was ordered by whatever the list returned —
 * `createdAt` descending. A request touching a shift in four hours and one
 * touching next month sorted equally, which is the whole reason the redesign
 * calls its ordering "affected work, soonest".
 *
 * ## The two things `soonestAffectedAt` does not mean
 *
 * ⚠ **It is computed differently per target** (`WorkerLeaveRequestService.cs:553-585`):
 *
 * - `Task` — the task's `ScheduledAt`, with **no filter at all**. A request about
 *   a shift that has already begun therefore carries a **past** date.
 * - `TaskGroup` — a `MIN` over assignments that are still `Pending` **and** in the
 *   future. Nothing future-pending left means `null`.
 *
 * So past dates exist, and they sort **first**. That is deliberate: a request
 * whose shift has already started is the most urgent thing in the queue precisely
 * because approving it will be refused (`task_already_started`) and somebody has
 * to reject it and refill instead. Sorting it below next month's request would
 * bury the one row that cannot wait.
 *
 * ⚠ **`null` is not "no urgency", it is "nothing left to protect"** — an already
 * decided request, or a group whose future assignments are gone. Those go last,
 * and among themselves keep the newest-first order the server sent, which is the
 * useful reading of a decided list.
 */
export function bySoonestAffected(
  a: WorkerLeaveRequestDto,
  b: WorkerLeaveRequestDto,
): number {
  const at = parse(a.soonestAffectedAt);
  const bt = parse(b.soonestAffectedAt);

  if (at === null && bt === null) {
    // Newest request first — what the server already returns, made explicit so
    // the tie-break does not depend on sort stability.
    return parse(b.createdAt)! - parse(a.createdAt)!;
  }
  if (at === null) return 1;
  if (bt === null) return -1;
  return at - bt;
}

/** `null` for absent and for unparseable alike — both mean "cannot be ordered". */
function parse(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

/** A new array in queue order; the input is never mutated. */
export function orderQueue(
  rows: readonly WorkerLeaveRequestDto[],
): WorkerLeaveRequestDto[] {
  return [...rows].sort(bySoonestAffected);
}
