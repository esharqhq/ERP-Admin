"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  isInMonth,
  isPastDay,
  monthGrid,
  monthOf,
  shiftMonth,
  toggleDate,
  weekdayLabels,
  type YearMonth,
} from "@/lib/tasks/month-grid";
import { toLocalDateKey } from "@/lib/tasks/weekly-rows";
import { cn } from "@/lib/utils";

/**
 * Pick every day an order covers.
 *
 * Multi-select: clicking a day toggles it in or out of the selection via
 * `toggleDate`, which also keeps the result sorted ascending — a caller that
 * derives a date range from `value[0]` / `value.at(-1)` depends on that order
 * being the real first and last day, not the click order.
 *
 * Past days are disabled. Nothing server-side refuses them; work that has been
 * and gone cannot be usefully staffed, so the refusal is ours.
 *
 * No outer border: this renders inside a form card, and a bordered box inside a
 * bordered card reads as clutter. The grid's own surface separates it instead.
 */
export function MonthDatePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const todayKey = toLocalDateKey(new Date());

  const [view, setView] = useState<YearMonth>(() => {
    // Open on the month of the earliest selection rather than always on today:
    // re-opening a form that already holds September dates should not land the
    // admin in August with nothing highlighted.
    if (value.length > 0) return monthOf(value[0]);
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const cells = useMemo(() => monthGrid(view), [view]);
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);
  const selected = new Set(value);

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  const chipLabel = (key: string) =>
    new Date(`${key}T00:00:00`).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });

  /**
   * A padding cell carries a neighbouring month's real date and stays
   * selectable — the admin may genuinely want the 1st of next month. Clicking
   * one also moves the view to that month, so the selection lands somewhere
   * visible instead of in a grey cell the eye reads as decoration.
   */
  function pick(key: string) {
    onChange(toggleDate(value, key));
    if (!isInMonth(key, view)) setView(monthOf(key));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Capped: `grid-cols-7` fills whatever it is given, and on a dashboard-width
          column that spreads seven cells over ~1000px — a month you have to sweep
          your eyes across rather than read. A month grid is legible at ~360px. */}
      <div className="w-full max-w-sm rounded-xl bg-muted/40 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 p-0"
            disabled={disabled}
            onClick={() => setView((v) => shiftMonth(v, -1))}
            aria-label={tCommon("previousMonth")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold tracking-tight">{monthLabel}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 p-0"
            disabled={disabled}
            onClick={() => setView((v) => shiftMonth(v, 1))}
            aria-label={tCommon("nextMonth")}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekdays.map((w, i) => (
            <span
              key={i}
              className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70"
            >
              {w}
            </span>
          ))}

          {cells.map((cell) => {
            const past = isPastDay(cell.key, todayKey);
            const isSelected = selected.has(cell.key);
            const isToday = cell.key === todayKey;
            return (
              <button
                key={cell.key}
                type="button"
                disabled={disabled || past}
                aria-pressed={isSelected}
                title={isToday ? tCommon("today") : undefined}
                onClick={() => pick(cell.key)}
                className={cn(
                  "relative flex h-10 items-center justify-center rounded-lg text-[13px] tabular-nums transition-all outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  "disabled:pointer-events-none disabled:opacity-30",
                  isSelected
                    ? "bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                    : "hover:bg-background hover:shadow-sm",
                  // A padding day is a real, selectable date — just not part of
                  // the month on screen, so it recedes rather than disappears.
                  !isSelected && !cell.inMonth && "text-muted-foreground/40",
                  !isSelected && cell.inMonth && "text-foreground",
                )}
              >
                {cell.day}
                {/* A dot, not a border: a bordered cell next to a filled one
                    reads as a third state rather than as "this is today". */}
                {isToday && !isSelected ? (
                  <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Which days are actually selected, spelled out. The grid alone makes the
          admin count highlighted cells — and cannot show a date in a month they
          have since paged away from. */}
      {value.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {tCommon("daysSelected", { count: value.length })}
          </span>
          {value.map((key) => (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(toggleDate(value, key))}
              className="group inline-flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2 pr-1 text-[11px] font-medium tabular-nums text-primary transition-colors hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-50"
            >
              {chipLabel(key)}
              <X className="size-3 opacity-50 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange([])}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {tCommon("clear")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
