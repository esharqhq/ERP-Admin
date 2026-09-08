"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Clock, Layers } from "lucide-react";
import { useClock } from "@/hooks/use-today";
import { formatRelativeAge, formatRelativeMoment, relativeMoment } from "@/lib/ui/relative-time";
import { initials } from "@/lib/ui/initials";
import type { WorkerLeaveRequestDto } from "@/lib/types/leave.types";

interface Props {
  row: WorkerLeaveRequestDto;
  selected: boolean;
  onSelect: (requestId: string) => void;
}

/**
 * One triage line. It answers *who, how long ago, how wide* — never the
 * decision, which belongs in the panel beside it.
 *
 * `targetType` is drawn as the two different decisions it is: "Task" touches one
 * date, "TaskGroup" ends the enrolment and deletes every future assignment under
 * it. The old table printed the raw word and let the admin guess.
 */
export function LeaveQueueRow({ row, selected, onSelect }: Props) {
  const t = useTranslations("leave");
  const locale = useLocale();
  const now = useClock();

  const isGroup = row.targetType === "TaskGroup";
  const workerName = row.workerName ?? row.workerId.slice(0, 8);
  const asked = formatRelativeAge(row.createdAt, now, locale);

  // The line the old table had no way to draw. `soonestAffectedAt` is a past
  // timestamp when the shift has already begun — "2 hours ago" is the correct
  // and most alarming reading there, so the same formatter covers both.
  const affected = formatRelativeMoment(row.soonestAffectedAt, now, locale);
  const moment = relativeMoment(row.soonestAffectedAt, now);
  const hot =
    moment !== null &&
    (moment.value <= 0 ||
      (moment.unit === "hour" && moment.value <= 48) ||
      moment.unit === "minute");

  return (
    <button
      type="button"
      onClick={() => onSelect(row.id)}
      aria-current={selected ? "true" : undefined}
      className={`relative flex w-full flex-col gap-1.5 border-b border-border px-4 py-3 text-left transition-colors ${
        selected ? "bg-accent/60" : "hover:bg-accent/30"
      }`}
    >
      {selected && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px] bg-primary"
        />
      )}

      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
            selected
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {initials(workerName)}
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">{workerName}</span>
          {asked && (
            <span className="truncate text-[11px] text-muted-foreground">
              {t("row.asked", { age: asked })}
            </span>
          )}
        </span>

        <span
          className={`flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${
            isGroup
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isGroup ? (
            <Layers className="size-3" />
          ) : (
            <CalendarDays className="size-3" />
          )}
          {isGroup ? t("target.group") : t("target.task")}
        </span>
      </div>

      <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {row.reason}
      </span>

      {affected && (
        <span
          className={`flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${
            hot
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Clock className="size-3" />
          {t("row.affected", { when: affected })}
        </span>
      )}
    </button>
  );
}
