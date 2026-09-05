"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Crosshair,
  RotateCcw,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TableForbidden, TableState } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import type { AttendanceWeek } from "@/hooks/use-attendance-week";
import type { TaskGroupDto } from "@/lib/types/task.types";
import type { WorkerRowDto } from "@/lib/types/worker.types";
import { weekdayLabels, type DayKey, type Week } from "@/lib/ui/week";
import {
  buildMatrixWeek,
  type MatrixChip,
  type OpenTaskCandidate,
} from "@/lib/workers/matrix";
import { cn } from "@/lib/utils";
import { MatrixRow } from "./matrix-row";

/**
 * Workers × week — **reading A, booked work**.
 *
 * Seven attendance reads fill the grid whatever the page size, so the column axis
 * is free and the row axis stays the paged worker list the Table shows. Declared
 * availability is *not* the ground: it costs one request per worker and arrives
 * when a row is expanded.
 *
 * ⚠ **Rows are windowed and there is no infinite scroll.** The design's numbers —
 * five drawn, twenty more per press — with every worker sorted free-days first
 * rather than hidden, so the window opens on the rows most worth seeing instead
 * of on whichever five happen to sort first alphabetically.
 */

/** The frozen identity column, matched to the design's 300px. */
const IDENTITY = "w-[300px] flex-none";
const INITIAL_ROWS = 5;
const ROW_STEP = 20;

