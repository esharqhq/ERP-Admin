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
    expect(done("AutoAccepted")).toEqual({ kind: "autoAccepted", tone: "neutral", at: null });
    expect(done(null)).toEqual({ kind: "legacyClosed", tone: "neutral" });
    expect(done("ClosedSomehow")).toEqual({ kind: "unknownReason", tone: "neutral", reason: "ClosedSomehow" });
  });
  it("closed by an admin: their words, their name and the time (§0k·1)", () => {
    const t = day({
      status: "Done",
      closureReason: "ClosedForced",
      closureNote: "Supervisor's phone died",
      closedByAdminName: "D. Krüger",
      closedAt: "2026-10-01T13:05:00",
    });
    expect(dayAlert(t, null, EARLY)).toEqual({
      kind: "forced",
      tone: "neutral",
      note: "Supervisor's phone died",
      by: "D. Krüger",
      at: at("2026-10-01T13:05:00"),
    });
  });
  it("an old ClosedForced row with nothing recorded still reads as forced, all nulls", () => {
    expect(dayAlert(day({ status: "Done", closureReason: "ClosedForced", closureNote: "  " }), null, EARLY)).toEqual({
      kind: "forced",
      tone: "neutral",
      note: null,
      by: null,
      at: null,
    });
  });
  it("auto-accepted carries the server's closedAt", () => {
    const t = day({ status: "Done", closureReason: "AutoAccepted", closedAt: "2026-09-30T16:41:00" });
    expect(dayAlert(t, null, EARLY)).toEqual({ kind: "autoAccepted", tone: "neutral", at: at("2026-09-30T16:41:00") });
  });
  it("upheld reads the server's note first, the complaint only as a fallback", () => {
    const t = day({
      status: "Done",
      closureReason: "ClosedReplacement",
      closureNote: "Photos confirm it",
      closedByAdminName: "A. Admin",
      closedAt: "2026-10-02T15:10:00",
    });
    expect(dayAlert(t, complaint({ decisionNote: "older text" }), EARLY)).toEqual({
      kind: "upheld",
      tone: "critical",
      note: "Photos confirm it",
      by: "A. Admin",
      at: at("2026-10-02T15:10:00"),
    });
    const old = day({ status: "Done", closureReason: "ClosedReplacement" });
    expect(dayAlert(old, complaint({ decisionNote: "older text", decidedAt: "2026-10-02T15:10:00" }), EARLY)).toEqual({
      kind: "upheld",
      tone: "critical",
      note: "older text",
      by: null,
      at: at("2026-10-02T15:10:00"),
    });
    expect(dayAlert(old, null, EARLY)).toEqual({ kind: "upheld", tone: "critical", note: null, by: null, at: null });
  });
  it("cancelled says how and when; an unknown road is generic (§0k·2)", () => {
    const c = (cancellationReason: string | null) =>
      dayAlert(day({ status: "Cancelled", cancellationReason, cancelledAt: "2026-10-03T09:00:00" }), null, EARLY);
    expect(c("BookingCancelled")).toEqual({ kind: "cancelled", tone: "neutral", how: "booking", at: at("2026-10-03T09:00:00") });
    expect(c("AutoCancelled")).toMatchObject({ how: "auto" });
    expect(c("DayCancelled")).toMatchObject({ how: "day" });
    expect(c("SomethingNew")).toMatchObject({ how: null });
    expect(dayAlert(day({ status: "Cancelled" }), null, EARLY)).toEqual({ kind: "cancelled", tone: "neutral", how: null, at: null });
  });
  it("an unknown state has no alert", () => {
    expect(dayAlert(day({ status: "Paused" }), null, EARLY)).toBeNull();
  });
});
