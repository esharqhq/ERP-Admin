/**
 * Turning the table's **column id** into the two params a server-sorted admin
 * endpoint takes.
 *
 * Pure and React-free, and separate from `components/ui/data-table/` because it
 * is the piece with a rule in it — the shell only needs to know that a column
 * with no `sortKey` is inert.
 *
 * **The address always names the column, never the API's field.** `lastSeen` in
 * the URL, `lastSeenAt` on the wire. That way the same visible sort produces the
 * same link on a client-sorted queue and on a server-sorted one, and the wire
 * name — which the backend is free to rename — never ends up in a bookmark.
 */

export interface ServerSortColumn {
  id: string;
  /**
   * The API's own sort field. **Absent means the column cannot be sorted**, which
   * is how an inert header is expressed: `sortBy` is a strict whitelist on every
   * admin table and anything outside it is `400 invalid_sort_column`, never a
   * fallback to the default order.
   */
  sortKey?: string;
}

export interface ServerSort {
  key: string;
  dir: "asc" | "desc";
}

/** The wire sort column for the column id the URL carries, or `undefined`. */
export function sortKeyFor(
  columns: ServerSortColumn[],
  sort: ServerSort | null,
): string | undefined {
  if (!sort) return undefined;
  return columns.find((c) => c.id === sort.key)?.sortKey;
}

/**
 * Both params, or **neither**.
 *
 * ⚠ `dir` never travels alone. It is meaningless without a column, and sending it
 * by itself puts a parameter in every unsorted request describing an ordering
 * nobody asked for — the same class of mistake as a stale `?onTask=`, where the
 * request looks fine and means something else.
 *
 * Title-cased on the way out: the URL carries `desc`, because that is what every
 * other tool on the web uses and an admin may hand-edit it, while the wire's
 * `SortDir` is `Asc`/`Desc`.
 */
export function serverSortParams(
  columns: ServerSortColumn[],
  sort: ServerSort | null,
): { sortBy?: string; dir?: "Asc" | "Desc" } {
  const sortBy = sortKeyFor(columns, sort);
  if (!sortBy) return {};
  return { sortBy, dir: sort?.dir === "asc" ? "Asc" : "Desc" };
}
