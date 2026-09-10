import type { AgencyLinkSetBy, AgencyLinkStatus } from "@/lib/types/agency.types";

/**
 * The three controls a link can offer an admin.
 *
 * ⚠ **`confirm` and `overrule` are two booleans over ONE endpoint**, and that is
 * the whole reason this type is not a single `canConfirm`. `POST …/confirm`
 * serves two acts and the backend decides which from the current state: on
 * `Proposed`/`WORKER` it agrees with a worker's claim, on `Disputed` it rules
 * **against** a person who said the link was wrong. The guide is explicit that a
 * shared button silently becoming an overrule is the wrong UI, and the overrule
 * is recorded separately in the audit log for the same reason.
 */
export interface LinkVerbs {
  /** Agreeing with a worker's own claim. `reason` optional. */
  confirm: boolean;
  /** THE OVERRULE — ruling against a disputing worker. `reason` required. */
  overrule: boolean;
  /** Always available while the link is live. `reason` always required. */
  reject: boolean;
}

const NONE: LinkVerbs = { confirm: false, overrule: false, reject: false };

/**
 * F-05c §5.3's whole state machine, resolved once.
 *
 * ⚠ **The parameter is structural, not one of the two DTOs**, and deliberately:
 * `AgencyLinkRowDto` (the queue) and `WorkerAgencyLinkDto` (the worker card) are
 * different shapes, and both surfaces must get the **same** answer. Naming
 * either one would force the other to build a fake object to ask the question.
 *
 * ⚠ **An unrecognised value returns `NONE`**, matching `agencyLinkTurn`'s
 * reasoning: offering a verb against a state this build has not met is how a
 * `400` becomes a UI that looks broken. The widened unions exist so `tsc` cannot
 * prune this branch as unreachable.
 */
export function linkActions(
  link: { status: AgencyLinkStatus; setByUserType: AgencyLinkSetBy },
  canManage: boolean,
): LinkVerbs {
  if (!canManage) return NONE;

  switch (link.status) {
    case "Proposed":
      // The mirror rule, as a refusal: whoever asserted the link cannot close it.
      if (link.setByUserType === "WORKER") {
        return { confirm: true, overrule: false, reject: true };
      }
      if (link.setByUserType === "ADMIN") {
        return { confirm: false, overrule: false, reject: true };
      }
      return NONE;

    // ⚠ Never `confirm`. Confirming a dispute IS the overrule, whichever side
    // asserted it — the worker has already had their say.
    case "Disputed":
      return { confirm: false, overrule: true, reject: true };

    case "Confirmed":
      return { confirm: false, overrule: false, reject: true };

    // Terminal. Any move out answers `agency_link_already_resolved`.
    case "Rejected":
      return NONE;

    default:
      return NONE;
  }
}
