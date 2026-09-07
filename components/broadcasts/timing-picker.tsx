"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, CalendarClock, Clock, Info, Send } from "lucide-react";
import { DayControl } from "@/components/ui/date-range-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Source of truth: assets/Uyer Admin Broadcasts.dc.html §06/§07 — Send
// now/Schedule toggle, neither preselected ("Both defaults would be one
// careless click away from an unrecoverable send" — Compose.dc.html #03).

export type SendMode = "unset" | "now" | "schedule";

/**
 * `date`/`time` are read in the browser's own local time zone — the design
 * mock shows "Berlin" because that's its demo admin, not a hardcoded
 * requirement, so this converts from whatever zone the browser reports.
 */
export function computeScheduledAtUtc(date: string, time: string): string | null {
  if (!date || !time) return null;
  const local = new Date(`${date}T${time}:00`);
  return Number.isNaN(local.getTime()) ? null : local.toISOString();
}

/**
 * The inverse of `computeScheduledAtUtc`, for edit-mode prefill — reads
 * local getters (`getFullYear`/`getHours`/…), NOT `iso.slice(...)`, which
 * would read the UTC components and land the reconstructed date/time an
 * offset away from what's actually stored for any admin not in UTC+0.
 */
export function isoToLocalParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

const TIME_STEP_MINUTES = 15;

function timeOptions(): string[] {
  const list: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += TIME_STEP_MINUTES) {
      list.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return list;
}

function isValidTime(v: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(v)) return false;
  const [h, m] = v.split(":").map(Number);
  return h >= 0 && h < 24 && m >= 0 && m < 60;
}

/**
 * Replaces a bare `<input type="time">`: the native control's own chrome
 * (spin buttons, calendar-picker icon, AM/PM segment) can't be restyled to
 * match `BoundBox` — the same box `DayControl` renders for the date — so
 * next to it a native input reads as a visibly different, foreign control
 * rather than the app's own field. This mirrors `BoundBox`'s exact classes
 * (h-8, rounded-[10px], ring-1 ring-inset ring-border, font-mono text-xs)
 * and reuses `DayPopover`'s Popover-trigger-via-`render` pattern, so a
 * Schedule row reads as two matching boxes, the way the design draws it.
 */
function TimeField({
  value,
  onChange,
  invalid = false,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const listRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => timeOptions(), []);

  // Scrolling the selected option into view is a real DOM-sync effect (not a
  // derived setState), so it stays here; seeding `draft` from `value` moves
  // into `onOpenChange` below instead of a second effect watching `open`.
  useEffect(() => {
    if (!open) return;
    const selected = listRef.current?.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: "center" });
  }, [open]);

  const commit = (next: string) => {
    if (!isValidTime(next)) return;
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value);
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-8 w-[104px] flex-none items-center gap-1.5 rounded-[10px] bg-background px-2.5 font-mono text-xs transition-colors",
              "ring-1 ring-inset ring-border hover:bg-accent",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring",
              invalid && "ring-destructive",
              value ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Clock className="size-3.5 flex-none text-muted-foreground" />
            {value || "--:--"}
          </button>
        }
        aria-label={ariaLabel}
      />
      <PopoverContent className="w-36 p-2" align="start">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(draft);
          }}
          placeholder="HH:MM"
          className="mb-2 h-8 font-mono text-xs"
        />
        <div ref={listRef} className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              data-selected={o === value}
              // The Input above holds focus once the popover opens. Without
              // this, clicking an option blurs the Input first — and the
              // blur handler used to commit `draft` (the *old*, unchanged
              // value) and close the popover before this button's own click
              // finished, so picking a different time silently did nothing
              // past the first change. Blocking the mousedown-driven focus
              // shift keeps focus put, so no blur fires and this button's
              // own click is the only thing that runs.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(o)}
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-left font-mono text-xs",
                o === value ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {o}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface TimingPickerProps {
  sendMode: SendMode;
  date: string;
  time: string;
  onSendModeChange: (mode: SendMode) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  /** `broadcast_schedule_in_past`, rendered here per §09's error spec — never a page-top banner. */
  pastError?: boolean;
}

/** "in 2 days" / "in 3 hours" / "in 12 minutes" — whichever unit reads best. */
function relativeLabel(iso: string, locale: string | undefined): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffMin = Math.round(diffMs / 60_000);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
  return rtf.format(Math.round(diffHr / 24), "day");
}

export function TimingPicker({
  sendMode,
  date,
  time,
  onSendModeChange,
  onDateChange,
  onTimeChange,
  pastError = false,
}: TimingPickerProps) {
  const t = useTranslations("broadcasts.compose.timing");
  const locale = useLocale();

  const iso = computeScheduledAtUtc(date, time);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t("label")} <span className="text-destructive">*</span>
      </span>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onSendModeChange("now")}
          className={cn(
            "flex h-[38px] flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium ring-1 ring-inset transition-colors",
            sendMode === "now"
              ? "bg-primary text-primary-foreground ring-primary"
              : "text-foreground ring-border hover:bg-muted",
          )}
        >
          <Send className="size-4" />
          {t("sendNow")}
        </button>
        <button
          type="button"
          onClick={() => onSendModeChange("schedule")}
          className={cn(
            "flex h-[38px] flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium ring-1 ring-inset transition-colors",
            sendMode === "schedule"
              ? "bg-primary text-primary-foreground ring-primary"
              : "text-foreground ring-border hover:bg-muted",
          )}
        >
          <CalendarClock className="size-4" />
          {t("schedule")}
        </button>
      </div>

      {sendMode === "schedule" && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5">
            {/* `flex` here, not just `flex-1`: BoundBox (DayControl's inner
                button) already carries its own `flex-1` class to stretch to
                fill, but that only does anything once its immediate parent
                is itself a flex container — without it the button shrinks
                to its text width and leaves a wide gap before the time
                field, which is exactly what this fixes. */}
            <div className="flex flex-1">
              <DayControl label={t("dateLabel")} value={date} onChange={onDateChange} />
            </div>
            <TimeField value={time} onChange={onTimeChange} invalid={pastError} ariaLabel={t("timeLabel")} />
          </div>
          {pastError ? (
            <p className="text-xs text-destructive">{t("scheduleInPast")}</p>
          ) : iso ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">= {iso}</span>
              <span className="flex h-5 items-center rounded-md bg-muted px-2 text-[11px] font-semibold text-muted-foreground">
                {relativeLabel(iso, locale)}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("pickBoth")}</p>
          )}

          {iso && !pastError && (
            <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-2.5 ring-1 ring-inset ring-border">
              <span className="flex items-start gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-3.5 flex-none text-muted-foreground" />
                {t("dispatchTickNote")}
              </span>
              <span className="flex items-start gap-2 text-[11.5px] leading-relaxed text-status-pending-deep">
                <AlertTriangle className="mt-0.5 size-3.5 flex-none text-status-pending" />
                {t("missedAfterSixHours")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
