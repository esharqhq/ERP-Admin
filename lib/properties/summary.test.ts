import { describe, expect, it } from "vitest";
import {
  SUMMARY_FILTER_KEYS,
  matchesSummaryFilter,
  summarise,
} from "@/lib/properties/summary";
import type { PropertyDto } from "@/lib/types/property.types";

function property(over: Partial<PropertyDto> = {}): PropertyDto {
  return {
    id: "p1",
    bossOwnerUserId: "o1",
    name: "Sonnenhof",
    address: "Bergmannstraße 42",
    lat: 52.4,
    long: 13.3,
    category: { id: "c1", code: "APARTMENT", nameEn: "Apartment", nameDe: "Wohnung" },
    entryInstructions: "",
    floorCount: 6,
    roomCount: 48,
    areaSqm: 1840,
    createdAt: "2026-08-12T00:00:00Z",
    isDeleted: false,
    media: [],
    ...over,
  };
}

const ACTIVE = new Set(["APARTMENT", "OFFICE"]);

describe("summarise", () => {
  it("counts nothing wrong with a complete set", () => {
    const s = summarise([property({ media: [{ id: "m" }] as never })], ACTIVE, 0);
    expect(s.noPhotos).toBe(0);
    expect(s.noArea).toBe(0);
    expect(s.retiredCategory).toBe(0);
    expect(s.inBin).toBe(0);
    expect(s.total).toBe(1);
  });

  it("counts a property with an empty gallery", () => {
    expect(summarise([property({ media: [] })], ACTIVE, 0).noPhotos).toBe(1);
  });

  /**
   * ⚠ The load-bearing case. `media` is `null` unless the request carried
   * `?withMedia=true`, and null means **not asked for**, not "no photos". A page
   * that forgets the parameter would otherwise report every property as missing
   * its gallery.
   */
  it("does NOT count an unfetched gallery as missing", () => {
    expect(summarise([property({ media: null })], ACTIVE, 0).noPhotos).toBe(0);
  });

  it("counts a null floor area", () => {
    expect(summarise([property({ areaSqm: null })], ACTIVE, 0).noArea).toBe(1);
  });

  // A real zero is a measured value, not an absent one.
  it("does not count a zero floor area", () => {
    expect(summarise([property({ areaSqm: 0 })], ACTIVE, 0).noArea).toBe(0);
  });

  it("counts a category the active list no longer holds", () => {
    const rows = [property({ category: { ...property().category, code: "HOSTEL" } })];
    expect(summarise(rows, ACTIVE, 0).retiredCategory).toBe(1);
  });

  /**
   * The active list arrives on its own request. Before it does, the set is empty
   * and **every** category would look retired — so an unresolved list reports
   * zero rather than accusing the whole table.
   */
  it("reports no retired categories until the active list has arrived", () => {
    expect(summarise([property()], new Set<string>(), 0).retiredCategory).toBe(0);
  });

  it("takes the bin count from its own read", () => {
    expect(summarise([property()], ACTIVE, 4).inBin).toBe(4);
  });

  it("counts one property under several headings at once", () => {
    const rows = [
      property({
        media: [],
        areaSqm: null,
        category: { ...property().category, code: "HOSTEL" },
      }),
    ];
    const s = summarise(rows, ACTIVE, 0);
    expect([s.noPhotos, s.noArea, s.retiredCategory]).toEqual([1, 1, 1]);
  });

  it("is all zeroes for an empty table", () => {
    expect(summarise([], ACTIVE, 0)).toEqual({
      total: 0,
      noPhotos: 0,
      noArea: 0,
      retiredCategory: 0,
      inBin: 0,
    });
  });
});

describe("matchesSummaryFilter", () => {
  it("passes everything when no summary filter is set", () => {
    expect(matchesSummaryFilter(property(), {}, ACTIVE)).toBe(true);
  });

  it("narrows to properties with an empty gallery", () => {
    const on = { noPhotos: "true" };
    expect(matchesSummaryFilter(property({ media: [] }), on, ACTIVE)).toBe(true);
    expect(
      matchesSummaryFilter(property({ media: [{ id: "m" }] as never }), on, ACTIVE),
    ).toBe(false);
  });

  it("narrows to properties with no floor area", () => {
    const on = { noArea: "true" };
    expect(matchesSummaryFilter(property({ areaSqm: null }), on, ACTIVE)).toBe(true);
    expect(matchesSummaryFilter(property({ areaSqm: 12 }), on, ACTIVE)).toBe(false);
  });

  it("narrows to properties on a retired category", () => {
    const on = { retired: "true" };
    const retired = property({ category: { ...property().category, code: "HOSTEL" } });
    expect(matchesSummaryFilter(retired, on, ACTIVE)).toBe(true);
    expect(matchesSummaryFilter(property(), on, ACTIVE)).toBe(false);
  });

  // Two tiles clicked in turn is an AND, like every other filter on this table.
  it("combines with AND", () => {
    const on = { noPhotos: "true", noArea: "true" };
    expect(matchesSummaryFilter(property({ media: [], areaSqm: null }), on, ACTIVE)).toBe(
      true,
    );
    expect(matchesSummaryFilter(property({ media: [], areaSqm: 90 }), on, ACTIVE)).toBe(
      false,
    );
  });

  // Anything unrecognised is off — the URL is hand-editable.
  it("ignores a value that is neither \"true\" nor \"false\"", () => {
    expect(matchesSummaryFilter(property({ media: [{ id: "m" }] as never }), { noPhotos: "1" }, ACTIVE)).toBe(true);
  });

  /**
   * `"false"` is the band's other real option — *"which properties DO have
   * photos"* — and it is not the same as omitting the filter. A checkbox cannot
   * express that difference, which is why these are `triState` fields.
   */
  it("narrows to the rows WITHOUT the defect on \"false\"", () => {
    const on = { noPhotos: "false" };
    expect(
      matchesSummaryFilter(property({ media: [{ id: "m" }] as never }), on, ACTIVE),
    ).toBe(true);
    expect(matchesSummaryFilter(property({ media: [] }), on, ACTIVE)).toBe(false);
  });

  it("narrows to properties that DO have a floor area", () => {
    const on = { noArea: "false" };
    expect(matchesSummaryFilter(property({ areaSqm: 90 }), on, ACTIVE)).toBe(true);
    expect(matchesSummaryFilter(property({ areaSqm: null }), on, ACTIVE)).toBe(false);
  });

  it("keeps its keys in step with the filter it implements", () => {
    expect(SUMMARY_FILTER_KEYS).toEqual(["noPhotos", "noArea", "retired"]);
  });
});
