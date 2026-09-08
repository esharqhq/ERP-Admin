import { describe, expect, it } from "vitest";
import { computeStaffingLayout } from "@/lib/tasks/pip-layout";

describe("computeStaffingLayout", () => {
  it("0/3 urgent — 3 red-ringed missing pips", () => {
    const layout = computeStaffingLayout(0, 3, true);
    expect(layout.mode).toBe("pips");
    if (layout.mode !== "pips") throw new Error("unreachable");
    expect(layout.pips).toHaveLength(3);
    for (const pip of layout.pips) {
      expect(pip.kind).toBe("missing");
      expect(pip.bg).toBe("#FFFFFF");
      expect(pip.ring).toBe("inset 0 0 0 1.5px rgba(220,59,59,0.65)");
    }
  });

  it("1/3 calm — 1 filled + 2 amber-ringed missing pips", () => {
    const layout = computeStaffingLayout(1, 3, false);
    expect(layout.mode).toBe("pips");
    if (layout.mode !== "pips") throw new Error("unreachable");
    expect(layout.pips).toHaveLength(3);
    expect(layout.pips[0]).toEqual({ kind: "filled", bg: "#1C6B4C", ring: null });
    expect(layout.pips[1].kind).toBe("missing");
    expect(layout.pips[1].ring).toBe("inset 0 0 0 1.5px #E7B769");
    expect(layout.pips[2].kind).toBe("missing");
    expect(layout.pips[2].ring).toBe("inset 0 0 0 1.5px #E7B769");
  });

  it("3/3 — 3 filled pips, nothing missing", () => {
    const layout = computeStaffingLayout(3, 3, false);
    expect(layout.mode).toBe("pips");
    if (layout.mode !== "pips") throw new Error("unreachable");
    expect(layout.pips).toHaveLength(3);
    expect(layout.pips.every((p) => p.kind === "filled")).toBe(true);
  });

  it("4/3 — 3 filled + 1 lime over pip with a green ring", () => {
    const layout = computeStaffingLayout(4, 3, false);
    expect(layout.mode).toBe("pips");
    if (layout.mode !== "pips") throw new Error("unreachable");
    expect(layout.pips).toHaveLength(4);
    expect(layout.pips.slice(0, 3).every((p) => p.kind === "filled")).toBe(true);
    expect(layout.pips[3]).toEqual({
      kind: "over",
      bg: "#7ED957",
      ring: "inset 0 0 0 1.5px #1C6B4C",
    });
  });

  it("0/6 — no pip strip, fraction only in amber", () => {
    const layout = computeStaffingLayout(0, 6, false);
    expect(layout).toEqual({ mode: "fraction-only", text: "0 / 6", fg: "#9A5E00" });
  });

  it("0/0 cancelled — dash only", () => {
    expect(computeStaffingLayout(0, 0, false)).toEqual({ mode: "dash" });
  });
});
