"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  DataTable,
  TableEmpty,
  TableError,
  TableForbidden,
  TableNoMatch,
} from "@/components/ui/data-table";
import { AccountLog } from "@/components/detail/account-log";
import { useAccountLog } from "@/hooks/use-account-log";
import { RegisterCalendarShell } from "@/components/tasks/register/register-calendar-shell";
import {
  WeeklyWorkRowCard,
  weeklyDayLabel,
  weeklyWorkColumns,
} from "@/components/owners/weekly-work-columns";
import { useLocalTableState } from "@/hooks/use-local-table-state";
import { useClock, useTodayKey } from "@/hooks/use-today";
import { useOwnerTaskGroups } from "@/hooks/use-owners";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import {
  countRowsByStatus,
  filterRowsByStatus,
  flattenTaskRows,
  matchesWeeklyRow,
  ownerRegisterRows,
  rowsInWeek,
  visibleWeeklyRows,
  weeklyRowHref,
} from "@/lib/tasks/weekly-rows";
import { shiftWeek, weekOf, weekRangeLabel } from "@/lib/ui/week";
import type { PropertyDto } from "@/lib/types/property.types";

/**
 * ⚠ The six day states as `TaskStateKey`s, not as the server's words.
 *
 * These were `"Active"` and `"Review"` until F-07 ·0 renamed them on
 * 2026-09-17; after that, picking either matched no row and the table silently
 * emptied. `filterRowsByStatus` canonicalises both sides, so the tab value is
 * now our key rather than a copy of a server word that has already moved once.
 *
 * `rejected` is F-07 ·5's disputed day, listed here for the same reason the
 * other five are: `filterRowsByStatus` already canonicalises it, so the tab
 * only needed to exist to start filtering correctly.
 *
 * ⚠ Nothing here is sent to the API. `filterRowsByStatus` runs over rows already
 * fetched — the admin task list's `?status=` is a different, server-bound enum
 * that answers `400` problem-details for an unknown value.
 */
const STATUSES = [
  "all",
  "pending",
  "checkedIn",
  "inReview",
  "done",
  "cancelled",
  "rejected",
] as const;

/**
 * What this owner has booked, by week.
 *
 * A `line` tab row switches view. The table view is the panel's own
 * `DataTable` shell — the same one the Tasks register renders through — so the
 * header, the status tabs, search, the column picker, density, the four
 * notice states, the pager and the row-cards below 768px all match every other
 * table rather than being hand-rolled here. The week arrows sit in the shell's
 * action slot, where the register keeps its view switch.
 *
 * The table's state is held in memory (`useLocalTableState`), not in the URL:
 * the walk-in screen embeds this card and reads `?tab=` itself, so a status tab
 * here writing `?tab=` would switch that page's tab.
 *
 * Both views read the **same** query — the task groups the detail page already
 * fetches — so switching cannot show two different answers and neither costs a
 * request. They also share one week, one status tab and one search, so the
 * calendar — the Tasks register's own week grid (`RegisterCalendarShell`) —
 * draws exactly the set the table lists. It replaced `TasksCalendar`, a
 * hand-drawn grid that read a second, wider query and scrolled sideways.
 *
 * The "Booking" column is the task group's title, not a service type: the API
 * has neither a service field nor a service catalogue, and the title is what an
 * owner types when booking.
 *
 * The third tab is the account's admin log. It sits here rather than in a card
 * of its own because it is occasional: an admin opens it when they are asking
 * "who changed this, and why", and the rest of the time it should not be taking
 * space from the week. It is also its own read and its own permission, so it can
 * refuse while the two views beside it work perfectly.
 */
