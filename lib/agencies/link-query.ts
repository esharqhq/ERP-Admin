import type { TableSort } from "@/hooks/use-table-url-state";
import type { AgencyLinkQuery } from "@/lib/types/agency.types";

/**
 * The filter keys this screen owns, by **wire param name** so the mapping below
 * is 1:1 and greppable. `status` is absent on purpose: it is the tab's.
 *
 * `workerId` has no control — the bell and the worker card deep-link it. It is
 * read from the URL and never drawn.
 */
export const LINK_FILTER_KEYS = ["agencyId", "workerId"] as const;

/**
 * ⚠ **The route's whole `sortBy` whitelist.** Anything else is
 * `400 invalid_sort_column`, and there is deliberately **no sort on worker or
 * agency name** — so no header for those two columns may offer one.
 */
export const LINK_SORT_COLUMNS = ["createdAt", "resolvedAt", "status"] as const;

const DEFAULT_SORT = "createdAt";

function sortColumn(key: string): string {
  return (LINK_SORT_COLUMNS as readonly string[]).includes(key)
    ? key
    : DEFAULT_SORT;
}

/**
 * The table's URL state → the typed query. Server mode, so this is the only
 * place the screen's controls become a request.
 *
 * ⚠ **`sort.key` is a COLUMN ID, not a wire key.** `DataTable`'s `SortableHead`
 * calls `onSort(column.id)` and compares `sort.key === column.id`
 * (`data-table.tsx:621,646`) — `column.sortKey` is read **only** as the boolean
 * *"is this sortable"*, and the wire key it holds never reaches a request. The
 * queue's three sortable columns are therefore **named after their wire
 * columns**, so id and key are the same string by construction. This whitelist
 * stays regardless: the URL is hand-editable.
 *
 * ⚠ **An unknown `sortBy` falls back rather than being sent.** A stale bookmark
 * would otherwise answer `400 invalid_sort_column` and blank the screen.
 *
 * ⚠ **The two `dir` casings meet here.** `useTableUrlState` holds lowercase
 * `"asc"`/`"desc"`; the wire wants `SortDir` = `"Asc"`/`"Desc"`
 * (`lib/types/onboarding.types.ts:81`). This is the only place that conversion
 * belongs.
 */
export function buildLinkQuery({
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
}): AgencyLinkQuery {
  const query: AgencyLinkQuery = { page, pageSize };

  if (tab && tab !== "all") query.status = tab;

  const needle = search.trim();
  if (needle) query.search = needle;

  for (const key of LINK_FILTER_KEYS) {
    const value = filters[key]?.trim();
    if (value) query[key] = value;
  }

  if (sort) {
    query.sortBy = sortColumn(sort.key);
    query.dir = sort.dir === "asc" ? "Asc" : "Desc";
  }

  return query;
}
