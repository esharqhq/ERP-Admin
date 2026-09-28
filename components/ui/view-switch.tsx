"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ViewSwitchItem<V extends string> {
  key: V;
  label: string;
  Icon: LucideIcon;
}

/**
 * Two (or a few) drawings of one set — Table/Matrix on Workers, List/Calendar
 * on Tasks.
 *
 * A segmented control rather than tabs: the stage tabs beside it choose
 * **which** rows, and two tab strips would ask an admin to work out which of
 * them changes the population. This one is visibly a different kind of control
 * — a raised pill inside a sunken track — which is the distinction doing the
 * work.
 */
export function ViewSwitch<V extends string>({
  label,
  value,
  items,
  onChange,
}: {
  /** Accessible name for the group. */
  label: string;
  value: V;
  items: ViewSwitchItem<V>[];
  onChange: (view: V) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-none gap-0.5 rounded-[10px] bg-shell-tint p-[3px]"
    >
      {items.map(({ key, label: itemLabel, Icon }) => {
        const on = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(key)}
            className={cn(
              "flex h-7 items-center gap-[7px] rounded-lg px-3 text-[12.5px] transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on
                ? "bg-card font-semibold text-primary shadow-sm"
                : "font-medium text-ink-soft hover:text-foreground",
            )}
          >
            <Icon className="size-[14px]" />
            {itemLabel}
          </button>
        );
      })}
    </div>
  );
}
