"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTodayKey } from "@/hooks/use-today";
import {
  monthGrid,
  monthOf,
  shiftMonth,
  weekdayLabels,
  type YearMonth,
} from "@/lib/tasks/month-grid";
import {
  DATE_RANGE_PRESETS,
  matchPreset,
  presetRange,
  type DateRange,
  type DateRangePreset,
} from "@/lib/ui/date-range";
import { cn } from "@/lib/utils";

/**
 * The filter band's date range: two preset pills, a Custom pill, and the two
 * bounds as mono boxes that each open a month grid.
 *
 * **Why this exists rather than two `<input type="date">`.** The native control's
 * printed format follows the **browser's** locale, not the page's, so a German
 * admin on an en-US browser read `mm/dd/yy` on a German screen — the same class of
 * bug as the hardcoded German weekday list, in the other direction. It also draws
 * its own calendar glyph, which no other control in this app has. The mono
 * `YYYY-MM-DD` box is unambiguous in both languages and is the shape the wire
 * uses, so what an admin reads is what the query carries.
 *
 * The grid comes from `lib/tasks/month-grid` — the same pure helpers the order
 * form's picker uses, including `weekdayLabels(locale)` from `Intl`. One month
 * implementation, so the two calendars cannot disagree about which day a week
 * starts on.
 */
export function DateRangeControl({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: DateRange;
  /** Both bounds at once — a preset sets two, and the band writes them together. */
  onChange: (next: DateRange) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("common");
  const todayKey = useTodayKey();

  // `""` before the clock is known, so no pill is lit on the server snapshot and
  // the strip settles on hydration rather than claiming a window it cannot date.
  const active = matchPreset(value, todayKey);
  const isCustom = Boolean(value.from || value.to) && active === null;

  /** A lit preset toggles off, so the strip can clear what it set. */
  const pickPreset = (preset: DateRangePreset) =>
    onChange(active === preset ? { from: "", to: "" } : presetRange(preset, todayKey));

  return (
    <div className={cn("flex flex-col gap-2", disabled && "opacity-50")}>
      <div className="flex flex-wrap gap-1.5">
        {DATE_RANGE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled || !todayKey}
            onClick={() => pickPreset(preset)}
            className={pillClass(active === preset)}
          >
            {t(`datePreset.${preset}` as "datePreset.7d")}
          </button>
        ))}
        {/* Not decoration and not a dead control: it reports that the bounds are
            hand-picked, and opens the lower one so "let me choose" has somewhere
            to go. Clearing is the pills' job or the chip's. */}
        <DayPopover
          bound={value.from}
          max={value.to}
          disabled={disabled}
          label={`${label} — ${t("rangeFrom")}`}
          onPick={(day) => onChange({ ...value, from: day })}
          trigger={
            <button type="button" disabled={disabled} className={pillClass(isCustom)}>
              {t("datePreset.custom")}
            </button>
          }
        />
      </div>

      <div className="flex items-center gap-1.5">
        <DayPopover
          bound={value.from}
          max={value.to}
          disabled={disabled}
          label={`${label} — ${t("rangeFrom")}`}
          onPick={(day) => onChange({ ...value, from: day })}
          trigger={<BoundBox placeholder={t("rangeFrom")}>{value.from}</BoundBox>}
        />

        <span aria-hidden className="text-xs text-muted-foreground/60">
          →
        </span>

        <DayPopover
          bound={value.to}
          min={value.from}
          disabled={disabled}
          label={`${label} — ${t("rangeTo")}`}
          onPick={(day) => onChange({ ...value, to: day })}
          trigger={<BoundBox placeholder={t("rangeTo")}>{value.to}</BoundBox>}
        />
      </div>
    </div>
  );
}

/**
 * **One** date, for a filter whose wire param is a single day rather than a range.
 *
 * The workers table's `availableOn` is the case: *“who told us they can work on
 * that date”* is one question about one day, and drawing it as a range with the
 * two bounds locked together would invite an admin to set only one of them and
 * then send a bound the API has no parameter for.
 *
 * Built from the same `DayPopover` and the same mono `YYYY-MM-DD` box the range's
 * bounds use, so the two calendars that can appear in one band cannot disagree
 * about which day a week starts on — the bug that produced
 * `055ccf1 fix(calendar)`. Picking the day that is already set clears it, which is
 * the only way back to “no date” once one is chosen.
 */
