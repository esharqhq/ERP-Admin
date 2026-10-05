"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatHm } from "@/lib/tasks/detail/day-time";
import { daySteps, type Label, type StepState, type StepTime } from "@/lib/tasks/detail/day-view";
import type { TaskComplaintDto, TaskItemDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

const DOT: Record<StepState, string> = {
  ok: "bg-primary text-primary-foreground",
  current: "bg-primary text-primary-foreground ring-4 ring-status-verified-tint",
  bad: "bg-status-cancelled text-background",
  badOpen: "bg-card ring-2 ring-inset ring-status-cancelled",
  skip: "bg-card ring-2 ring-inset ring-border",
  cancel: "bg-muted-foreground text-background",
  todo: "bg-card ring-2 ring-inset ring-border",
  off: "bg-card ring-2 ring-inset ring-muted",
};

const LINE: Record<StepState, string> = {
  ok: "bg-primary",
  current: "bg-primary",
  bad: "bg-status-cancelled",
  badOpen: "bg-status-cancelled",
  skip: "bg-border",
  cancel: "bg-border",
  todo: "bg-border",
  off: "bg-muted",
};

const LABEL: Record<StepState, string> = {
  ok: "text-foreground",
  current: "text-foreground",
  bad: "text-status-cancelled-deep",
  badOpen: "text-status-cancelled-deep",
  skip: "text-muted-foreground",
  cancel: "text-foreground",
  todo: "text-muted-foreground",
  off: "text-muted-foreground/60",
};

/** Step 4 of a Done day carries a closure-reason key; those words live under `closure.*`. */
const CLOSURE_KEYS: ReadonlySet<string> = new Set([
  "OwnerAccepted",
  "AutoAccepted",
  "ClosedForced",
  "ClosedReplacement",
]);

/** Scheduled → Checked in → Handed in → Closed; vertical below 768px. */
export function DayTimeline({
  task,
  complaint,
  locale,
}: {
  task: TaskItemDto;
  complaint: TaskComplaintDto | null;
  locale: string;
}) {
  const t = useTranslations("tasks.detail");
  const steps = daySteps(task, complaint);

  // `closureLabel(null)` is `{ key: "closed" }` → `steps.closed` ("Closed"), never "Accepted".
  const label = (l: Label) =>
    "raw" in l ? l.raw : CLOSURE_KEYS.has(l.key) ? t(`closure.${l.key}`) : t(`steps.${l.key}`);
  const time = (s: StepTime) => {
    switch (s.kind) {
      case "at":
        return formatHm(s.at, locale);
      case "about":
        return t("steps.about", { time: formatHm(s.at, locale) });
      case "auto":
        return t("steps.auto", { time: formatHm(s.at, locale) });
      case "beforeStart":
        return t("steps.beforeStart");
      case "skipped":
        return t("steps.skipped");
      default:
        return "–";
    }
  };

  return (
    <ol className="grid gap-3 md:grid-cols-4 md:gap-0">
      {steps.map((s, i) => {
        const next = steps[i + 1];
        const filled = s.state === "ok" || s.state === "current" || s.state === "bad" || s.state === "cancel";
        return (
          <li key={i} className="flex gap-3 md:flex-col md:gap-2">
            <div className="flex items-center md:w-full">
              <span className={cn("flex size-[22px] flex-none items-center justify-center rounded-full", DOT[s.state])}>
                {s.state === "cancel" ? (
                  <X className="size-3" strokeWidth={3} />
                ) : filled ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : null}
              </span>
              {next ? <span aria-hidden className={cn("hidden h-0.5 flex-1 md:block", LINE[next.state])} /> : null}
            </div>
            <span className="flex flex-col gap-0.5 md:pr-3">
              <span className={cn("text-[13px] font-semibold", LABEL[s.state])}>{label(s.label)}</span>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{time(s.time)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
