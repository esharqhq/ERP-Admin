"use client";

import { useMemo, useState } from "react";
import {
  deriveStatus,
  summarize,
  STATUS_ORDER,
  type AttendanceStatus,
  type AttendanceSummary,
} from "@/lib/attendance/status";
import type { AttendanceRowDto } from "@/lib/types/attendance.types";

export type StatusTab = "all" | AttendanceStatus;
export type SortKey = "worker" | "property" | "scheduled" | "checkIn" | "status";
export type SortDir = "asc" | "desc";

export interface DerivedRow extends AttendanceRowDto {
  status: AttendanceStatus;
}

export interface AttendanceTable {
  tab: StatusTab;
  setTab: (tab: StatusTab) => void;
  search: string;
  setSearch: (search: string) => void;
  property: string;
  outcome: string;
  setFilter: (key: "property" | "outcome", value: string) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  toggleSort: (key: SortKey) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  /** Summary over ALL rows for the day (not the filtered subset). */
  summary: AttendanceSummary;
  /** Count per tab across ALL rows. */
  tabCounts: Record<StatusTab, number>;
  propertyOptions: string[];
  outcomeOptions: string[];
  /** Row count after tab + property/outcome filter + search. */
  filteredCount: number;
  /** Full filtered + sorted set (used for export). */
  filteredRows: DerivedRow[];
  /** Current page slice of `filteredRows`. */
  pageRows: DerivedRow[];
}

const DEFAULT_PAGE_SIZE = 50;

export function useAttendanceTable(rows: AttendanceRowDto[]): AttendanceTable {
  const [tab, setTabState] = useState<StatusTab>("all");
  const [search, setSearchState] = useState("");
  const [property, setProperty] = useState("");
  const [outcome, setOutcome] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("scheduled");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);

  const derived = useMemo<DerivedRow[]>(
    () => rows.map((r) => ({ ...r, status: deriveStatus(r) })),
    [rows],
  );

  const summary = useMemo(
    () => summarize(derived.map((r) => r.status)),
    [derived],
  );

  const tabCounts = useMemo<Record<StatusTab, number>>(
    () => ({
      all: summary.assigned,
      present: summary.present,
      late: summary.late,
      absent: summary.absent,
    }),
    [summary],
  );

  const propertyOptions = useMemo(
    () =>
      Array.from(new Set(derived.map((r) => r.propertyName).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [derived],
  );

  const outcomeOptions = useMemo(
    () =>
      Array.from(new Set(derived.map((r) => r.outcome).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [derived],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return derived.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (property && r.propertyName !== property) return false;
      if (outcome && r.outcome !== outcome) return false;
      if (q && !r.workerName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [derived, tab, property, outcome, search]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    // Nulls / unparseable timestamps sort last in ascending order.
    const time = (iso: string | null) => {
      if (!iso) return Number.POSITIVE_INFINITY;
      const parsed = Date.parse(iso);
      return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
    };
    const cmp = (a: DerivedRow, b: DerivedRow): number => {
      switch (sortKey) {
        case "worker":
          return a.workerName.localeCompare(b.workerName) * dir;
        case "property":
          return a.propertyName.localeCompare(b.propertyName) * dir;
        case "scheduled":
          return (time(a.scheduledAt) - time(b.scheduledAt)) * dir;
        case "checkIn":
          return (time(a.checkinAt) - time(b.checkinAt)) * dir;
        case "status":
          return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir;
        default:
          return 0;
      }
    };
    return [...filtered].sort(cmp);
  }, [filtered, sortKey, sortDir]);

  // Clamp page so a shrunk result set (filter change, new date) never shows blank.
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.max(1, Math.min(page, pageCount));
  const pageRows = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize],
  );

  const setTab = (next: StatusTab) => {
    setTabState(next);
    setPage(1);
  };
  const setSearch = (next: string) => {
    setSearchState(next);
    setPage(1);
  };
  const setFilter = (key: "property" | "outcome", value: string) => {
    if (key === "property") setProperty(value);
    else setOutcome(value);
    setPage(1);
  };
  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };
  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  return {
    tab,
    setTab,
    search,
    setSearch,
    property,
    outcome,
    setFilter,
    sortKey,
    sortDir,
    toggleSort,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    summary,
    tabCounts,
    propertyOptions,
    outcomeOptions,
    filteredCount: filtered.length,
    filteredRows: sorted,
    pageRows,
  };
}
