"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CARD_TONE_CLASS, CalendarCard } from "@/components/tasks/register/calendar-card";
import type { RegisterRow } from "@/lib/tasks/register/rows";
import { buildCalendarDays, type CalendarDay, type CardTone } from "@/lib/tasks/register/week";
import { dayLabel, shiftWeek, weekOf, weekRangeLabel, weekdayLabels } from "@/lib/ui/week";
import { cn } from "@/lib/utils";

type CalendarT = ReturnType<typeof useTranslations<"tasks.register">>;

/** Legend order = the design's. `closed` is the Done/Cancelled pair, so it has its own word. */
const LEGEND: { tone: CardTone; label: (t: CalendarT) => string }[] = [
  { tone: "running", label: (t) => t("status.Running") },
  { tone: "scheduled", label: (t) => t("status.Scheduled") },
  { tone: "open", label: (t) => t("status.Open") },
  { tone: "unstaffed", label: (t) => t("status.Unstaffed") },
  { tone: "overdue", label: (t) => t("status.Overdue") },
  { tone: "review", label: (t) => t("status.Review") },
  { tone: "closed", label: (t) => t("calendar.closed") },
];

/** Real card height, so the grid does not jump when the rows land. */
function CardSkeletons() {
  return (
    <>
      <Skeleton className="h-[62px] rounded-[10px]" />
      <Skeleton className="h-[62px] rounded-[10px]" />
    </>
  );
}

function DayChip({ day, t }: { day: CalendarDay; t: CalendarT }) {
  // An empty day is neither short nor "all covered" — it has nothing to cover.
  if (day.count === 0) return <span className="h-[22px]" aria-hidden />;
  return day.short > 0
    ? <Badge tone="warning">{t("calendar.short", { count: day.short })}</Badge>
    : <Badge tone="success">{t("calendar.covered")}</Badge>;
}

/**
 * The register's week (spec §5, design 02 / 09): the **same filtered rows** as
 * the list, laid on the week they happen in. The page owns the rows and the
 * week (both in the URL); this draws them.
 *
 * Desktop: seven day columns, today tinted. Below `md`: one day at a time,
 * never a horizontally scrolling grid.
 */
