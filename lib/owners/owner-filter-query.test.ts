import { describe, expect, it } from "vitest";
import {
  buildOwnerFilterQuery,
  clearCityOnCountryChange,
} from "@/lib/owners/owner-filter-query";

const empty: Record<string, string> = {};

describe("buildOwnerFilterQuery", () => {
  it("sends nothing at all when no filter is set", () => {
    expect(buildOwnerFilterQuery(empty)).toEqual({ ok: true, query: {} });
  });

  it("drops blanks rather than sending them as empty params", () => {
    expect(buildOwnerFilterQuery({ companyCityId: "", taskCountMin: "" })).toEqual({
      ok: true,
      query: {},
    });
  });

  // `countryId` scopes which cities are offered; it is not a filter and the API
  // has no param for it. Sending it would be a 400 on an unknown query key.
  it("never sends countryId, which only scopes the city list", () => {
    expect(buildOwnerFilterQuery({ countryId: "de" })).toEqual({ ok: true, query: {} });
  });

  // The single most consequential rule in this file.
  it("omits neverOrdered when Any, and sends false when Has ordered", () => {
    expect(buildOwnerFilterQuery(empty).ok && buildOwnerFilterQuery(empty)).toEqual({
      ok: true,
      query: {},
    });
    expect(buildOwnerFilterQuery({ neverOrdered: "false" })).toEqual({
      ok: true,
      query: { neverOrdered: false },
    });
    expect(buildOwnerFilterQuery({ neverOrdered: "true" })).toEqual({
      ok: true,
      query: { neverOrdered: true },
    });
  });

  it("coerces counts to numbers and keeps a real zero", () => {
    expect(buildOwnerFilterQuery({ taskCountMin: "0", taskCountMax: "5" })).toEqual({
      ok: true,
      query: { taskCountMin: 0, taskCountMax: 5 },
    });
  });

  it("passes the text filters through untouched", () => {
    expect(
      buildOwnerFilterQuery({ companyCityId: "berlin-id", registeredFrom: "2026-01-01" }),
    ).toEqual({
      ok: true,
      query: { companyCityId: "berlin-id", registeredFrom: "2026-01-01" },
    });
  });

  it("refuses a reversed date range instead of letting the server 400", () => {
    expect(
      buildOwnerFilterQuery({
        lastOrderedFrom: "2026-03-01",
        lastOrderedTo: "2026-02-01",
      }),
    ).toEqual({ ok: false });
    expect(
      buildOwnerFilterQuery({ registeredFrom: "2026-03-01", registeredTo: "2026-02-01" }),
    ).toEqual({ ok: false });
  });

  it("refuses a reversed or negative count range", () => {
    expect(buildOwnerFilterQuery({ taskCountMin: "9", taskCountMax: "2" })).toEqual({
      ok: false,
    });
    expect(buildOwnerFilterQuery({ propertyCountMin: "-1" })).toEqual({ ok: false });
  });

  it("refuses never-ordered combined with either date bound", () => {
    expect(
      buildOwnerFilterQuery({ neverOrdered: "true", lastOrderedFrom: "2026-01-01" }),
    ).toEqual({ ok: false });
    expect(
      buildOwnerFilterQuery({ neverOrdered: "true", lastOrderedTo: "2026-01-01" }),
    ).toEqual({ ok: false });
  });

  it("allows has-ordered combined with a date range, which is the useful pairing", () => {
    expect(
      buildOwnerFilterQuery({ neverOrdered: "false", lastOrderedFrom: "2026-01-01" }),
    ).toEqual({
      ok: true,
      query: { neverOrdered: false, lastOrderedFrom: "2026-01-01" },
    });
  });
});

describe("clearCityOnCountryChange", () => {
  // A stale companyCityId returns an EMPTY PAGE, not an error, so a city left over
  // from the previous country looks like a legitimately empty result.
  it("drops the city when the country changes", () => {
    const next = clearCityOnCountryChange(
      { countryId: "de", companyCityId: "berlin" },
      "at",
    );
    expect(next.countryId).toBe("at");
    expect(next.companyCityId).toBe("");
  });

  it("keeps the city when the country is unchanged", () => {
    const next = clearCityOnCountryChange(
      { countryId: "de", companyCityId: "berlin" },
      "de",
    );
    expect(next.companyCityId).toBe("berlin");
  });

  it("clears the city when the country is cleared back to Any", () => {
    const next = clearCityOnCountryChange(
      { countryId: "de", companyCityId: "berlin" },
      "",
    );
    expect(next.countryId).toBe("");
    expect(next.companyCityId).toBe("");
  });
});
