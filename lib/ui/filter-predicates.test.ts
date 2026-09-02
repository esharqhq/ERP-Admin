import { describe, expect, it } from "vitest";
import { matchesAny, withinDay, withinNumber } from "@/lib/ui/filter-predicates";

describe("matchesAny", () => {
  it("passes everything when nothing is selected", () => {
    expect(matchesAny(undefined, "a")).toBe(true);
    expect(matchesAny("", "a")).toBe(true);
  });

  it("matches one selected value", () => {
    expect(matchesAny("a", "a")).toBe(true);
    expect(matchesAny("a", "b")).toBe(false);
  });

  // A multi-select is match-**any**, the same as the API's repeatable params.
  it("matches any of several", () => {
    expect(matchesAny("a,b,c", "b")).toBe(true);
    expect(matchesAny("a,b,c", "d")).toBe(false);
  });

  it("ignores empty members from a hand-edited value", () => {
    expect(matchesAny("a,,b", "b")).toBe(true);
    expect(matchesAny(",,", "b")).toBe(true);
  });

  it("never matches a null row value against a real selection", () => {
    expect(matchesAny("a", null)).toBe(false);
    expect(matchesAny("", null)).toBe(true);
  });
});

describe("withinDay", () => {
  const iso = "2026-08-12T14:30:00Z";

  it("passes with no bounds", () => {
    expect(withinDay(iso, "", "")).toBe(true);
    expect(withinDay(iso, undefined, undefined)).toBe(true);
  });

  /**
   * Both ends are **inclusive**, compared by calendar day. An admin who picks
   * 12 Aug – 12 Aug means that day, and a timestamp inside it must survive — which
   * an instant comparison against midnight would fail.
   */
  it("includes a row on the boundary day at either end", () => {
    expect(withinDay(iso, "2026-08-12", "2026-08-12")).toBe(true);
  });

  it("excludes a row before the lower bound", () => {
    expect(withinDay(iso, "2026-08-13", "")).toBe(false);
  });

  it("excludes a row after the upper bound", () => {
    expect(withinDay(iso, "", "2026-08-11")).toBe(false);
  });

  it("takes one open bound", () => {
    expect(withinDay(iso, "2026-01-01", "")).toBe(true);
    expect(withinDay(iso, "", "2026-12-31")).toBe(true);
  });

  /**
   * A row with no date **drops out** of any bound rather than passing it — the
   * same rule SQL applies to a `NULL` against a range, and what an admin asking
   * "added last week" means.
   */
  it("drops a row with no date once a bound is set", () => {
    expect(withinDay(null, "2026-01-01", "")).toBe(false);
    expect(withinDay(null, "", "")).toBe(true);
  });
});

describe("withinNumber", () => {
  it("passes with no bounds", () => {
    expect(withinNumber(500, "", "")).toBe(true);
  });

  it("is inclusive at both ends", () => {
    expect(withinNumber(100, "100", "200")).toBe(true);
    expect(withinNumber(200, "100", "200")).toBe(true);
  });

  it("excludes outside the bounds", () => {
    expect(withinNumber(99, "100", "")).toBe(false);
    expect(withinNumber(201, "", "200")).toBe(false);
  });

  // `0` is a real bound — "properties with no recorded area at all" is `max=0`.
  it("treats a zero bound as a bound, not as absent", () => {
    expect(withinNumber(0, "", "0")).toBe(true);
    expect(withinNumber(5, "", "0")).toBe(false);
  });

  it("drops a null value once a bound is set", () => {
    expect(withinNumber(null, "100", "")).toBe(false);
    expect(withinNumber(null, "", "")).toBe(true);
  });

  it("ignores a bound that is not a number", () => {
    expect(withinNumber(50, "abc", "")).toBe(true);
  });
});
