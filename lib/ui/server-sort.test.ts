import { describe, expect, it } from "vitest";
import { serverSortParams, sortKeyFor } from "@/lib/ui/server-sort";

/** A slice of the workers registry: two sortable columns and two inert ones. */
const COLUMNS = [
  { id: "worker", sortKey: "fullName" },
  { id: "status" },
  { id: "lastSeen", sortKey: "lastSeenAt" },
  { id: "location" },
];

describe("sortKeyFor", () => {
  it("maps the column id in the URL to the API's own field", () => {
    expect(sortKeyFor(COLUMNS, { key: "lastSeen", dir: "desc" })).toBe("lastSeenAt");
  });

  it("gives nothing for an inert column", () => {
    expect(sortKeyFor(COLUMNS, { key: "status", dir: "asc" })).toBeUndefined();
  });

  it("gives nothing for a column the registry has lost", () => {
    expect(sortKeyFor(COLUMNS, { key: "employeeType", dir: "asc" })).toBeUndefined();
  });

  it("gives nothing when nothing is sorted", () => {
    expect(sortKeyFor(COLUMNS, null)).toBeUndefined();
  });
});

describe("serverSortParams", () => {
  it("title-cases the direction for the wire", () => {
    expect(serverSortParams(COLUMNS, { key: "worker", dir: "asc" })).toEqual({
      sortBy: "fullName",
      dir: "Asc",
    });
    expect(serverSortParams(COLUMNS, { key: "worker", dir: "desc" })).toEqual({
      sortBy: "fullName",
      dir: "Desc",
    });
  });

  /*
    The whole reason this function exists. `dir` alone describes an ordering
    nobody asked for, and a `sortBy` the whitelist does not hold is a
    `400 invalid_sort_column` — which on a table reads as "no workers match".
  */
  it("sends neither param when the column cannot be sorted", () => {
    expect(serverSortParams(COLUMNS, { key: "status", dir: "desc" })).toEqual({});
    expect(serverSortParams(COLUMNS, null)).toEqual({});
  });

  it("never emits a key an inert header could reach", () => {
    for (const column of COLUMNS.filter((c) => !c.sortKey)) {
      const params = serverSortParams(COLUMNS, { key: column.id, dir: "desc" });
      expect(Object.keys(params), column.id).toEqual([]);
    }
  });

  /** Spreading the result into a query must add nothing when it is empty. */
  it("spreads into a query without leaving undefined keys behind", () => {
    const query = { page: 1, ...serverSortParams(COLUMNS, null) };
    expect(Object.keys(query)).toEqual(["page"]);
  });
});
