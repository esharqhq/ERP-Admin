"use client";

import { useMemo } from "react";
import {
  countRows,
  deriveRows,
  matchesTab,
  KIND_ORDER,
  type AttendanceCounts,
  type AttendanceRow,
  type AttendanceTab,
} from "@/lib/attendance/status";
import type { AttendanceRowDto } from "@/lib/types/attendance.types";
import type { TableSort } from "@/hooks/use-table-url-state";

/**
 * The whole day, narrowed in the browser.
 *
 * ⚠ **There is no paging here, and adding it back would be a bug.**
 * `GET /api/admin/attendance?date=` takes one parameter — the date — and has no
 * `page`, `size`, `sort`, `q` or filter params at all. The response *is* the day,
 * platform-wide. So every control on the screen works the loaded array, and a
 * pager, a page-size select or a server sort arrow would be a control with nothing
 * to bind to. The footer says *"{shown} of {total} rows"* instead.
 *
 * The three previous incarnations of this hook held `page`, `pageSize` and
 * `pageRows`; they are gone rather than left unused, so nothing can quietly render
 * one page of a day and call it the day.
 */

export type SortKey = "worker" | "property" | "scheduled" | "checkIn" | "status";

export interface AttendanceTableInput {
  rows: AttendanceRowDto[];
  /** Instant the grammar is evaluated at — `useLiveClock()`. `0` before the clock is known. */
  nowMs: number;
  /** Whether the viewed day is today; suppresses the "how late right now" delta elsewhere. */
  isToday: boolean;
  tab: AttendanceTab;
  search: string;
  property: string;
  outcome: string;
  sort: TableSort | null;
}

export interface AttendanceTable {
  /** Every row for the day, with its kind. The strip and the tab badges count these. */
  allRows: AttendanceRow[];
  /** After tab + property + outcome + search, in sort order. Also what the CSV exports. */
  rows: AttendanceRow[];
  /** Counts over **all** rows, so a tab badge does not change when you click it. */
  counts: AttendanceCounts;
  propertyOptions: string[];
  outcomeOptions: string[];
  /** The day came back with rows but the narrowing left none — *"nothing matched"*, not *"empty day"*. */
  isNarrowedToNothing: boolean;
}

/** The design's default: *"the column the table sorts by default"* on `workerName`. */
export const DEFAULT_SORT: TableSort = { key: "worker", dir: "asc" };

const collator = new Intl.Collator(undefined, { sensitivity: "base" });

/** Nulls and unparseable timestamps sort last in ascending order, never first. */
const time = (iso: string | null): number => {
  if (!iso) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

export function useAttendanceTable(input: AttendanceTableInput): AttendanceTable {
  const { rows, nowMs, tab, search, property, outcome, sort } = input;

  const allRows = useMemo(() => deriveRows(rows, nowMs), [rows, nowMs]);

  const counts = useMemo(() => countRows(allRows), [allRows]);

  const propertyOptions = useMemo(
    () =>
      Array.from(new Set(allRows.map((r) => r.propertyName).filter(Boolean))).sort((a, b) =>
        collator.compare(a, b),
      ),
    [allRows],
  );

  const outcomeOptions = useMemo(
    () =>
      Array.from(new Set(allRows.map((r) => r.outcome).filter(Boolean))).sort((a, b) =>
        collator.compare(a, b),
      ),
    [allRows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (!matchesTab(r, tab)) return false;
      if (property && r.propertyName !== property) return false;
      if (outcome && r.outcome !== outcome) return false;
      if (q) {
        // The placeholder promises "worker or property", so it must search both.
        const hay = `${r.workerName} ${r.propertyName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allRows, tab, property, outcome, search]);

  const sorted = useMemo(() => {
    const active = sort ?? DEFAULT_SORT;
    const dir = active.dir === "asc" ? 1 : -1;
    const cmp = (a: AttendanceRow, b: AttendanceRow): number => {
      switch (active.key as SortKey) {
        case "property":
          return collator.compare(a.propertyName, b.propertyName) * dir;
        case "scheduled":
          return (time(a.scheduledAt) - time(b.scheduledAt)) * dir;
        case "checkIn":
          return (time(a.checkinAt) - time(b.checkinAt)) * dir;
        case "status":
          return (KIND_ORDER[a.kind] - KIND_ORDER[b.kind]) * dir;
        case "worker":
        default:
          return collator.compare(a.workerName, b.workerName) * dir;
      }
    };
    // Tie-break on the scheduled time, then on the row's own grain, so two workers
    // with the same name on the same property keep a stable order between renders.
    return [...filtered].sort(
      (a, b) =>
        cmp(a, b) ||
        time(a.scheduledAt) - time(b.scheduledAt) ||
        collator.compare(a.taskId + a.workerId, b.taskId + b.workerId),
    );
  }, [filtered, sort]);

  return {
    allRows,
    rows: sorted,
    counts,
    propertyOptions,
    outcomeOptions,
    isNarrowedToNothing: allRows.length > 0 && sorted.length === 0,
  };
}

/**
 * Severity order, for the phone.
 *
 * *"The desktop table sorts by worker; the phone sorts by severity. Same rows,
 * same badges — only the reading order changes, because a phone is used to answer
 * 'is anyone missing right now?'"* Refusals float above everything, because they
 * are the rows where somebody tried and the system said no.
 */
export function bySeverity(rows: AttendanceRow[]): AttendanceRow[] {
  return [...rows].sort(
    (a, b) =>
      Number(b.refused) - Number(a.refused) ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      time(a.scheduledAt) - time(b.scheduledAt),
  );
}