export function RegisterCalendar({
  rows,
  weekStartKey,
  todayKey,
  onWeek,
  isLoading = false,
  notice,
}: {
  rows: RegisterRow[];
  weekStartKey: string;
  todayKey: string;
  onWeek: (startKey: string) => void;
  isLoading?: boolean;
  /** Drawn instead of the days — error, refusal, nothing matched. The pager stays. */
  notice?: ReactNode;
}) {
  const t = useTranslations("tasks.register");
  const locale = useLocale();
  const week = useMemo(() => weekOf(weekStartKey, todayKey), [weekStartKey, todayKey]);
  const days = useMemo(() => buildCalendarDays(rows, week, todayKey), [rows, week, todayKey]);
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);
  const total = days.reduce((n, d) => n + d.count, 0);
  const short = days.reduce((n, d) => n + d.short, 0);
  const thisWeek = weekOf(todayKey, todayKey).startKey;

  /**
   * The phone's one day. Held with the week it was picked in, so paging to
   * another week falls back to that week's default (today, else Monday) rather
   * than a key that is no longer on screen.
   */
  const [picked, setPicked] = useState<{ week: string; key: string } | null>(null);
  const selectedKey = picked?.week === week.startKey
    ? picked.key
    : week.dayKeys.includes(todayKey) ? todayKey : week.dayKeys[0];
  const selectedIndex = Math.max(0, week.dayKeys.indexOf(selectedKey));
  const selected = days[selectedIndex];

  // The clock is unknown on the server snapshot (`useTodayKey()` is ""), and a
  // week of invalid dates cannot be formatted — hold the space until it is.
  if (!todayKey || !weekStartKey) {
    return (
      <div className="flex grow flex-col gap-2 p-4">
        <Skeleton className="h-7 w-64 rounded-lg" />
        <Skeleton className="h-[360px] rounded-[10px]" />
      </div>
    );
  }

  /** ‹ › step a day, and carry over into the neighbouring week at either end. */
  function stepDay(n: 1 | -1) {
    const next = selectedIndex + n;
    if (next >= 0 && next < 7) {
      setPicked({ week: week.startKey, key: week.dayKeys[next] });
      return;
    }
    const start = shiftWeek(week.startKey, n);
    const landed = weekOf(start, todayKey);
    setPicked({ week: start, key: n > 0 ? landed.dayKeys[0] : landed.dayKeys[6] });
    onWeek(start);
  }

  return (
    <div className="flex grow flex-col">
      {/* Desktop header — the week pager drives the date range while Calendar is on. */}
      <div className="hidden flex-wrap items-center gap-2.5 border-b border-border px-4 py-3 sm:px-5 md:flex">
        <div className="flex flex-none items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onWeek(shiftWeek(week.startKey, -1))}
            aria-label={t("calendar.prevWeek")}
            className="size-7 rounded-lg"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeek(thisWeek)}
            // Disabled rather than hidden, as on the workers Matrix: a control
            // that vanishes makes the row change width while paging.
            disabled={week.startKey === thisWeek}
            className="h-7 rounded-lg px-2.5 text-xs"
          >
            {t("calendar.thisWeek")}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onWeek(shiftWeek(week.startKey, 1))}
            aria-label={t("calendar.nextWeek")}
            className="size-7 rounded-lg"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
        <span className="whitespace-nowrap font-mono text-[12.5px] font-semibold tabular-nums">
          {weekRangeLabel(week, locale)}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground/70">{t("calendar.sameSet")}</span>
        <div className="flex-1" />
        {!isLoading && !notice && (
          <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-muted-foreground">
            {t("calendar.inView", { count: total, short })}
          </span>
        )}
      </div>

      {/* Phone header — one day at a time (design 09). */}
      <div className="flex flex-col gap-2.5 border-b border-border px-4 py-3 md:hidden">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => stepDay(-1)}
            aria-label={t("calendar.prevDay")}
            className="size-[30px] flex-none rounded-lg"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <div role="group" aria-label={t("calendar.days")} className="flex min-w-0 flex-1 gap-1">
            {days.map((day, i) => {
              const on = i === selectedIndex;
              return (
                <button
                  key={day.key}
                  type="button"
                  aria-pressed={on}
                  aria-label={dayLabel(day.key, locale)}
                  onClick={() => setPicked({ week: week.startKey, key: day.key })}
                  className={cn(
                    "flex h-[46px] min-w-0 flex-1 flex-col items-center justify-center gap-px rounded-[10px]",
                    "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    on
                      ? "bg-primary text-primary-foreground"
                      : day.isToday ? "bg-accent/40 ring-1 ring-inset ring-border" : "ring-1 ring-inset ring-border",
                  )}
                >
                  <span className={cn("overline-label", !on && "text-muted-foreground")}>
                    {weekdays[i]}
                  </span>
                  <span className="font-mono text-xs font-semibold tabular-nums">
                    {String(week.days[i].getDate()).padStart(2, "0")}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "size-[5px] rounded-full",
                      day.short > 0 ? "bg-status-pending" : day.count > 0 ? "bg-status-active" : "bg-transparent",
                    )}
                  />
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => stepDay(1)}
            aria-label={t("calendar.nextDay")}
            className="size-[30px] flex-none rounded-lg"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span className="text-[12.5px] font-semibold">{dayLabel(selected.key, locale)}</span>
          {!isLoading && !notice && (
            <span
              className={cn(
                "font-mono text-[11px] tabular-nums",
                selected.short > 0 ? "text-status-cancelled-deep" : "text-muted-foreground",
              )}
            >
              {t("calendar.dayCount", { count: selected.count })}
              {selected.short > 0 ? ` · ${t("calendar.short", { count: selected.short })}` : ""}
            </span>
          )}
        </div>
      </div>

      {notice ? (
        <div className="flex grow items-center justify-center py-10">{notice}</div>
      ) : (
        <>
          {/* Desktop grid — seven columns, never wider than the card. */}
          <div className="hidden grow grid-cols-7 md:grid">
            {days.map((day, i) => (
              <div
                key={day.key}
                className={cn(
                  "flex min-w-0 flex-col border-r border-border last:border-r-0",
                  day.isToday && "bg-accent/40",
                )}
              >
                <div className="flex flex-col gap-1 border-b border-border px-2.5 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("overline-label", day.isToday ? "text-primary" : "text-muted-foreground")}>
                      {weekdays[i]}
                    </span>
                    <span
                      className={cn(
                        "flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 font-mono text-[12.5px] tabular-nums",
                        day.isToday ? "bg-primary font-bold text-primary-foreground" : "font-medium",
                      )}
                    >
                      {String(week.days[i].getDate()).padStart(2, "0")}
                    </span>
                    <div className="flex-1" />
                    {!isLoading && (
                      <span className="whitespace-nowrap font-mono text-[10px] tabular-nums text-muted-foreground">
                        {t("calendar.dayCount", { count: day.count })}
                      </span>
                    )}
                  </div>
                  {isLoading ? <Skeleton className="h-[22px] w-20 rounded-full" /> : <DayChip day={day} t={t} />}
                </div>
                <div className="flex min-w-0 flex-col gap-1.5 p-1.5">
                  {isLoading ? <CardSkeletons /> : day.rows.map((row) => <CalendarCard key={row.task.id} row={row} />)}
                </div>
              </div>
            ))}
          </div>

          {/* Phone — the picked day's cards, stacked. */}
          <div className="flex grow flex-col gap-2 p-3 md:hidden">
            {isLoading ? <CardSkeletons /> : selected.rows.map((row) => <CalendarCard key={row.task.id} row={row} />)}
          </div>
        </>
      )}

      {/* Legend — one swatch per tone. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5 sm:px-5">
        <span className="overline-label text-muted-foreground">{t("calendar.legend")}</span>
        {LEGEND.map(({ tone, label }) => (
          <span
            key={tone}
            className={cn(
              "flex h-[22px] items-center rounded-md px-2 text-[11px] font-semibold whitespace-nowrap",
              CARD_TONE_CLASS[tone],
            )}
          >
            {label(t)}
          </span>
        ))}
      </div>
    </div>
  );
}
