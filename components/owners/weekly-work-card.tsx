"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTableCard } from "@/components/ui/data-table-card";
import { TableCell, TableRow } from "@/components/ui/table";
import { RowLink } from "@/components/ui/row-link";
import { TasksCalendar } from "@/components/tasks/tasks-calendar";
import { useWeekNavigation } from "@/hooks/use-week-navigation";
import { useOwnerTaskGroups } from "@/hooks/use-owners";
import {
  filterRowsByStatus,
  flattenTaskRows,
  rowsInWeek,
  toLocalDateKey,
  workerSummary,
  type WeeklyTaskRow,
} from "@/lib/tasks/weekly-rows";
import type { PropertyDto } from "@/lib/types/property.types";

const STATUSES = ["all", "Pending", "Active", "Review", "Done", "Cancelled"] as const;

function fmtTime(iso: string): string {
  const t = iso.includes("T") ? iso.split("T")[1] : iso;
  return t.slice(0, 5);
}

/**
 * What this owner has booked, by week.
 *
 * Laid out like the Workers screen: a `line` tab row switches view, a second
 * `line` tab row filters status, and the table itself is a `DataTableCard` — so
 * the column headers, the result count and the card chrome match every other
 * table in the panel rather than being hand-rolled here.
 *
 * Both views read the **same** query — the task groups the detail page already
 * fetches — so switching cannot show two different answers and neither costs a
 * request. The calendar shows the shape of the week; the table shows what is in
 * it.
 *
 * The "Booking" column is the task group's title, not a service type: the API
 * has neither a service field nor a service catalogue, and the title is what an
 * owner types when booking.
 */
export function WeeklyWorkCard({
  ownerUserId,
  properties,
}: {
  ownerUserId: string;
  properties: PropertyDto[];
}) {
  const t = useTranslations("owners");
  const locale = useLocale();
  const nav = useWeekNavigation();
  const [view, setView] = useState<"calendar" | "table">("calendar");
  const [status, setStatus] = useState<string>("all");

  const { data: groups = [], isLoading } = useOwnerTaskGroups(ownerUserId);

  const propertyNames = useMemo(
    () => Object.fromEntries(properties.map((p) => [p.id, p.name ?? ""])),
    [properties],
  );

  const weekKeys = useMemo(() => nav.days.map(toLocalDateKey), [nav.days]);

  const rows = useMemo(
    () =>
      filterRowsByStatus(
        rowsInWeek(flattenTaskRows(groups, propertyNames), weekKeys),
        status,
      ),
    [groups, propertyNames, weekKeys, status],
  );

  const columns = [
    { label: t("work.columns.date") },
    { label: t("work.columns.property") },
    { label: t("work.columns.time") },
    { label: t("work.columns.worker") },
    { label: t("work.columns.booking") },
    { label: t("work.columns.status") },
  ];

  // The calendar carries its own week navigation, so this pairs with the table
  // only — two sets of arrows on one card would be ambiguous.
  const weekNav = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="size-8 p-0"
        onClick={nav.prev}
        aria-label={nav.dateRangeLabel}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[9rem] text-center text-sm font-medium tabular-nums">
        {nav.dateRangeLabel}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="size-8 p-0"
        onClick={nav.next}
        aria-label={nav.dateRangeLabel}
      >
        <ChevronRight className="size-4" />
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
      </TabsList>

      <TabsContent value="calendar">
        <TasksCalendar ownerUserId={ownerUserId} properties={properties} />
      </TabsContent>

      <TabsContent value="table" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={status} onValueChange={setStatus}>
            <TabsList variant="line" className="self-start">
              {STATUSES.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {t(`work.status.${s}` as Parameters<typeof t>[0])}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {weekNav}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <DataTableCard
            title={t("work.title")}
            count={rows.length}
            columns={columns}
            data={rows}
            renderRow={(row: WeeklyTaskRow) => {
              const staff = workerSummary(row);
              const label = new Date(
                `${row.scheduledDate}T00:00:00`,
              ).toLocaleDateString(locale, {
                weekday: "short",
                day: "2-digit",
                month: "short",
              });

              return (
                <TableRow
                  key={row.taskId}
                  className="group/row relative cursor-pointer transition-colors duration-150 hover:bg-accent/40"
                >
                  <TableCell className="py-2.5 text-sm tabular-nums">
                    <RowLink href={`/dashboard/tasks/${row.taskId}`} label={label} />
                    {label}
                  </TableCell>
                  <TableCell className="text-sm">{row.propertyName || "—"}</TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {fmtTime(row.scheduledAt)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {staff.names.length === 0 ? (
                      <span className="text-muted-foreground">{t("work.unstaffed")}</span>
                    ) : (
                      <span>
                        {staff.names.join(", ")}
                        {staff.extra > 0 ? (
                          <span className="ml-1 text-muted-foreground">
                            {t("work.more", { count: staff.extra })}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate text-sm text-muted-foreground">
                    {row.groupTitle || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.status}</Badge>
                  </TableCell>
                </TableRow>
              );
            }}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
