import type { AgencyLinkStatus } from "@/lib/types/agency.types";

/**
 * Does rejecting this link take something away from an agency's portal?
 *
 * ⚠ **Only a `Confirmed` link is visible to a partner company**
 * (`f-05-b-agency-portal.md` §2). `Proposed`, `Disputed` and `Rejected` are all
 * outside the portal already, so rejecting them removes nothing from it — and a
 * warning saying otherwise would be a false claim about another company's
 * access.
 *
 * ⚠ **What makes the `Confirmed` case worth interrupting an admin over is §7,
 * not §2.** The worker leaving the portal is reversible in principle; the
 * *history window* is not. Re-creating the link restarts it from the new date
 * and the earlier work is gone from the agency's view — "not recoverable from
 * your side". So reject-then-re-attach is not an undo, and the copy this gates
 * must not let anyone believe it is.
 *
 * ⚠ Structural parameter, one field. The queue row (`AgencyLinkRowDto`) and the
 * worker card (`WorkerAgencyLinkDto`) are different shapes; typing this to
 * either would keep one of the two surfaces from reading it, which is precisely
 * the defect that had to be corrected on `agencyLinkTurn`.
 */
export function portalLossOnReject(
  link: { status: AgencyLinkStatus } | null | undefined,
): boolean {
  return link?.status === "Confirmed";
}
