"use client";

import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { TableCell, TableRow } from "@/components/ui/table";
import { AttendanceBadge, KIND_RAIL, OutcomeLine } from "@/components/attendance/attendance-badge";
import { CheckinCell, CheckoutCell } from "@/components/attendance/checkin-cell";
import { initials } from "@/lib/ui/initials";
import { hhmm } from "@/lib/attendance/format";
import type { AttendanceRow } from "@/lib/attendance/status";
import { cn } from "@/lib/utils";

/**
 * One row: one **(task, worker) pair**.
 *
 * That is the grain of the response and it is worth stating, because it is not the
 * grain a reader assumes. A worker on two tasks the same day is two rows, and a
 * task with three workers is three — so the React key is the pair, never the
 * worker and never the task alone.
 *
 * Clicking the row opens the detail sheet rather than navigating. The design caps
 * the table at seven columns, so the fields that do not earn one — the
 * coordinates, the submission time, the refusal timestamp, the four ids — live one
 * click away instead of being dropped. The two inner links (the task group, and
 * the map pin in the check-in cell) stop their own clicks.
 */
export function AttendanceTableRow({
  row,
  nowMs,
  isToday,
  locale,
  onOpen,
}: {
  row: AttendanceRow;
  nowMs: number;
  isToday: boolean;
  locale: string;
  onOpen: () => void;
}) {
  const t = useTranslations("attendance");
  const struck = row.kind === "cancelled";

  return (
    <TableRow
      onClick={onOpen}
      /* A row that opens a panel is a button, so it answers the keyboard too. */
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "cursor-pointer border-l-[3px] outline-none hover:bg-accent/40 focus-visible:bg-accent/40",
        KIND_RAIL[row.kind],
        // Overdue rows tint the whole row, because they are the ones somebody is
        // scanning for. Nothing else does — a table where every row is tinted has
        // no signal left.
        row.kind === "overdue" && "bg-status-cancelled-tint/25",
      )}
    >
      <TableCell className="py-2.5">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex size-7 flex-none items-center justify-center rounded-full text-[10.5px] font-semibold",
              struck
                ? "bg-muted text-muted-foreground"
                : "bg-shell-tint text-status-verified",
            )}
          >
            {initials(row.workerName)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span
              className={cn(
                "truncate text-[13.5px] font-semibold",
                struck && "text-muted-foreground line-through",
              )}
            >
              {row.workerName}
            </span>
            <span className="truncate font-mono text-[10.5px] text-muted-foreground">
              {row.workerId.slice(0, 8)}
            </span>
          </span>
        </div>
      </TableCell>

      <TableCell className="text-[13px]">
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{row.propertyName}</span>
          <span className="truncate font-mono text-[10.5px] text-muted-foreground">
            {row.propertyId.slice(0, 8)}
          </span>
        </span>
      </TableCell>

      <TableCell className="text-[13px]">
        <span className="flex min-w-0 flex-col">
          <Link
            href={`/dashboard/tasks/${row.taskGroupId}`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "truncate underline-offset-2 hover:underline",
              // A null title is drawn as the italic task id — never a blank cell.
              row.taskGroupTitle ? "text-foreground" : "text-ink-soft italic",
            )}
          >
            {row.taskGroupTitle || row.taskId.slice(0, 8)}
          </Link>
          <span className="truncate font-mono text-[10.5px] text-muted-foreground">
            {row.taskGroupTitle ? row.taskId.slice(0, 8) : t("cell.noGroupTitle")}
          </span>
        </span>
      </TableCell>

      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[13px] tabular-nums">
            {hhmm(row.scheduledAt, locale)}
          </span>
          <span className="font-mono text-[10.5px] text-muted-foreground">
            {row.taskStatus}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <CheckinCell row={row} nowMs={nowMs} isToday={isToday} locale={locale} />
      </TableCell>

      <TableCell>
        <CheckoutCell row={row} locale={locale} />
      </TableCell>

      <TableCell>
        <div className="flex items-center justify-between gap-2">
          <span className="flex flex-col items-start gap-0.5">
            <AttendanceBadge kind={row.kind} />
            <OutcomeLine outcome={row.outcome} />
          </span>
          <ChevronRight className="size-3.5 flex-none text-muted-foreground/50" />
        </div>
      </TableCell>
    </TableRow>
  );
}

/** The row's stable identity: the pair, not either half of it. */
export const rowKey = (row: AttendanceRow) => `${row.taskId}:${row.workerId}`;
