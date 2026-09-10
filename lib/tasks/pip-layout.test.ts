import { describe, expect, it } from "vitest";
import { computeStaffingLayout } from "@/lib/tasks/pip-layout";

/**
 * These assertions are on **kinds and tones**, never on colours. The module
 * deliberately names none — the meter component maps meaning to theme tokens —
 * so a test that pinned a hex here would be pinning the thing that was wrong.
 */
describe("computeStaffingLayout", () => {
  it("0/3 urgent — three missing seats, urgency carried through", () => {
    const layout = computeStaffingLayout(0, 3, true);
    if (layout.mode !== "pips") throw new Error("unreachable");
    expect(layout.pips).toEqual(["missing", "missing", "missing"]);
    expect(layout.urgent).toBe(true);
  });

  it("0/3 calm — the same seats, not urgent", () => {
    const layout = computeStaffingLayout(0, 3, false);
    if (layout.mode !== "pips") throw new Error("unreachable");
    expect(layout.pips).toEqual(["missing", "missing", "missing"]);
    expect(layout.urgent).toBe(false);
  });

  it("1/3 — filled seats come first, missing ones after", () => {
    const layout = computeStaffingLayout(1, 3, false);
    if (layout.mode !== "pips") throw new Error("unreachable");
    expect(layout.pips).toEqual(["filled", "missing", "missing"]);
  });

  it("3/3 — three filled seats, nothing missing", () => {
    const layout = computeStaffingLayout(3, 3, false);
    if (layout.mode !== "pips") throw new Error("unreachable");
    expect(layout.pips).toEqual(["filled", "filled", "filled"]);
  });

  it("4/3 — the extra body gets its own seat rather than being clamped away", () => {
    // The server permits over-staffing; the board must not hide it.
    const layout = computeStaffingLayout(4, 3, false);
    if (layout.mode !== "pips") throw new Error("unreachable");
    expect(layout.pips).toEqual(["filled", "filled", "filled", "over"]);
  });

  it("6/3 — every extra body is one seat, not one lump", () => {
    const layout = computeStaffingLayout(6, 3, false);
    if (layout.mode !== "pips") throw new Error("unreachable");
    expect(layout.pips.filter((p) => p === "over")).toHaveLength(1);
  });

  it("5/5 — five seats still draw as a strip", () => {
    const layout = computeStaffingLayout(5, 5, false);
    expect(layout.mode).toBe("pips");
  });

  it("0/6 — past five seats the strip is dropped for a fraction", () => {
    expect(computeStaffingLayout(0, 6, false)).toEqual({
      mode: "fraction-only",
      text: "0 / 6",
      tone: "short",
    });
  });

  it("0/6 urgent — the same fraction, urgent tone", () => {
    expect(computeStaffingLayout(0, 6, true)).toEqual({
      mode: "fraction-only",
      text: "0 / 6",
      tone: "urgent",
    });
  });

  it("1/6 urgent is short, not urgent — urgency is the zero case", () => {
    // Partly covered on a task starting today is still a gap, but it is not the
    // alarm that nobody-at-all is.
    const layout = computeStaffingLayout(1, 6, true);
    if (layout.mode !== "fraction-only") throw new Error("unreachable");
    expect(layout.tone).toBe("short");
  });

  it("6/6 — a covered fraction", () => {
    const layout = computeStaffingLayout(6, 6, false);
    if (layout.mode !== "fraction-only") throw new Error("unreachable");
    expect(layout.tone).toBe("covered");
  });

  it("7/6 — over-staffed reads as covered, not as a gap", () => {
    const layout = computeStaffingLayout(7, 6, false);
    if (layout.mode !== "fraction-only") throw new Error("unreachable");
    expect(layout.tone).toBe("covered");
  });

  it("0/0 cancelled — a dash, not an empty strip", () => {
    expect(computeStaffingLayout(0, 0, false)).toEqual({ mode: "dash" });
  });

  it("0/1 — a single missing seat is still a strip", () => {
    const layout = computeStaffingLayout(0, 1, false);
    if (layout.mode !== "pips") throw new Error("unreachable");
    expect(layout.pips).toEqual(["missing"]);
  });
});
