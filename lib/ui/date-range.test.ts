import { describe, expect, it } from "vitest";
import {
  DATE_RANGE_PRESETS,
  matchPreset,
  presetRange,
  shiftDay,
} from "@/lib/ui/date-range";

describe("shiftDay", () => {
  it("walks backwards across a month boundary", () => {
    expect(shiftDay("2026-03-02", -3)).toBe("2026-02-27");
  });

  it("walks backwards across a year boundary", () => {
    expect(shiftDay("2026-01-02", -3)).toBe("2025-12-30");
  });

  // 2024 is a leap year, so the 29th exists and must not be skipped.
  it("respects a leap day", () => {
    expect(shiftDay("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("respects a non-leap February", () => {
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("returns the same day for a zero shift", () => {
    expect(shiftDay("2026-08-31", 0)).toBe("2026-08-31");
  });

  // `useTodayKey` returns "" until the clock is known. Every caller here would
  // otherwise turn that into an `Invalid Date` and print "NaN-aN-aN".
  it("passes an empty key straight through", () => {
    expect(shiftDay("", -7)).toBe("");
  });
});

describe("presetRange", () => {
  /**
   * "7 d" is **today and the six before it** — seven calendar days, the reading
   * every other tool uses. Anchoring at `today - 7` would span eight.
   */
  it("counts today as one of the seven days", () => {
    expect(presetRange("7d", "2026-08-31")).toEqual({
      from: "2026-08-25",
      to: "2026-08-31",
    });
  });

  it("counts today as one of the ninety days", () => {
    expect(presetRange("90d", "2026-09-01")).toEqual({
      from: "2026-06-04",
      to: "2026-09-01",
    });
  });

  it("counts today as one of the thirty days", () => {
    expect(presetRange("30d", "2026-08-31")).toEqual({
      from: "2026-08-02",
      to: "2026-08-31",
    });
  });

  it("yields an empty range with no clock, rather than a range around 1970", () => {
    expect(presetRange("7d", "")).toEqual({ from: "", to: "" });
  });
});

describe("matchPreset", () => {
  it("names the preset a range was built from", () => {
    for (const key of DATE_RANGE_PRESETS) {
      const range = presetRange(key, "2026-08-31");
      expect(matchPreset(range, "2026-08-31")).toBe(key);
    }
  });

  // The pill strip has a third state, "Custom", and it is the absence of a match
  // rather than a value of its own.
  it("returns null for a hand-picked range", () => {
    expect(matchPreset({ from: "2026-01-01", to: "2026-06-30" }, "2026-08-31")).toBeNull();
  });

  it("returns null for a half-open range, which no preset produces", () => {
    expect(matchPreset({ from: "2026-08-25", to: "" }, "2026-08-31")).toBeNull();
  });

  it("returns null for an empty range", () => {
    expect(matchPreset({ from: "", to: "" }, "2026-08-31")).toBeNull();
  });

  /**
   * The same range stops being "7 d" tomorrow. A pill that stayed lit would claim
   * a window the query no longer describes, so the match is always re-derived
   * against the current day.
   */
  it("stops matching once the day moves on", () => {
    const range = presetRange("7d", "2026-08-31");
    expect(matchPreset(range, "2026-09-01")).toBeNull();
  });

  it("does not match with no clock, even against an empty range", () => {
    expect(matchPreset({ from: "", to: "" }, "")).toBeNull();
  });
});
