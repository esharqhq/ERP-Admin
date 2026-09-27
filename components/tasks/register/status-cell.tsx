"use client";

import { useTranslations } from "next-intl";
import type { DerivedTaskStatus } from "@/lib/tasks/derived-status";
import { cn } from "@/lib/utils";

/** Design 04: colour is the exception. Only three states earn a fill. */
const TONE: Record<DerivedTaskStatus, { chip: string; dot: string }> = {
  Open: { chip: "text-muted-foreground", dot: "bg-muted-foreground/40" },
  Scheduled: { chip: "text-status-active", dot: "bg-status-active/50" },
  Running: { chip: "bg-status-active-tint px-2 text-status-active", dot: "bg-status-active" },
  Review: { chip: "text-status-pending-deep", dot: "bg-status-pending" },
  Disputed: { chip: "text-status-pending-deep", dot: "bg-status-pending" },
  Done: { chip: "text-muted-foreground/70", dot: "bg-status-active/30" },
  Unstaffed: { chip: "bg-status-cancelled-tint px-2 text-status-cancelled-deep", dot: "bg-status-cancelled" },
  Overdue: { chip: "bg-status-cancelled-tint px-2 text-status-cancelled-deep ring-1 ring-inset ring-status-cancelled/35", dot: "bg-status-cancelled-deep" },
  Cancelled: { chip: "text-muted-foreground/50", dot: "bg-muted-foreground/25" },
};

export function StatusCell({ status }: { status: DerivedTaskStatus }) {
  const t = useTranslations("tasks.register.status");
  const tone = TONE[status] ?? TONE.Open;
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-full text-xs font-semibold", tone.chip)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", tone.dot)} />
      {t(status)}
    </span>
  );
}
