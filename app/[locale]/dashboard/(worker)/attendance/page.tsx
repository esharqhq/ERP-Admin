"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Download, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FilterMenu, type FilterGroup } from "@/components/ui/filter-menu";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAttendance } from "@/hooks/use-attendance";
import {
  useAttendanceTable,
  type DerivedRow,
  type StatusTab,
} from "@/hooks/use-attendance-table";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { normalizeStatus } from "@/lib/types/task.types";
import { downloadCsv } from "@/lib/csv";
import type { AttendanceStatus, AttendanceSummary } from "@/lib/attendance/status";
import { cn } from "@/lib/utils";

/** UTC today — matches the backend's UTC-today default; stable across SSR/hydration. */
const todayUtc = () => new Date().toISOString().slice(0, 10);

const TABS: StatusTab[] = ["all", "present", "late", "absent"];

function fmtTime(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function OutcomeBadge({ value }: { value: string }) {
  const s = normalizeStatus(value);
  const variant =
    s === "completed" || s === "done"
      ? "default"
      : s === "pending"
        ? "secondary"
        : s === "rejected" || s === "cancelled"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{value || "—"}</Badge>;
}

function StatusPill({ status, label }: { status: AttendanceStatus; label: string }) {
  const dot =
    status === "present"
      ? "bg-emerald-500"
      : status === "late"
        ? "bg-amber-500"
        : "bg-destructive";
  const text =
    status === "present"
      ? "text-emerald-600 dark:text-emerald-400"
      : status === "late"
        ? "text-amber-600 dark:text-amber-400"
        : "text-destructive";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", text)}>
      <span className={cn("size-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

export default function AttendancePage() {
  const t = useTranslations("attendance");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const canRead = useHasPermission("system:attendance:read");
  const [date, setDate] = useState(todayUtc);

  const { data: rows = [], isLoading, isError } = useAttendance(date, canRead);
  const table = useAttendanceTable(rows);

  if (!canRead) {
    return (
      <div className="flex flex-col gap-6">
        <Header t={t} />
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t("noAccess")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExport = () => {
    const headers = [
      t("columns.worker"),
      t("columns.property"),
      t("columns.task"),
      t("columns.scheduled"),
      t("columns.checkIn"),
      t("columns.checkOut"),
      t("columns.status"),
      t("columns.outcome"),
      t("columns.lat"),
      t("columns.lng"),
    ];
    const data = table.filteredRows.map((r) => [
      r.workerName,
      r.propertyName,
      r.taskGroupTitle || r.taskId,
      fmtTime(r.scheduledAt, locale),
      fmtTime(r.checkinAt, locale),
      fmtTime(r.checkoutAt, locale),
      t(`status.${r.status}`),
      r.outcome,
      r.checkinLat ?? "",
      r.checkinLng ?? "",
    ]);
    downloadCsv(`attendance-${date}.csv`, headers, data);
  };

  const filterGroups: FilterGroup[] = [
    {
      key: "property",
      label: t("columns.property"),
      options: table.propertyOptions.map((p) => ({ label: p, value: p })),
    },
    {
      key: "outcome",
      label: t("columns.outcome"),
      options: table.outcomeOptions.map((o) => ({ label: o, value: o })),
    },
  ];
  const filterValues: Record<string, string> = {
    property: table.property,
    outcome: table.outcome,
  };

  return (
    <div className="flex flex-col gap-6">
      <Header t={t} />

      {/* Toolbar: date + export */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">
            {t("dateLabel")}
          </span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayUtc())}
            className="w-44"
          />
        </label>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isLoading || table.filteredCount === 0}
        >
          <Download className="size-4" />
          {t("export")}
        </Button>
      </div>

      {/* Compact summary strip */}
      <SummaryStrip t={t} summary={table.summary} isLoading={isLoading} />

      {/* Status tabs */}
      <Tabs value={table.tab} onValueChange={(v) => table.setTab(v as StatusTab)}>
        <TabsList>
          {TABS.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(`tabs.${key}`)}
              <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                {table.tabCounts[key]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? tCommon("loading")
                : tCommon("resultsFound", { count: table.filteredCount })}
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="search"
                placeholder={t("searchPlaceholder")}
                value={table.search}
                onChange={(e) => table.setSearch(e.target.value)}
                className="h-9 w-full sm:w-56"
              />
              <FilterMenu
                groups={filterGroups}
                values={filterValues}
                onChange={(key, v) =>
                  table.setFilter(key as "property" | "outcome", v)
                }
                allLabel={tCommon("all")}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[65vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  <SortableTableHead
                    label={t("columns.worker")}
                    active={table.sortKey === "worker"}
                    direction={table.sortDir}
                    onClick={() => table.toggleSort("worker")}
                  />
                  <SortableTableHead
                    label={t("columns.property")}
                    active={table.sortKey === "property"}
                    direction={table.sortDir}
                    onClick={() => table.toggleSort("property")}
                  />
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("columns.task")}
                  </TableHead>
                  <SortableTableHead
                    label={t("columns.scheduled")}
                    active={table.sortKey === "scheduled"}
                    direction={table.sortDir}
                    onClick={() => table.toggleSort("scheduled")}
                  />
                  <SortableTableHead
                    label={t("columns.checkIn")}
                    active={table.sortKey === "checkIn"}
                    direction={table.sortDir}
                    onClick={() => table.toggleSort("checkIn")}
                  />
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("columns.checkOut")}
                  </TableHead>
                  <SortableTableHead
                    label={t("columns.status")}
                    active={table.sortKey === "status"}
                    direction={table.sortDir}
                    onClick={() => table.toggleSort("status")}
                  />
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("columns.outcome")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-8 w-full rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-sm text-destructive"
                    >
                      {tCommon("error")}
                    </TableCell>
                  </TableRow>
                ) : table.pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.pageRows.map((r) => (
                    <AttendanceRow key={r.taskId} row={r} locale={locale} t={t} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!isLoading && !isError && table.filteredCount > 0 ? (
            <div className="border-t border-border">
              <TablePagination
                page={table.page}
                pageSize={table.pageSize}
                total={table.filteredCount}
                onPageChange={table.setPage}
                onPageSizeChange={table.setPageSize}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function AttendanceRow({
  row,
  locale,
  t,
}: {
  row: DerivedRow;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const hasCoords = row.checkinLat != null && row.checkinLng != null;
  return (
    <TableRow className="hover:bg-accent/40">
      <TableCell className="py-3 font-medium">{row.workerName}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.propertyName}</TableCell>
      <TableCell className="text-sm">
        <Link
          href={`/dashboard/tasks/${row.taskGroupId}`}
          className="text-muted-foreground underline-offset-2 hover:underline"
        >
          {row.taskGroupTitle || row.taskId.slice(0, 8)}
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground tabular-nums">
        {fmtTime(row.scheduledAt, locale)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground tabular-nums">
        <span className="flex items-center gap-1">
          {fmtTime(row.checkinAt, locale)}
          {hasCoords && (
            <a
              href={`https://www.google.com/maps?q=${row.checkinLat},${row.checkinLng}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`${row.checkinLat}, ${row.checkinLng}`}
              className="text-primary hover:opacity-80"
            >
              <MapPin className="size-3.5" />
            </a>
          )}
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground tabular-nums">
        {fmtTime(row.checkoutAt, locale)}
      </TableCell>
      <TableCell>
        <StatusPill status={row.status} label={t(`status.${row.status}`)} />
      </TableCell>
      <TableCell>
        <OutcomeBadge value={row.outcome} />
      </TableCell>
    </TableRow>
  );
}

function SummaryStrip({
  t,
  summary,
  isLoading,
}: {
  t: ReturnType<typeof useTranslations>;
  summary: AttendanceSummary;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-11 w-full max-w-xl rounded-lg" />;
  }
  const items = [
    { key: "assigned", value: summary.assigned, dot: "bg-muted-foreground" },
    { key: "present", value: summary.present, dot: "bg-emerald-500" },
    { key: "late", value: summary.late, dot: "bg-amber-500" },
    { key: "absent", value: summary.absent, dot: "bg-destructive" },
  ] as const;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
      {items.map((it) => (
        <span key={it.key} className="inline-flex items-center gap-2">
          <span className={cn("size-2 rounded-full", it.dot)} />
          <span className="text-muted-foreground">{t(`summary.${it.key}`)}</span>
          <span className="font-semibold tabular-nums">{it.value}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-2">
        <span className="text-muted-foreground">{t("summary.rate")}</span>
        <span className="font-semibold tabular-nums">{summary.rate}%</span>
      </span>
    </div>
  );
}

function Header({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
        {t("title")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
    </div>
  );
}
