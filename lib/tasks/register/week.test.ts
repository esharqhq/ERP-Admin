import { describe, expect, it } from "vitest";
import {
  buildCalendarDays, calendarBandPatch, calendarWeek, calendarWindow, cardTone, inCalendarWindow, registerView,
  toListPatch, weekPatch,
} from "@/lib/tasks/register/week";
import { weekOf } from "@/lib/ui/week";
import type { RegisterRow } from "@/lib/tasks/register/rows";

const r = (over: Partial<RegisterRow>) => ({ dayKey: "2026-09-21", startMs: 1, status: "Open", assignable: false,
  open: true, staffing: { filled: 1, required: 1, gap: 0, covered: true }, ...over }) as RegisterRow;

describe("buildCalendarDays", () => {
  const week = weekOf("2026-09-21", "2026-09-23");
  it("lays seven days, today flagged, rows sorted by start", () => {
    const days = buildCalendarDays([r({ startMs: 9 }), r({ startMs: 3 }), r({ dayKey: "2026-09-23" })], week, "2026-09-23");
    expect(days).toHaveLength(7);
    expect(days[0].rows.map((x) => x.startMs)).toEqual([3, 9]);
    expect(days[2].isToday).toBe(true);
    expect(days[2].count).toBe(1);
  });
  it("sums the shortfall of the open days only", () => {
    const days = buildCalendarDays([
      r({ assignable: true, staffing: { filled: 0, required: 2, gap: 2, covered: false } }),
      r({ assignable: false, status: "Cancelled", staffing: { filled: 0, required: 3, gap: 3, covered: false } }),
    ], week, "2026-09-23");
    expect(days[0].short).toBe(2);
  });
  it("drops rows outside the week", () => {
    expect(buildCalendarDays([r({ dayKey: "2026-09-30" })], week, "2026-09-23").every((d) => d.count === 0)).toBe(true);
  });
});

describe("cardTone", () => {
  it("maps the statuses to the design's card tints", () => {
    expect(cardTone(r({ status: "Running" }))).toBe("running");
    expect(cardTone(r({ status: "Unstaffed" }))).toBe("unstaffed");
    expect(cardTone(r({ status: "Done" }))).toBe("closed");
    expect(cardTone(r({ status: "Cancelled" }))).toBe("closed");
    expect(cardTone(r({ status: "Disputed" }))).toBe("review");
  });
});

const TODAY = "2026-09-27"; // a Sunday

describe("registerView", () => {
  it("is the calendar only when the URL says so", () => {
    expect(registerView({ view: "calendar" })).toBe("calendar");
    expect(registerView({})).toBe("list");
    expect(registerView({ view: "matrix" })).toBe("list");
  });
});

describe("calendarWeek", () => {
  it("is this week when nothing names one", () => {
    expect(calendarWeek({}, TODAY).startKey).toBe("2026-09-21");
  });
  it("follows the week param, else the band's first day", () => {
    expect(calendarWeek({ week: "2026-10-05" }, TODAY).startKey).toBe("2026-10-05");
    expect(calendarWeek({ from: "2026-10-08", to: "2026-10-20" }, TODAY).startKey).toBe("2026-10-05");
    expect(calendarWeek({ week: "2026-10-12", from: "2026-10-08" }, TODAY).startKey).toBe("2026-10-12");
  });
  it("falls back to the band's last day when only that is set", () => {
    expect(calendarWeek({ to: "2026-10-14" }, TODAY).startKey).toBe("2026-10-12");
  });
  it("snaps a hand-edited mid-week key to its Monday", () => {
    expect(calendarWeek({ week: "2026-10-07" }, TODAY).startKey).toBe("2026-10-05");
  });
});

describe("weekPatch", () => {
  it("moves the week and drops a band range it would contradict", () => {
    expect(weekPatch("2026-10-05")).toEqual({ week: "2026-10-05", from: "", to: "" });
  });
});

describe("calendarBandPatch", () => {
  it("lets a band date write take over from the week pager", () => {
    expect(calendarBandPatch({ from: "2026-10-01" })).toEqual({ from: "2026-10-01", week: "" });
    expect(calendarBandPatch({ from: "", to: "" })).toEqual({ from: "", to: "", week: "" });
  });
  it("leaves every other filter write alone", () => {
    expect(calendarBandPatch({ status: "Open" })).toEqual({ status: "Open" });
  });
});

