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
 * Re-exported so a queue imports its columns, its shell and its sort mapping from
 * one place. The rule lives in `lib/ui/server-sort.ts`, which is pure and tested.
 */
export { serverSortParams, sortKeyFor } from "@/lib/ui/server-sort";
