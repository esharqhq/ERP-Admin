"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-base font-semibold tracking-tight">
            {t("work.title")}
          </h2>

          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            <Button
              variant={view === "calendar" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5"
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="size-3.5" />
              {t("work.viewCalendar")}
            </Button>
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5"
              onClick={() => setView("table")}
            >
              <List className="size-3.5" />
              {t("work.viewTable")}
            </Button>
          </div>
        </div>

        {/* Only the table needs these — the calendar brings its own week nav
            and its own property filter. */}
        {view === "table" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                onClick={nav.prev}
                aria-label={t("work.viewCalendar")}
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
                aria-label={t("work.viewCalendar")}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  variant={status === s ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-[12px]"
                  onClick={() => setStatus(s)}
                >
                  {t(`work.status.${s}` as Parameters<typeof t>[0])}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="pt-0">
        {view === "calendar" ? (
          <TasksCalendar ownerUserId={ownerUserId} properties={properties} />
        ) : isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("work.empty")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("work.columns.date")}</TableHead>
                <TableHead>{t("work.columns.property")}</TableHead>
                <TableHead>{t("work.columns.time")}</TableHead>
                <TableHead>{t("work.columns.worker")}</TableHead>
                <TableHead>{t("work.columns.booking")}</TableHead>
                <TableHead>{t("work.columns.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
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
                        <span className="text-muted-foreground">
                          {t("work.unstaffed")}
                        </span>
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
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
