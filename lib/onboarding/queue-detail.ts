/**
 * How the queue's rows describe a document bundle.
 *
 * Since 2026-09-08 (`kyc-queue-load-audit`) the list row carries a per-verdict
 * breakdown, so the queue no longer reads one detail per row to draw this. What
 * it lost in that trade is **order**: the row knows how many files are approved,
 * pending and rejected, not which file is which — so the dots are a grouped
 * summary, and the per-file strip lives on the detail view, which still has the
 * real `documents[]`.
 *
 * It also lost `submittedAt` outright. There is no column and no audit trail for
 * when a bundle was put in front of an admin (`docs/handoff/CHANGELOG.md`,
 * 2026-09-08), so the "waiting N days" column and its seven-day alarm are gone
 * with it. Nothing on the row substitutes: `onboardingReviewedAt` is when a
 * decision was *made*, and it is `null` on exactly the rows the queue is about.
 */

export type DocVerdict = "approved" | "pending" | "rejected";

/** How many dots a row draws before it stops. The count beside them is exact. */
export const MAX_DOTS = 8;

export interface VerdictCounts {
  pending: number;
  approved: number;
  rejected: number;
}

/**
 * The dots for one row, grouped by verdict.
 *
 * Rejected first, then pending, then approved — the read the design asks for is
 * *"a red dot in the row is the fastest read of 'this one has a problem'"*, and
 * that only works if red is never pushed past `MAX_DOTS` by a pile of green.
 */
export function verdictDots(counts: VerdictCounts | null | undefined): DocVerdict[] {
  if (!counts) return [];
  const dots: DocVerdict[] = [
    ...Array<DocVerdict>(Math.max(0, counts.rejected)).fill("rejected"),
    ...Array<DocVerdict>(Math.max(0, counts.pending)).fill("pending"),
    ...Array<DocVerdict>(Math.max(0, counts.approved)).fill("approved"),
  ];
  return dots.slice(0, MAX_DOTS);
}

/**
 * The second line under a subject's name: their company, then their email.
 *
 * "Natural person" when there is no company — a complete state, not a gap, and
 * the design says so in as many words. `companyName` is `null` (never an empty
 * string) for an owner with no `OwnerCompany` row, so absence is the answer and
 * the line can be drawn on first paint rather than waiting for a second read.
 */
export function subjectSide(
  company: string | null,
  email: string | null,
  naturalPerson: string,
  /** Worker rows have no company concept at all — they get email only. */
  hasCompanyConcept = true,
): string | null {
  const parts = [
    hasCompanyConcept ? (company ?? naturalPerson) : null,
    email,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