export function DayControl({
  label,
  value,
  onChange,
  disabled = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (day: string) => void;
  disabled?: boolean;
  /** Shown while nothing is picked. Defaults to the shared “pick a date”. */
  placeholder?: string;
}) {
  const t = useTranslations("common");
  return (
    <DayPopover
      bound={value}
      disabled={disabled}
      label={label}
      onPick={onChange}
      trigger={
        <BoundBox placeholder={placeholder ?? t("pickDate")}>{value}</BoundBox>
      }
    />
  );
}

/**
 * A preset chip's classes. Filled when on, hairline ring when off — §08's two
 * states.
 *
 * A function rather than a component because the Custom chip **is** a popover
 * trigger: `PopoverTrigger asChild` needs to put its own props on the button that
 * receives the click, and a wrapper component in between is one more element for
 * those props to land on the wrong side of.
 */
function pillClass(on: boolean): string {
  return cn(
    "flex h-[30px] items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-medium transition-colors",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-40",
    on
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "text-foreground ring-1 ring-inset ring-border hover:bg-accent",
  );
}

/** One bound. Mono, because it prints the wire's own `YYYY-MM-DD`. */
function BoundBox({
  placeholder,
  children,
}: {
  placeholder: string;
  children?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-8 flex-1 items-center rounded-[10px] bg-background px-2.5 font-mono text-xs transition-colors",
        "ring-1 ring-inset ring-border hover:bg-accent",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        children ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {children || placeholder}
    </button>
  );
}

/**
 * A month grid in a popover, for one bound.
 *
 * `min`/`max` are the *other* bound: days on the wrong side of it are disabled
 * rather than accepted and then rejected by the range validator, which is how the
 * old native pair behaved through its own `min`/`max` attributes.
 *
 * Picking the day that is already set **clears** the bound. A range control with
 * no way back to "no lower bound" traps an admin who only wanted an upper one.
 */
function DayPopover({
  bound,
  min,
  max,
  disabled,
  label,
  onPick,
  trigger,
}: {
  bound: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  label: string;
  onPick: (day: string) => void;
  /** The element the popover hangs off — a pill or a bound box. */
  trigger: React.ReactElement<Record<string, unknown>>;
}) {
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const todayKey = useTodayKey();
  const [open, setOpen] = useState(false);

  const [view, setView] = useState<YearMonth>(() => {
    if (bound) return monthOf(bound);
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const cells = useMemo(() => monthGrid(view), [view]);
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  function pick(key: string) {
    onPick(key === bound ? "" : key);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled) return;
        // Re-anchor on the way in, so re-opening a set bound lands on its month
        // rather than wherever the admin last paged to.
        if (next && bound) setView(monthOf(bound));
        setOpen(next);
      }}
    >
      {/* Base UI composes through `render`, not `asChild`: the trigger's props
          land on the element passed in rather than on a wrapper around it. */}
      <PopoverTrigger render={trigger} aria-label={label} disabled={disabled} />
      <PopoverContent className="w-auto p-3" align="start">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 p-0"
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
            onClick={() => setView((v) => shiftMonth(v, 1))}
            aria-label={tCommon("nextMonth")}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid w-[248px] grid-cols-7 gap-0.5">
          {weekdays.map((w, i) => (
            <span
              key={i}
              className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70"
            >
              {w}
            </span>
          ))}

          {cells.map((cell) => {
            const blocked =
              (min !== undefined && min !== "" && cell.key < min) ||
              (max !== undefined && max !== "" && cell.key > max);
            const selected = cell.key === bound;
            return (
              <button
                key={cell.key}
                type="button"
                disabled={blocked}
                aria-pressed={selected}
                title={cell.key === todayKey ? tCommon("today") : undefined}
                onClick={() => pick(cell.key)}
                className={cn(
                  "relative flex h-8 items-center justify-center rounded-lg text-[13px] tabular-nums transition-colors outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:pointer-events-none disabled:opacity-30",
                  selected
                    ? "bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-accent",
                  // A padding day is a real, selectable date — just not part of the
                  // month on screen, so it recedes rather than disappears.
                  !selected && !cell.inMonth && "text-muted-foreground/40",
                )}
              >
                {cell.day}
                {cell.key === todayKey && !selected && (
                  <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
