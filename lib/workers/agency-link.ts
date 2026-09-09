import type { AgencyLinkSetBy, AgencyLinkStatus } from "@/lib/types/agency.types";

/**
 * Whose desk a worker↔agency link is sitting on.
 *
 * `settled` covers three genuinely different situations — the link is agreed, the
 * link is dead, or this build does not recognise its state — because they share
 * the only property the caller needs: **there is nothing for an admin to press.**
 */
export type AgencyLinkTurn = "admin" | "worker" | "settled";

/**
 * The mirror rule, resolved once: *whoever did not assert the link is the one who
 * has to agree to it* (`f-05-c-worker-agency-link.md` §2).
 *
 * ⚠ **`status` alone cannot answer this.** Two rows both reading `Proposed` mean
 * opposite things — one is an admin's decision, the other is the worker's — and
 * `setByUserType` is the field that separates them. Every surface that renders a
 * link has to make that legible, so the rule lives here rather than in a component:
 * the links table's dispute queue reads the same answer as the worker's detail card.
 *
 * ⚠ **Unknown values fall to `settled`, deliberately.** Claiming an unrecognised
 * state is *waiting on an admin* invents work nobody can act on; the card prints the
 * raw `status` regardless, so calling it settled hides nothing. This is the default
 * branch `guidance.md` §6 requires — the widened `AgencyLinkStatus` /
 * `AgencyLinkSetBy` unions exist so `tsc` cannot prune it.
 *
 * ⚠ **The parameter is structural, not `WorkerAgencyLinkDto`**, and it has to be:
 * the two surfaces that ask this question carry different shapes. The worker card
 * holds a `WorkerAgencyLinkDto`; the links queue holds an `AgencyLinkRowDto`,
 * which has **no `disputeNote`** because the wire sends none. Naming either DTO
 * would force the other to build a fake object to ask — and then one of the two
 * screens would grow its own copy of the mirror rule, which is precisely what
 * this function exists to prevent.
 */
export function agencyLinkTurn(
  link:
    | { status: AgencyLinkStatus; setByUserType: AgencyLinkSetBy }
    | null
    | undefined,
): AgencyLinkTurn {
  if (!link) return "settled";

  // A dispute waits on an admin whichever side asserted the link: the worker has
  // already had their say, and only an admin can reject it or overrule them.
  if (link.status === "Disputed") return "admin";

  if (link.status === "Proposed") {
    if (link.setByUserType === "WORKER") return "admin";
    if (link.setByUserType === "ADMIN") return "worker";
    return "settled";
  }

  // `Confirmed`, `Rejected`, and anything this build has not met.
  return "settled";
}
