import { describe, expect, it } from "vitest";
import { countRangeError, rangeError } from "@/lib/ui/filter-validation";

describe("rangeError", () => {
  it("passes a well-ordered or half-open range", () => {
    expect(rangeError("2026-01-01", "2026-02-01")).toBeNull();
    expect(rangeError("2026-01-01", "")).toBeNull();
    expect(rangeError("", "2026-02-01")).toBeNull();
    expect(rangeError("", "")).toBeNull();
    // Equal bounds are a legal single-day window, not an error.
    expect(rangeError("2026-01-01", "2026-01-01")).toBeNull();
  });

  it("rejects a reversed range", () => {
    expect(rangeError("2026-03-01", "2026-02-01")).toBe("order");
  });
});

describe("countRangeError", () => {
  it("passes a well-ordered or half-open range", () => {
    expect(countRangeError("1", "5")).toBeNull();
    expect(countRangeError("", "5")).toBeNull();
    expect(countRangeError("0", "0")).toBeNull();
  });

  it("rejects a negative bound", () => {
    expect(countRangeError("-1", "")).toBe("negative");
    expect(countRangeError("", "-2")).toBe("negative");
  });

  it("rejects min above max", () => {
    expect(countRangeError("9", "2")).toBe("order");
  });

  // A blank is "no bound", never zero — sending 0 as a min would be a real filter.
  it("treats a blank as absent rather than as zero", () => {
    expect(countRangeError("", "")).toBeNull();
  });
});
