"use client";

import { useCallback, useMemo, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/paged.types";
import { cycleSort } from "@/lib/ui/table-sort";
import type { TableSort, TableUrlState } from "@/hooks/use-table-url-state";

export interface LocalTableStateOptions {
  defaultTab?: string;
  defaultSort?: TableSort | null;
  defaultPageSize?: number;
}

/**
 * `TableUrlState`, held in component state instead of the URL.
 *
 * For a `DataTable` **embedded** in a page that owns its own query string. The
 * owner's booked-work card is the case: the walk-in screen embeds it and reads
 * `?tab=` and `?day=` for itself, so the URL-backed hook would let a status tab
 * in the card switch the page's tab. A queue that *is* the page keeps
 * `useTableUrlState` — a shareable address is the point there.
 *
 * Same contract as the URL hook: every narrowing move resets to page 1, the sort
 * cycles desc → asc → default, and `isFiltered` is search and filters only,
 * never the tab. No search debounce — there is no history stack to protect.
 */
export function useLocalTableState(options: LocalTableStateOptions = {}): TableUrlState {
  const {
    defaultTab = "all",
    defaultSort = null,
    defaultPageSize = DEFAULT_PAGE_SIZE,
  } = options;

  const [tab, setTabState] = useState(defaultTab);
  const [search, setSearch] = useState("");
  const [filters, setFilterState] = useState<Record<string, string>>({});
  const [explicitSort, setExplicitSort] = useState<TableSort | null>(null);
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  const setTab = useCallback((next: string) => {
    setTabState(next);
    setPageState(1);
  }, []);

  const resetTab = useCallback(() => setTab(defaultTab), [setTab, defaultTab]);

  const setSearchInput = useCallback((value: string) => {
    setSearch(value);
    setPageState(1);
  }, []);

  /** An empty value removes the key, as the URL hook removes the param. */
  const setFilters = useCallback((patch: Record<string, string>) => {
    setFilterState((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(patch)) {
        if (value) next[key] = value;
        else delete next[key];
      }
      return next;
    });
    setPageState(1);
  }, []);

  const setFilter = useCallback(
    (key: string, value: string) => setFilters({ [key]: value }),
    [setFilters],
  );

  const resetFilters = useCallback(() => {
    setFilterState({});
    setPageState(1);
  }, []);

  const toggleSort = useCallback((key: string) => {
    setExplicitSort((prev) => cycleSort(prev, key));
    setPageState(1);
  }, []);

  const setSort = useCallback((next: TableSort | null) => {
    setExplicitSort(next);
    setPageState(1);
  }, []);

  const setPage = useCallback((next: number) => setPageState(Math.max(1, next)), []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  return useMemo(
    () => ({
      tab,
      search,
      searchInput: search,
      filters,
      sort: explicitSort ?? defaultSort,
      page,
      pageSize,
      setTab,
      setSearchInput,
      setFilter,
      setFilters,
      resetFilters,
      toggleSort,
      setSort,
      setPage,
      setPageSize,
      isFiltered: Object.keys(filters).length > 0 || search.trim().length > 0,
      isDefaultTab: tab === defaultTab,
      resetTab,
    }),
    // `defaultSort` is usually an inline literal; its two fields are the input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      tab, search, filters, explicitSort, defaultSort?.key, defaultSort?.dir, page, pageSize,
      setTab, setSearchInput, setFilter, setFilters, resetFilters, toggleSort, setSort,
      setPage, setPageSize, defaultTab, resetTab,
    ],
  );
}
