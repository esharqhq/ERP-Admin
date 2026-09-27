import { describe, expect, it } from "vitest";
import {
  buildCalendarDays, calendarBandPatch, calendarWeek, cardTone, registerView, toListPatch, weekPatch,
} from "@/lib/tasks/register/week";
import { weekOf } from "@/lib/ui/week";
import type { RegisterRow } from "@/lib/tasks/register/rows";

const r = (over: Partial<RegisterRow>) => ({ dayKey: "2026-09-21", startMs: 1, status: "Open", assignable: false,
  staffing: { filled: 1, required: 1, gap: 0, covered: true }, ...over }) as RegisterRow;

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
  it("hands the paged week to the list as its date range", () => {
    expect(toListPatch({ view: "calendar", week: "2026-10-05" })).toEqual({
      view: "", week: "", from: "2026-10-05", to: "2026-10-11",
    });
  });
  it("leaves the list's own window alone when no week was paged to", () => {
    expect(toListPatch({ view: "calendar", from: "2026-10-08" })).toEqual({ view: "", week: "" });
    expect(toListPatch({ view: "calendar" })).toEqual({ view: "", week: "" });
  });
});