export function WorkersMatrix({
  week,
  todayKey,
  workers,
  attendance,
  groups,
  isForbidden,
  isLoading,
  onAssign,
  onOpenChip,
  onAssignDay,
}: {
  week: Week;
  todayKey: DayKey;
  /** The current page of the shared worker list — same filters as the Table. */
  workers: WorkerRowDto[];
  attendance: AttendanceWeek;
  groups: TaskGroupDto[];
  isForbidden: boolean;
  isLoading: boolean;
  onAssign: (chip: MatrixChip) => void;
  onOpenChip: (chip: MatrixChip) => void;
  onAssignDay: (worker: WorkerRowDto, dayKey: DayKey, candidates: OpenTaskCandidate[]) => void;
}) {
  const t = useTranslations("workers.matrix");
  const locale = useLocale();

  const [visible, setVisible] = useState(INITIAL_ROWS);
  const [expanded, setExpanded] = useState<string | null>(null);

  const grid = useMemo(
    () =>
      buildMatrixWeek({
        workers,
        dayKeys: week.dayKeys,
        attendance: attendance.rowsByDay,
        groups,
      }),
    [workers, week.dayKeys, attendance.rowsByDay, groups],
  );

  const labels = useMemo(() => weekdayLabels(locale), [locale]);
  const failedDays = grid.days.map((d) => d.failed);
  const shown = grid.rows.slice(0, visible);

  if (isForbidden) {
    return (
      <Card className="grow shrink-0 items-center justify-center overflow-hidden py-0">
        <TableForbidden />
      </Card>
    );
  }

  return (
    <Card className="grow shrink-0 gap-0 overflow-hidden py-0">
      {/*
        The grid scrolls inside its own container; the page never scrolls
        sideways. Same rule as the table.
      */}
      <div className="scrollbar-slim w-full overflow-x-auto">
        <div className="min-w-[948px]">
          {/* ── the seven column heads ─────────────────────────────────── */}
          <div className="flex border-b border-border bg-muted/20">
            <div className={cn(IDENTITY, "border-r border-border px-3.5 py-2")}>
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("worker")}
              </span>
            </div>
            {grid.days.map((day, i) => {
              const isToday = day.key === todayKey;
              return (
                <div
                  key={day.key}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center gap-0.5 border-r border-border/60 px-2 py-1.5",
                    isToday
                      ? "bg-status-active-tint/25"
                      : i > 4
                        ? "bg-muted/20"
                        : undefined,
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.09em]",
                      isToday ? "text-status-active" : "text-muted-foreground",
                    )}
                  >
                    {labels[i]}
                  </span>
                  <span
                    className={cn(
                      "flex h-[23px] min-w-[23px] items-center justify-center rounded-full px-1.5 font-mono text-[12.5px] tabular-nums",
                      isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : i > 4
                          ? "text-muted-foreground"
                          : "text-foreground",
                    )}
                  >
                    {day.key.slice(8)}
                  </span>
                  {/* Per-column failure is one column wide, with its own retry. */}
                  {day.failed ? (
                    <button
                      type="button"
                      onClick={attendance.days[i].refetch}
                      className="flex items-center gap-1 whitespace-nowrap rounded px-1 text-[9.5px] font-semibold text-status-pending-deep underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <RotateCcw className="size-2.5" />
                      {t("retryDay")}
                    </button>
                  ) : (
                    <DayMeta
                      booked={day.booked}
                      refused={day.refused}
                      loading={attendance.days[i].isLoading}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── the rows ────────────────────────────────────────────────── */}
          {isLoading ? (
            Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex min-h-[78px] border-b border-border/60">
                <div className={cn(IDENTITY, "border-r border-border px-3.5 py-3")}>
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
                {week.dayKeys.map((k) => (
                  <div key={k} className="flex-1 border-r border-border/60 p-1.5">
                    <Skeleton className="h-[54px] w-full rounded-md" />
                  </div>
                ))}
              </div>
            ))
          ) : shown.length === 0 ? (
            <TableState
              icon={<Clock className="size-4" />}
              title={t("emptyTitle")}
              body={t("emptyBody")}
            />
          ) : (
            shown.map((row) => (
              <MatrixRow
                key={row.worker.id}
                row={row}
                dayKeys={week.dayKeys}
                todayKey={todayKey}
                failedDays={failedDays}
                openTasksByDay={grid.openTasksByDay}
                // One row at a time: each open row is one request, and a grid
                // where every row is open is the cost this reading exists to avoid.
                expanded={expanded === row.worker.id}
                onToggle={() =>
                  setExpanded((id) => (id === row.worker.id ? null : row.worker.id))
                }
                onAssign={onAssign}
                onOpenChip={onOpenChip}
                onAssignDay={(dayKey, candidates) =>
                  onAssignDay(row.worker, dayKey, candidates)
                }
              />
            ))
          )}
        </div>
      </div>

      {/* ── legend and the row window ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5 sm:px-5">
        <Legend />
        <div className="flex-1" />
        <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">
          {t("rowRange", { shown: shown.length, total: grid.rows.length })}
        </span>
        {shown.length < grid.rows.length && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisible((n) => n + ROW_STEP)}
            className="h-7 rounded-lg text-xs"
          >
            {t("showMore", {
              count: Math.min(ROW_STEP, grid.rows.length - shown.length),
            })}
          </Button>
        )}
      </div>
    </Card>
  );
}

/**
 * What this day is, in one line under the date: platform-wide attendance
 * counts from `MatrixDay` itself (`day.booked`/`day.refused`) — not the
 * paged/visible row set below — so this line can never disagree with the
 * per-column retry state right above it.
 *
 * ⚠ **Deliberately no longer reads `demand`/`openShifts`.** Those answered a
 * different question ("what does the week need", from the task-groups read)
 * and both aggregate rows that drew them are gone now — reading A is
 * people-only, and "what the week needs" is Tasks' question, not this
 * screen's. This line only ever answered "how many bookings, and how many
 * refused", and says exactly that in the design's own `dayDefs` format
 * (`"24 booked"`, `"26 · 2 refused"`).
 */
function DayMeta({
  booked,
  refused,
  loading,
}: {
  booked: number;
  refused: number;
  /** This day's own attendance read — one of the seven independent calls. */
  loading: boolean;
}) {
  const t = useTranslations("workers.matrix");

  if (loading) {
    return <Skeleton className="h-2.5 w-14 rounded" />;
  }

  // Nobody was on the roster at all that day. Quiet — an empty day is not a problem.
  if (booked === 0) {
    return (
      <span className="whitespace-nowrap text-[9.5px] text-muted-foreground/60">
        {t("dayNoJobs")}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "whitespace-nowrap text-[9.5px]",
        refused > 0 ? "font-semibold text-status-cancelled" : "text-muted-foreground/70",
      )}
    >
      {refused > 0 ? t("dayBookedRefused", { booked, refused }) : t("dayBooked", { count: booked })}
    </span>
  );
}

function Legend() {
  const t = useTranslations("workers.matrix.legend");
  const items = [
    { key: "present", Icon: Check, cls: "bg-status-active-tint text-status-active" },
    { key: "booked", Icon: Clock, cls: "bg-muted text-foreground/80" },
    {
      key: "short",
      Icon: AlertTriangle,
      cls: "bg-status-pending-tint text-status-pending-deep",
    },
    {
      key: "refused",
      Icon: Crosshair,
      cls: "bg-status-cancelled-tint text-status-cancelled",
    },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map(({ key, Icon, cls }) => (
        <span
          key={key}
          className={cn(
            "flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold",
            cls,
          )}
        >
          <Icon className="size-2.5" strokeWidth={2.4} />
          {t(key)}
        </span>
      ))}
    </div>
  );
}
