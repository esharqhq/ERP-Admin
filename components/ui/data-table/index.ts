export { DataTable, type DataTableProps } from "./data-table";
export { StageTabs } from "./stage-tabs";
export { ColumnPicker } from "./column-picker";
export {
  TableEmpty,
  TableError,
  TableForbidden,
  TableNoMatch,
  TableSkeletonRows,
  TableState,
} from "./table-states";
export type {
  ClientSource,
  DataColumn,
  DataSource,
  ServerSource,
  StageTab,
} from "./types";

/**
 * A server queue's wire sort column, from the column id the URL carries.
 *
 * The address always names the **column**, never the API's field, so the same
 * visible sort produces the same link on a client-sorted and a server-sorted
 * queue. Server callers translate here, on the way into the query.
 */
export function sortKeyFor(
  columns: { id: string; sortKey?: string }[],
  sort: { key: string } | null,
): string | undefined {
  if (!sort) return undefined;
  return columns.find((c) => c.id === sort.key)?.sortKey;
}
