import type { ReactNode } from "react";
import type { ColumnMeta } from "@/lib/ui/table-prefs";

/**
 * One column of a queue, registered once and then addressed by id everywhere —
 * by the picker, by the stored preferences, and by the sort in the URL.
 */
export interface DataColumn<Row> extends ColumnMeta {
  /** Already translated. The picker and the header both print it. */
  label: string;
  cell: (row: Row) => ReactNode;
  align?: "left" | "right";
  /** Width and any other classes for both the header cell and the body cells. */
  className?: string;
  /**
   * Client mode: how this column orders, ascending. The shell reverses it for
   * `desc`. A column without one is not sortable in client mode.
   */
  compare?: (a: Row, b: Row) => number;
  /**
   * Server mode: the API's sort column name, which is rarely the column id.
   * A column without one is not sortable in server mode.
   */
  sortKey?: string;
}

interface SourceBase {
  isLoading: boolean;
  isError: boolean;
  /**
   * The read was refused. Kept apart from `isError` because the two say different
   * things and offer different fixes — *"this failed, reload"* against *"your role
   * does not include this, ask someone"* — and apart from empty, because a queue
   * an admin may not read is not a queue with nothing in it.
   */
  isForbidden?: boolean;
}

/**
 * Every row, unnarrowed. The shell searches, filters, sorts and pages it.
 *
 * For an endpoint with no query parameters — `GET /api/admin/kyc?status=` returns
 * a bare array and takes nothing else.
 */
export interface ClientSource<Row> extends SourceBase {
  mode: "client";
  rows: Row[];
  /** `needle` arrives lower-cased and trimmed. */
  matches?: (row: Row, needle: string) => boolean;
  /** Called once per row with the whole values bag, so filters can interact. */
  filter?: (row: Row, values: Record<string, string>) => boolean;
}

/**
 * One page, already searched, filtered, sorted and paged by the API.
 *
 * ⚠ The shell narrows **nothing** in this mode. Running the client pipeline over a
 * server page would search and count the current 25 rows and present the answer as
 * if it were the whole set — a filter that silently lies. The caller reads the same
 * `useTableUrlState` the shell does and turns it into the query.
 */
export interface ServerSource<Row> extends SourceBase {
  mode: "server";
  rows: Row[];
  /** Across every page, from the envelope — never `rows.length`. */
  total: number;
}

export type DataSource<Row> = ClientSource<Row> | ServerSource<Row>;

export interface StageTab {
  value: string;
  label: string;
  /**
   * Omitted where nothing can count it. The worker queue has no source for these
   * — `WorkerRowDto` carries no review fields and six `pageSize=1` probes is the
   * wrong price — so its tabs ship bare rather than with a number that would only
   * ever describe the page on screen.
   */
  count?: number;
}
