"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/paged.types";

/**
 * A queue's tab, search, filters, sort and page — held in the URL.
 *
 * The design asks for this by name: *"the state lives in the URL so a queue is
 * shareable."* An admin who has narrowed a list to the four submissions they are
 * arguing about can paste the address into a ticket and the person opening it sees
 * the same four. Component state cannot do that, and neither can `localStorage` —
 * which is why the **column** preferences live there instead (see
 * `use-column-prefs.ts`): those are how one person likes to look, not what they
 * are looking at.
 *
 * `next/navigation`, deliberately, not the `next-intl` router: `usePathname()`
 * here returns the already-localised path, so re-prefixing it would produce
 * `/de/de/dashboard/...`. Nothing about this hook is locale-aware.
 */

/** Params this hook owns. A filter may not be named any of them. */
const RESERVED = ["tab", "q", "sort", "dir", "page", "size"] as const;

/**
 * Deliberately **not** the wire's `SortDir` (`"Asc" | "Desc"`). This is what an
 * admin sees in their address bar and may hand-edit, and `?dir=desc` is the form
 * every other tool on the web uses. The queue adapter title-cases it on the way
 * to a server-sorted endpoint; the owner queue, which sorts in the browser, never
 * needs to.
 */
export type TableSortDir = "asc" | "desc";

export interface TableSort {
  key: string;
  dir: TableSortDir;
}

export interface TableUrlStateOptions {
  /**
   * The wire-param names the filter controls own, so everything else in the query
   * string is left alone — a `?from=email` on a link out of a notification
   * survives a filter change instead of being swept away.
   */
  filterKeys?: string[];
  /** The tab shown when the URL names none. */
  defaultTab?: string;
  /** Applied when the URL names no sort. */
  defaultSort?: TableSort | null;
  defaultPageSize?: number;
  /**
   * How long typing settles before it reaches the URL. Every keystroke writing a
   * history entry would make Back walk letter by letter out of a search.
   */
  searchDebounceMs?: number;
}

export interface TableUrlState {
  tab: string;
  /** Settled search — what a query should read. */
  search: string;
  /** Live search — what the input shows. */
  searchInput: string;
  filters: Record<string, string>;
  sort: TableSort | null;
  /** 1-based. */
  page: number;
  pageSize: number;

  setTab: (tab: string) => void;
  setSearchInput: (value: string) => void;
  setFilter: (key: string, value: string) => void;
  resetFilters: () => void;
  /** Ascending, then descending, then back to the default sort. */
  toggleSort: (key: string) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  /**
   * Whether the emptiness on screen could be **the filters'** doing — search and
   * filters only, deliberately **not** the tab.
   *
   * This is the discriminator between *"Nothing matches these filters — clear one
   * to widen the search"* and *"No submissions in review."* The tab is not a
   * filter: it is which queue you are looking at, and an empty Review tab with
   * nothing else set is a queue that is genuinely clear. Folding the tab in here
   * offers an admin a Clear all that would clear nothing, against copy blaming
   * filters they never set.
   */
  isFiltered: boolean;
  /** On the landing tab. `false` is what makes an empty state offer "see all". */
  isDefaultTab: boolean;
  /** Back to the landing tab, without the caller having to know its name. */
  resetTab: () => void;
}

