"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  AssignButton,
  StaffingLine,
  TaskIdentity,
  dayLabel,
  windowLabel,
} from "@/components/tasks/register/register-columns";
import { StatusCell } from "@/components/tasks/register/status-cell";
import type { RegisterRow } from "@/lib/tasks/register/rows";
import { cn } from "@/lib/utils";

/**
 * One day of work below 768px — design 09's card. Title and repeat mark, property
 * · short id, then status · schedule, then the meter with Assign on the right.
 * The shell overlays the full-card `RowLink`; Assign sits above it. It never
 * scrolls sideways — every line truncates or wraps instead.
 */
export function RegisterRowCard({
  row,
  onAssign,
}: {
  row: RegisterRow;
  onAssign: (row: RegisterRow) => void;
}) {
  const t = useTranslations("tasks.register");
  const locale = useLocale();

  return (
    <div className="flex min-w-0 flex-col gap-2.5 px-4 py-3.5">
      <TaskIdentity row={row} t={t} />

      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <StatusCell status={row.status} />
        <span
          className={cn(
            "whitespace-nowrap text-xs font-semibold",
            row.startsSoon && "text-status-cancelled-deep",
          )}
        >
          {dayLabel(row, locale)}
          <span
            className={cn(
              "ml-1.5 font-mono font-normal tabular-nums text-muted-foreground",
              row.startsSoon && "text-status-cancelled-deep",
            )}
          >
            {windowLabel(row)}
          </span>
        </span>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-3 border-t border-border pt-2.5">
        <StaffingLine row={row} />
        <AssignButton row={row} label={t("assign")} onAssign={onAssign} />
      </div>
    </div>
  );
}
