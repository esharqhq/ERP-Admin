import { describe, expect, it } from "vitest";
import {
  REGISTER_FILTER_KEYS, bandResetPatch, bandValues, isBandFiltered,
  isCapped, matchesRegister, matchesSearch, resolveWindow, staffingBucket, tabMatches,
  type RegisterLookups,
} from "@/lib/tasks/register/filters";
import type { RegisterRow } from "@/lib/tasks/register/rows";

const TODAY = "2026-09-27"; // a Sunday
const lookups: RegisterLookups = { cityByProperty: new Map([["p-1", "c-berlin"]]), walkInOwnerId: "o-walk" };

function row(over: Partial<RegisterRow> = {}): RegisterRow {
  return {
    task: { id: "t-12345678", propertyId: "p-1", propertyName: "Sonnenhof", requiredWorkerCount: 2 },
    group: null, title: "House cleaning", repeating: false, status: "Open",
    staffing: { filled: 1, required: 2, gap: 1, covered: false }, over: 0, professionIds: ["pr-1"],
    dayKey: TODAY, startMs: 0, startTime: "09:00", endTime: "15:00", durationH: 6,
    unstaffedToday: false, startsSoon: false, assignable: true, ownerId: "o-1", ratingFloor: 4,
    createdAt: null, hasCheckin: false, ...over,
  } as RegisterRow;
}

describe("resolveWindow", () => {
  it("defaults to this week, Monday to Sunday", () => {
    const w = resolveWindow("thisWeek", {}, TODAY);
    expect(w.fromKey).toBe("2026-09-21");
    expect(w.toKey).toBe("2026-09-27");
  });
  it("uses today for the today and unstaffed tabs", () => {
    expect(resolveWindow("today", {}, TODAY).fromKey).toBe(TODAY);
    expect(resolveWindow("unstaffed", {}, TODAY).toKey).toBe(TODAY);
  });
  it("uses the next seven days for short and next7", () => {
    const w = resolveWindow("short", {}, TODAY);
    expect(w.fromKey).toBe(TODAY);
    expect(w.toKey).toBe("2026-10-03");
  });
  it("lets an explicit date range win over the tab", () => {
    const w = resolveWindow("today", { from: "2026-09-01", to: "2026-09-10" }, TODAY);
    expect(w).toMatchObject({ fromKey: "2026-09-01", toKey: "2026-09-10" });
  });
  it("sends local midnight and the last local millisecond", () => {
    const w = resolveWindow("today", {}, TODAY);
    const from = new Date(w.fromIso);
    const to = new Date(w.toIso);
    expect([from.getHours(), from.getMinutes()]).toEqual([0, 0]);
    expect([to.getHours(), to.getMinutes(), to.getSeconds(), to.getMilliseconds()]).toEqual([23, 59, 59, 999]);
  });
  it("ignores a malformed bound", () => {
    expect(resolveWindow("thisWeek", { from: "01.09.2026" }, TODAY).fromKey).toBe("2026-09-21");
  });
});

describe("tabMatches", () => {
  it("narrows unstaffed, short and today", () => {
    expect(tabMatches("unstaffed", row({ unstaffedToday: true }), TODAY)).toBe(true);
    expect(tabMatches("unstaffed", row(), TODAY)).toBe(false);
    expect(tabMatches("short", row(), TODAY)).toBe(true);
    expect(tabMatches("short", row({ assignable: false }), TODAY)).toBe(false);
    expect(tabMatches("today", row({ dayKey: "2026-09-28" }), TODAY)).toBe(false);
    expect(tabMatches("thisWeek", row({ dayKey: "2026-09-28" }), TODAY)).toBe(true);
  });
});

describe("staffingBucket", () => {
  it("sorts a day into none, short, full or over", () => {
    expect(staffingBucket(row({ staffing: { filled: 0, required: 2, gap: 2, covered: false } }))).toBe("none");
    expect(staffingBucket(row())).toBe("short");
    expect(staffingBucket(row({ staffing: { filled: 2, required: 2, gap: 0, covered: true } }))).toBe("full");
    expect(staffingBucket(row({ over: 1, staffing: { filled: 3, required: 2, gap: 0, covered: true } }))).toBe("over");
  });
});

