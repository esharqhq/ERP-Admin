"use client";

import { useCallback, useMemo, useState } from "react";

/** Describes one filter dimension: a key and how to read the matched value off an item. */
export interface TableFilterConfig<T> {
  key: string;
  /** Returns the item's value for this dimension; compared against the selected option. */
  selector: (item: T) => string | null | undefined;
}

/**
 * Reusable filter state + filtering logic for list/table screens. Holds the
 * selected value per dimension and returns the data narrowed to items matching
 * every active filter. An empty/absent selected value means "all" (no narrowing
 * on that dimension). Pair with the `FilterMenu` component for the UI.
 */
export function useTableFilters<T>(data: T[], config: TableFilterConfig<T>[]) {
  const [values, setValues] = useState<Record<string, string>>({});

  const setFilter = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setValues({}), []);

  const filtered = useMemo(
    () =>
      data.filter((item) =>
        config.every(({ key, selector }) => {
          const selected = values[key];
          if (!selected) return true;
          return selector(item) === selected;
        }),
      ),
    [data, config, values],
  );

  const activeCount = useMemo(
    () => Object.values(values).filter(Boolean).length,
    [values],
  );

  return { values, setFilter, reset, filtered, activeCount };
}
