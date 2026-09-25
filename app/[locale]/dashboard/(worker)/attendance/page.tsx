"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, CalendarDays, Download, ShieldOff, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FilterMenu, type FilterGroup } from "@/components/ui/filter-menu";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { StageTabs, TableSkeletonRows, TableState } from "@/components/ui/data-table";
import { AttendanceStrip } from "@/components/attendance/attendance-strip";
import { AttendanceCardChips, AttendanceCards } from "@/components/attendance/attendance-cards";
import { AttendanceDetailSheet } from "@/components/attendance/attendance-detail-sheet";
import {
  AttendanceTableRow,
  rowKey,
} from "@/components/attendance/attendance-table-row";
import { DayStepper } from "@/components/attendance/day-stepper";
import { useAttendance } from "@/hooks/use-attendance";
import {
  DEFAULT_SORT,
  useAttendanceTable,
  type SortKey,
} from "@/hooks/use-attendance-table";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { useLiveClock, useTodayKey } from "@/hooks/use-today";
import { hhmm, longDate } from "@/lib/attendance/format";
import { checkinDoorKind } from "@/lib/attendance/checkin-door";
import type { AttendanceRow, AttendanceTab } from "@/lib/attendance/status";
import { downloadCsv } from "@/lib/csv";

/**
 * Attendance — one day, one request, every assigned worker.
 *
 * `GET /api/admin/attendance?date=` answers with one row per assigned `TaskWorker`
 * whose task is scheduled that day, present and absent alike. It takes **one
 * parameter**. There is no page, size, sort, search or filter param, so the day is
 * the only thing the server decides and every other control on this screen works
 * the array already in the browser — including the CSV, which exports what is
 * filtered rather than what fits on a page.
 *
 * That single fact shapes three things worth not undoing:
 *
 * - **No pager.** A page-size select or a server sort arrow would have nothing to
 *   bind to; the footer says how many of the day are shown instead.
 * - **The status grammar is ours.** The response carries `present` as a bool and
 *   no status at all, so the seven kinds are derived in `lib/attendance/status.ts`
 *   — tested there, because a live day never contains all seven at once.
 * - **Read-only, end to end.** Nothing behind `system:attendance:read` writes, so
 *   neither the rows nor the detail sheet offer an action, not even a disabled one.
 */

const COLUMNS = 7;

/** The five tabs. `missing` groups three kinds; `refused` is a different axis. */
const TABS: AttendanceTab[] = ["all", "in", "late", "missing", "refused"];

/** Which of the seven columns can be sorted, in the order they are drawn. */
const SORTABLE: { key: SortKey; column: string }[] = [
  { key: "worker", column: "worker" },
  { key: "property", column: "property" },
  { key: "scheduled", column: "scheduled" },
  { key: "checkIn", column: "checkIn" },
  { key: "status", column: "status" },
];

/** The permission that gates the whole screen — there is no partial view. */
const PERMISSION = "system:attendance:read";

/** Whether a failed read was a refusal rather than a fault. Axios error shape. */
function isForbidden(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { response?: { status?: number } }).response?.status === 403
  );
}

