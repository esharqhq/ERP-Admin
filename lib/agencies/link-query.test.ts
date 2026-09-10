import { describe, expect, it } from "vitest";
import {
  buildLinkQuery,
  LINK_FILTER_KEYS,
  LINK_SORT_COLUMNS,
} from "@/lib/agencies/link-query";

const BASE = {
  filters: {} as Record<string, string>,
  tab: "Disputed",
  search: "",
  sort: null,
  page: 1,
  pageSize: 25,
};

describe("buildLinkQuery", () => {
  it("always sends the page and the page size", () => {
    expect(buildLinkQuery({ ...BASE, page: 3, pageSize: 50 })).toMatchObject({
      page: 3,
      pageSize: 50,
    });
  });

  it("sends the tab as the status", () => {
    expect(buildLinkQuery(BASE).status).toBe("Disputed");
  });

  /**
   * ⚠ `"all"` is a **tab**, not a status. `?status=all` would be refused, and the
   * absence of the param is what "every status" means on this route.
   */
  it("sends no status at all for the all tab", () => {
    expect("status" in buildLinkQuery({ ...BASE, tab: "all" })).toBe(false);
  });

  it("trims the search and omits it when empty", () => {
    expect(buildLinkQuery({ ...BASE, search: "  Vogel  " }).search).toBe("Vogel");
    expect("search" in buildLinkQuery({ ...BASE, search: "   " })).toBe(false);
  });

  it("passes the filter keys it owns", () => {
    const q = buildLinkQuery({
      ...BASE,
      filters: { agencyId: "a-1", workerId: "w-1" },
    });
    expect(q.agencyId).toBe("a-1");
    expect(q.workerId).toBe("w-1");
  });

  /**
   * `workerId` has no control on the screen — the bell and the worker card
   * deep-link it. It is read from the URL and never drawn, so it must survive a
   * build that has no filter field for it.
   */
  it("carries workerId even though no control writes it", () => {
    expect(LINK_FILTER_KEYS).toContain("workerId");
  });

  it("ignores a filter key it does not own", () => {
    const q = buildLinkQuery({ ...BASE, filters: { nonsense: "x" } }) as Record<
      string,
      unknown
    >;
    expect("nonsense" in q).toBe(false);
  });

  /**
   * ⚠ **Where the two `dir` casings meet.** `useTableUrlState` holds lowercase
   * `"asc"`/`"desc"` because that is what an admin may hand-edit in the address
   * bar; the wire wants `SortDir`, which is `"Asc"`/`"Desc"`.
   */
  it("title-cases the direction for the wire", () => {
    expect(
      buildLinkQuery({ ...BASE, sort: { key: "createdAt", dir: "asc" } }).dir,
    ).toBe("Asc");
    expect(
      buildLinkQuery({ ...BASE, sort: { key: "createdAt", dir: "desc" } }).dir,
    ).toBe("Desc");
  });

  it("sends each whitelisted column unchanged", () => {
    for (const key of LINK_SORT_COLUMNS) {
      expect(buildLinkQuery({ ...BASE, sort: { key, dir: "desc" } }).sortBy).toBe(
        key,
      );
    }
  });

  /**
   * ⚠ **The URL is user-editable and outlives the column that wrote it.** A
   * stale bookmark naming a column that is not on the whitelist would answer
   * `400 invalid_sort_column` and blank the whole screen, so it falls back
   * rather than being sent.
   *
   * `workerFullName` is the realistic case: it is a visible column an operator
   * would reasonably expect to sort by, and the route has no such key.
   */
  it("falls back to createdAt for a column the route would refuse", () => {
    expect(
      buildLinkQuery({ ...BASE, sort: { key: "workerFullName", dir: "asc" } })
        .sortBy,
    ).toBe("createdAt");
  });

  it("sends no sort params when nothing is sorted", () => {
    const q = buildLinkQuery(BASE);
    expect("sortBy" in q).toBe(false);
    expect("dir" in q).toBe(false);
  });

  /** The whitelist is exactly the route's, and nothing else can join it. */
  it("whitelists the route's three columns and no more", () => {
    expect([...LINK_SORT_COLUMNS]).toEqual(["createdAt", "resolvedAt", "status"]);
  });
});
