"use client";

import { useTranslations } from "next-intl";
import { CalendarClock, Send } from "lucide-react";
import { DayControl } from "@/components/ui/date-range-field";
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

  const iso = computeScheduledAtUtc(date, time);
  const utcLabel = iso
    ? new Date(iso).toLocaleString("en-GB", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

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
          <div className={cn("flex gap-1.5 rounded-lg", pastError && "ring-1 ring-inset ring-destructive")}>
            <div className="flex-1">
              <DayControl label={t("dateLabel")} value={date} onChange={onDateChange} />
            </div>
            <input
              type="time"
              aria-label={t("timeLabel")}
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              aria-invalid={pastError}
              className="h-10 w-[118px] flex-none rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
            />
          </div>
          {pastError ? (
            <p className="text-xs text-destructive">{t("scheduleInPast")}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {utcLabel ? t("utcTranslation", { utc: utcLabel }) : t("pickBoth")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
