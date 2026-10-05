import { describe, expect, it } from "vitest";
import { dayAlert } from "@/lib/tasks/detail/day-alert";
import { AUTO_ACCEPT_MS } from "@/lib/tasks/detail/day-time";
import { at, complaint, day, worker } from "@/lib/tasks/detail/fixtures";

const EARLY = at("2026-10-05T07:00:00");

describe("dayAlert — spec §4.3", () => {
  it("disputed with the complaint loaded", () => {
    const c = complaint({
      photos: [
        { id: "p", url: "u", originalFileName: "a.jpg", fileSize: 1, mimeType: "image/jpeg", uploadedAt: "2026-10-02T13:40:00" },
      ],
    });
    expect(dayAlert(day({ status: "Rejected" }), c, EARLY)).toEqual({
      kind: "complaint",
      tone: "critical",
      reason: c.reason,
      photos: 1,
      raisedAt: at("2026-10-02T13:40:00"),
    });
  });
  it("disputed before the complaint loads", () => {
    expect(dayAlert(day({ status: "Rejected" }), null, EARLY)).toEqual({ kind: "complaintUnloaded", tone: "critical" });
  });
  it("late arrival names each late worker, with the id fallback, and counts minutes", () => {
    const live = day({
      status: "CheckedIn",
      workers: [
        worker({ id: "a", workerName: "Jamshid Tursunov" }),
        worker({ id: "b", workerName: null, workerId: "abcdef0123456" }),
      ],
    });
    expect(dayAlert(live, null, at("2026-10-05T08:34:00"))).toEqual({
      kind: "late",
      tone: "warning",
      names: ["Jamshid Tursunov", "abcdef01"],
      minutes: 34,
    });
  });
  it("checked in with everyone on site has no alert", () => {
    const live = day({ status: "CheckedIn", workers: [worker({ checkinAt: "2026-10-05T08:01:00" })] });
    expect(dayAlert(live, null, at("2026-10-05T09:00:00"))).toBeNull();
  });
  it("pending past start: cancels itself at window end — not in the design", () => {
    expect(dayAlert(day(), null, at("2026-10-05T08:10:00"))).toEqual({
      kind: "startPassed",
      tone: "warning",
      cancelsAt: at("2026-10-05T12:00:00"),
    });
  });
  it("pending with the clock unknown never claims 'start passed'", () => {
    expect(dayAlert(day(), null, 0)?.kind).toBe("noWorkers");
  });
  it("pending staffing: none / short / ready", () => {
    expect(dayAlert(day(), null, EARLY)).toEqual({
      kind: "noWorkers",
      tone: "critical",
      required: 3,
      startsAt: at("2026-10-05T08:00:00"),
    });
    expect(dayAlert(day({ workers: [worker()] }), null, EARLY)).toEqual({
      kind: "understaffed",
      tone: "warning",
      open: 2,
      required: 3,
      startsAt: at("2026-10-05T08:00:00"),
    });
    const full = day({ workers: [worker({ id: "a" }), worker({ id: "b" }), worker({ id: "c" })] });
    expect(dayAlert(full, null, EARLY)).toEqual({ kind: "ready", tone: "positive", required: 3 });
  });
  it("a limit of 0, or one lowered under the assigned count, reads Ready", () => {
    expect(dayAlert(day({ requiredWorkerCount: 0 }), null, EARLY)?.kind).toBe("ready");
    expect(
      dayAlert(day({ requiredWorkerCount: 1, workers: [worker({ id: "a" }), worker({ id: "b" })] }), null, EARLY)?.kind,
    ).toBe("ready");
  });
  it("in review: hand-in and auto-accept times", () => {
    expect(dayAlert(day({ status: "InReview", completedAt: "2026-10-05T11:52:00" }), null, EARLY)).toEqual({
      kind: "waitingOwner",
      tone: "warning",
      handedAt: at("2026-10-05T11:52:00"),
      autoAt: at("2026-10-05T11:52:00") + AUTO_ACCEPT_MS,
    });
  });
  it("done: one alert per closure reason, none for OwnerAccepted", () => {
    const done = (closureReason: string | null) => dayAlert(day({ status: "Done", closureReason }), null, EARLY);
    expect(done("OwnerAccepted")).toBeNull();
    expect(done("AutoAccepted")).toEqual({ kind: "autoAccepted", tone: "neutral" });
    expect(done("ClosedForced")).toEqual({ kind: "forced", tone: "neutral" });
    expect(done(null)).toEqual({ kind: "legacyClosed", tone: "neutral" });
    expect(done("ClosedSomehow")).toEqual({ kind: "unknownReason", tone: "neutral", reason: "ClosedSomehow" });
  });
  it("done · upheld uses the ruling when loaded", () => {
    const t = day({ status: "Done", closureReason: "ClosedReplacement" });
    expect(dayAlert(t, null, EARLY)).toEqual({ kind: "upheld", tone: "critical", note: null, decidedAt: null });
    expect(
      dayAlert(t, complaint({ decisionNote: "Photos confirm wet floor.", decidedAt: "2026-10-02T15:10:00" }), EARLY),
    ).toEqual({
      kind: "upheld",
      tone: "critical",
      note: "Photos confirm wet floor.",
      decidedAt: at("2026-10-02T15:10:00"),
    });
  });
  it("cancelled, and an unknown state", () => {
    expect(dayAlert(day({ status: "Cancelled" }), null, EARLY)).toEqual({ kind: "cancelled", tone: "neutral" });
    expect(dayAlert(day({ status: "Paused" }), null, EARLY)).toBeNull();
  });
});
