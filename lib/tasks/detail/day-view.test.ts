import { describe, expect, it } from "vitest";
import {
  closureLabel,
  dayNote,
  dayStaffing,
  daySteps,
  dayTone,
  supervisorLabel,
} from "@/lib/tasks/detail/day-view";
import { AUTO_ACCEPT_MS } from "@/lib/tasks/detail/day-time";
import { at, day, worker } from "@/lib/tasks/detail/fixtures";

const NOW = at("2026-10-05T07:00:00");

describe("dayTone", () => {
  it("reads every state through canonicalTaskStatus", () => {
    expect(dayTone(day({ status: "Active" }))).toBe("checkedIn");
    expect(dayTone(day({ status: "Rejected" }))).toBe("rejected");
  });
  it("is unknown for a word the panel does not know", () => {
    expect(dayTone(day({ status: "Paused" }))).toBe("unknown");
  });
});

describe("dayNote — spec §4.1", () => {
  it("pending with nobody: unfilled, danger", () => {
    expect(dayNote(day(), NOW)).toEqual({ key: "unfilled", count: 3, tone: "danger" });
  });
  it("pending short: unfilled, warning", () => {
    expect(dayNote(day({ workers: [worker()] }), NOW)).toEqual({ key: "unfilled", count: 2, tone: "warning" });
  });
  it("pending full: fully staffed", () => {
    const full = day({ workers: [worker({ id: "a" }), worker({ id: "b" }), worker({ id: "c" })] });
    expect(dayNote(full, NOW).key).toBe("fullyStaffed");
  });
  it("pending past start: start passed, before staffing", () => {
    expect(dayNote(day(), at("2026-10-05T08:30:00"))).toEqual({ key: "startPassed", tone: "warning" });
  });
  it("checked in with a late worker", () => {
    const live = day({ status: "CheckedIn", workers: [worker({ checkinAt: null })] });
    expect(dayNote(live, at("2026-10-05T08:30:00"))).toEqual({ key: "late", count: 1, tone: "warning" });
  });
  it("checked in, all on site", () => {
    const live = day({ status: "CheckedIn", startedAt: "2026-10-05T08:02:00", workers: [worker({ checkinAt: "2026-10-05T08:02:00" })] });
    expect(dayNote(live, at("2026-10-05T08:30:00"))).toEqual({ key: "onSite", at: at("2026-10-05T08:02:00"), tone: "muted" });
  });
  it("in review, disputed, cancelled", () => {
    expect(dayNote(day({ status: "InReview" }), NOW).key).toBe("waitingOwner");
    expect(dayNote(day({ status: "Rejected" }), NOW)).toEqual({ key: "disputed", tone: "danger" });
    expect(dayNote(day({ status: "Cancelled" }), NOW).key).toBe("cancelled");
  });
  it("done carries the reason, and a null reason is never 'accepted'", () => {
    expect(dayNote(day({ status: "Done", closureReason: "AutoAccepted" }), NOW)).toEqual({ key: "closure", reason: "AutoAccepted", tone: "muted" });
    expect(dayNote(day({ status: "Done", closureReason: null }), NOW).key).toBe("noReason");
  });
  it("unknown state: none", () => {
    expect(dayNote(day({ status: "Paused" }), NOW).key).toBe("none");
  });
});

describe("dayStaffing", () => {
  it("is null on a cancelled day", () => {
    expect(dayStaffing(day({ status: "Cancelled" }))).toBeNull();
  });
  it("tones 0 danger and short warning on an open day", () => {
    expect(dayStaffing(day())).toEqual({ filled: 0, required: 3, tone: "danger" });
    expect(dayStaffing(day({ workers: [worker()] }))?.tone).toBe("warning");
  });
  it("a limit of 0 with nobody on it is muted, not danger (it reads Ready)", () => {
    expect(dayStaffing(day({ requiredWorkerCount: 0 }))?.tone).toBe("muted");
  });
  it("stays muted on a closed day whatever the count", () => {
    expect(dayStaffing(day({ status: "Done" }))?.tone).toBe("muted");
  });
});

describe("closureLabel", () => {
  it("names the four known reasons, prints an unknown one verbatim, and calls null 'closed'", () => {
    expect(closureLabel("ClosedForced")).toEqual({ key: "ClosedForced" });
    expect(closureLabel("ClosedSomehow")).toEqual({ raw: "ClosedSomehow" });
    expect(closureLabel(null)).toEqual({ key: "closed" });
  });
});

