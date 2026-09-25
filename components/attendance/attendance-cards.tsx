"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { AttendanceBadge, KIND_RAIL } from "@/components/attendance/attendance-badge";
import { CheckinDoorLabel } from "@/components/attendance/checkin-door-label";
import { initials } from "@/lib/ui/initials";
import { hhmm, metres } from "@/lib/attendance/format";
import { refusalReasonKey, type AttendanceRow } from "@/lib/attendance/status";
import { bySeverity } from "@/hooks/use-attendance-table";
import { rowKey } from "@/components/attendance/attendance-table-row";
import { cn } from "@/lib/utils";

/**
 * The day, below 768px: row-cards, not a sideways table.
 *
 * Seven columns cannot be scrolled horizontally at 390px and stay readable, so
 * the card keeps what a phone is actually used for — identity, the two times, the
 * check-in door, the badge and the refusal line — and everything else is one tap
 * into the sheet.
 *
 * ⚠ **The order is different on purpose.** The desktop table sorts by worker; the
 * phone sorts by severity, refusals first. Same rows and the same badges — only
 * the reading order changes, because a phone is answering *"is anyone missing
 * right now?"* rather than reading the whole day.
 *
 * No pin and no CSV here. Those are desk jobs.
 */
export function AttendanceCards({
  rows,
  locale,
  onOpen,
}: {
  rows: AttendanceRow[];
  locale: string;
  onOpen: (row: AttendanceRow) => void;
}) {
  const t = useTranslations("attendance");
  const ordered = bySeverity(rows);

  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-[11px] text-muted-foreground">{t("mobile.severityNote")}</p>

      {ordered.map((row) => (
        <Card key={rowKey(row)} row={row} locale={locale} onOpen={() => onOpen(row)} />
      ))}
    </div>
  );
}

function Card({
  row,
  locale,
  onOpen,
}: {
  row: AttendanceRow;
  locale: string;
  onOpen: () => void;
}) {
  const t = useTranslations("attendance");
  const tRefusal = useTranslations("attendance.refusal");
  const reason = refusalReasonKey(row.lastRefusalReason);
  const distance = metres(row.lastRefusalDistanceMeters);

  const refusalParts = [tRefusal("count", { count: row.refusedCheckinCount })];
  if (distance != null) refusalParts.push(tRefusal("distance", { meters: distance }));
  else if (reason) refusalParts.push(tRefusal(`reason.${reason}`));

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        // 44px is the floor; the two-line body puts every card comfortably over it.
        "flex min-h-11 w-full items-start gap-3 rounded-xl border-l-[3px] bg-card p-3 text-left shadow-card ring-1 ring-foreground/10 outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring",
        KIND_RAIL[row.kind],
        row.kind === "overdue" && "bg-status-cancelled-tint/25",
      )}
    >
      <span className="flex size-8 flex-none items-center justify-center rounded-full bg-shell-tint text-[11px] font-semibold text-status-verified">
        {initials(row.workerName)}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-start justify-between gap-2">
          <span className="flex min-w-0 flex-col">
            <span
              className={cn(
                "truncate text-[13.5px] font-semibold",
                row.kind === "cancelled" && "text-muted-foreground line-through",
              )}
            >
              {row.workerName}
            </span>
            <span className="truncate text-[11.5px] text-muted-foreground">
              {row.propertyName}
            </span>
          </span>
          <AttendanceBadge kind={row.kind} className="flex-none" />
        </span>

        <span className="flex items-center gap-2 font-mono text-[11.5px] tabular-nums text-ink-soft">
          {/*
            Scheduled → check-in. **Not** check-out: that timestamp is task-wide,
            stamped for every worker at once, and a phone has no room to carry the
            caveat that keeps it from being read as "left at".
          */}
          {t("mobile.times", {
            scheduled: hhmm(row.scheduledAt, locale),
            checkIn: hhmm(row.checkinAt, locale),
          })}
          <span className="text-muted-foreground/70">{row.outcome}</span>
        </span>

        {/* Its own line: at 390px the mono times line has no room left for it. */}
        <CheckinDoorLabel door={row.checkinDoor} className="text-[11px]" />

        {row.refused && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-status-cancelled-deep">
            <AlertTriangle className="size-2.5 flex-none" />
            {refusalParts.join(" · ")}
          </span>
        )}
      </span>
    </button>
  );
}

/** The four counts over the cards, as chips — the strip's job at phone width. */
export function AttendanceCardChips({
  counts,
}: {
  counts: { in: number; late: number; missing: number; refused: number };
}) {
  const t = useTranslations("attendance.mobile");
  const chips = [
    { key: "in", value: counts.in, tone: "bg-status-active-tint text-status-active" },
    {
      key: "late",
      value: counts.late,
      tone: "bg-status-pending-tint text-status-pending-deep",
    },
    {
      key: "missing",
      value: counts.missing,
      tone: "bg-status-cancelled-tint text-status-cancelled-deep",
    },
    {
      key: "refused",
      value: counts.refused,
      tone: "bg-muted text-foreground",
    },
  ] as const;

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c.key}
          className={cn(
            "rounded-full px-2 py-0.5 text-[11.5px] font-semibold",
            // A zero keeps its place and loses its colour, as the strip's tiles do.
            c.value === 0 ? "bg-muted/60 text-muted-foreground" : c.tone,
          )}
        >
          {t(c.key, { count: c.value })}
        </span>
      ))}
    </div>
  );
}
