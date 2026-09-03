import { describe, expect, it } from "vitest";
import {
  formatDay,
  formatRelativeAge,
  relativeAge,
} from "@/lib/ui/relative-time";

const NOW = Date.parse("2026-09-01T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("relativeAge", () => {
  it("has nothing to say about a missing timestamp", () => {
    expect(relativeAge(null, NOW)).toBeNull();
    expect(relativeAge(undefined, NOW)).toBeNull();
    expect(relativeAge("", NOW)).toBeNull();
  });

  /* `0` is the server snapshot from `useToday`/`useClock` — "no clock yet". */
  it("has nothing to say before the clock is known", () => {
    expect(relativeAge(ago(HOUR), 0)).toBeNull();
  });

  it("degrades an unparseable value rather than throwing", () => {
    expect(relativeAge("not-a-date", NOW)).toBeNull();
  });

  it("walks the ladder", () => {
    expect(relativeAge(ago(30_000), NOW)).toEqual({ value: 0, unit: "minute" });
    expect(relativeAge(ago(12 * MINUTE), NOW)).toEqual({ value: -12, unit: "minute" });
    expect(relativeAge(ago(2 * HOUR), NOW)).toEqual({ value: -2, unit: "hour" });
    expect(relativeAge(ago(3 * DAY), NOW)).toEqual({ value: -3, unit: "day" });
    expect(relativeAge(ago(9 * DAY), NOW)).toEqual({ value: -1, unit: "week" });
    expect(relativeAge(ago(33 * DAY), NOW)).toEqual({ value: -1, unit: "month" });
    expect(relativeAge(ago(400 * DAY), NOW)).toEqual({ value: -1, unit: "year" });
  });

  it("switches unit at the boundary, not before it", () => {
    const unit = (ms: number) => relativeAge(ago(ms), NOW)?.unit;
    expect(unit(59 * MINUTE)).toBe("minute");
    expect(unit(60 * MINUTE)).toBe("hour");
    expect(unit(23 * HOUR)).toBe("hour");
    expect(unit(24 * HOUR)).toBe("day");
  });

  /*
    Clock skew between the server and the browser is the usual cause, and
    "in 4 seconds" reads as a bug where "now" reads as the truth.
  */
  it("clamps a future timestamp to now instead of counting forward", () => {
    expect(relativeAge(ago(-5 * HOUR), NOW)).toEqual({ value: 0, unit: "minute" });
  });
});

describe("formatRelativeAge", () => {
  it("renders in the locale it is given", () => {
    expect(formatRelativeAge(ago(2 * HOUR), NOW, "en")).toBe("2 hours ago");
    expect(formatRelativeAge(ago(2 * HOUR), NOW, "de")).toContain("2");
  });

  it("says the language's own word for now rather than «in 0 minutes»", () => {
    expect(formatRelativeAge(ago(10_000), NOW, "en")).toBe("this minute");
  });

  it("passes null straight through", () => {
    expect(formatRelativeAge(null, NOW, "en")).toBeNull();
  });
});

describe("formatDay", () => {
  /*
    Asserted by parts, not by order: `en` puts the month first ("Aug 27, 2026")
    and `de` the day ("27. Aug. 2026"). Pinning one ordering here would be a test
    that fails the moment it is read in the other language.
  */
  it("prints a short absolute day in the locale's own order", () => {
    const en = formatDay("2026-08-27T09:00:00Z", "en");
    expect(en).toContain("27");
    expect(en).toContain("2026");
    expect(en).toMatch(/Aug/);
    expect(formatDay("2026-08-27T09:00:00Z", "de")).toContain("27");
  });

  it("gives an em dash rather than Invalid Date", () => {
    expect(formatDay(null, "en")).toBe("—");
    expect(formatDay("nonsense", "en")).toBe("—");
  });
});
