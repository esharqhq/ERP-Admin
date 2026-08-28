import { describe, expect, it } from "vitest";
import { GAP, pageCountFor, pageRange, pageWindow } from "@/lib/ui/pagination";

describe("pageWindow", () => {
  it("draws what the design draws — page 1 of 6", () => {
    expect(pageWindow(1, 6)).toEqual([1, 2, GAP, 6]);
  });

  it("keeps the first and last on either side of a deep page", () => {
    // Those two are the pages an operator jumps to by name; eliding them turns
    // both into a run of Next clicks.
    expect(pageWindow(9, 20)).toEqual([1, GAP, 8, 9, 10, GAP, 20]);
  });

  it("spells out a gap of exactly one page instead of hiding it", () => {
    // "1 … 3" is the same width as "1 2 3" and says less.
    expect(pageWindow(4, 6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("has no gap at all when everything fits", () => {
    expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
  });

  it("collapses to a single page rather than an empty pager", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 0)).toEqual([1]);
  });

  it("clamps a current page outside the range", () => {
    // `?page=99` outlives the filter that made 99 pages. Both ends clamp into
    // the range and, four pages being too few to break the run, neither leaves
    // a gap behind.
    expect(pageWindow(99, 4)).toEqual([1, 2, 3, 4]);
    expect(pageWindow(-3, 4)).toEqual([1, 2, 3, 4]);
    // With room for a gap, the clamped page is genuinely at the far end.
    expect(pageWindow(99, 12)).toEqual([1, GAP, 11, 12]);
  });

  it("never repeats a page number", () => {
    for (const [page, count] of [
      [1, 1],
      [1, 2],
      [2, 2],
      [1, 3],
      [5, 9],
    ] as const) {
      const numbers = pageWindow(page, count).filter(
        (s): s is number => s !== GAP,
      );
      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });
});

describe("pageRange", () => {
  it("reads 1-based and inclusive", () => {
    expect(pageRange(1, 25, 36)).toEqual({ from: 1, to: 25 });
    expect(pageRange(2, 25, 36)).toEqual({ from: 26, to: 36 });
  });

  it("is 0–0 on an empty set rather than 1–0", () => {
    expect(pageRange(1, 25, 0)).toEqual({ from: 0, to: 0 });
  });

  it("never runs past the total on a short last page", () => {
    expect(pageRange(3, 10, 21).to).toBe(21);
  });
});

describe("pageCountFor", () => {
  it("is at least one, even with nothing in the set", () => {
    expect(pageCountFor(0, 25)).toBe(1);
  });

  it("rounds a partial page up", () => {
    expect(pageCountFor(26, 25)).toBe(2);
    expect(pageCountFor(50, 25)).toBe(2);
  });

  it("survives a zero page size instead of dividing by it", () => {
    expect(Number.isFinite(pageCountFor(10, 0))).toBe(true);
  });
});
