"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutList,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { AccountLog } from "@/components/detail/account-log";
import { CardState } from "@/components/detail/card-state";
import { useAccountLog } from "@/hooks/use-account-log";
import { useTodayKey } from "@/hooks/use-today";
import type { WeekNavigation } from "@/hooks/use-week-navigation";
import type {
  ShiftState,
  WeekSummary,
  WorkerShift,
} from "@/hooks/use-worker-shifts";
import { toLocalDateKey } from "@/lib/tasks/weekly-rows";
import { cn } from "@/lib/utils";

/**
 * One colour per state, and the states are deliberately not a status enum: the
 * question the grid answers is *did this shift happen, and on time*, which the
 * task's own status cannot answer on its own.
 */
const STATE: Record<
  ShiftState,
  { cell: string; time: string; title: string; note: string }
> = {
  onSite: {
    cell: "bg-primary",
    time: "text-fresh",
    title: "text-primary-foreground",
    note: "text-primary-foreground/70",
  },
  onTime: {
    cell: "bg-accent",
    time: "text-accent-foreground",
    title: "text-accent-foreground",
    note: "text-accent-foreground/75",
  },
  late: {
    cell: "bg-status-pending-tint ring-1 ring-inset ring-status-pending/35",
    time: "text-status-pending-deep",
    title: "text-status-pending-deep",
    note: "text-status-pending-deep/80",
  },
  missed: {
    cell: "bg-status-cancelled-tint ring-1 ring-inset ring-status-cancelled/35",
    time: "text-status-cancelled-deep",
    title: "text-status-cancelled-deep",
    note: "text-status-cancelled-deep/80",
  },
  scheduled: {
    cell: "bg-muted",
    time: "text-muted-foreground",
    title: "text-foreground/80",
    note: "text-muted-foreground",
  },
  done: {
    cell: "bg-muted",
    time: "text-muted-foreground",
    title: "text-foreground/80",
    note: "text-muted-foreground",
  },
};

const LEGEND: ShiftState[] = [
  "onSite",
  "onTime",
  "late",
  "missed",
  "scheduled",
];

/** `"2026-08-25T14:00:00"` → `"14:00"`, without constructing a Date. */
function hhmm(iso: string): string {
  const time = iso.includes("T") ? iso.split("T")[1] : iso;
  return time.slice(0, 5);
}

function ShiftCell({ shift }: { shift: WorkerShift }) {
  const t = useTranslations("workers.shifts");
  const tone = STATE[shift.state];

  const note =
    shift.state === "missed"
      ? t("noCheckin")
      : shift.checkinAt && shift.checkoutAt
        ? t("inOut", { in: hhmm(shift.checkinAt), out: hhmm(shift.checkoutAt) })
        : shift.checkinAt
          ? shift.state === "late"
            ? t("inLate", {
                in: hhmm(shift.checkinAt),
                minutes: shift.lateBy ?? 0,
              })
            : t("inOnly", { in: hhmm(shift.checkinAt) })
          : t("scheduled");

  return (
    <Link
      href={`/dashboard/tasks/${shift.taskId}`}
      className={cn(
        "flex flex-col gap-0.5 rounded-md px-2 py-1.5 transition-opacity hover:opacity-85",
        tone.cell,
      )}
    >
      <span className={cn("text-[10px] font-semibold tabular-nums", tone.time)}>
        {hhmm(shift.scheduledAt)}
      </span>
      <span
        className={cn(
          "truncate text-[11px] font-semibold leading-tight",
          tone.title,
        )}
      >
        {shift.propertyName || t("unnamedProperty")}
      </span>
      <span className={cn("truncate text-[10px] leading-tight", tone.note)}>
        {note}
      </span>
    </Link>
  );
}

/**
 * What this worker is on, week by week — bookings *and* their clock-ins.
 *
 * Three views over two reads. Grid and Table share the same week query, so
 * switching between them cannot show two different answers and neither costs a
 * request. The log is its own read and its own permission, which is why it is a
 * tab rather than a fourth card: it is occasional, and it should not take space
 * from the week when nobody is asking for it.
 *
 * The week itself is **owned by the page**, not by this card. The identity band
 * states the same week's on-time rate and hours, and a card holding its own
 * navigation would let the two disagree about which week they were describing.
 */