describe("matchesRegister", () => {
  it("passes everything with no filters", () => {
    expect(matchesRegister(row(), {}, lookups)).toBe(true);
  });
  it("filters by status, staffing, property, city, owner and profession", () => {
    expect(matchesRegister(row(), { status: "Open,Running" }, lookups)).toBe(true);
    expect(matchesRegister(row(), { status: "Done" }, lookups)).toBe(false);
    expect(matchesRegister(row(), { staffing: "full" }, lookups)).toBe(false);
    expect(matchesRegister(row(), { property: "p-2" }, lookups)).toBe(false);
    expect(matchesRegister(row(), { city: "c-berlin" }, lookups)).toBe(true);
    expect(matchesRegister(row(), { city: "c-munich" }, lookups)).toBe(false);
    expect(matchesRegister(row(), { owner: "o-1" }, lookups)).toBe(true);
    expect(matchesRegister(row(), { profession: "pr-9" }, lookups)).toBe(false);
  });
  it("filters by time of day, overdue, repeating and check-in", () => {
    expect(matchesRegister(row(), { startAfter: "10:00" }, lookups)).toBe(false);
    expect(matchesRegister(row(), { startBefore: "10:00" }, lookups)).toBe(true);
    expect(matchesRegister(row(), { overdue: "true" }, lookups)).toBe(false);
    expect(matchesRegister(row({ status: "Overdue" }), { overdue: "true" }, lookups)).toBe(true);
    expect(matchesRegister(row(), { repeating: "true" }, lookups)).toBe(false);
    expect(matchesRegister(row(), { checkedIn: "true" }, lookups)).toBe(false);
  });
  it("filters by workers required and rating floor", () => {
    expect(matchesRegister(row(), { reqMin: "3" }, lookups)).toBe(false);
    expect(matchesRegister(row(), { reqMax: "2" }, lookups)).toBe(true);
    expect(matchesRegister(row(), { ratingMin: "4.5" }, lookups)).toBe(false);
    expect(matchesRegister(row({ ratingFloor: null }), { ratingMin: "1" }, lookups)).toBe(false);
  });
  it("walk-in only needs the walk-in owner", () => {
    expect(matchesRegister(row({ ownerId: "o-walk" }), { walkIn: "true" }, lookups)).toBe(true);
    expect(matchesRegister(row(), { walkIn: "true" }, lookups)).toBe(false);
  });
  it("does not crash on a day without its booking", () => {
    const orphan = row({ ownerId: null, ratingFloor: null, professionIds: [], title: null });
    expect(matchesRegister(orphan, { owner: "o-1", profession: "pr-1" }, lookups)).toBe(false);
    expect(matchesRegister(orphan, {}, lookups)).toBe(true);
  });
  it("ignores a non-numeric bound", () => {
    expect(matchesRegister(row(), { reqMin: "abc" }, lookups)).toBe(true);
  });
});

describe("matchesSearch", () => {
  it("matches the title, the property and the short id", () => {
    expect(matchesSearch(row(), "house")).toBe(true);
    expect(matchesSearch(row(), "sonnen")).toBe(true);
    expect(matchesSearch(row(), "t-1234")).toBe(true);
    expect(matchesSearch(row({ title: null }), "house")).toBe(false);
  });
});

describe("isCapped", () => {
  it("is true at the 5,000-row ceiling", () => {
    expect(isCapped(4999)).toBe(false);
    expect(isCapped(5000)).toBe(true);
  });
});

describe("the view keys", () => {
  it("share the URL mechanism but are not filters", () => {
    expect(REGISTER_FILTER_KEYS).toEqual(expect.arrayContaining(["view", "week", "from", "status"]));
    expect(bandValues({ view: "calendar", week: "2026-10-05", status: "Open" })).toEqual({ status: "Open" });
    expect(isBandFiltered({ view: "calendar", week: "2026-10-05" }, "")).toBe(false);
    expect(isBandFiltered({ view: "calendar", status: "Open" }, "")).toBe(true);
    expect(isBandFiltered({ view: "calendar" }, "  sonne ")).toBe(true);
  });
  it("clear every band key and keep the drawing and the week", () => {
    const patch = bandResetPatch();
    expect(Object.keys(patch)).not.toContain("view");
    expect(Object.keys(patch)).not.toContain("week");
    expect(patch).toMatchObject({ from: "", to: "", status: "", ratingMin: "" });
  });
});
