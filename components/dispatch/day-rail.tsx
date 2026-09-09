"use client";

import { useTranslations } from "next-intl";
import { isUrgentDay, type DispatchDayGroup } from "@/lib/tasks/day-groups";
import { cn } from "@/lib/utils";

/**
 * The day index down the left of the board — **inside** the board's card, not
 * beside it, which is what makes it read as an index of this list rather than a
 * second navigation.
 *
 * ⚠ **It has a selected day, and an earlier pass shipped it without one.** Every
 * row looked identical, so the rail read as a static list that belonged to no
 * particular day. Selection is the whole affordance: the lit row is the day the
 * board is scrolled to, marked three ways at once — a raised surface, a coloured
 * accent bar at the left edge, and a heavier label.
 *
 * Clicking scrolls rather than filters. The admin's question is "what is
 * happening then", and an answer that hides the surrounding days makes the next
 * question harder.
 *
 * Below `lg` it becomes a **horizontal strip** rather than disappearing. The
 * design has no narrow artboard, and the first pass took that as licence to drop
 * the rail entirely — which on a tablet left the board with no day navigation at
 * all, the one control it most needs when only two rows fit on screen.
 */
export function DayRail({
  groups,
  selectedKey,
  onSelect,
  dayLabel,
  dateLabel,
  footer,
}: {
  groups: DispatchDayGroup[];
  /** The day currently in view, or `null` before anything is chosen. */
  selectedKey: string | null;
  onSelect: (key: string) => void;
  dayLabel: (group: DispatchDayGroup) => string;
  dateLabel: (key: string) => string;
  /** The block pinned to the rail's foot — the window this board is showing. */
  footer?: React.ReactNode;
}) {
  const t = useTranslations("dispatch");

  return (
    <>
      {/* Narrow: one scrollable row of day chips, pinned above the groups. */}
      <nav
        aria-label={t("railTitle")}
        className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2 lg:hidden"
      >
        {groups.map((group) => {
          const urgent = isUrgentDay(group);
          const selected = group.key === selectedKey;
          return (
            <button
              key={group.key}
              type="button"
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelect(group.key)}
              className={cn(
                "flex flex-none items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                selected
                  ? "bg-card font-semibold shadow-card ring-1 ring-foreground/10"
                  : "bg-muted/50 font-medium text-muted-foreground",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <span className="whitespace-nowrap">{dayLabel(group)}</span>
              {group.unstaffed > 0 ? (
                <span
                  className={cn(
                    "font-mono text-[10px] font-semibold tabular-nums",
                    urgent ? "text-status-cancelled-deep" : "text-status-pending-deep",
                  )}
                >
                  {group.unstaffed}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Wide: the index down the left, inside the board's own card. */}
      <nav
        aria-label={t("railTitle")}
        className="hidden w-[178px] flex-none flex-col gap-2.5 overflow-hidden border-e border-border bg-muted/25 p-3 lg:flex"
      >
      <span className="px-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        {t("railTitle")}
      </span>

      <div className="flex flex-col gap-0.5">
        {groups.map((group) => {
          const urgent = isUrgentDay(group);
          const selected = group.key === selectedKey;
          return (
            <button
              key={group.key}
              type="button"
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelect(group.key)}
              className={cn(
                "relative flex h-12 items-center gap-2 rounded-xl px-2.5 text-left transition-colors",
                selected
                  ? "bg-card shadow-card ring-1 ring-foreground/10"
                  : "hover:bg-accent/60",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {/* The accent bar is the selected day's loudest mark, and it carries
                  the urgency colour so the rail says which day is on fire. */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-3 start-0 w-[3px] rounded-e-full",
                  selected
                    ? urgent
                      ? "bg-destructive"
                      : "bg-primary"
                    : "bg-transparent",
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={cn(
                    "truncate text-[13px]",
                    selected ? "font-bold" : "font-medium",
                  )}
                >
                  {dayLabel(group)}
                </span>
                <span className="truncate text-[10.5px] text-muted-foreground">
                  {dateLabel(group.key)}
                </span>
              </span>
              {/*
                A tinted pill, not an outline badge: the count is the rail's
                payload and has to survive being glanced at from the board.
                Zero keeps its place and loses its colour — a day with nothing
                short is a real answer, and a rail that changed width as tasks
                were filled would move under the pointer.
              */}
              <span
                className={cn(
                  "flex h-5 min-w-[22px] flex-none items-center justify-center rounded-[7px] px-1.5 font-mono text-[11px] font-semibold tabular-nums",
                  group.unstaffed === 0
                    ? "bg-muted text-muted-foreground"
                    : urgent
                      ? "bg-status-cancelled-tint text-status-cancelled-deep"
                      : "bg-status-pending-tint text-status-pending-deep",
                )}
              >
                {group.unstaffed}
              </span>
            </button>
          );
        })}
      </div>

      {footer ? <div className="mt-auto">{footer}</div> : null}
      </nav>
    </>
  );
}