export function WeeklyWorkCard({
  ownerUserId,
  ownerProfileId = null,
  properties,
  showLog = true,
}: {
  ownerUserId: string;
  /**
   * `null` until the KYC read lands, or for good if it 404'd. The owner side
   * writes audit entries against **both** ids — `OwnerUser` for a deactivation,
   * `OwnerProfile` for KYC verdicts and legal-name corrections — so without this
   * the log is missing half of itself.
   */
  ownerProfileId?: string | null;
  properties: PropertyDto[];
  /**
   * Off where the card is a *booking aid* rather than an account view — the
   * walk-in screen embeds it to show what is already booked while dates are
   * being picked, and an audit tab there answers a question nobody is asking.
   */
  showLog?: boolean;
}) {
  const t = useTranslations("owners");
  // Borrowed rather than re-added: `workers.calendar` already carries a
  // translated Previous/Next Week pair in both locales.
  const tNav = useTranslations("workers.calendar");
  const locale = useLocale();
  const todayKey = useTodayKey();
  const clock = useClock();
  /**
   * One week for both views — the table's arrows and the calendar's pager move
   * the same key, so switching view never jumps to another week. `null` means
   * "this week", resolved once the clock is known (`""` on the server snapshot).
   */
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const week = useMemo(
    () => (todayKey ? weekOf(weekStart ?? todayKey, todayKey) : null),
    [weekStart, todayKey],
  );
  const [view, setView] = useState<"calendar" | "table" | "log">("calendar");
  const table = useLocalTableState({
    defaultSort: { key: "date", dir: "asc" },
  });

  const {
    data: groups = [],
    isLoading,
    isError,
    error,
  } = useOwnerTaskGroups(ownerUserId);
  const log = useAccountLog(showLog ? [ownerUserId, ownerProfileId] : []);

  const propertyNames = useMemo(
    () => Object.fromEntries(properties.map((p) => [p.id, p.name ?? ""])),
    [properties],
  );

  const weekKeys = useMemo(() => week?.dayKeys ?? [], [week]);
  const waiting = isLoading || !week || !clock;

  /** The week, before the status tab — what the tab counts are taken over. */
  const weekRows = useMemo(
    () => rowsInWeek(flattenTaskRows(groups, propertyNames), weekKeys),
    [groups, propertyNames, weekKeys],
  );

  /**
   * Narrowed by the tab **before** the shell sees it, as the register does: a
   * tab is which slice you are looking at, not a filter, so it must not light
   * up "Nothing matches these filters" or be cleared by Clear all.
   */
  const rows = useMemo(
    () => filterRowsByStatus(weekRows, table.tab),
    [weekRows, table.tab],
  );

  const counts = useMemo(() => countRowsByStatus(weekRows, STATUSES), [weekRows]);
  const tabs = STATUSES.map((s) => ({
    value: s,
    label: t(`work.status.${s}` as Parameters<typeof t>[0]),
    count: waiting || isError ? undefined : counts[s],
  }));

  /**
   * The calendar draws the register's own week grid over **the same set** the
   * table lists — tab and search applied — joined by task id, so the two views
   * cannot disagree about what is booked.
   */
  const calendarRows = useMemo(() => {
    if (!clock) return [];
    const visible = new Set(
      visibleWeeklyRows(weekRows, table.tab, table.search).map((r) => r.taskId),
    );
    return ownerRegisterRows(groups, propertyNames, new Date(clock)).filter((r) =>
      visible.has(r.task.id),
    );
  }, [groups, propertyNames, clock, weekRows, table.tab, table.search]);

  const forbidden = isError && isPermissionDenied(error);
  const emptyCopy = table.isDefaultTab
    ? { title: t("work.empty.title"), body: t("work.empty.body") }
    : {
        title: t("work.empty.tabTitle", {
          status: t(`work.status.${table.tab}` as Parameters<typeof t>[0]),
        }),
        body: t("work.empty.tabBody"),
      };
  const calendarNotice = forbidden ? (
    <TableForbidden />
  ) : waiting ? undefined : isError ? (
    <TableError />
  ) : calendarRows.length > 0 ? undefined : table.isFiltered ? (
    <TableNoMatch onClear={() => table.setSearchInput("")} />
  ) : (
    <TableEmpty {...emptyCopy} icon={<CalendarDays className="size-4" />} />
  );

  const columns = useMemo(() => weeklyWorkColumns({ t, locale }), [t, locale]);

  // The table's week arrows. The calendar draws its own pager over the same
  // `weekStart`, so whichever view moved the week, the other is already there.
  const weekNav = (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        className="size-7 rounded-lg"
        disabled={!week}
        onClick={() => week && setWeekStart(shiftWeek(week.startKey, -1))}
        // Direction, not the range: an identical label on both buttons leaves
        // the chevron as the only cue, which AT users cannot see.
        aria-label={tNav("previousWeek")}
      >
        <ChevronLeft className="size-3.5" />
      </Button>
      <span className="min-w-[9rem] text-center font-mono text-[12.5px] font-semibold tabular-nums">
        {week ? weekRangeLabel(week, locale) : "–"}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        className="size-7 rounded-lg"
        disabled={!week}
        onClick={() => week && setWeekStart(shiftWeek(week.startKey, 1))}
        aria-label={tNav("nextWeek")}
      >
        <ChevronRight className="size-3.5" />
      </Button>
    </div>
  );

  return (
    <Tabs
      value={view}
      onValueChange={(v) => setView(v as typeof view)}
      className="gap-4"
    >
      <TabsList variant="line" className="self-start">
        <TabsTrigger value="calendar" className="gap-2">
          <CalendarDays className="size-4" />
          {t("work.viewCalendar")}
        </TabsTrigger>
        <TabsTrigger value="table" className="gap-2">
          <LayoutList className="size-4" />
          {t("work.viewTable")}
        </TabsTrigger>
        {showLog ? (
          <TabsTrigger value="log" className="gap-2">
            <History className="size-4" />
            {t("work.viewLog")}
          </TabsTrigger>
        ) : null}
      </TabsList>

      <TabsContent value="calendar" className="flex flex-col">
        <RegisterCalendarShell
          state={table}
          scope="owner-weekly-work-calendar"
          title={t("work.title")}
          count={waiting || isError ? undefined : calendarRows.length}
          viewSwitch={null}
          tabs={tabs}
          tabsLabel={t("work.tabsLabel")}
          searchPlaceholder={t("work.search")}
          // No filter band on this card: the tabs and search are the whole set.
          fields={[]}
          onBandChange={() => {}}
          onBandChangeMany={() => {}}
          onBandReset={() => {}}
          calendar={{
            rows: calendarRows,
            weekStartKey: week?.startKey ?? "",
            todayKey,
            onWeek: setWeekStart,
            isLoading: waiting,
            notice: calendarNotice,
          }}
        />
      </TabsContent>

      <TabsContent value="table" className="flex flex-col">
        <DataTable
          state={table}
          scope="owner-weekly-work"
          title={t("work.title")}
          actions={weekNav}
          columns={columns}
          rowKey={(row) => row.taskId}
          rowHref={weeklyRowHref}
          rowLabel={(row) =>
            `${weeklyDayLabel(row, locale)} · ${row.propertyName || row.groupTitle}`
          }
          mobileCard={(row) => (
            <WeeklyWorkRowCard row={row} t={t} locale={locale} />
          )}
          tabs={tabs}
          tabsLabel={t("work.tabsLabel")}
          searchPlaceholder={t("work.search")}
          // On a status tab the week is not empty — that one slice is. Saying
          // "nothing booked" there would be false; the shell adds "See all".
          empty={{ ...emptyCopy, icon: <CalendarDays className="size-4" /> }}
          source={{
            mode: "client",
            rows,
            isLoading: waiting,
            isError,
            isForbidden: forbidden,
            matches: matchesWeeklyRow,
          }}
        />
      </TabsContent>

      {showLog ? (
        <TabsContent value="log">
          <Card>
            <CardContent>
              <AccountLog
                entries={log.entries}
                canRead={log.canRead}
                isPending={log.isPending}
                isError={log.isError}
              />
            </CardContent>
          </Card>
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
