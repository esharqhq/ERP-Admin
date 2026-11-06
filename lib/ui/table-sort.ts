import type { TableSort } from "@/hooks/use-table-url-state";

/**
 * A header click, as `useTableUrlState.toggleSort` does it: a new column starts
 * descending, a second click turns it ascending, a third returns the table to its
 * default order (`null`). Pure so the in-memory table state can share the cycle
 * and the test can pin it.
 *
 * `explicit` is the sort the admin chose — **not** the default — because a
 * default is not something a click can be cycling through.
 */
export function cycleSort(explicit: TableSort | null, key: string): TableSort | null {
  if (explicit?.key !== key) return { key, dir: "desc" };
  if (explicit.dir !== "asc") return { key, dir: "asc" };
  return null;
}
