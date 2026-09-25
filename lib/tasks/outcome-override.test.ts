import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import {
  outcomeChoices,
  outcomeErrorKey,
} from "@/lib/tasks/outcome-override";

const NOW = new Date("2026-09-26T12:00:00Z").getTime();
const LATER = "2026-09-26T15:00:00Z";
const EARLIER = "2026-09-26T09:00:00Z";

function day(status: string, scheduledAt = LATER) {
  return { status, scheduledAt };
}

describe("outcomeChoices", () => {
  it("offers all three results on a Done day, minus the one already held", () => {
    expect(outcomeChoices(day("Done", EARLIER), "Completed", NOW)).toEqual([
      "NoShow",
      "Removed",
    ]);
    expect(outcomeChoices(day("Done", EARLIER), "Pending", NOW)).toEqual([
      "Completed",
      "NoShow",
      "Removed",
    ]);
  });

  it("offers only Removed on a Pending day that has not started", () => {
    expect(outcomeChoices(day("Pending"), "Pending", NOW)).toEqual(["Removed"]);
  });

  it("offers nothing to a worker already removed from a not-started day", () => {
    expect(outcomeChoices(day("Pending"), "Removed", NOW)).toEqual([]);
  });

  it("offers nothing on a Pending day whose start has come", () => {
    expect(outcomeChoices(day("Pending", EARLIER), "Pending", NOW)).toEqual([]);
    const exactly = new Date(LATER).getTime();
    expect(outcomeChoices(day("Pending"), "Pending", exactly)).toEqual([]);
  });

  it("offers nothing while the day is open, in review, disputed or cancelled", () => {
    for (const status of ["CheckedIn", "InReview", "Rejected", "Cancelled"]) {
      expect(outcomeChoices(day(status), "Pending", NOW)).toEqual([]);
    }
  });

  it("offers nothing on a state word it does not know", () => {
    expect(outcomeChoices(day("Paused"), "Pending", NOW)).toEqual([]);
  });

  it("offers nothing on a Pending day before the clock is known", () => {
    expect(outcomeChoices(day("Pending"), "Pending", 0)).toEqual([]);
  });

  it("does not need the clock on a Done day", () => {
    expect(outcomeChoices(day("Done", EARLIER), "NoShow", 0)).toEqual([
      "Completed",
      "Removed",
    ]);
  });

  it("offers nothing on a Pending day with an unparseable start", () => {
    expect(outcomeChoices(day("Pending", "not-a-date"), "Pending", NOW)).toEqual([]);
  });

  it("reads the current outcome case-insensitively", () => {
    expect(outcomeChoices(day("Done", EARLIER), "noshow", NOW)).toEqual([
      "Completed",
      "Removed",
    ]);
  });
});

function apiError(status: number, data: unknown): AxiosError {
  const err = new AxiosError("failed");
  // @ts-expect-error — a minimal response is all the reader touches.
  err.response = { status, data };
  return err;
}

describe("outcomeErrorKey", () => {
  it.each([
    "outcome_target_not_allowed",
    "outcome_not_overridable",
    "decide_the_complaint_first",
    "complaint_already_decided",
    "cannot_override_to_pending",
    "task_worker_not_found",
  ])("names %s by its own key", (code) => {
    expect(outcomeErrorKey(apiError(400, { error: code }))).toBe(code);
  });

  it("reads an empty-bodied 403 as a permission refusal", () => {
    expect(outcomeErrorKey(apiError(403, ""))).toBe("forbidden");
  });

  it("returns null for anything it does not name", () => {
    expect(outcomeErrorKey(apiError(400, { error: "something_new" }))).toBeNull();
    expect(outcomeErrorKey(new Error("network"))).toBeNull();
  });
});
