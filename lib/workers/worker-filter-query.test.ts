import { describe, expect, it } from "vitest";
import { buildWorkerFilterQuery } from "@/lib/workers/worker-filter-query";

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

  it("wraps the single profession into the repeatable param", () => {
    expect(buildWorkerFilterQuery({ professionId: "p1" })).toEqual({
      ok: true,
      query: { professionIds: ["p1"] },
    });
  });

  it("coerces counts and keeps a real zero", () => {
    expect(buildWorkerFilterQuery({ completedMin: "0", completedMax: "0" })).toEqual({
      ok: true,
      query: { completedMin: 0, completedMax: 0 },
    });
  });

  // Same omit-vs-false trap as the owners table's `neverOrdered`.
  it("omits the booleans when unset and sends false when explicitly chosen", () => {
    expect(buildWorkerFilterQuery({})).toEqual({ ok: true, query: {} });
    expect(buildWorkerFilterQuery({ onTask: "false" })).toEqual({
      ok: true,
      query: { onTask: false },
    });
    expect(buildWorkerFilterQuery({ hasActiveContract: "true" })).toEqual({
      ok: true,
      query: { hasActiveContract: true },
    });
  });

  it("sends ratingMin as a threshold with no second bound", () => {
    expect(buildWorkerFilterQuery({ ratingMin: "4" })).toEqual({
      ok: true,
      query: { ratingMin: 4 },
    });
  });

  // `includeUnrated` decides whether unrated workers survive ALONGSIDE the
  // threshold set, so alone it describes a set nobody asked to narrow.
  it("only sends includeUnrated when a rating threshold is set", () => {
    expect(buildWorkerFilterQuery({ includeUnrated: "true" })).toEqual({
      ok: true,
      query: {},
    });
    expect(buildWorkerFilterQuery({ ratingMin: "4", includeUnrated: "true" })).toEqual({
      ok: true,
      query: { ratingMin: 4, includeUnrated: true },
    });
    expect(buildWorkerFilterQuery({ ratingMin: "4", includeUnrated: "false" })).toEqual({
      ok: true,
      query: { ratingMin: 4, includeUnrated: false },
    });
  });

  it("refuses reversed ranges instead of letting the server 400", () => {
    expect(
      buildWorkerFilterQuery({ registeredFrom: "2026-03-01", registeredTo: "2026-02-01" }),
    ).toEqual({ ok: false });
    expect(buildWorkerFilterQuery({ experienceMin: "9", experienceMax: "2" })).toEqual({
      ok: false,
    });
    expect(buildWorkerFilterQuery({ completedMin: "-1" })).toEqual({ ok: false });
  });

  it("never sends employeeType, which has no enum to pick from", () => {
    expect(buildWorkerFilterQuery({ employeeType: "Full" })).toEqual({
      ok: true,
      query: {},
    });
  });
});
