import { describe, expect, it } from "vitest";
import {
  dayLabel,
  fromDayKey,
  isoWeek,
  mondayOf,
  shiftWeek,
  toDayKey,
  weekOf,
  weekRangeLabel,
  weekdayLabels,
} from "@/lib/ui/week";

describe("day keys", () => {
  /*
    The bug this guards: `new Date("2026-09-01")` is UTC midnight, which is
    2026-08-31 anywhere west of Greenwich. A server `scheduledDate` is a local
    calendar date, so a round trip through the wrong constructor shifts a whole
    column of the grid by a day.
  */
  it("round-trips a key through a LOCAL date", () => {
    expect(toDayKey(fromDayKey("2026-09-01"))).toBe("2026-09-01");
    expect(toDayKey(fromDayKey("2026-01-01"))).toBe("2026-01-01");
    expect(toDayKey(fromDayKey("2026-12-31"))).toBe("2026-12-31");
  });

  it("pads single digits", () => {
    expect(toDayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("mondayOf", () => {
  it("finds the Monday from any day of the week", () => {
    // 2026-09-01 is a Tuesday; its Monday is 2026-08-31.
    for (const [day, monday] of [
      ["2026-08-31", "2026-08-31"], // Mon
      ["2026-09-01", "2026-08-31"], // Tue
      ["2026-09-06", "2026-08-31"], // Sun — the trap in a Sunday-first locale
      ["2026-09-07", "2026-09-07"], // next Mon
    ] as const) {
      expect(toDayKey(mondayOf(fromDayKey(day))), day).toBe(monday);
    }
  });
});

describe("isoWeek", () => {
  /* The Thursday rule: a week belongs to the year holding its Thursday. */
  it("puts an early-January day in the previous year's last week when it belongs there", () => {
    // 2027-01-01 is a Friday, so its week's Thursday is 2026-12-31 → week 53.
    expect(isoWeek(fromDayKey("2027-01-01"))).toBe(53);
  });

  it("numbers a mid-year week", () => {
    expect(isoWeek(fromDayKey("2026-08-31"))).toBe(36);
  });

  it("gives week 1 to a January day whose Thursday is in January", () => {
    // 2026-01-01 is a Thursday.
    expect(isoWeek(fromDayKey("2026-01-01"))).toBe(1);
  });
});

describe("weekOf", () => {
  const TODAY = "2026-09-01";

  it("builds seven Monday-first days from an anchor anywhere in the week", () => {
    const w = weekOf("2026-09-03", TODAY);
    expect(w.startKey).toBe("2026-08-31");
    expect(w.dayKeys).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
    expect(w.isoWeek).toBe(36);
  });

  /* A hand-edited or absent `?week=` must land on this week, never throw. */
  it("falls back to today for a missing or malformed anchor", () => {
    for (const bad of [null, undefined, "", "not-a-date", "2026-13-99x"]) {
      expect(weekOf(bad, TODAY).startKey, String(bad)).toBe("2026-08-31");
    }
  });

  it("crosses a month and a year boundary", () => {
    expect(weekOf("2026-12-31", "2026-09-01").dayKeys).toContain("2027-01-03");
  });
});

describe("shiftWeek", () => {
  it("steps a whole week in both directions", () => {
    expect(shiftWeek("2026-08-31", 1)).toBe("2026-09-07");
    expect(shiftWeek("2026-08-31", -1)).toBe("2026-08-24");
    expect(shiftWeek("2026-08-31", 0)).toBe("2026-08-31");
  });

  /* Local arithmetic, so a DST boundary cannot land the pager on a Sunday. */
  it("stays on a Monday across a DST change", () => {
    // Europe/Berlin springs forward on 2026-03-29.
    expect(shiftWeek("2026-03-23", 1)).toBe("2026-03-30");
    expect(shiftWeek("2026-03-30", -1)).toBe("2026-03-23");
  });
});

describe("weekdayLabels", () => {
  it("returns seven Monday-first names from Intl, not a literal list", () => {
    const en = weekdayLabels("en");
    expect(en).toHaveLength(7);
    expect(en[0]).toMatch(/^Mon/);
    expect(en[6]).toMatch(/^Sun/);
  });

  /* The defect this replaces: a German list rendered on an English screen. */
  it("speaks the locale it is given", () => {
    expect(weekdayLabels("de")[0]).toMatch(/^Mo/);
    expect(weekdayLabels("de")).not.toEqual(weekdayLabels("en"));
  });
});

describe("weekRangeLabel", () => {
  it("prints both ends in the locale's own order", () => {
    const label = weekRangeLabel(weekOf("2026-08-31", "2026-08-31"), "de");
    expect(label).toContain("31");
    expect(label).toContain("06");
    expect(label).toContain("–");
  });
});

describe("dayLabel", () => {
  it("names one specific date, weekday and all", () => {
    // 2026-09-05 is a Saturday.
    const label = dayLabel("2026-09-05", "en");
    expect(label).toMatch(/^Sat/);
    expect(label).toContain("05");
  });

  it("speaks the locale it is given", () => {
    expect(dayLabel("2026-09-05", "de")).toMatch(/^Sa/);
  });
});
