import { describe, expect, it } from "vitest";
import { adminNoteLabelKey, canOfferRevoke } from "@/lib/skill-requests/display";

describe("adminNoteLabelKey", () => {
  /**
   * `adminNote` is one field with two meanings: the admin's question while
   * InfoRequested, and the rejection reason once Rejected (reject overwrites the
   * same column). A single generic label is wrong in both states.
   */
  it("calls it a question while the worker is being asked", () => {
    expect(adminNoteLabelKey("InfoRequested")).toBe("adminQuestion");
  });

  it("calls it the rejection reason once rejected", () => {
    expect(adminNoteLabelKey("Rejected")).toBe("rejectionReason");
  });

  /** Nothing sensible to call it in the other states, so it is not labelled. */
  it("has no label for the states where the field carries neither", () => {
    expect(adminNoteLabelKey("Pending")).toBeNull();
    expect(adminNoteLabelKey("Approved")).toBeNull();
    expect(adminNoteLabelKey("Revoked")).toBeNull();
  });
});

describe("canOfferRevoke", () => {
  const APPROVED = {
    status: "Approved" as const,
    professionCode: "WINDOW_CLEANING",
    heldSkillCount: 2,
  };

  it("offers revoke on an approved request", () => {
    expect(canOfferRevoke(APPROVED)).toBe(true);
  });

  /** Revoke acts from `Approved` only — every other state is a 400. */
  it("never offers revoke from any other status", () => {
    for (const status of [
      "Pending",
      "InfoRequested",
      "Rejected",
      "Revoked",
    ] as const) {
      expect(canOfferRevoke({ ...APPROVED, status })).toBe(false);
    }
  });

  /**
   * `cannot_revoke_general` — GENERAL is the protected default every worker is
   * registered with, so the control is hidden rather than allowed to fail. Keyed on
   * `code`, never on a display name, because the name is admin-editable.
   */
  it("never offers revoke on the protected default skill", () => {
    expect(canOfferRevoke({ ...APPROVED, professionCode: "GENERAL" })).toBe(false);
  });

  /** `cannot_revoke_last_skill` — a worker with no skills could join nothing. */
  it("never offers revoke when it is the worker's only skill", () => {
    expect(canOfferRevoke({ ...APPROVED, heldSkillCount: 1 })).toBe(false);
    expect(canOfferRevoke({ ...APPROVED, heldSkillCount: 0 })).toBe(false);
  });
});
