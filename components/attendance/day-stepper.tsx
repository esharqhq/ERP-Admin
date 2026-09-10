"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { shiftDay } from "@/lib/ui/date-range";
import { cn } from "@/lib/utils";

/**
 * The one control on this screen that talks to the server.
 *
 * `GET /api/admin/attendance?date=` takes exactly one parameter, so the day is the
 * only thing the response depends on and everything else in the toolbar — the
 * tabs, the search, the two filters, the CSV — works the day already in the
 * browser. Drawing the date as a **stepper** rather than a bare `<input
 * type="date">` says that: one tap is one request, and the neighbouring days are
 * where an admin actually goes.
 *
 * The native picker is kept underneath for the case a stepper is bad at — a date
 * three weeks back — as a hidden input the calendar button opens.
 */
export function DayStepper({
  value,
  todayKey,
  onChange,
  disabled,
}: {
  value: string;
  /** Today as a local `YYYY-MM-DD`, or `""` before the clock is known. */
  todayKey: string;
  onChange: (dayKey: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("attendance.date");
  const isToday = Boolean(todayKey) && value === todayKey;

  return (
    <div className="flex items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          {t("label")}
        </span>

        <span className="flex items-center gap-px rounded-lg bg-shell-tint p-[3px]">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("prev")}
            disabled={disabled}
            onClick={() => onChange(shiftDay(value, -1))}
            className="size-7"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {/*
            The date input is the label. It carries the value, opens the native
            calendar, and can be typed into — so the stepper adds the two common
            moves without taking the uncommon one away.
          */}
          <span className="flex items-center gap-1.5 rounded-md bg-card px-2 py-1 shadow-sm">
            <CalendarDays className="size-3.5 flex-none text-ink-soft" />
            <input
              type="date"
              value={value}
              disabled={disabled}
              onChange={(e) => {
                // An emptied input would send `date=` and read as "today" to the
                // server while the stepper still showed a blank; hold the day.
                if (e.target.value) onChange(e.target.value);
              }}
              className="w-[6.5rem] bg-transparent font-mono text-[12.5px] tabular-nums outline-none"
            />
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("next")}
            disabled={disabled}
            onClick={() => onChange(shiftDay(value, 1))}
            className="size-7"
          >
            <ChevronRight className="size-4" />
          </Button>
        </span>
      </label>

      {/*
        Present but inert on today, rather than hidden. A control that appears and
        disappears as you step through the week moves the export button beside it.
      */}
      <Button
        type="button"
        variant={isToday ? "ghost" : "outline"}
        size="sm"
        disabled={disabled || isToday || !todayKey}
        onClick={() => onChange(todayKey)}
        className={cn("h-8", isToday && "text-muted-foreground")}
      >
        {t("today")}
      </Button>
    </div>
  );
}
