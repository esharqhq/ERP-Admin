import { describe, expect, it } from "vitest";
import { stepIndex } from "@/lib/properties/gallery";

describe("stepIndex", () => {
  it("moves forward and back", () => {
    expect(stepIndex(1, 1, 5)).toBe(2);
    expect(stepIndex(3, -1, 5)).toBe(2);
  });

  // JS `%` keeps the sign of the dividend, so a naive `(i - 1) % len` returns
  // -1 at the first photo and indexes past the end of the array.
  it("wraps backward from the first photo to the last", () => {
    expect(stepIndex(0, -1, 5)).toBe(4);
  });

  it("wraps forward from the last photo to the first", () => {
    expect(stepIndex(4, 1, 5)).toBe(0);
  });

  it("stays put in a single-photo gallery", () => {
    expect(stepIndex(0, 1, 1)).toBe(0);
    expect(stepIndex(0, -1, 1)).toBe(0);
  });

  // Guards the caller that steps while the list is being refetched.
  it("returns 0 rather than NaN when there is nothing to step through", () => {
    expect(stepIndex(0, 1, 0)).toBe(0);
  });

  it("always returns an index inside the list", () => {
    for (let i = 0; i < 10; i++) {
      for (const d of [-1, 1]) {
        const next = stepIndex(i, d, 10);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(10);
      }
    }
  });
});
