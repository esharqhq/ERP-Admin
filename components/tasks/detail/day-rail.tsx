"use client";

import { DAY_TONE_CLASS } from "@/components/tasks/detail/day-state-chip";
import { formatDayParts } from "@/lib/tasks/detail/day-time";
import { dayTone } from "@/lib/tasks/detail/day-view";
import type { TaskItemDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

/** One bar per day, 7 per row (days need not be consecutive, so a row is not a week). */
export function DayRail({
  days,
  selectedId,
  onSelect,
  locale,
}: {
  days: TaskItemDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  locale: string;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const { wd, dd } = formatDayParts(d.scheduledDate, locale);
        const selected = d.id === selectedId;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(d.id)}
            aria-pressed={selected}
            aria-label={`${wd} ${dd}`}
            className="flex flex-col gap-1.5 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn(
                "h-2 rounded-full",
                DAY_TONE_CLASS[dayTone(d)].bar,
                selected && "ring-2 ring-primary ring-offset-2 ring-offset-card",
              )}
            />
            <span
              className={cn(
                "font-mono text-[11px] tabular-nums",
                selected ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {wd} {dd}
            </span>
          </button>
        );
      })}
    </div>
  );
}
