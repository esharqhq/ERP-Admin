"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The band above a table that says what a page of rows cannot: which of them is
 * missing something, and how many.
 *
 * A count block on the left — *"on the platform · 312 workers"* — and a row of
 * tiles beside it, each naming one defect and offering the narrowing that isolates
 * it. A tile writes a **filter** into the URL rather than switching the screen into
 * a mode, so clicking one produces a shareable link and the table's own filter
 * chips can clear it again.
 *
 * Lifted out of `components/properties/summary-strip.tsx` when the workers screen
 * needed the same band with different tiles. The **shell** is shared; the tiles
 * are not — each screen names its own defects, in its own copy, from its own
 * counts. Anything that tried to share the tiles too would be a component with a
 * per-screen `switch` in it.
 *
 * **Tones are tokens, not the design's hexes.** The design's amber (`#FEF6E7` /
 * `#9A5E00`) and red (`#FDECEC` / `#B22B2B`) are the `warning` and `critical`
 * pairs `globals.css` already ships, AA-checked and with dark values. Matching the
 * hexes literally would fork the palette and render a near-white tile on a dark
 * page.
 */

const TONE = {
  warning: {
    shell: "bg-status-pending-tint/60 ring-status-pending/30",
    text: "text-status-pending-deep",
    detail: "text-status-pending-deep/70",
  },
  critical: {
    shell: "bg-status-cancelled-tint/60 ring-status-cancelled/30",
    text: "text-status-cancelled-deep",
    detail: "text-status-cancelled-deep/70",
  },
  neutral: {
    shell: "bg-muted/50 ring-border",
    text: "text-foreground",
    detail: "text-muted-foreground",
  },
} as const;

export type SummaryTone = keyof typeof TONE;

export function SummaryStrip({
  label,
  value,
  isLoading,
  children,
}: {
  /** The small-caps line over the count — *"on the platform"*. */
  label: string;
  /** The count itself, already pluralised by the caller's own message. */
  value: string;
  isLoading?: boolean;
  /** The tiles. One `SummaryTile` each. */
  children: ReactNode;
}) {
  if (isLoading) {
    return <Skeleton className="h-[68px] w-full rounded-2xl" />;
  }

  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-2xl bg-card px-3.5 py-2.5 shadow-card ring-1 ring-foreground/10">
      <div className="flex flex-none flex-col gap-px border-r border-border pr-3.5">
        <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          {label}
        </span>
        <span className="whitespace-nowrap font-mono text-[15px] font-semibold">
          {value}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

/**
 * One tile.
 *
 * **A zero keeps its place and loses its colour.** A strip whose tiles vanish as
 * the data improves changes width under the admin, and "0 with no photos" is a
 * real statement — it is the answer to the question the tile asks. It also loses
 * its action: there is nothing to narrow to.
 *
 * That rule is also what makes a **failed or refused count** safe: a probe that
 * 403s or times out reports `0`, and a tile drawn as cleared is a far better lie
 * than a tile drawn as alarming. Nothing here needs to know the difference.
 */
export function SummaryTile({
  icon,
  title,
  detail,
  action,
  tone,
  count,
  on,
  href,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  action: string;
  tone: SummaryTone;
  count: number;
  /** The narrowing this tile writes is currently on. */
  on?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const clear = count === 0;
  const c = TONE[clear ? "neutral" : tone];
  const actionable = !clear && (Boolean(href) || Boolean(onClick));

  const body = (
    <>
      <span className={cn("flex-none", clear ? "text-muted-foreground" : c.text)}>
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px text-left">
        <span className={cn("truncate text-xs font-semibold", c.text)}>{title}</span>
        <span className={cn("truncate text-[10px]", c.detail)}>{detail}</span>
      </span>
      {actionable && (
        <span className={cn("flex-none text-[11px] font-semibold", c.text)}>
          {action}
        </span>
      )}
    </>
  );

  const className = cn(
    "flex h-11 min-w-[13rem] flex-1 items-center gap-2.5 rounded-xl px-2.5 ring-1 ring-inset transition-colors",
    c.shell,
    actionable && "cursor-pointer hover:brightness-[0.98]",
    // The pressed state has to be visible from the table: this tile is the only
    // thing saying why the list below is short.
    on && "ring-2 ring-primary/50",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring",
  );

  if (!actionable) {
    return <div className={className}>{body}</div>;
  }

  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={className}>
      {body}
    </button>
  );
}
