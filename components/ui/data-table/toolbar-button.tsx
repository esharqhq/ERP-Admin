"use client";

import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The queue toolbar's controls — Filters, Columns, density.
 *
 * One component because the design gives all three the same body (36px tall,
 * 12px of side padding, a 15px icon, a 13.5px label) and the same two states,
 * and three hand-tuned copies is how a toolbar ends up a pixel out of line.
 *
 * **The state is the point.** A control is *on* — filled forest, white label —
 * when it is doing something or is open: filters are applied, or the panel it
 * owns is showing. Otherwise it is a hairline ring on the card. That is the only
 * signal that a list is narrowed once the filter band is closed again, so it is
 * not decoration.
 *
 * `size="sm"` already gives 36px and 12px padding; what is overridden here is the
 * radius (the DS control rung rather than the button default), the gap, and the
 * icon size.
 */
export function ToolbarButton({
  on,
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & { on?: boolean }) {
  return (
    <Button
      variant={on ? "default" : "outline"}
      size="sm"
      aria-pressed={on}
      className={cn(
        "gap-[7px] rounded-lg px-3 text-[13.5px] font-medium",
        !on && "text-foreground/90",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

/**
 * The figure beside a toolbar label — the active-filter count, or `6 / 10`.
 *
 * `pill` is the filter badge, which is a round chip on a tinted ground; without
 * it the figure sits bare beside the label, which is how the design renders the
 * column ratio. Both go translucent-white on a filled button and grey on a
 * ringed one, so the figure never fights its own background.
 */
export function ToolbarCount({
  on,
  pill,
  children,
}: {
  on?: boolean;
  pill?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        pill
          ? "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] font-semibold"
          : "text-xs",
        pill && (on ? "bg-primary-foreground/20" : "bg-muted"),
        on ? "text-primary-foreground/80" : "text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
