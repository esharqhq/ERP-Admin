import { describe, expect, it } from "vitest";
import {
  isInMonth,
  isPastDay,
  monthGrid,
  monthOf,
  shiftMonth,
  toggleDate,
  weekdayLabels,
  type MonthGridCell,
} from "@/lib/tasks/month-grid";

const inMonth = (cells: MonthGridCell[]) => cells.filter((c) => c.inMonth);

describe("monthGrid", () => {
  it("always returns six weeks, so the grid does not change height month to month", () => {
    expect(monthGrid({ year: 2026, month: 1 })).toHaveLength(42);
    expect(monthGrid({ year: 2026, month: 7 })).toHaveLength(42);
  });

  it("starts on a Monday, whatever weekday the month starts on", () => {
    for (const month of [0, 1, 5, 8, 11]) {
      const first = monthGrid({ year: 2026, month })[0];
      // 1 = Monday in `Date.getDay()`.
      expect(new Date(`${first.key}T00:00:00`).getDay()).toBe(1);
    }
  });

  it("holds exactly the month's own days, leap years included", () => {
    expect(inMonth(monthGrid({ year: 2026, month: 1 }))).toHaveLength(28);
    expect(inMonth(monthGrid({ year: 2028, month: 1 }))).toHaveLength(29);
    expect(inMonth(monthGrid({ year: 2026, month: 7 }))).toHaveLength(31);
  });

  it("pads with the neighbouring months' real dates, not blanks", () => {
    const cells = monthGrid({ year: 2026, month: 1 });
    expect(inMonth(cells)[0].key).toBe("2026-02-01");
    expect(cells[0].key.startsWith("2026-01")).toBe(true);
    expect(cells[41].key.startsWith("2026-0")).toBe(true);
    // Every cell carries a usable key — a null would have to be guarded at
    // every call site.
    expect(cells.every((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.key))).toBe(true);
  });

  it("numbers each cell by its own day of the month", () => {
    const cells = monthGrid({ year: 2026, month: 1 });
    const first = inMonth(cells)[0];
    expect(first.day).toBe(1);
    expect(inMonth(cells).at(-1)!.day).toBe(28);
  });
});

describe("shiftMonth", () => {
  it("rolls the year at both ends", () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });

  it("moves within a year without touching it", () => {
    expect(shiftMonth({ year: 2026, month: 7 }, 1)).toEqual({ year: 2026, month: 8 });
  });
});

describe("isPastDay", () => {
  it("treats today as not past — an order can be filed for this morning", () => {
    expect(isPastDay("2026-08-12", "2026-08-12")).toBe(false);
  });

  it("marks yesterday past and tomorrow not", () => {
    expect(isPastDay("2026-08-11", "2026-08-12")).toBe(true);
    expect(isPastDay("2026-08-13", "2026-08-12")).toBe(false);
  });

  it("compares as dates, not as numbers — a key sorts correctly across months", () => {
    expect(isPastDay("2026-07-31", "2026-08-01")).toBe(true);
    expect(isPastDay("2026-09-01", "2026-08-31")).toBe(false);
  });
});

describe("toggleDate", () => {
  it("adds a date to an empty selection", () => {
    expect(toggleDate([], "2026-08-13")).toEqual(["2026-08-13"]);
  });

  it("adds a second date out of order and returns it sorted ascending", () => {
    expect(toggleDate(["2026-08-20"], "2026-08-13")).toEqual([
      "2026-08-13",
      "2026-08-20",
    ]);
  });

  it("toggles an already-selected date off, leaving the rest sorted", () => {
    expect(toggleDate(["2026-08-13", "2026-08-20"], "2026-08-13")).toEqual([
      "2026-08-20",
    ]);
  });

  it("toggling the only selected date off returns an empty array", () => {
    expect(toggleDate(["2026-08-13"], "2026-08-13")).toEqual([]);
  });
});

describe("monthOf", () => {
  it("reads the year and the 0-indexed month out of a key", () => {
    expect(monthOf("2026-08-13")).toEqual({ year: 2026, month: 7 });
  });

  it("maps January to 0 and December to 11", () => {
    expect(monthOf("2026-01-01")).toEqual({ year: 2026, month: 0 });
    expect(monthOf("2026-12-31")).toEqual({ year: 2026, month: 11 });
  });
});

describe("isInMonth", () => {
  it("is true for a key inside the month", () => {
    expect(isInMonth("2026-08-13", { year: 2026, month: 7 })).toBe(true);
  });

  it("is false for the neighbouring month", () => {
    expect(isInMonth("2026-09-01", { year: 2026, month: 7 })).toBe(false);
  });

  it("is false for the same month in another year", () => {
    expect(isInMonth("2025-08-13", { year: 2026, month: 7 })).toBe(false);
  });

  it("agrees with monthGrid's own inMonth flag on every cell", () => {
    // The two must not drift: the picker decides "is this a padding day" with
    // the flag, and deciding "which month should I jump to" with this helper.
    const view = { year: 2026, month: 7 };
    for (const cell of monthGrid(view)) {
      expect(isInMonth(cell.key, view)).toBe(cell.inMonth);
    }
  });
});

describe("weekdayLabels", () => {
  it("starts on Monday and ends on Sunday for en", () => {
    expect(weekdayLabels("en")).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
  });

  it("returns the German abbreviations for de", () => {
    // Exactly the list both calendars used to hardcode — which is why an
    // English admin was reading German.
    expect(weekdayLabels("de")).toEqual([
      "Mo",
      "Di",
      "Mi",
      "Do",
      "Fr",
      "Sa",
      "So",
    ]);
  });

  it("returns seven distinct positions whatever the locale", () => {
    expect(weekdayLabels("en")).toHaveLength(7);
    expect(weekdayLabels("de")).toHaveLength(7);
  });

  it("does not depend on which weekday it is called on", () => {
    // The anchor is derived from `new Date()`, so a bug in the Sunday-to-Monday
    // shift would only show up on some days of the week.
    expect(weekdayLabels("de")[0]).toBe("Mo");
    expect(weekdayLabels("de")[6]).toBe("So");
  });
});
