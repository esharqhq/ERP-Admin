"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Crosshair,
  EyeOff,
  Plus,
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
  type DemandCell,
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
 * five drawn, twenty more per press — with the workless rows hidden by default,
 * which is the mechanism that makes five a sensible number: on a real page most
 * of the directory has no work in any given week.
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
  groupsLoading,
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
  groupsLoading: boolean;
  isForbidden: boolean;
  isLoading: boolean;
  onAssign: (chip: MatrixChip) => void;
  onOpenChip: (chip: MatrixChip) => void;
  onAssignDay: (worker: WorkerRowDto, dayKey: DayKey, candidates: OpenTaskCandidate[]) => void;
}) {
  const t = useTranslations("workers.matrix");
  const locale = useLocale();

  const [hideUnbooked, setHideUnbooked] = useState(true);
  const [visible, setVisible] = useState(INITIAL_ROWS);
  const [expanded, setExpanded] = useState<string | null>(null);

  const grid = useMemo(
    () =>
      buildMatrixWeek({
        workers,
        dayKeys: week.dayKeys,
        attendance: attendance.rowsByDay,
        groups,
        hideUnbooked,
      }),
    [workers, week.dayKeys, attendance.rowsByDay, groups, hideUnbooked],
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
                      demand={grid.demand[i]}
                      open={grid.openShifts[i]}
                      refused={day.refused}
                      loading={groupsLoading}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── what the week needs ─────────────────────────────────────── */}
          <div className="flex border-b border-border bg-card">
            <div
              className={cn(
                IDENTITY,
                "flex flex-col justify-center gap-0.5 border-r border-border px-3.5 py-2",
              )}
            >
              <span className="text-[11.5px] font-semibold text-primary">
                {t("demand")}
              </span>
              <span className="font-mono text-[9.5px] text-muted-foreground">
                {t("demandWhy")}
              </span>
            </div>
            {grid.demand.map((cell, i) => {
              const full = cell.required > 0 && cell.assigned >= cell.required;
              return (
                <div
                  key={week.dayKeys[i]}
                  className="flex min-w-0 flex-1 flex-col justify-center border-r border-border/60 p-1.5"
                >
                  {groupsLoading ? (
                    <Skeleton className="h-8 w-full rounded-md" />
                  ) : cell.taskCount === 0 ? (
                    <span className="self-center font-mono text-sm text-border">–</span>
                  ) : (
                    <div
                      className={cn(
                        "flex min-w-0 flex-col gap-0.5 rounded-md px-1.5 py-1 ring-1 ring-inset",
                        full
                          ? "bg-status-active-tint/60 text-status-active ring-status-active/20"
                          : "bg-status-pending-tint/60 text-status-pending-deep ring-status-pending/30",
                      )}
                    >
                      <span className="flex items-center justify-between gap-1">
                        <span className="min-w-0 truncate font-mono text-[9.5px] font-semibold">
                          {cell.window}
                        </span>
                        <span className="flex-none rounded bg-background/70 px-1 font-mono text-[9px] font-bold">
                          {cell.assigned}/{cell.required}
                        </span>
                      </span>
                      {/*
                        ⚠ At ~140 owners this line reads "12 properties" rather
                        than a name — which is the argument for cutting this row.
                        Kept so that judgement is made against a real screen.
                      */}
                      <span className="min-w-0 truncate text-[9.5px] opacity-80">
                        {cell.label ||
                          t("properties", { count: cell.propertyCount })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── nobody assigned yet ────────────────────────────────── */}
          <div className="flex border-b border-border bg-card">
            <div
              className={cn(
                IDENTITY,
                "flex flex-col justify-center gap-0.5 border-r border-border px-3.5 py-1.5",
              )}
            >
              <span className="text-[11.5px] font-semibold text-status-pending-deep">
                {t("openShifts")}
              </span>
              {/*
                These are invisible to attendance — a task with nobody on it has no
                attendance row at all — so this line comes from the task-groups
                read. Worth saying, because it is why that second read exists.
              */}
              <span className="font-mono text-[9.5px] text-muted-foreground">
                {t("openShiftsWhy")}
              </span>
            </div>
            {grid.openShifts.map((n, i) => (
              <div
                key={week.dayKeys[i]}
                className="flex min-w-0 flex-1 items-center justify-center border-r border-border/60 px-1.5 py-1.5"
              >
                {n === 0 ? (
                  <span className="font-mono text-sm text-border">–</span>
                ) : (
                  <span className="flex items-center gap-1 whitespace-nowrap rounded-md bg-status-pending-tint px-1.5 py-1 text-[10.5px] font-semibold text-status-pending-deep ring-1 ring-inset ring-status-pending/30">
                    {t("openCount", { count: n })}
                    <Plus className="size-2.5" strokeWidth={2.6} />
                  </span>
                )}
              </div>
            ))}
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
              body={hideUnbooked ? t("emptyHiddenBody") : t("emptyBody")}
              action={
                hideUnbooked && grid.hiddenCount > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHideUnbooked(false)}
                    className="mt-1"
                  >
                    {t("showAll")}
                  </Button>
                ) : undefined
              }
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

      {/* ── the hidden-rows bar ───────────────────────────────────────── */}
      {hideUnbooked && grid.hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setHideUnbooked(false)}
          className="flex items-center justify-center gap-2 border-t border-status-pending/25 bg-status-pending-tint/40 py-2 text-[11.5px] font-semibold text-status-pending-deep outline-none hover:bg-status-pending-tint/60 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <EyeOff className="size-3.5" />
          {t("hidden", { count: grid.hiddenCount })}
          <span className="underline underline-offset-2">{t("showAll")}</span>
        </button>
      )}

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
 * What this day is, in one line under the date.
 *
 * ⚠ **This line and the two aggregate rows below now say overlapping things**, and
 * that is a deliberate, temporary state (2026-09-01): the rows were cut on the
 * user's call and then restored at their request so the trade-off could be judged
 * against a real screen rather than a description.
 *
 * The head is **not** being reverted with them. It used to read *"nothing
 * booked"* directly above a row announcing an open shift — both true, one counting
 * bookings and the other counting jobs, and together reading as a bug. Whatever is
 * decided about the rows, that sentence should not come back.
 *
 * **If the rows go again, this line is the only thing left saying that unstaffed
 * work exists** — a task nobody is assigned to produces no attendance row at all,
 * so a week holding three unstaffed jobs would otherwise draw exactly like a week
 * holding none.
 */
function DayMeta({
  demand,
  open,
  refused,
  loading,
}: {
  demand: DemandCell;
  open: number;
  refused: number;
  /** The task-groups read is still in flight. */
  loading: boolean;
}) {
  const t = useTranslations("workers.matrix");

  /*
    ⚠ Not "no jobs" while the read is in flight. Every count here comes from the
    task-groups call, so before it lands `taskCount` is legitimately 0 — and
    printing "no jobs" would state, for a second, the exact opposite of what this
    line exists to say.
  */
  if (loading) {
    return <Skeleton className="h-2.5 w-14 rounded" />;
  }

  // Nothing is scheduled at all. Quiet — an empty day is not a problem.
  if (demand.taskCount === 0) {
    return (
      <span className="whitespace-nowrap text-[9.5px] text-muted-foreground/60">
        {t("dayNoJobs")}
      </span>
    );
  }

  const short = demand.assigned < demand.required;

  return (
    <span
      className={cn(
        "flex items-center gap-1 whitespace-nowrap text-[9.5px]",
        short || refused > 0
          ? "font-semibold text-status-pending-deep"
          : "text-muted-foreground/70",
      )}
    >
      {t("dayStaffed", { assigned: demand.assigned, required: demand.required })}
      {/* Distinct from "short-staffed": these are jobs with nobody at all on
          them, which is the one an admin can act on from the assign sheet. */}
      {open > 0 && <span>{t("dayOpen", { count: open })}</span>}
      {refused > 0 && (
        <span className="text-status-cancelled">
          {t("dayRefused", { count: refused })}
        </span>
      )}
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
