"use client";

import { useTranslations } from "next-intl";
import type { AttendanceKind } from "@/lib/attendance/status";
import { cn } from "@/lib/utils";

/**
 * One badge per row, and only one.
 *
 * The design's Avoid list names *"a second badge per row"* explicitly: status is
 * the badge, and `outcome` is the mono line under it. Two pills side by side would
 * let the row say "Overdue" and "Pending" with equal weight when only the first is
 * the answer to the question the screen asks.
 *
 * **Tones are tokens, not the design's hexes** — the same rule `summary-strip.tsx`
 * records. The design's palette maps 1:1 onto the `--status-*` families
 * (`#1C8B52` → `status-active`, `#E08A00` → `status-pending`, `#DC3B3B` →
 * `status-cancelled`), which are AA-checked and carry dark-mode values; matching
 * the literal hexes would fork the palette and render a near-white pill on a dark
 * page.
 *
 * `overdue` is the one kind drawn as an **outline** rather than a fill. It is a
 * suspicion, not a verdict — the worker may still be walking up — so it reads as
 * urgent without looking like the settled red of a no-show. That distinction is
 * the whole reason the kind exists.
 */

const TONE: Record<AttendanceKind, string> = {
  in: "bg-status-active-tint text-status-active ring-status-active/25",
  late: "bg-status-pending-tint text-status-pending-deep ring-status-pending/30",
  await: "bg-muted/60 text-muted-foreground ring-border",
  overdue: "bg-transparent text-status-cancelled ring-status-cancelled/45",
  noshow: "bg-status-cancelled-tint text-status-cancelled-deep ring-status-cancelled/30",
  removed: "bg-shell-tint text-ink-soft ring-border",
  cancelled: "bg-transparent text-muted-foreground/80 ring-border",
};

const DOT: Record<AttendanceKind, string> = {
  in: "bg-status-active",
  late: "bg-status-pending",
  await: "bg-muted-foreground/40",
  overdue: "bg-status-cancelled",
  noshow: "bg-status-cancelled",
  removed: "bg-ink-soft",
  cancelled: "bg-muted-foreground/35",
};

/**
 * The left rail on the row, for the kinds that need finding by eye down a long
 * day. `transparent` for the calm ones — a rail on every row is not a signal.
 */
export const KIND_RAIL: Record<AttendanceKind, string> = {
  in: "border-l-transparent",
  late: "border-l-status-pending/60",
  await: "border-l-transparent",
  overdue: "border-l-status-cancelled",
  noshow: "border-l-status-cancelled-deep",
  removed: "border-l-ink-soft/50",
  cancelled: "border-l-transparent",
};

export function AttendanceBadge({
  kind,
  className,
}: {
  kind: AttendanceKind;
  className?: string;
}) {
  const t = useTranslations("attendance.status");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ring-1 ring-inset",
        TONE[kind],
        className,
      )}
    >
      <span className={cn("size-1.5 flex-none rounded-full", DOT[kind])} />
      {t(kind)}
    </span>
  );
}

/**
 * `outcome`, under the badge, in mono.
 *
 * Deliberately not a badge (see above) and deliberately not translated: these are
 * the wire's own enum names (`Pending`, `Completed`, `NoShow`, `Removed`,
 * `Cancelled`) and the toolbar's Outcome filter offers the same raw values, so a
 * translated line here could not be matched back to the filter that produced it.
 * Mono and muted is how the rest of this console draws a wire value.
 */
export function OutcomeLine({ outcome }: { outcome: string }) {
  return (
    <span className="font-mono text-[10.5px] text-muted-foreground">
      {outcome || "—"}
    </span>
  );
}