export default function AttendancePage() {
  const t = useTranslations("attendance");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const canRead = useHasPermission(PERMISSION);
  const todayKey = useTodayKey();

  /**
   * The clock **ticks**, and it has to. Every kind on this screen is a comparison
   * against now — `Awaiting` until the shift starts, `Overdue` after — so a frozen
   * clock would leave a 09:59 arrival reading "not due yet" at 10:30. React
   * Query's `staleTime: 0` cannot fix that: the stale value is ours, not the
   * server's.
   */
  const nowMs = useLiveClock();

  /**
   * The day, the tab, the search, the two filters and the sort all live in the
   * address. That is what makes the error state's promise true — *"the day is in
   * the address, so retrying returns to exactly this one"* — and it makes a
   * narrowed day a link somebody can paste into a ticket.
   */
  const url = useTableUrlState({
    filterKeys: ["date", "property", "outcome"],
    defaultTab: "all",
    defaultSort: DEFAULT_SORT,
  });

  // `""` until the clock resolves, which suppresses the first fetch rather than
  // asking the server for its own idea of today and then re-asking for ours.
  const dayKey = url.filters.date || todayKey;
  const isToday = Boolean(todayKey) && dayKey === todayKey;
  const tab = (TABS.includes(url.tab as AttendanceTab) ? url.tab : "all") as AttendanceTab;

  const query = useAttendance(dayKey || undefined, canRead && Boolean(dayKey));
  const rows = query.data ?? [];

  const table = useAttendanceTable({
    rows,
    nowMs,
    isToday,
    tab,
    search: url.search,
    property: url.filters.property ?? "",
    outcome: url.filters.outcome ?? "",
    sort: url.sort,
  });

  const [openRow, setOpenRow] = useState<AttendanceRow | null>(null);

  const isLoading = query.isLoading || !dayKey;
  const forbidden = !canRead || isForbidden(query.error);
  const failed = query.isError && !forbidden;

  /**
   * One write, so the day survives it. `resetFilters` would clear `date` too —
   * it is a filter key, because that is how it is read back — and dropping the
   * admin onto today is not what "show all rows of *this* day" means.
   */
  const showEverything = () =>
    url.setFilters({ tab: "", q: "", property: "", outcome: "" });

  const handleExport = () => {
    const headers = [
      t("columns.worker"),
      t("columns.property"),
      t("columns.task"),
      t("columns.scheduled"),
      t("columns.checkIn"),
      t("columns.checkOut"),
      t("columns.status"),
      t("detail.field.outcome"),
      t("detail.field.coordinates"),
      t("detail.field.checkinMethod"),
      t("detail.field.refusedCount"),
      t("detail.field.lastRefusal"),
    ];
    // What is filtered, not what is paged — there are no pages.
    const data = table.rows.map((r) => {
      // F-07 ·2. Empty for `null` (never checked in, or before 2026-09-22) and
      // for a door this app does not know — a cell, not a guess. ⚠ Beside the
      // coordinates on purpose: on "scanned by staff" they are the scanner's.
      const door = checkinDoorKind(r.checkinDoor);
      return [
        r.workerName,
        r.propertyName,
        r.taskGroupTitle || r.taskId,
        hhmm(r.scheduledAt, locale),
        hhmm(r.checkinAt, locale),
        hhmm(r.checkoutAt, locale),
        t(`status.${r.kind}`),
        r.outcome,
        r.checkinLat != null && r.checkinLng != null
          ? `${r.checkinLat}, ${r.checkinLng}`
          : "",
        door ? t(`door.${door}`) : "",
        r.refusedCheckinCount,
        [r.lastRefusalReason, r.lastRefusalDistanceMeters].filter((v) => v != null).join(" · "),
      ];
    });
    downloadCsv(`attendance-${dayKey}.csv`, headers, data);
  };

  const filterGroups: FilterGroup[] = [
    {
      key: "property",
      label: t("columns.property"),
      options: table.propertyOptions.map((p) => ({ label: p, value: p })),
    },
    {
      key: "outcome",
      label: t("detail.field.outcome"),
      options: table.outcomeOptions.map((o) => ({ label: o, value: o })),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {forbidden ? (
        <ForbiddenPanel />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <DayStepper
              value={dayKey}
              todayKey={todayKey}
              onChange={(next) =>
                // Today is the screen's own default, so it is written as the
                // absence of the param rather than as its value.
                url.setFilter("date", next && next !== todayKey ? next : "")
              }
              disabled={!dayKey}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isLoading || table.rows.length === 0}
              className="h-8"
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">{t("export")}</span>
            </Button>
          </div>

          {/* The strip is the desk reading; the phone gets the same counts as chips. */}
          <div className="hidden md:block">
            <AttendanceStrip
              counts={table.counts}
              tab={tab}
              onSelect={(next) => url.setTab(next)}
              isLoading={isLoading}
            />
          </div>
          <div className="md:hidden">
            <AttendanceCardChips counts={table.counts} />
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <StageTabs
              tabs={TABS.map((key) => ({
                value: key,
                label: t(`tabs.${key}`),
                count: table.counts[key],
              }))}
              value={tab}
              onChange={(next) => url.setTab(next)}
              label={t("columns.status")}
            />

            <div className="flex items-center gap-2">
              <Input
                type="search"
                placeholder={t("searchPlaceholder")}
                value={url.searchInput}
                onChange={(e) => url.setSearchInput(e.target.value)}
                className="h-9 w-full md:w-56"
              />
              <FilterMenu
                groups={filterGroups}
                values={{
                  property: url.filters.property ?? "",
                  outcome: url.filters.outcome ?? "",
                }}
                onChange={(key, value) => url.setFilter(key, value)}
                allLabel={tCommon("all")}
              />
            </div>
          </div>

          {/*
            The refused tab carries the one sentence that keeps its count honest:
            the geofence runs before the assignment lookup, so a refusal by someone
            who is not on the task is recorded with no attendance row to appear on.
            This count is therefore never "all refusals today".
          */}
          {tab === "refused" && (
            <p className="flex gap-2 rounded-lg bg-muted/40 px-3 py-2 text-[11.5px] text-muted-foreground text-pretty ring-1 ring-inset ring-border">
              <AlertTriangle className="mt-px size-3.5 flex-none" />
              {t("refusal.unassignedNote")}
            </p>
          )}

          <Card>
            <CardHeader className="pb-3">
              <p className="text-xs text-muted-foreground">
                {isLoading
                  ? tCommon("loading")
                  : t("footer.shown", {
                      shown: table.rows.length,
                      total: table.counts.all,
                    })}
              </p>
            </CardHeader>

            <CardContent className="p-0">
              {failed ? (
                <ErrorPanel onRetry={() => void query.refetch()} />
              ) : !isLoading && table.counts.all === 0 ? (
                <EmptyDayPanel
                  date={longDate(dayKey, locale)}
                  canGoToToday={!isToday && Boolean(todayKey)}
                  onGoToToday={() => url.setFilter("date", "")}
                />
              ) : !isLoading && table.isNarrowedToNothing ? (
                <NoMatchPanel total={table.counts.all} onShowAll={showEverything} />
              ) : (
                <>
                  {/* Desktop: the seven-column table. */}
                  <div className="hidden max-h-[65vh] overflow-y-auto md:block">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow className="hover:bg-transparent">
                          {SORTABLE.slice(0, 2).map(({ key, column }) => (
                            <SortableTableHead
                              key={key}
                              label={t(`columns.${column}`)}
                              active={url.sort?.key === key}
                              direction={url.sort?.dir ?? "asc"}
                              onClick={() => url.toggleSort(key)}
                            />
                          ))}
                          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            {t("columns.task")}
                          </TableHead>
                          {SORTABLE.slice(2, 4).map(({ key, column }) => (
                            <SortableTableHead
                              key={key}
                              label={t(`columns.${column}`)}
                              active={url.sort?.key === key}
                              direction={url.sort?.dir ?? "asc"}
                              onClick={() => url.toggleSort(key)}
                            />
                          ))}
                          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            {t("columns.checkOut")}
                          </TableHead>
                          <SortableTableHead
                            label={t("columns.status")}
                            active={url.sort?.key === "status"}
                            direction={url.sort?.dir ?? "asc"}
                            onClick={() => url.toggleSort("status")}
                          />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableSkeletonRows columns={COLUMNS} density="comfortable" />
                        ) : (
                          table.rows.map((row) => (
                            <AttendanceTableRow
                              key={rowKey(row)}
                              row={row}
                              nowMs={nowMs}
                              isToday={isToday}
                              locale={locale}
                              onOpen={() => setOpenRow(row)}
                            />
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Phone: row-cards, sorted by severity. */}
                  <div className="p-3 md:hidden">
                    {isLoading ? (
                      <div className="h-40 animate-pulse rounded-xl bg-muted/50" />
                    ) : (
                      <AttendanceCards
                        rows={table.rows}
                        locale={locale}
                        onOpen={setOpenRow}
                      />
                    )}
                  </div>

                  {!isLoading && (
                    <div className="border-t border-border px-4 py-2.5">
                      <p className="text-[11px] text-muted-foreground">
                        {t("footer.wholeDay")}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {openRow && (
        <AttendanceDetailSheet
          row={openRow}
          locale={locale}
          onClose={() => setOpenRow(null)}
        />
      )}
    </div>
  );
}

/**
 * An empty array is a **real answer**, not a failure — a Sunday looks exactly like
 * this. So the day picker stays above it and the panel says which day was empty,
 * rather than offering a reload of a request that already succeeded.
 */
function EmptyDayPanel({
  date,
  canGoToToday,
  onGoToToday,
}: {
  date: string;
  canGoToToday: boolean;
  onGoToToday: () => void;
}) {
  const t = useTranslations("attendance.states");
  return (
    <TableState
      icon={<CalendarDays className="size-4" />}
      title={t("emptyDayTitle", { date })}
      body={t("emptyDayBody")}
      action={
        canGoToToday ? (
          <Button size="sm" onClick={onGoToToday} className="mt-1">
            {t("emptyDayCta")}
          </Button>
        ) : undefined
      }
    />
  );
}

/**
 * The day has rows; this view selects none of them. Different copy from an empty
 * day, because the fix is a control on this screen rather than a different date —
 * and the tab badges already said so, so the panel just repeats it plainly.
 */
function NoMatchPanel({
  total,
  onShowAll,
}: {
  total: number;
  onShowAll: () => void;
}) {
  const t = useTranslations("attendance.states");
  return (
    <TableState
      icon={<SlidersHorizontal className="size-4" />}
      title={t("noMatchTitle")}
      body={t("noMatchBody", { total })}
      action={
        <Button variant="outline" size="sm" onClick={onShowAll} className="mt-1">
          {t("noMatchCta", { total })}
        </Button>
      }
    />
  );
}

/** Retrying is safe and lands on the same day, because the day is in the address. */
function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("attendance.states");
  return (
    <TableState
      icon={<AlertTriangle className="size-4" />}
      title={t("errorTitle")}
      body={t("errorBody")}
      action={
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          {t("errorRetry")}
        </Button>
      }
    />
  );
}

/**
 * One permission gates the whole screen, so there is no partial view to fall back
 * on — and **no Retry**, because retrying cannot help. The only next step is a
 * person, so the panel names the permission to ask for and offers the way out.
 */
function ForbiddenPanel() {
  const t = useTranslations("attendance.states");
  return (
    <Card>
      <CardContent className="py-10">
        <TableState
          icon={<ShieldOff className="size-4" />}
          title={t("forbiddenTitle")}
          body={t("forbiddenBody")}
          action={
            <div className="mt-2 flex flex-col items-center gap-2.5">
              <code className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {t("forbiddenCode")}
              </code>
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
                {t("forbiddenBack")}
              </Button>
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}
