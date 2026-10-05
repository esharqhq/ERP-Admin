"use client";

import { useTranslations } from "next-intl";
import { dayTone, type DayTone } from "@/lib/tasks/detail/day-view";
import type { TaskItemDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

/**
 * The detail page's own day-state tones, after the design (Done forest,
 * Checked in fresh, In review amber, Disputed red, Pending and Cancelled grey).
 * ⚠ Not `TaskStatusBadge`: four other screens use that one's tones.
 */
export const DAY_TONE_CLASS: Record<DayTone, { chip: string; dot: string; bar: string }> = {
  done: { chip: "bg-status-verified-tint text-status-verified", dot: "bg-status-verified", bar: "bg-status-verified" },
  checkedIn: { chip: "bg-status-active-tint text-status-active", dot: "bg-status-active", bar: "bg-status-active" },
  inReview: { chip: "bg-status-pending-tint text-status-pending-deep", dot: "bg-status-pending", bar: "bg-status-pending" },
  rejected: {
    chip: "bg-status-cancelled-tint text-status-cancelled-deep",
    dot: "bg-status-cancelled",
    bar: "bg-status-cancelled",
  },
  pending: { chip: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50", bar: "bg-muted-foreground/25" },
  cancelled: {
    chip: "bg-muted text-muted-foreground/70",
    dot: "bg-muted-foreground/30",
    bar: "bg-[repeating-linear-gradient(135deg,var(--color-border)_0_4px,var(--color-muted)_4px_8px)]",
  },
  unknown: { chip: "text-muted-foreground ring-1 ring-inset ring-border", dot: "bg-muted-foreground/40", bar: "bg-muted" },
};

export function DayStateChip({ task, className }: { task: TaskItemDto; className?: string }) {
  const t = useTranslations("tasks.detail.states");
  const tone = dayTone(task);
  const c = DAY_TONE_CLASS[tone];
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 self-start rounded-md px-2 text-[11px] font-semibold",
        c.chip,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", c.dot)} />
      {/* An unknown state prints the server's word, never a guess. */}
      {tone === "unknown" ? task.status || "–" : t(tone)}
    </span>
  );
}
