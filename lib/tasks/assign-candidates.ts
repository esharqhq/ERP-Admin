// lib/tasks/assign-candidates.ts

import { normalizeStatus } from "@/lib/types/task.types";
import { VACATED_OUTCOMES } from "@/lib/tasks/staffing";
import type { SortDir } from "@/lib/types/onboarding.types";
import type { TaskItemDto } from "@/lib/types/task.types";
import type { WorkerRowDto } from "@/lib/types/worker.types";

/**
 * The three orders the assign sheet offers.
 *
 * `free` is not a filter. A booked worker is still offered — the server permits
 * assigning them, and only refuses if the new task's window actually **overlaps**
 * one they hold — so hiding them would remove legal choices. It sorts them last
 * and tags them instead.
 */
export const CANDIDATE_SORTS = ["free", "rating", "name"] as const;
export type CandidateSort = (typeof CANDIDATE_SORTS)[number];

/**
 * The server-side half of an order.
 *
 * ⚠ **Sorting is done by the server, not over the page we happen to hold.** The
 * sheet asks for 100 rows; client-sorting those would rank "best rated" within an
 * arbitrary hundred rather than across the directory, which is the wrong answer
 * dressed as the right one. `rating` and `fullName` are both in
 * `WORKER_SORT_COLUMNS`, so both orders are real.
 *
 * `free` has **no** server key — `booked` is a filter, never a sort column — so it
 * borrows the rating order and partitions on top (see `orderCandidates`). The
 * honest name for that order is "free first, then best rated".
 */
export function candidateQuery(sort: CandidateSort): {
  sortBy: string;
  dir: SortDir;
} {
  if (sort === "name") return { sortBy: "fullName", dir: "Asc" };
  return { sortBy: "rating", dir: "Desc" };
}

/**
 * Applies whatever the server could not.
 *
 * For `rating` and `name` the response is already in order and this returns it
 * untouched — deliberately, so nothing re-sorts a server order and quietly
 * disagrees with it.
 *
 * For `free` it is a **stable** partition: unbooked workers first, each group
 * keeping the rating order the server sent. `Array.prototype.sort` is required to
 * be stable, so this needs no tiebreaker.
 */
export function orderCandidates(
  workers: WorkerRowDto[],
  sort: CandidateSort,
): WorkerRowDto[] {
  if (sort !== "free") return workers;
  return [...workers].sort((a, b) => Number(a.booked) - Number(b.booked));
}

/**
 * Who already occupies a seat on this task.
 *
 * Offering them back would earn `worker_limit_reached` or a duplicate row, so
 * they are removed from the list rather than refused after the click — the same
 * call the Matrix's sheet makes.
 *
 * Reads `VACATED_OUTCOMES`, so a worker who was **removed** from this task is
 * offered again. ⚠ That is correct in this app's model and currently refused by
 * the server, which counts removed rows against the limit — see
 * `BACKEND-ASKS.md` #31. When that is fixed this needs no change; until then the
 * sheet is offering a choice the server will reject, which is strictly better
 * than hiding the only worker the admin wants to put back.
 */
export function occupiedBy(task: TaskItemDto | undefined): Set<string> {
  return new Set(
    (task?.workers ?? [])
      .filter((w) => !VACATED_OUTCOMES.has(normalizeStatus(w.outcome)))
      .map((w) => w.workerId),
  );
}

/**
 * Search over the two fields the row shows a name from. Case-insensitive, and an
 * empty or whitespace-only query keeps everything — the box narrows, so an
 * untouched one must not hide anybody.
 */
export function filterCandidates(
  workers: WorkerRowDto[],
  occupied: Set<string>,
  query: string,
): WorkerRowDto[] {
  const q = query.trim().toLowerCase();
  return workers.filter((w) => {
    if (occupied.has(w.id)) return false;
    if (!q) return true;
    return (
      (w.fullName ?? "").toLowerCase().includes(q) ||
      (w.email ?? "").toLowerCase().includes(q)
    );
  });
}

/**
 * What the row says about a worker's rating.
 *
 * ⚠ `rating` is `0` for **both** "unrated" and "rated zero", and the DTO carries
 * nothing to tell them apart. Treating `0` as new is the reading every other
 * screen in this app takes, and it is the safer error: calling a genuinely
 * zero-rated worker "New" understates a problem the admin will see on the task,
 * whereas printing "0.0" on somebody who has never worked invents one.
 *
 * Whether a New worker may actually be assigned depends on the task group's
 * `allowNewWorkers` flag (`RatingEligible`, backend), which this sheet has no
 * source for — see `BACKEND-ASKS.md` #33. So this is context for the admin's
 * judgement, never a gate.
 */
export function ratingLabel(worker: WorkerRowDto): { isNew: boolean; text: string } {
  return worker.rating > 0
    ? { isNew: false, text: worker.rating.toFixed(1) }
    : { isNew: true, text: "" };
}