describe("toListPatch", () => {
  it("hands the paged-to week's drawn days to the list as its date range", () => {
    const win = { from: "2026-10-05", to: "2026-10-11" };
    expect(toListPatch({ view: "calendar", week: "2026-10-05" }, win)).toEqual({
      view: "", week: "", from: "2026-10-05", to: "2026-10-11",
    });
  });
  it("writes the calendar's window, not the bare week — the same set comes back", () => {
    // next7 from Wed 30.09, paged › to Mon 05.10: the calendar drew 05.10–06.10.
    const win = { from: "2026-10-05", to: "2026-10-06" };
    expect(toListPatch({ view: "calendar", week: "2026-10-05" }, win)).toEqual({
      view: "", week: "", from: "2026-10-05", to: "2026-10-06",
    });
  });
  it("leaves the list's own window alone when no week was paged to", () => {
    const win = { from: "2026-10-05", to: "2026-10-11" };
    expect(toListPatch({ view: "calendar", from: "2026-10-08" }, win)).toEqual({ view: "", week: "" });
    expect(toListPatch({ view: "calendar" }, win)).toEqual({ view: "", week: "" });
  });
  it("writes no dates when the paged-to week drew nothing", () => {
    expect(toListPatch({ view: "calendar", week: "2026-10-12" }, null)).toEqual({ view: "", week: "" });
  });
  it("ignores a malformed week instead of writing NaN keys", () => {
    const win = { from: "2026-09-21", to: "2026-09-27" };
    expect(toListPatch({ view: "calendar", week: "05.10.2026" }, win)).toEqual({ view: "", week: "" });
    expect(toListPatch({ view: "calendar", week: "garbage" }, win)).toEqual({ view: "", week: "" });
  });
});

describe("calendarWindow", () => {
  const week = weekOf("2026-10-05", TODAY); // Mon 05.10 – Sun 11.10
  it("is the whole week with no band dates", () => {
    expect(calendarWindow({}, week)).toEqual({ from: "2026-10-05", to: "2026-10-11" });
  });
  it("intersects the week with the band's range — the band still narrows", () => {
    expect(calendarWindow({ from: "2026-10-08", to: "2026-10-20" }, week)).toEqual({ from: "2026-10-08", to: "2026-10-11" });
    expect(calendarWindow({ from: "2026-10-08" }, week)).toEqual({ from: "2026-10-08", to: "2026-10-11" });
  });
  it("honours a to-only band", () => {
    expect(calendarWindow({ to: "2026-10-07" }, week)).toEqual({ from: "2026-10-05", to: "2026-10-07" });
  });
  it("is empty when the band lies wholly outside the week", () => {
    expect(calendarWindow({ from: "2026-10-20", to: "2026-10-25" }, week)).toBeNull();
    expect(calendarWindow({ to: "2026-10-01" }, week)).toBeNull();
  });
  it("ignores a malformed bound", () => {
    expect(calendarWindow({ from: "08.10.2026" }, week)).toEqual({ from: "2026-10-05", to: "2026-10-11" });
  });
});

describe("calendarWindow with the tab's own span", () => {
  // Wed 30.09: next7 / short is 30.09–06.10, which crosses into the next week.
  const span = { from: "2026-09-30", to: "2026-10-06" };
  it("intersects the current week with the tab's days — the list's set, this week's part", () => {
    const current = weekOf("2026-09-30", "2026-09-30"); // Mon 28.09 – Sun 04.10
    expect(calendarWindow({}, current, span)).toEqual({ from: "2026-09-30", to: "2026-10-04" });
  });
  it("draws the rest of the tab's days on the next week", () => {
    const next = weekOf("2026-10-05", "2026-09-30");
    expect(calendarWindow({}, next, span)).toEqual({ from: "2026-10-05", to: "2026-10-06" });
  });
  it("is empty on a week the tab's days never reach", () => {
    expect(calendarWindow({}, weekOf("2026-10-12", "2026-09-30"), span)).toBeNull();
    expect(calendarWindow({}, weekOf("2026-09-21", "2026-09-30"), span)).toBeNull();
  });
  it("is the whole week when the tab has no span (this week: the pager is its range)", () => {
    expect(calendarWindow({}, weekOf("2026-10-12", "2026-09-30"), null)).toEqual({ from: "2026-10-12", to: "2026-10-18" });
  });
  it("lets the band's own dates win over the tab's span, as they do in the list", () => {
    const current = weekOf("2026-09-30", "2026-09-30");
    expect(calendarWindow({ from: "2026-09-28", to: "2026-09-29" }, current, span)).toEqual({
      from: "2026-09-28", to: "2026-09-29",
    });
  });
});

describe("inCalendarWindow", () => {
  it("keeps the days inside, and nothing when the window is empty", () => {
    const win = { from: "2026-10-08", to: "2026-10-11" };
    expect(inCalendarWindow("2026-10-07", win)).toBe(false);
    expect(inCalendarWindow("2026-10-08", win)).toBe(true);
    expect(inCalendarWindow("2026-10-11", win)).toBe(true);
    expect(inCalendarWindow("2026-10-08", null)).toBe(false);
  });
});
