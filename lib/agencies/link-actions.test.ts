import { describe, expect, it } from "vitest";
import { linkActions } from "@/lib/agencies/link-actions";
import type { AgencyLinkSetBy, AgencyLinkStatus } from "@/lib/types/agency.types";

function link(status: AgencyLinkStatus, setByUserType: AgencyLinkSetBy) {
  return { status, setByUserType };
}

const NONE = { confirm: false, overrule: false, reject: false };

describe("linkActions", () => {
  /**
   * ⚠ A MODERATOR holds `agency_link:read_any` and **no** write grant
   * (`DatabaseSeeder.cs:1954`), so the queue must render completely with no verb
   * anywhere. This is the case a permission-blind build gets wrong.
   */
  it("offers nothing at all without the manage grant", () => {
    for (const status of [
      "Proposed",
      "Disputed",
      "Confirmed",
      "Rejected",
    ] as const) {
      for (const by of ["WORKER", "ADMIN"] as const) {
        expect(linkActions(link(status, by), false)).toEqual(NONE);
      }
    }
  });

  it("offers confirm and reject on a worker's own claim", () => {
    expect(linkActions(link("Proposed", "WORKER"), true)).toEqual({
      confirm: true,
      overrule: false,
      reject: true,
    });
  });

  /**
   * ⚠ **The dead-button case.** An admin cannot confirm a link an admin created —
   * `400 agency_link_not_awaiting_you`. That row waits on the worker, and a
   * confirm here would imply an admin can approve their own assertion.
   */
  it("offers only reject on an admin's own proposal", () => {
    expect(linkActions(link("Proposed", "ADMIN"), true)).toEqual({
      confirm: false,
      overrule: false,
      reject: true,
    });
  });

  /**
   * ⚠ **A dispute is never a plain confirm.** Confirming a `Disputed` link IS
   * the overrule, whichever side asserted it, and it is a different control with
   * a different consequence — so the flag is different too.
   */
  it("turns confirm into the overrule on a dispute, from either side", () => {
    for (const by of ["WORKER", "ADMIN"] as const) {
      expect(linkActions(link("Disputed", by), true)).toEqual({
        confirm: false,
        overrule: true,
        reject: true,
      });
    }
  });

  /** `reject` reaches `Rejected` from `Confirmed` too — it is the only door. */
  it("still offers reject on a confirmed link", () => {
    expect(linkActions(link("Confirmed", "WORKER"), true)).toEqual({
      confirm: false,
      overrule: false,
      reject: true,
    });
  });

  it("offers nothing on a rejected link, which is terminal", () => {
    expect(linkActions(link("Rejected", "ADMIN"), true)).toEqual(NONE);
  });

  /**
   * ⚠ The default branch `guidance.md` §6 requires. Offering a verb against a
   * state this build does not understand is how a `400` becomes a UI that looks
   * broken — and the widened unions are what keep `tsc` from pruning this.
   */
  it("offers nothing against a status it does not recognise", () => {
    expect(
      linkActions(link("Withdrawn" as AgencyLinkStatus, "WORKER"), true),
    ).toEqual(NONE);
  });

  it("offers nothing against a setByUserType it does not recognise", () => {
    expect(linkActions(link("Proposed", "AGENCY" as AgencyLinkSetBy), true)).toEqual(
      NONE,
    );
  });
});
