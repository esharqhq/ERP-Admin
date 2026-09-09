import { describe, expect, it } from "vitest";
import { portalLossOnReject } from "@/lib/agencies/portal-impact";
import type { AgencyLinkStatus } from "@/lib/types/agency.types";

/**
 * ⚠ This predicate exists to stop the reject dialog from telling an admin
 * something false. Rejecting is legal from three states, and only **one** of
 * them is visible in the agency's portal (`f-05-b-agency-portal.md` §2), so a
 * warning shown on all three would claim an admin is cutting off access the
 * company never had. That is worse than silence: it makes a routine cleanup of
 * a bogus `Proposed` claim feel like severing a partnership.
 */
describe("portalLossOnReject", () => {
  it("warns on a Confirmed link — the only state a portal can see", () => {
    expect(portalLossOnReject({ status: "Confirmed" })).toBe(true);
  });

  /**
   * A worker's unagreed claim was never in the portal — §2 is explicit that
   * `Proposed` is not visible, and the agency is never even told such a claim
   * exists. Nothing leaves, so nothing is warned about.
   */
  it("does not warn on Proposed — the agency never saw this worker", () => {
    expect(portalLossOnReject({ status: "Proposed" })).toBe(false);
  });

  /**
   * ⚠ `Disputed` is the subtle one. The worker is objecting, which *feels* like
   * the most consequential reject on the screen — but a disputed link is
   * already outside the portal (§2), so the rejection takes nothing further
   * away. The reject dialog stays quiet; the weight of this act belongs to the
   * overrule's second step, not here.
   */
  it("does not warn on Disputed — already outside the portal", () => {
    expect(portalLossOnReject({ status: "Disputed" })).toBe(false);
  });

  it("does not warn on an already-rejected link", () => {
    expect(portalLossOnReject({ status: "Rejected" })).toBe(false);
  });

  /**
   * The wire enum grows without warning. An unrecognised state must not put
   * words in a dialog about consequences we cannot know.
   */
  it("does not warn on a state this app does not know", () => {
    expect(
      portalLossOnReject({ status: "SomethingNew" as AgencyLinkStatus }),
    ).toBe(false);
  });

  it("handles an absent link", () => {
    expect(portalLossOnReject(null)).toBe(false);
    expect(portalLossOnReject(undefined)).toBe(false);
  });
});