export function ShiftsCard({
  workerId,
  nav,
  shifts,
  summary,
  canRead,
  isPending,
  isError,
}: {
  workerId: string;
  nav: WeekNavigation;
  shifts: WorkerShift[];
  summary: WeekSummary;
  /** `null` while the grant set is unknown — not the same as `false`. */
  canRead: boolean | null;
  isPending: boolean;
  isError: boolean;
}) {
  const t = useTranslations("workers.shifts");
  const tNav = useTranslations("workers.calendar");
  const locale = useLocale();
  const [view, setView] = useState<"grid" | "table" | "log">("grid");

  const log = useAccountLog([workerId]);

  const byDay = useMemo(() => {
    const map = new Map<string, WorkerShift[]>();
    for (const shift of shifts) {
      const held = map.get(shift.scheduledDate);
      if (held) held.push(shift);
      else map.set(shift.scheduledDate, [shift]);
    }
    return map;
  }, [shifts]);

  // Through the hook, not `new Date()`: this runs during SSR too, and a header
  // cell that highlights a different day before and after hydration is a
  // mismatch React will complain about and a reader will not trust.
  const todayKey = useTodayKey();

  const weekNav = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="size-8 p-0"
        onClick={nav.prev}
        aria-label={tNav("previousWeek")}
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
        aria-label={tNav("nextWeek")}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );

  function weekBody(render: () => React.ReactNode) {
    if (canRead === false)
      return (
        <CardState
          icon={<CalendarDays className="size-8" />}
          title={t("refused")}
          hint={t("refusedHint")}
          note="gated · task:list_any"
        />
      );
    if (canRead === null || isPending)
      return <Skeleton className="h-64 w-full rounded-lg" />;
    if (isError)
      return (
        <CardState
          icon={<CalendarDays className="size-8" />}
          title={t("failed")}
          note="read failed"
        />
      );
    return render();
  }

  return (
    <Card>
      {/* One `Tabs` around the whole card, so each trigger owns a real panel —
          triggers wired to hand-rolled conditionals lose the roving focus and
          the `aria-controls` pairing that make a tab strip usable by keyboard. */}
      <Tabs
        value={view}
        onValueChange={(v) => setView(v as typeof view)}
        className="gap-0"
      >
        <CardHeader className="flex flex-col gap-3 border-b pb-3 @xl/card-header:flex-row @xl/card-header:items-center @xl/card-header:justify-between">
          <TabsList variant="line">
            <TabsTrigger value="grid" className="gap-2">
              <CalendarDays className="size-4" />
              {t("viewGrid")}
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <LayoutList className="size-4" />
              {t("viewTable")}
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-2">
              <History className="size-4" />
              {t("viewLog")}
            </TabsTrigger>
          </TabsList>
          {/* The log is not a week, so the arrows go with the two views that are —
            leaving them live beside it would offer navigation that changes
            nothing. */}
          {view !== "log" ? weekNav : null}
        </CardHeader>

        <CardContent className="flex flex-col gap-3 pt-4">
          <TabsContent value="grid" className="flex flex-col gap-3">
            {weekBody(() => (
              <>
                <div className="overflow-x-auto">
                  <div className="grid min-w-[46rem] grid-cols-7 overflow-hidden rounded-lg ring-1 ring-inset ring-border">
                    {nav.days.map((day) => {
                      const key = toLocalDateKey(day);
                      const isToday = key === todayKey;
                      const isWeekend =
                        day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <div
                          key={`head-${key}`}
                          className={cn(
                            "flex flex-col gap-0.5 border-b border-border px-2.5 py-1.5",
                            isToday
                              ? "bg-accent"
                              : isWeekend
                                ? "bg-muted/50"
                                : "bg-muted/25",
                          )}
                        >
                          <span
                            className={cn(
                              "text-[10px] font-semibold uppercase tracking-[0.07em]",
                              isToday
                                ? "text-accent-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {day.toLocaleDateString(locale, {
                              weekday: "short",
                            })}
                            {isToday ? ` · ${tNav("today")}` : ""}
                          </span>
                          <span
                            className={cn(
                              "text-[13px] tabular-nums",
                              isToday
                                ? "font-semibold text-accent-foreground"
                                : "text-foreground/70",
                            )}
                          >
                            {day.getDate()}
                          </span>
                        </div>
                      );
                    })}

                    {nav.days.map((day) => {
                      const key = toLocalDateKey(day);
                      const isWeekend =
                        day.getDay() === 0 || day.getDay() === 6;
                      const cells = byDay.get(key) ?? [];
                      return (
                        <div
                          key={`body-${key}`}
                          className={cn(
                            "flex min-h-[9rem] flex-col gap-1.5 border-border p-1.5 not-last:border-r",
                            isWeekend && "bg-muted/25",
                          )}
                        >
                          {cells.map((shift) => (
                            <ShiftCell key={shift.taskId} shift={shift} />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
                    {LEGEND.map((state) => (
                      <span
                        key={state}
                        className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "size-2.5 rounded-[3px]",
                            STATE[state].cell,
                          )}
                        />
                        {t(`state.${state}`)}
                      </span>
                    ))}
                  </div>
                  {/* Hours worked, from clock-ins — not from what was booked.
                      The two differ, and only one of them happened. */}
                  <span className="text-[11px] text-muted-foreground">
                    {t("summary", {
                      shifts: summary.shifts,
                      hours: summary.hours.toFixed(1),
                    })}
                  </span>
                </div>
              </>
            ))}
          </TabsContent>

          <TabsContent value="table">
            {weekBody(() =>
              shifts.length === 0 ? (
                <CardState
                  icon={<CalendarDays className="size-8" />}
                  title={t("emptyWeek", { range: nav.dateRangeLabel })}
                  hint={t("emptyWeekHint")}
                  note="no assignments in range"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[38rem] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        {[
                          "date",
                          "property",
                          "start",
                          "checkin",
                          "checkout",
                          "state",
                        ].map((col) => (
                          <th
                            key={col}
                            className="px-2 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
                          >
                            {t(`columns.${col}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map((shift) => (
                        <tr
                          key={shift.taskId}
                          className="border-b border-border/60 last:border-0 hover:bg-accent/30"
                        >
                          <td className="px-2 py-2 tabular-nums">
                            <Link
                              href={`/dashboard/tasks/${shift.taskId}`}
                              className="hover:underline"
                            >
                              {new Date(
                                `${shift.scheduledDate}T00:00:00`,
                              ).toLocaleDateString(locale, {
                                weekday: "short",
                                day: "2-digit",
                                month: "short",
                              })}
                            </Link>
                          </td>
                          <td className="px-2 py-2">
                            {shift.propertyName || t("unnamedProperty")}
                          </td>
                          <td className="px-2 py-2 tabular-nums text-muted-foreground">
                            {hhmm(shift.scheduledAt)}
                          </td>
                          <td className="px-2 py-2 tabular-nums text-muted-foreground">
                            {shift.checkinAt ? hhmm(shift.checkinAt) : "—"}
                          </td>
                          <td className="px-2 py-2 tabular-nums text-muted-foreground">
                            {shift.checkoutAt ? hhmm(shift.checkoutAt) : "—"}
                          </td>
                          <td className="px-2 py-2">
                            <Badge
                              tone={
                                shift.state === "missed"
                                  ? "danger"
                                  : shift.state === "late"
                                    ? "warning"
                                    : shift.state === "onSite"
                                      ? "primary"
                                      : shift.state === "onTime"
                                        ? "success"
                                        : "neutral"
                              }
                            >
                              {t(`state.${shift.state}`)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            )}
          </TabsContent>

          <TabsContent value="log">
            <AccountLog
              entries={log.entries}
              canRead={log.canRead}
              isPending={log.isPending}
              isError={log.isError}
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
