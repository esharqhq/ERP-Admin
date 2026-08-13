"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  isPastDay,
  monthGrid,
  shiftMonth,
  toggleDate,
  type YearMonth,
} from "@/lib/tasks/month-grid";
import { toLocalDateKey } from "@/lib/tasks/weekly-rows";
import { cn } from "@/lib/utils";

/** Monday-first, matching `tasks-calendar.tsx`. */
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

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
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const cells = useMemo(() => monthGrid(view), [view]);
  const selected = new Set(value);

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
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
        <span className="text-sm font-medium">{monthLabel}</span>
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
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="py-1 text-center text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
          >
            {w}
          </span>
        ))}

        {cells.map((cell) => {
          const past = isPastDay(cell.key, todayKey);
          const isSelected = selected.has(cell.key);
          return (
            <button
              key={cell.key}
              type="button"
              disabled={disabled || past}
              aria-pressed={isSelected}
              onClick={() => onChange(toggleDate(value, cell.key))}
              className={cn(
                "flex h-9 items-center justify-center rounded-md border text-[13px] tabular-nums transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40",
                isSelected
                  ? "border-primary bg-primary font-medium text-primary-foreground hover:bg-primary/90"
                  : "border-transparent hover:bg-accent/40",
                // A padding day stays clickable but recedes: it is a real,
                // selectable date, just not part of the month on screen.
                !isSelected && !cell.inMonth && "text-muted-foreground/50",
                !isSelected && cell.inMonth && "text-foreground",
                cell.key === todayKey && !isSelected && "border-border font-medium",
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
