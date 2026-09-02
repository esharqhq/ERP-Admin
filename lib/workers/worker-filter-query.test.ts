import { describe, expect, it } from "vitest";
import {
  buildWorkerFilterQuery,
  reconcileAgencyFilters,
} from "@/lib/workers/worker-filter-query";

describe("buildWorkerFilterQuery", () => {
  it("sends nothing at all when no filter is set", () => {
    expect(buildWorkerFilterQuery({})).toEqual({ ok: true, query: {} });
  });

  it("drops blanks rather than sending them as empty params", () => {
    expect(buildWorkerFilterQuery({ status: "", experienceMin: "" })).toEqual({
      ok: true,
      query: {},
    });
  });

  it("expands the comma-joined multi-select into the repeatable param", () => {
    expect(buildWorkerFilterQuery({ professionIds: "p1,p2" })).toEqual({
      ok: true,
      query: { professionIds: ["p1", "p2"] },
    });
  });

  it("coerces counts and keeps a real zero", () => {
    expect(buildWorkerFilterQuery({ completedMin: "0", completedMax: "0" })).toEqual({
      ok: true,
      query: { completedMin: 0, completedMax: 0 },
    });
  });

  /*
    The rename that fails silently: `?onTask=` is an unknown key now, so a stale
    client gets `200` and the whole unfiltered table. Nothing may emit it.
  */
  it("sends `booked`, and never the retired `onTask`", () => {
    const built = buildWorkerFilterQuery({ booked: "false" });
    expect(built).toEqual({ ok: true, query: { booked: false } });
    expect(Object.keys(built.ok ? built.query : {})).not.toContain("onTask");
  });

  it("keeps omit, true and false apart on every three-state filter", () => {
    expect(buildWorkerFilterQuery({ startingSoon: "" })).toEqual({
      ok: true,
      query: {},
    });
    expect(buildWorkerFilterQuery({ startingSoon: "true", idleWeek: "false" })).toEqual({
      ok: true,
      query: { startingSoon: true, idleWeek: false },
    });
  });

  it("passes the single availability date straight through", () => {
    expect(buildWorkerFilterQuery({ availableOn: "2026-09-03" })).toEqual({
      ok: true,
      query: { availableOn: "2026-09-03" },
    });
  });

  it("carries the location ids and the agency pair", () => {
    expect(
      buildWorkerFilterQuery({
        countryId: "c1",
        cityId: "c2",
        agencySource: "ViaAgency",
        agencyId: "a1",
      }),
    ).toEqual({
      ok: true,
      query: {
        countryId: "c1",
        cityId: "c2",
        agencySource: "ViaAgency",
        agencyId: "a1",
      },
    });
  });

  it("keeps includeUnrated only beside a threshold", () => {
    expect(buildWorkerFilterQuery({ includeUnrated: "true" })).toEqual({
      ok: true,
      query: {},
    });
    expect(
      buildWorkerFilterQuery({ ratingMin: "4", includeUnrated: "true" }),
    ).toEqual({ ok: true, query: { ratingMin: 4, includeUnrated: true } });
    expect(
      buildWorkerFilterQuery({ ratingMin: "4", includeUnrated: "false" }),
    ).toEqual({ ok: true, query: { ratingMin: 4, includeUnrated: false } });
  });

  it("refuses a rating outside 0..5 instead of letting the server 400", () => {
    expect(buildWorkerFilterQuery({ ratingMin: "6" })).toEqual({ ok: false });
    expect(buildWorkerFilterQuery({ ratingMin: "-1" })).toEqual({ ok: false });
    expect(buildWorkerFilterQuery({ ratingMin: "0" })).toEqual({
      ok: true,
      query: { ratingMin: 0 },
    });
  });

  it("refuses inverted and negative ranges", () => {
    expect(
      buildWorkerFilterQuery({ registeredFrom: "2026-03-01", registeredTo: "2026-02-01" }),
    ).toEqual({ ok: false });
    expect(
      buildWorkerFilterQuery({ lastSeenFrom: "2026-03-01", lastSeenTo: "2026-02-01" }),
    ).toEqual({ ok: false });
    expect(buildWorkerFilterQuery({ experienceMin: "9", experienceMax: "2" })).toEqual({
      ok: false,
    });
    expect(buildWorkerFilterQuery({ completedMin: "-1" })).toEqual({ ok: false });
  });

  /* `NULL <= x` is false in SQL, so the pair describes the empty set. */
  it("refuses neverLoggedIn=true beside a lastSeen bound, and allows false", () => {
    expect(
      buildWorkerFilterQuery({ neverLoggedIn: "true", lastSeenFrom: "2026-01-01" }),
    ).toEqual({ ok: false });
    expect(
      buildWorkerFilterQuery({ neverLoggedIn: "true", lastSeenTo: "2026-01-01" }),
    ).toEqual({ ok: false });
    expect(
      buildWorkerFilterQuery({ neverLoggedIn: "false", lastSeenFrom: "2026-01-01" }),
    ).toEqual({
      ok: true,
      query: { neverLoggedIn: false, lastSeenFrom: "2026-01-01" },
    });
    expect(buildWorkerFilterQuery({ neverLoggedIn: "true" })).toEqual({
      ok: true,
      query: { neverLoggedIn: true },
    });
  });

  it("never sends employeeType, which the backend removed", () => {
    expect(buildWorkerFilterQuery({ employeeType: "FullTime" })).toEqual({
      ok: true,
      query: {},
    });
  });
});

describe("reconcileAgencyFilters", () => {
  it("clears a named agency when Independent is picked", () => {
    expect(
      reconcileAgencyFilters({ agencyId: "a1" }, "agencySource", "Independent"),
    ).toEqual({ agencySource: "Independent", agencyId: "" });
  });

  it("keeps a named agency alongside ViaAgency", () => {
    expect(
      reconcileAgencyFilters({ agencyId: "a1" }, "agencySource", "ViaAgency"),
    ).toEqual({ agencySource: "ViaAgency", agencyId: "a1" });
  });

  it("drops Independent when an agency is named", () => {
    expect(
      reconcileAgencyFilters({ agencySource: "Independent" }, "agencyId", "a1"),
    ).toEqual({ agencyId: "a1", agencySource: "" });
  });

  it("leaves the other half alone when a pick is cleared", () => {
    expect(
      reconcileAgencyFilters({ agencySource: "ViaAgency" }, "agencyId", ""),
    ).toEqual({ agencyId: "", agencySource: "ViaAgency" });
  });
});
