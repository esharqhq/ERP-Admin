import { describe, expect, it } from "vitest";
import {
  REGISTER_FILTER_KEYS, activeTile, bandResetPatch, bandValues, isBandFiltered,
  isCapped, matchesRegister, matchesSearch, resolveWindow, staffingBucket, tabMatches, tabPatch, tabSpan,
  tilePatch, type RegisterLookups,
} from "@/lib/tasks/register/filters";
import type { RegisterRow } from "@/lib/tasks/register/rows";

const TODAY = "2026-09-27"; // a Sunday
const lookups: RegisterLookups = {
  cityByProperty: new Map([["p-1", "c-berlin"]]),
  bossByProperty: new Map(),
  walkInOwnerId: "o-walk",
};

function row(over: Partial<RegisterRow> = {}): RegisterRow {
  return {
    task: { id: "t-12345678", propertyId: "p-1", propertyName: "Sonnenhof", requiredWorkerCount: 2 },
    group: null, title: "House cleaning", repeating: false, status: "Open",
    staffing: { filled: 1, required: 2, gap: 1, covered: false }, over: 0, professionIds: ["pr-1"],
    dayKey: TODAY, startMs: 0, startTime: "09:00", endTime: "15:00", durationH: 6,
    unstaffedToday: false, startsSoon: false, assignable: true, open: true, ownerId: "o-1", ratingFloor: 4,
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
  it("keeps next7 to the open days — what the Next 7 days tile counts", () => {
    expect(tabMatches("next7", row(), TODAY)).toBe(true);
    // Fully staffed but still open: planned work, counted by the tile.
    expect(tabMatches("next7", row({ assignable: false, open: true }), TODAY)).toBe(true);
    expect(tabMatches("next7", row({ status: "Done", assignable: false, open: false }), TODAY)).toBe(false);
    expect(tabMatches("next7", row({ status: "Cancelled", assignable: false, open: false }), TODAY)).toBe(false);
  });
});

describe("tabSpan", () => {
  it("is the tab's own days — none for this week, whose range is the week on screen", () => {
    expect(tabSpan("thisWeek", TODAY)).toBeNull();
    expect(tabSpan("anything", TODAY)).toBeNull();
    expect(tabSpan("today", TODAY)).toEqual({ from: TODAY, to: TODAY });
    expect(tabSpan("unstaffed", TODAY)).toEqual({ from: TODAY, to: TODAY });
    expect(tabSpan("short", TODAY)).toEqual({ from: TODAY, to: "2026-10-03" });
    expect(tabSpan("next7", TODAY)).toEqual({ from: TODAY, to: "2026-10-03" });
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

describe("tabPatch", () => {
  it("applies the saved view in one write: the tab, with the band's dates and the week cleared", () => {
    expect(tabPatch("today")).toEqual({ tab: "today", from: "", to: "", overdue: "", week: "" });
  });
  it("writes the default tab as no param", () => {
    expect(tabPatch("thisWeek")).toMatchObject({ tab: "" });
  });
  it("keeps the drawing and every other band filter — it never names them", () => {
    const patch = tabPatch("next7");
    expect(Object.keys(patch)).not.toContain("view");
    expect(Object.keys(patch)).not.toContain("status");
    expect(Object.keys(patch)).not.toContain("property");
  });
  it("lets the tab's own window win again (repro: a paged week handed to the List, then Today)", () => {
    // Calendar › next week → List wrote next week as from/to; the Today tab must land on today.
    const url = { from: "2026-10-05", to: "2026-10-11", view: "", status: "Open" };
    const next = Object.fromEntries(
      Object.entries({ ...url, ...tabPatch("today") }).filter(([, v]) => v !== ""),
    );
    expect(resolveWindow("today", next, TODAY)).toMatchObject({ fromKey: TODAY, toKey: TODAY });
    expect(next).toMatchObject({ status: "Open" });
  });
});

describe("activeTile", () => {
  it("lights the tile of the current tab while no dates override it", () => {
    expect(activeTile("unstaffed", {})).toBe("unstaffed");
    expect(activeTile("short", {})).toBe("short");
    expect(activeTile("next7", {})).toBe("next7");
    expect(activeTile("next7", { from: "2026-10-01" })).toBeNull();
  });
  it("has no tile for this week or today", () => {
    expect(activeTile("thisWeek", {})).toBeNull();
    expect(activeTile("today", {})).toBeNull();
  });
  it("lights overdue whenever its filter is on", () => {
    expect(activeTile("thisWeek", { overdue: "true", from: "2026-09-25", to: TODAY })).toBe("overdue");
  });
});

describe("tilePatch", () => {
  it("lands a tab tile on its own window in either drawing", () => {
    expect(tilePatch("unstaffed", TODAY)).toEqual({ tab: "unstaffed", overdue: "", from: "", to: "", week: "" });
    expect(tilePatch("thisWeek", TODAY)).toMatchObject({ tab: "" });
  });
  it("is the saved view's own patch for a tab tile", () => {
    for (const tab of ["thisWeek", "today", "unstaffed", "short", "next7"] as const) {
      expect(tilePatch(tab, TODAY)).toEqual(tabPatch(tab));
    }
  });
  it("lands overdue on the backstop span, in the List — it is not a Mon–Sun week", () => {
    // Tue 2026-09-29: the span reaches back into the previous week.
    expect(tilePatch("overdue", "2026-09-29")).toEqual({
      tab: "", overdue: "true", from: "2026-09-27", to: "2026-09-29", week: "", view: "",
    });
  });
});

describe("Owner filter — the property's BOSS, not whoever booked (§0k·3, f-02a-1 §7)", () => {
  const boss = "boss-1";
  const manager = "manager-9";
  const lk: RegisterLookups = { ...lookups, bossByProperty: new Map([["p-1", boss]]) };
  const at = (propertyId: string, ownerId: string) =>
    row({ task: { id: "t-1", propertyId, propertyName: "Sonnenhof", requiredWorkerCount: 2 } as RegisterRow["task"], ownerId });
  it("keeps a booking a manager made at the BOSS's property", () => {
    expect(matchesRegister(at("p-1", manager), { owner: boss }, lk)).toBe(true);
  });
  it("drops it for the manager's own id — they own no property", () => {
    expect(matchesRegister(at("p-1", manager), { owner: manager }, lk)).toBe(false);
  });
  it("falls back to ownerId when the property is not in the list", () => {
    expect(matchesRegister(at("p-unknown", boss), { owner: boss }, lk)).toBe(true);
  });
  it("the walk-in filter uses the same match", () => {
    expect(matchesRegister(at("p-1", manager), { walkIn: "true" }, { ...lk, walkInOwnerId: boss })).toBe(true);
  });
});
