import { describe, expect, it } from "vitest";
import { saveDraftBlocker, sendBlocker } from "@/lib/contracts/authoring-gate";

describe("saveDraftBlocker", () => {
  it("blocks on the account, not the form, when authoring is illegal", () => {
    // The blocker the admin can act on is the account one — reporting the empty
    // period to someone who cannot author at all sends them to the wrong problem.
    expect(saveDraftBlocker(false, "", "")).toBe("locked");
    expect(saveDraftBlocker(false, "2026-09-01", "2027-09-01")).toBe("locked");
  });

  it("names the empty period — the state every newly approved owner starts in", () => {
    expect(saveDraftBlocker(true, "", "")).toBe("periodMissing");
    expect(saveDraftBlocker(true, "2026-09-01", "")).toBe("periodMissing");
    expect(saveDraftBlocker(true, "", "2027-09-01")).toBe("periodMissing");
  });

  it("tells a backwards period apart from a missing one", () => {
    expect(saveDraftBlocker(true, "2027-09-01", "2026-09-01")).toBe("periodBackwards");
  });

  it("allows a same-day period", () => {
    // `toUtcIso(to, true)` ends the day at 23:59:59, so from === to is a real
    // 24h period on the wire, not an empty one. The old strict `from < to`
    // killed Save draft for it with no explanation.
    expect(saveDraftBlocker(true, "2026-09-01", "2026-09-01")).toBeNull();
  });

  it("allows an ordinary period", () => {
    expect(saveDraftBlocker(true, "2026-09-01", "2027-09-01")).toBeNull();
  });
});

describe("sendBlocker", () => {
  it("blocks on the account first", () => {
    expect(sendBlocker(false, "Draft")).toBe("locked");
  });

  it("asks for a draft when nothing has been saved yet", () => {
    expect(sendBlocker(true, null)).toBe("needsDraft");
  });

  it("asks for a draft when the newest contract has already ended", () => {
    // These phases fall through to the authoring form (they are neither Sent nor
    // live), where saving writes a *new* contract — so the way forward is the
    // same sentence as having no contract at all.
    expect(sendBlocker(true, "Expired")).toBe("needsDraft");
    expect(sendBlocker(true, "Lapsed")).toBe("needsDraft");
    expect(sendBlocker(true, "Terminated")).toBe("needsDraft");
  });

  it("allows sending a saved draft", () => {
    expect(sendBlocker(true, "Draft")).toBeNull();
  });
});
