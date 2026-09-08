import { describe, expect, it } from "vitest";
import {
  MAX_DOTS,
  subjectSide,
  verdictDots,
  type VerdictCounts,
} from "@/lib/onboarding/queue-detail";

function counts(over: Partial<VerdictCounts> = {}): VerdictCounts {
  return { pending: 0, approved: 0, rejected: 0, ...over };
}

describe("verdictDots", () => {
  it("draws one dot per file", () => {
    expect(verdictDots(counts({ approved: 2, pending: 1 }))).toEqual([
      "pending",
      "approved",
      "approved",
    ]);
  });

  // The design's reason for the column: "a red dot in the row is the fastest
  // read of 'this one has a problem'". A pile of green must never push it out.
  it("puts rejected first, then pending, then approved", () => {
    expect(verdictDots(counts({ approved: 1, pending: 1, rejected: 1 }))).toEqual([
      "rejected",
      "pending",
      "approved",
    ]);
  });

  it("keeps the red dot visible when approvals would overflow the cap", () => {
    const dots = verdictDots(counts({ approved: 20, rejected: 1 }));
    expect(dots).toHaveLength(MAX_DOTS);
    expect(dots[0]).toBe("rejected");
  });

  it("stops at the cap", () => {
    expect(verdictDots(counts({ approved: 99 }))).toHaveLength(MAX_DOTS);
  });

  it("draws nothing for a bundle with no files", () => {
    expect(verdictDots(counts())).toEqual([]);
  });

  it("draws nothing when the row carries no breakdown", () => {
    expect(verdictDots(null)).toEqual([]);
    expect(verdictDots(undefined)).toEqual([]);
  });

  // Defensive rather than expected: the backend sends zeros, never negatives.
  it("ignores a negative count instead of throwing", () => {
    expect(verdictDots(counts({ approved: -3, pending: 1 }))).toEqual(["pending"]);
  });
});

describe("subjectSide", () => {
  it("joins company and email", () => {
    expect(
      subjectSide(
        "Vogel Immobilien GmbH",
        "k.vogel@vogel-immo.de",
        "Natural person",
      ),
    ).toBe("Vogel Immobilien GmbH · k.vogel@vogel-immo.de");
  });

  // `companyName` is null, never "", for an owner with no company row — so the
  // line can be drawn on first paint instead of waiting for a second read.
  it("says Natural person when the row has no company", () => {
    expect(subjectSide(null, "t@gmx.de", "Natural person")).toBe(
      "Natural person · t@gmx.de",
    );
  });

  it("says Natural person even with no email", () => {
    expect(subjectSide(null, null, "Natural person")).toBe("Natural person");
  });

  it("omits the company half entirely for a subject that has no company concept", () => {
    expect(subjectSide(null, "w@gmx.de", "Natural person", false)).toBe("w@gmx.de");
    expect(subjectSide(null, null, "Natural person", false)).toBeNull();
  });
});
