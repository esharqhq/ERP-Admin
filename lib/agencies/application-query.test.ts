import { describe, expect, it } from "vitest";
import {
  APPLICATION_SORT_COLUMNS,
  buildApplicationQuery,
} from "@/lib/agencies/application-query";

const BASE = {
  filters: {} as Record<string, string>,
  tab: "Pending",
  search: "",
  sort: null,
  page: 1,
  pageSize: 25,
};

describe("buildApplicationQuery", () => {
  it("sends the tab as the status param", () => {
    expect(buildApplicationQuery(BASE).status).toBe("Pending");
  });

  /** The "all" tab is the absence of a status, not a status called "all". */
  it("omits status entirely on the all tab", () => {
    expect(buildApplicationQuery({ ...BASE, tab: "all" }).status).toBeUndefined();
  });

  it("passes paging through", () => {
    const q = buildApplicationQuery({ ...BASE, page: 3, pageSize: 50 });
    expect(q.page).toBe(3);
    expect(q.pageSize).toBe(50);
  });

  it("sends a non-blank search and omits a blank one", () => {
    expect(buildApplicationQuery({ ...BASE, search: "nordwind" }).search).toBe(
      "nordwind",
    );
    expect(buildApplicationQuery({ ...BASE, search: "   " }).search).toBeUndefined();
  });

  it("maps every filter key the route accepts", () => {
    const q = buildApplicationQuery({
      ...BASE,
      filters: {
        countryId: "c1",
        cityId: "c2",
        submittedFrom: "2026-08-01",
        submittedTo: "2026-08-31",
      },
    });
    expect(q).toMatchObject({
      countryId: "c1",
      cityId: "c2",
      submittedFrom: "2026-08-01",
      submittedTo: "2026-08-31",
    });
  });

  it("omits a blank filter rather than sending an empty value", () => {
    const q = buildApplicationQuery({ ...BASE, filters: { countryId: "" } });
    expect("countryId" in q).toBe(false);
  });

  /**
   * ⚠ Offset-less dates are accepted by this route, so they pass through
   * unchanged — normalising them here would be inventing a timezone the operator
   * did not choose.
   */
  it("passes an offset-less date through untouched", () => {
    expect(
      buildApplicationQuery({ ...BASE, filters: { submittedFrom: "2026-08-01" } })
        .submittedFrom,
    ).toBe("2026-08-01");
  });

  it("sends a whitelisted sort column and its direction", () => {
    const q = buildApplicationQuery({
      ...BASE,
      sort: { key: "legalName", dir: "asc" },
    });
    expect(q.sortBy).toBe("legalName");
    expect(q.dir).toBe("Asc");
  });

  /**
   * ⚠ The default branch that matters. The URL is user-editable and a stale
   * bookmark must not break the screen — an unknown key would otherwise reach the
   * API as `400 invalid_sort_column`.
   */
  it("falls back to createdAt for a sort column outside the whitelist", () => {
    const q = buildApplicationQuery({
      ...BASE,
      sort: { key: "docCount", dir: "desc" },
    });
    expect(q.sortBy).toBe("createdAt");
    expect(q.dir).toBe("Desc");
  });

  it("omits sortBy entirely when nothing is sorted", () => {
    expect(buildApplicationQuery(BASE).sortBy).toBeUndefined();
  });

  /** The four derived columns are not in the whitelist, and cannot be. */
  it("whitelists exactly the four columns the route allows", () => {
    expect([...APPLICATION_SORT_COLUMNS]).toEqual([
      "createdAt",
      "reviewedAt",
      "status",
      "legalName",
    ]);
  });
});
