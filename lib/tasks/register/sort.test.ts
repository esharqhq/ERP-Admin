import { describe, expect, it } from "vitest";
import { compareSchedule, compareStaffing, compareStatus } from "@/lib/tasks/register/sort";
import type { RegisterRow } from "@/lib/tasks/register/rows";

const r = (over: Partial<RegisterRow>) => ({ startMs: 0, status: "Open", staffing: { filled: 0, required: 1, gap: 1, covered: false }, ...over }) as RegisterRow;

describe("register sort", () => {
  it("orders by start, unparseable last", () => {
    const rows = [r({ startMs: 30 }), r({ startMs: NaN }), r({ startMs: 10 })];
    expect(rows.sort(compareSchedule).map((x) => x.startMs)).toEqual([10, 30, NaN]);
  });
  it("puts the states that need action first", () => {
    const rows = [r({ status: "Done" }), r({ status: "Unstaffed" }), r({ status: "Scheduled" }), r({ status: "Overdue" })];
    expect(rows.sort(compareStatus).map((x) => x.status)).toEqual(["Unstaffed", "Overdue", "Scheduled", "Done"]);
  });
  it("puts the biggest shortfall first", () => {
    const rows = [r({ staffing: { filled: 2, required: 2, gap: 0, covered: true } }), r({ staffing: { filled: 0, required: 3, gap: 3, covered: false } })];
    expect(rows.sort(compareStaffing)[0].staffing.gap).toBe(3);
  });
});
