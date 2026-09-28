"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { propertyHue } from "@/lib/tasks/dispatch-row";
import type { RegisterRow } from "@/lib/tasks/register/rows";
import { cardTone, type CardTone } from "@/lib/tasks/register/week";
import { cn } from "@/lib/utils";

/**
 * Design 02's tints, as tokens. A tinted block per day of work, no white card —
 * except the two the design rings: Overdue (white, red ring) and the closed
 * pair (white, grey ring, faded), so they read as "not to plan on".
 */
export const CARD_TONE_CLASS: Record<CardTone, string> = {
  running: "bg-status-active-tint text-status-active",
  scheduled: "bg-accent/60 text-accent-foreground",
  open: "bg-muted text-foreground",
  unstaffed: "bg-status-cancelled-tint text-status-cancelled-deep",
  overdue: "bg-card ring-1 ring-inset ring-status-cancelled/45 text-status-cancelled-deep",
  review: "bg-status-pending-tint text-status-pending-deep",
  closed: "bg-card ring-1 ring-inset ring-border text-muted-foreground opacity-70",
};

/**
 * One day of work on the week grid. Only what an admin plans on: time,
 * "title · duration", property, staffing. The whole card is the link to the
 * booking (spec §5 — card click → the booking page).
 */
export function CalendarCard({ row }: { row: RegisterRow }) {
  const t = useTranslations("tasks.register");
  const title = row.title ?? row.task.propertyName ?? row.task.id.slice(0, 8);
  const label = row.durationH != null
    ? `${title} · ${t("calendar.hours", { hours: row.durationH })}`
    : title;

  return (
    <Link
      href={`/dashboard/tasks/${row.task.groupId}`}
      className={cn(
        "flex min-w-0 flex-none flex-col gap-0.5 rounded-[10px] p-2 text-xs leading-snug",
        "outline-none transition-[filter] hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring",
        CARD_TONE_CLASS[cardTone(row)],
      )}
    >
      <span className="flex items-baseline gap-1.5 font-mono text-[11px] font-bold tabular-nums">
        <span className="min-w-0 flex-1 truncate">{row.startTime}</span>
        <span className="flex-none">
          {row.staffing.filled}/{row.staffing.required}
        </span>
      </span>
      <span className="truncate font-semibold">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5 text-[11px]">
        <span
          aria-hidden
          className="size-1.5 flex-none rounded-full"
          // ⚠ The one inline colour: data-derived per property, as on the
          // list's Task column (`register-columns.tsx`) and Dispatch.
          style={{ backgroundColor: propertyHue(row.task.propertyId) }}
        />
        <span className="truncate">{row.task.propertyName ?? "–"}</span>
      </span>
    </Link>
  );
}
