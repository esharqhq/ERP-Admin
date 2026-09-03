import { describe, expect, it } from "vitest";
import {
  daysUntil,
  summariseAttention,
  type AttentionSource,
} from "@/lib/detail/attention";

const TODAY = Date.parse("2026-08-25T00:00:00.000Z");

function flag(
  id: string,
  tone: "critical" | "warning",
  blocking = false,
): AttentionSource {
  return {
    state: "flag",
    id,
    tone,
    blocking,
    title: `${id} title`,
    detail: `${id} detail`,
  };
}

function unknown(id: string): AttentionSource {
  return {
    state: "unknown",
    id,
    title: `${id} unknown`,
    detail: "you cannot read this",
  };
}

describe("summariseAttention", () => {
  it("is all clear only when nothing is waiting AND nothing is unreadable", () => {
    expect(
      summariseAttention([{ state: "clear" }, { state: "clear" }]).allClear,
    ).toBe(true);
    // The trap: one refused source and two clear ones is NOT a clean account.
    expect(
      summariseAttention([
        { state: "clear" },
        { state: "clear" },
        unknown("docs"),
      ]).allClear,
    ).toBe(false);
  });

  it("counts known sources, never assuming a refused one is zero", () => {
    const summary = summariseAttention([
      flag("unstaffed", "critical"),
      unknown("cover"),
      { state: "clear" },
    ]);

    expect(summary.known).toBe(2);
    expect(summary.total).toBe(3);
    expect(summary.unknowns).toHaveLength(1);
  });

  it("keeps a refused source as a slot rather than dropping it", () => {
    const summary = summariseAttention([unknown("docs")]);

    expect(summary.flags).toHaveLength(0);
    expect(summary.unknowns.map((u) => u.id)).toEqual(["docs"]);
    expect(summary.allClear).toBe(false);
  });

  it("puts critical findings ahead of warnings, and is otherwise stable", () => {
    const summary = summariseAttention([
      flag("warn-a", "warning"),
      flag("crit", "critical"),
      flag("warn-b", "warning"),
    ]);

    expect(summary.flags.map((f) => f.id)).toEqual([
      "crit",
      "warn-a",
      "warn-b",
    ]);
  });

  it("reports blocking when any one finding stops work", () => {
    expect(summariseAttention([flag("a", "warning")]).blocking).toBe(false);
    expect(
      summariseAttention([flag("a", "warning"), flag("b", "critical", true)])
        .blocking,
    ).toBe(true);
  });
});

describe("daysUntil", () => {
  it("counts whole days forward and backward", () => {
    expect(daysUntil("2026-09-03", TODAY)).toBe(9);
    expect(daysUntil("2026-08-25", TODAY)).toBe(0);
    expect(daysUntil("2026-08-22", TODAY)).toBe(-3);
  });

  it("says nothing when there is no date, or no clock", () => {
    // A missing expiry is not an expired one, and neither is an unread clock.
    expect(daysUntil(null, TODAY)).toBeNull();
    expect(daysUntil("", TODAY)).toBeNull();
    expect(daysUntil("not-a-date", TODAY)).toBeNull();
    expect(daysUntil("2026-09-03", 0)).toBeNull();
  });
});