export function useTableUrlState(options: TableUrlStateOptions = {}): TableUrlState {
  const {
    filterKeys = [],
    defaultTab = "all",
    defaultSort = null,
    defaultPageSize = DEFAULT_PAGE_SIZE,
    searchDebounceMs = 300,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (process.env.NODE_ENV !== "production") {
    const clash = filterKeys.find((k) => (RESERVED as readonly string[]).includes(k));
    if (clash) {
      throw new Error(
        `useTableUrlState: filter key "${clash}" collides with a reserved param (${RESERVED.join(", ")}). Rename the filter's wire param.`,
      );
    }
  }

  /**
   * Merge a patch into the current query and replace. An empty value **removes**
   * the param rather than writing `key=`, so a cleared filter leaves no trace and
   * two admins who cleared the same filter share one address.
   */
  const write = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        const v = value == null ? "" : String(value);
        if (v === "") next.delete(key);
        else next.set(key, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const tab = params.get("tab") ?? defaultTab;
  const urlSearch = params.get("q") ?? "";

  /**
   * Callers write `filterKeys={["stage", "type"]}` inline, so the array is a new
   * reference every render and would defeat every memo below it. Collapsed to a
   * string and re-split, which is a real dependency rather than a suppressed one.
   */
  const filterKeyList = filterKeys.join(",");
  const keys = useMemo(
    () => filterKeyList.split(",").filter(Boolean),
    [filterKeyList],
  );

  const filters = useMemo(() => {
    const out: Record<string, string> = {};
    for (const key of keys) {
      const v = params.get(key);
      if (v) out[key] = v;
    }
    return out;
  }, [params, keys]);

  const sortKey = params.get("sort");
  const sort: TableSort | null = sortKey
    ? { key: sortKey, dir: params.get("dir") === "asc" ? "asc" : "desc" }
    : defaultSort;

  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.max(1, Number(params.get("size")) || defaultPageSize);

  /**
   * The search input is local and the URL is settled, because the URL is a history
   * stack and typing is not.
   *
   * The resync — Back, Forward, or a Clear all moving the URL underneath us — is
   * done **during render**, not in an effect. React's documented shape for
   * adjusting state when an input changes: the component re-runs immediately with
   * the new value and nothing is painted from the stale one, where an effect would
   * paint the old term first and then correct it.
   */
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [syncedSearch, setSyncedSearch] = useState(urlSearch);
  if (urlSearch !== syncedSearch) {
    setSyncedSearch(urlSearch);
    setSearchInput(urlSearch);
  }

  // Typing settles, then reaches the URL. Guarded on equality, so the resync above
  // cannot bounce back out through here.
  useEffect(() => {
    if (searchInput === urlSearch) return;
    const id = setTimeout(
      () => write({ q: searchInput, page: null }),
      searchDebounceMs,
    );
    return () => clearTimeout(id);
  }, [searchInput, urlSearch, searchDebounceMs, write]);

  /**
   * Every narrowing move resets to page 1. Filtering to three results while on
   * page 5 renders an empty table over a full set, which reads as "no results"
   * and is the most common bug in a paged, filtered list.
   */
  const setTab = useCallback(
    (next: string) => write({ tab: next === defaultTab ? null : next, page: null }),
    [write, defaultTab],
  );

  const resetTab = useCallback(() => write({ tab: null, page: null }), [write]);

  const setFilter = useCallback(
    (key: string, value: string) => write({ [key]: value, page: null }),
    [write],
  );

  const resetFilters = useCallback(() => {
    const cleared: Record<string, null> = { page: null };
    for (const key of keys) cleared[key] = null;
    write(cleared);
  }, [write, keys]);

  /**
   * Three states, not two. A third click returns the table to its default order
   * rather than trapping the admin in a sort they only wanted to glance at.
   */
  const toggleSort = useCallback(
    (key: string) => {
      if (sortKey !== key) return write({ sort: key, dir: "desc", page: null });
      if (params.get("dir") !== "asc") return write({ sort: key, dir: "asc", page: null });
      return write({ sort: null, dir: null, page: null });
    },
    [sortKey, params, write],
  );

  const setPage = useCallback(
    (next: number) => write({ page: next <= 1 ? null : next }),
    [write],
  );

  const setPageSize = useCallback(
    (size: number) => write({ size: size === defaultPageSize ? null : size, page: null }),
    [write, defaultPageSize],
  );

  /**
   * Note there is no `activeFilterCount` here. This hook knows wire params, and a
   * date range owns two of them — counting params would badge a single range as
   * "2 filters". The badge counts *dimensions*, which only the field definitions
   * describe, so it comes from `countActiveFields()` in `filter-bar.tsx`.
   */
  return {
    tab,
    search: urlSearch,
    searchInput,
    filters,
    sort,
    page,
    pageSize,
    setTab,
    setSearchInput,
    setFilter,
    resetFilters,
    toggleSort,
    setPage,
    setPageSize,
    isFiltered:
      Object.keys(filters).length > 0 || urlSearch.trim().length > 0,
    isDefaultTab: tab === defaultTab,
    resetTab,
  };
}