describe("daySteps — spec §4.2", () => {
  const states = (task: Parameters<typeof daySteps>[0]) => daySteps(task).map((s) => s.state);

  it("always has four steps", () => {
    expect(daySteps(day({ status: "Paused" }))).toHaveLength(4);
  });
  it("pending / checked in / in review", () => {
    expect(states(day())).toEqual(["current", "todo", "todo", "todo"]);
    expect(states(day({ status: "CheckedIn" }))).toEqual(["ok", "current", "todo", "todo"]);
    expect(states(day({ status: "InReview" }))).toEqual(["ok", "ok", "current", "todo"]);
  });
  it("in review shows the auto-accept time on step 4", () => {
    const s = daySteps(day({ status: "InReview", completedAt: "2026-10-05T11:52:00" }));
    expect(s[3].time).toEqual({ kind: "auto", at: at("2026-10-05T11:52:00") + AUTO_ACCEPT_MS });
  });
  it("disputed", () => {
    const s = daySteps(day({ status: "Rejected" }));
    expect(s.map((x) => x.state)).toEqual(["ok", "ok", "bad", "badOpen"]);
    expect(s[2].label).toEqual({ key: "handedInDisputed" });
    expect(s[3].label).toEqual({ key: "awaitingRuling" });
  });
  it("done with no hand-in (force-closed) skips step 3", () => {
    const s = daySteps(day({ status: "Done", closureReason: "ClosedForced", completedAt: null }));
    expect(s.map((x) => x.state)).toEqual(["ok", "ok", "skip", "ok"]);
    expect(s[2].time).toEqual({ kind: "skipped" });
    expect(s[3].time).toEqual({ kind: "none" });
    expect(s[3].label).toEqual({ key: "ClosedForced" });
  });
  it("done: step 4 is the server's closedAt on every road (§0k·1)", () => {
    for (const closureReason of ["AutoAccepted", "ClosedReplacement", "ClosedForced", "OwnerAccepted"]) {
      const s = daySteps(
        day({ status: "Done", closureReason, completedAt: "2026-09-30T11:40:00", closedAt: "2026-09-30T16:41:00" }),
      );
      expect(s[3].time).toEqual({ kind: "at", at: at("2026-09-30T16:41:00") });
    }
  });
  it("done · owner-accepted before 2026-10-06 has closedAt null → no time, never an estimate", () => {
    const s = daySteps(day({ status: "Done", closureReason: "OwnerAccepted", completedAt: "2026-09-29T11:48:00", closedAt: null }));
    expect(s[3].time).toEqual({ kind: "none" });
  });
  it("done · auto-accepted with no closedAt is not estimated from the hand-in", () => {
    const s = daySteps(day({ status: "Done", closureReason: "AutoAccepted", completedAt: "2026-09-30T11:40:00" }));
    expect(s[3].time).toEqual({ kind: "none" });
  });
  it("cancelled before start", () => {
    const s = daySteps(day({ status: "Cancelled" }));
    expect(s.map((x) => x.state)).toEqual(["ok", "cancel", "off", "off"]);
    expect(s[1].time).toEqual({ kind: "beforeStart" });
  });
  it("cancelled: step 2 carries cancelledAt when the server has it", () => {
    const s = daySteps(day({ status: "Cancelled", cancelledAt: "2026-10-03T09:12:00" }));
    expect(s[1].time).toEqual({ kind: "at", at: at("2026-10-03T09:12:00") });
  });
});

describe("supervisorLabel — spec §4.4", () => {
  const sup = worker({ workerId: "sup-123456789", workerName: "  " });
  it("uses workerLabel, so a blank name falls back to the id", () => {
    expect(supervisorLabel(day({ status: "CheckedIn", supervisorWorkerId: "sup-123456789", workers: [sup] }))).toEqual({
      kind: "name",
      text: "sup-1234",
    });
  });
  it("a supervisor no longer in workers still shows an id, never 'not yet'", () => {
    expect(supervisorLabel(day({ status: "CheckedIn", supervisorWorkerId: "gone-987654321", workers: [] }))).toEqual({
      kind: "name",
      text: "gone-987",
    });
  });
  it("no supervisor: not yet on open days, a dash when cancelled, none otherwise", () => {
    expect(supervisorLabel(day())).toEqual({ kind: "notYet" });
    expect(supervisorLabel(day({ status: "Cancelled" }))).toEqual({ kind: "dash" });
    expect(supervisorLabel(day({ status: "Done" }))).toEqual({ kind: "none" });
  });
});
