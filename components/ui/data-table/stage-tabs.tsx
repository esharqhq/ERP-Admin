"use client";

import { cn } from "@/lib/utils";
import type { StageTab } from "./types";

/**
 * The queue's stage tabs.
 *
 * Named after the **onboarding stages**, never after a screen's own vocabulary.
 * That is a fix for a shipped defect, not a preference: the worker screen's
 * "Approved" tab once filtered `Active` while the owner screen's filtered
 * `Approved`, so one word named two different queues depending on where you had
 * come from. Taking the names from the stages makes that impossible to reintroduce.
 *
 * A count is optional per tab and absent tabs simply show none — see `StageTab`.
 * A zero is drawn, because "0" is a real statement that the queue is clear and is
 * exactly what an admin wants to see.
 */
export function StageTabs({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: StageTab[];
  value: string;
  onChange: (value: string) => void;
  /** Accessible name for the group. */
  label: string;
}) {
  /*
   * The ground is `--shell-tint`, not `--muted`. The console's `--muted` is cool
   * slate (#f1f5f9) by an explicit decision recorded in `globals.css`; this
   * design's neutrals are green-greys, and `--shell-tint` (#eef2f0) is the name
   * the DS already gives that. Beside the forest-tinted avatars in the rows
   * below, the slate reads visibly blue.
   *
   * The inactive label is `--ink-soft` for the same reason — the DS's warm
   * body-copy grey (#5B6B63), which is the value the design names.
   */
  return (
    <div
      role="tablist"
      aria-label={label}
      className="scrollbar-slim flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-shell-tint p-[3px]"
    >
      {tabs.map((tab) => {
        const on = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab.value)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-[13.5px] transition-colors",
              on
                ? "bg-card font-semibold text-foreground shadow-sm"
                : "font-medium text-ink-soft hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count != null && (
              <span
                className={cn(
                  "font-mono text-[11.5px] tabular-nums",
                  on ? "text-primary" : "text-muted-foreground/70",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
