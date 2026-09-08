import type { TableSort } from "@/hooks/use-table-url-state";
import type { AgencyApplicationQuery } from "@/lib/types/agency.types";

/**
 * The filter keys the route accepts, keyed by **wire param name** so the mapping
 * below is 1:1 and greppable. `status` is absent on purpose: it is the tab's, not
 * a filter's.
 */
export const APPLICATION_FILTER_KEYS = [
  "countryId",
  "cityId",
  "submittedFrom",
  "submittedTo",
] as const;

/**
 * ⚠ **The route's whole `sortBy` whitelist.** Anything else is
 * `400 invalid_sort_column`, and the four derived columns — `docCount`,
 * `hasAllRequiredDocs`, `source`, `previouslyRejectedCount` — are computed per
 * row in SQL, so ordering on one fails at runtime rather than 400ing. They can
 * never join this list.
 */
export const APPLICATION_SORT_COLUMNS = [
  "createdAt",
  "reviewedAt",
  "status",
  "legalName",
] as const;

const DEFAULT_SORT = "createdAt";

function sortColumn(key: string): string {
  return (APPLICATION_SORT_COLUMNS as readonly string[]).includes(key)
    ? key
    : DEFAULT_SORT;
}

/**
 * The table's URL state → the typed query. Server mode, so this is the only place
 * the screen's controls become a request.
 *
 * ⚠ **An unknown `sortBy` falls back to `createdAt` rather than being sent.** The
 * URL is user-editable and outlives the column that wrote it, so a stale bookmark
 * would otherwise answer `400 invalid_sort_column` and blank the screen.
 *
 * ⚠ **The two `dir` casings meet here.** `useTableUrlState` holds lowercase
 * `"asc"`/`"desc"`; the wire wants `SortDir`, which is `"Asc"`/`"Desc"`
 * (`lib/types/onboarding.types.ts:81`). This is the only place that conversion
 * belongs.
 */
export function buildApplicationQuery({
  filters,
  tab,
  search,
  sort,
  page,
  pageSize,
}: {
  filters: Record<string, string>;
  /** The status tab. `"all"` means *no* status param, not a status of that name. */
  tab: string;
  search: string;
  sort: TableSort | null;
  page: number;
  pageSize: number;
}): AgencyApplicationQuery {
  const query: AgencyApplicationQuery = { page, pageSize };

  if (tab && tab !== "all") query.status = tab;

  const needle = search.trim();
  if (needle) query.search = needle;

  for (const key of APPLICATION_FILTER_KEYS) {
    const value = filters[key]?.trim();
    // Offset-less dates pass through unchanged: this route accepts them, and
    // normalising here would invent a timezone the operator did not choose.
    if (value) query[key] = value;
  }

  if (sort) {
    query.sortBy = sortColumn(sort.key);
    query.dir = sort.dir === "asc" ? "Asc" : "Desc";
  }

  return query;
}
