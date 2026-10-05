import { describe, expect, it } from "vitest";
import { dayActions, isClosedDay, openSlots, rowActions } from "@/lib/tasks/detail/day-actions";
import { at, day, worker } from "@/lib/tasks/detail/fixtures";

const BEFORE = at("2026-10-05T06:00:00");

describe("dayActions — spec §6 + plan refinements", () => {
  it("pending: Assign only (no supervisor, no force close — design 1a–1c)", () => {
    expect(dayActions(day())).toEqual(["assign"]);
  });
  it("checked in: supervisor, force close, assign", () => {
    expect(dayActions(day({ status: "CheckedIn" }))).toEqual(["supervisor", "forceClose", "assign"]);
  });
  it("in review: supervisor, force close — no Assign (dropped vs the old page)", () => {
    expect(dayActions(day({ status: "InReview" }))).toEqual(["supervisor", "forceClose"]);
  });
  it("disputed: open complaint only", () => {
    expect(dayActions(day({ status: "Rejected" }))).toEqual(["openComplaint"]);
  });
  it("done: rate team only when someone Completed", () => {
    expect(dayActions(day({ status: "Done", workers: [worker({ outcome: "Completed" })] }))).toEqual(["rateTeam"]);
    expect(dayActions(day({ status: "Done", workers: [worker({ outcome: "NoShow" })] }))).toEqual([]);
  });
  it("cancelled and unknown: nothing", () => {
    expect(dayActions(day({ status: "Cancelled" }))).toEqual([]);
    expect(dayActions(day({ status: "Paused" }))).toEqual([]);
  });
});

describe("rowActions", () => {
  it("rate only a Completed worker (task_worker_not_completed otherwise)", () => {
    const done = day({ status: "Done" });
    expect(rowActions(done, worker({ outcome: "Completed" }), BEFORE)).toContain("rate");
    expect(rowActions(done, worker({ outcome: "NoShow" }), BEFORE)).not.toContain("rate");
  });
  it("unassign only an active worker on an open day", () => {
    expect(rowActions(day(), worker(), BEFORE)).toContain("unassign");
    expect(rowActions(day({ status: "CheckedIn" }), worker(), BEFORE)).toContain("unassign");
    expect(rowActions(day({ status: "InReview" }), worker(), BEFORE)).not.toContain("unassign");
    expect(rowActions(day(), worker({ outcome: "Removed" }), BEFORE)).not.toContain("unassign");
  });
  it("change outcome follows outcomeChoices (§0j)", () => {
    expect(rowActions(day({ status: "Done" }), worker({ outcome: "Completed" }), BEFORE)).toContain("outcome");
    expect(rowActions(day({ status: "InReview" }), worker(), BEFORE)).not.toContain("outcome");
  });
});

describe("openSlots", () => {
  it("counts unfilled slots on open days only, never negative", () => {
    expect(openSlots(day({ workers: [worker()] }))).toBe(2);
    expect(openSlots(day({ status: "CheckedIn" }))).toBe(3);
    expect(openSlots(day({ status: "InReview" }))).toBe(0);
    expect(openSlots(day({ requiredWorkerCount: 1, workers: [worker({ id: "a" }), worker({ id: "b" })] }))).toBe(0);
  });
});

describe("isClosedDay", () => {
  it("is done or cancelled", () => {
    expect(isClosedDay(day({ status: "Done" }))).toBe(true);
    expect(isClosedDay(day({ status: "Cancelled" }))).toBe(true);
    expect(isClosedDay(day({ status: "Rejected" }))).toBe(false);
  });
});
