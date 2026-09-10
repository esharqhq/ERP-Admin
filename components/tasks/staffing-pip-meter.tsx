import {
  computeStaffingLayout,
  type PipKind,
  type StaffingTone,
} from "@/lib/tasks/pip-layout";
import { cn } from "@/lib/utils";

export interface StaffingPipMeterProps {
  filled: number;
  required: number;
  /** Starting now or already started — colours a gap red rather than amber. */
  urgent: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Appearance lives here, meaning lives in `pip-layout.ts`. That split is the
 * point: the module used to hand back the design's literal hexes and this
 * component fed them to inline `style=`, which made the meter the one element on
 * the board that kept painting the light palette on a dark page.
 *
 * Every colour below is a `globals.css` status token, so both themes are served
 * by one class list. ⚠ Contrast has **not** been measured — the tokens are the
 * ones `summary-strip.tsx` already uses for the same amber/red pair, and that is
 * the precedent being followed, not a WCAG claim.
 */
const PIP_CLASS: Record<PipKind, string> = {
  filled: "bg-status-active",
  /** Lighter fill plus a ring, so an extra body reads as "beyond full", not "full". */
  over: "bg-status-active/40 ring-1 ring-inset ring-status-active",
  /** Hollow — the ring colour is urgency's job, added below. */
  missing: "bg-background ring-1 ring-inset",
};

const TONE_CLASS: Record<StaffingTone, string> = {
  covered: "text-status-active",
  short: "text-amber-600 dark:text-amber-400",
  urgent: "text-destructive",
};

/**
 * ⚠ **Wide, not tall.** The design's seat is `16 × 7` — a horizontal dash, so a
 * row of them reads as a bar chart filling left to right. This shipped as `8 × 16`
 * for months (upright bars, like a signal-strength meter), which inverts the
 * metaphor: an upright bar reads as *one* thing getting taller, not as *seats*
 * being filled. Verified against `Uyer Admin Dispatch.dc.html`, which uses
 * `width:16px;height:7px` at every occurrence.
 */
const SIZE_CLASS = {
  sm: "w-4 h-[7px]",
  md: "w-[18px] h-2",
} as const;

export function StaffingPipMeter({
  filled,
  required,
  urgent,
  size = "sm",
  className,
}: StaffingPipMeterProps) {
  const layout = computeStaffingLayout(filled, required, urgent);

  switch (layout.mode) {
    case "dash":
      return (
        <span className={cn("font-mono text-xs text-muted-foreground", className)}>
          —
        </span>
      );
    case "fraction-only":
      return (
        <span
          className={cn(
            "font-mono text-xs font-bold tabular-nums",
            TONE_CLASS[layout.tone],
            className,
          )}
        >
          {layout.text}
        </span>
      );
    case "pips":
      return (
        <span
          className={cn("inline-flex items-center gap-[3px]", className)}
          // The strip is a picture of a number; screen readers get the number.
          role="img"
          aria-label={`${filled} / ${required}`}
        >
          {layout.pips.map((pip, i) => (
            <span
              key={i}
              aria-hidden
              className={cn(
                "rounded-[3px]",
                SIZE_CLASS[size],
                PIP_CLASS[pip],
                pip === "missing" &&
                  (layout.urgent
                    ? "ring-destructive/60"
                    : "ring-status-pending/70"),
              )}
            />
          ))}
        </span>
      );
  }
}
