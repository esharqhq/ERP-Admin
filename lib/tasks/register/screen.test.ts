import { describe, expect, it } from "vitest";
import { nextAssignRow, registerRange, registerTabRows } from "@/lib/tasks/register/screen";
import type { RegisterRow } from "@/lib/tasks/register/rows";

const WED = "2026-09-30"; // Mon 28.09 – Sun 04.10 is this week
const NOW = new Date(2026, 8, 30, 10, 0).getTime();

function row(over: Partial<RegisterRow> = {}): RegisterRow {
  return {
    task: { id: "t-1" }, dayKey: WED, startMs: new Date(2026, 8, 30, 12, 0).getTime(),
    status: "Open", unstaffedToday: false, assignable: true, open: true,
    staffing: { filled: 1, required: 2, gap: 1, covered: false }, ...over,
  } as RegisterRow;
}

describe("registerRange", () => {
  it("is nothing until the clock is known", () => {
    expect(registerRange("thisWeek", {}, "")).toBeNull();
  });
  it("is the tab's window in the list, with no calendar", () => {
    const r = registerRange("next7", {}, WED)!;
    expect(r.window).toMatchObject({ fromKey: WED, toKey: "2026-10-06" });
    expect(r.week).toBeNull();
    expect(r.days).toBeNull();
  });
  it("lets the band's dates win in the list", () => {
    const r = registerRange("next7", { from: "2026-10-10", to: "2026-10-12" }, WED)!;
    expect(r.window).toMatchObject({ fromKey: "2026-10-10", toKey: "2026-10-12" });
  });
  it("draws next7 on this week as the tab's days inside the week — the list's set", () => {
    const r = registerRange("next7", { view: "calendar" }, WED)!;
    expect(r.week?.startKey).toBe("2026-09-28");
    expect(r.days).toEqual({ from: WED, to: "2026-10-04" });
    expect(r.window).toMatchObject({ fromKey: WED, toKey: "2026-10-04" });
  });
  it("draws the rest of short's days on the next week", () => {
    const r = registerRange("short", { view: "calendar", week: "2026-10-05" }, WED)!;
    expect(r.days).toEqual({ from: "2026-10-05", to: "2026-10-06" });
    expect(r.window).toMatchObject({ fromKey: "2026-10-05", toKey: "2026-10-06" });
  });
  it("draws nothing on a week the tab's days never reach, yet still asks a valid window", () => {
    const r = registerRange("next7", { view: "calendar", week: "2026-10-12" }, WED)!;
    expect(r.days).toBeNull();
    expect(r.window).toMatchObject({ fromKey: "2026-10-12", toKey: "2026-10-18" });
  });
  it("lets the pager drive this week's range to any week", () => {
    const r = registerRange("thisWeek", { view: "calendar", week: "2026-10-12" }, WED)!;
    expect(r.days).toEqual({ from: "2026-10-12", to: "2026-10-18" });
  });
  it("intersects the week with the band's dates, not the tab's", () => {
    const r = registerRange("next7", { view: "calendar", from: "2026-09-28", to: "2026-09-29" }, WED)!;
    expect(r.days).toEqual({ from: "2026-09-28", to: "2026-09-29" });
  });
});

describe("registerTabRows", () => {
  const rows = [
    row({ task: { id: "past" } as RegisterRow["task"], dayKey: "2026-09-28" }),
    row({ task: { id: "wed" } as RegisterRow["task"] }),
    row({ task: { id: "next" } as RegisterRow["task"], dayKey: "2026-10-05" }),
    row({ task: { id: "done" } as RegisterRow["task"], open: false, assignable: false }),
  ];
  const ids = (rs: RegisterRow[]) => rs.map((r) => r.task.id);

  it("narrows by the tab only in the list — the server window already bounds the days", () => {
    expect(ids(registerTabRows(rows, registerRange("next7", {}, WED), "next7", WED))).toEqual(["past", "wed", "next"]);
  });
  it("keeps the calendar to its drawn days", () => {
    const range = registerRange("next7", { view: "calendar" }, WED);
    expect(ids(registerTabRows(rows, range, "next7", WED))).toEqual(["wed"]);
  });
  it("draws no rows when the calendar's days are empty", () => {
    const range = registerRange("next7", { view: "calendar", week: "2026-10-12" }, WED);
    expect(registerTabRows(rows, range, "next7", WED)).toEqual([]);
  });
  it("draws no rows until the range is known", () => {
    expect(registerTabRows(rows, null, "next7", WED)).toEqual([]);
  });
});

describe("nextAssignRow", () => {
  const id = (r: RegisterRow | null) => r?.task.id ?? null;
  it("picks the soonest unstaffed-today row first", () => {
    const rows = [
      row({ task: { id: "early-short" } as RegisterRow["task"], startMs: NOW + 1000 }),
      row({ task: { id: "late-unstaffed" } as RegisterRow["task"], startMs: NOW + 9000, unstaffedToday: true }),
      row({ task: { id: "later-unstaffed" } as RegisterRow["task"], startMs: NOW + 99000, unstaffedToday: true }),
    ];
    expect(id(nextAssignRow(rows, NOW))).toBe("late-unstaffed");
  });
  it("never picks an unstaffed row the admin could not assign", () => {
    const rows = [
      row({ task: { id: "locked" } as RegisterRow["task"], unstaffedToday: true, assignable: false }),
      row({ task: { id: "short" } as RegisterRow["task"], startMs: NOW + 5000 }),
    ];
    expect(id(nextAssignRow(rows, NOW))).toBe("short");
  });
  it("otherwise picks the soonest assignable row that has not started", () => {
    const rows = [
      row({ task: { id: "later" } as RegisterRow["task"], startMs: NOW + 9000 }),
      row({ task: { id: "sooner" } as RegisterRow["task"], startMs: NOW + 1000 }),
      row({ task: { id: "full" } as RegisterRow["task"], startMs: NOW + 500, assignable: false }),
    ];
    expect(id(nextAssignRow(rows, NOW))).toBe("sooner");
  });
  it("skips a past day and a day that already started", () => {
    const rows = [
      row({ task: { id: "yesterday" } as RegisterRow["task"], dayKey: "2026-09-29", startMs: NOW - 86_400_000 }),
      row({ task: { id: "started" } as RegisterRow["task"], startMs: NOW - 60_000 }),
      row({ task: { id: "tomorrow" } as RegisterRow["task"], startMs: NOW + 86_400_000 }),
    ];
    expect(id(nextAssignRow(rows, NOW))).toBe("tomorrow");
  });
  it("skips a day whose start cannot be read", () => {
    expect(nextAssignRow([row({ startMs: Number.NaN })], NOW)).toBeNull();
  });
  it("is null when nothing can be assigned", () => {
    expect(nextAssignRow([row({ assignable: false })], NOW)).toBeNull();
    expect(nextAssignRow([], NOW)).toBeNull();
  });
});
