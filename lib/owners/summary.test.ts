import { describe, expect, it } from "vitest";
import { OWNER_SUMMARY_TILES } from "@/lib/owners/summary";
import { isTileActive, toggleTileFilter } from "@/lib/workers/summary";
import { buildOwnerFilterQuery } from "@/lib/owners/owner-filter-query";

const tile = (id: string) => {
  const t = OWNER_SUMMARY_TILES.find((x) => x.id === id);
  if (!t) throw new Error(`no tile ${id}`);
  return t;
};

describe("OWNER_SUMMARY_TILES", () => {
  it("counts the same population it narrows to", () => {
    // The bug this shape exists to make unspellable: a tile that probes one set
    // and filters to another reports a number the table can never show.
    for (const t of OWNER_SUMMARY_TILES) {
      for (const [key, value] of Object.entries(t.filter)) {
        expect(String(t.query[key as keyof typeof t.query])).toBe(value);
      }
    }
  });

  it("pins ownerType on every probe, as the table's tabs do", () => {
    // Without this the walk-in system account is counted in a strip sitting
    // above a table that excludes it.
    for (const t of OWNER_SUMMARY_TILES) {
      expect(t.query.ownerType).toBe("Regular");
    }
  });

  it("has no Blocked tile — the owner table has no administrative block", () => {
    // `?status=Blocked` on owners is a 400, so a tile for it could only ever
    // report a failed probe as 0.
    expect(OWNER_SUMMARY_TILES.some((t) => t.filter.status === "Blocked")).toBe(false);
  });
});

describe("owner tile round-trip", () => {
  it("lights only when its own narrowing is the one on screen", () => {
    expect(isTileActive(tile("review"), { onboardingStatus: "Review" })).toBe(true);
    expect(isTileActive(tile("review"), { onboardingStatus: "Kyc" })).toBe(false);
    expect(isTileActive(tile("awaitingDocs"), { onboardingStatus: "Kyc" })).toBe(true);
  });

  it("clicking the lit tile clears it", () => {
    const on = toggleTileFilter(tile("lapsed"), {});
    expect(on).toEqual({ status: "Lapsed" });
    expect(toggleTileFilter(tile("lapsed"), on)).toEqual({ status: "" });
  });

  it("neverOrdered writes the string, not an empty value", () => {
    // An empty value means "no opinion" and would count the whole table.
    expect(toggleTileFilter(tile("neverOrdered"), {})).toEqual({ neverOrdered: "true" });
  });

  it("a tile's own filter survives the query builder", () => {
    // ⚠ The one combination the server refuses is `neverOrdered` together with a
    // last-ordered date range. A tile writes only its own key, so on its own it
    // can never build that pair.
    const built = buildOwnerFilterQuery({ neverOrdered: "true" });
    expect(built.ok).toBe(true);
  });

  it("refuses neverOrdered beside a date range, before it is ever sent", () => {
    const built = buildOwnerFilterQuery({
      neverOrdered: "true",
      lastOrderedFrom: "2026-09-01",
    });
    expect(built.ok).toBe(false);
  });
});
