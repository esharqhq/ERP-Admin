"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { taskService } from "@/lib/services/task.service";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { useTodayKey } from "@/hooks/use-today";
import { normalizeStatus } from "@/lib/types/task.types";
import { toLocalDateKey } from "@/lib/tasks/weekly-rows";
import type { TaskItemDto, TaskWorkerDto } from "@/lib/types/task.types";

/**
 * ⚠ **Unconfirmed with the business.** The grid calls a check-in late once it is
 * more than this many minutes past the scheduled start. Payroll may run a grace
 * period, and if it does this label will be argued about — it is filed in
 * `BACKEND-ASKS.md` as a question, not assumed to be settled.
 *
 * Five minutes, not zero, so a worker who clocks in as the shift begins is not
 * marked late by the round-trip of their own tap.
 */
export const LATE_GRACE_MINUTES = 5;

/** Outcomes that mean the worker is no longer on the job. Mirrors `weekly-rows`. */
const VACATED = new Set(["removed", "cancelled", "noshow"]);

export type ShiftState =
  "onSite" | "onTime" | "late" | "missed" | "scheduled" | "done";

export interface WorkerShift {
  taskId: string;
  propertyId: string;
  propertyName: string;
  /** `"yyyy-MM-dd"`, local, as the server sends it. */
  scheduledDate: string;
  scheduledAt: string;
  status: string;
  state: ShiftState;
  checkinAt: string | null;
  checkoutAt: string | null;
  /** Whole minutes past the scheduled start, or `null` if never clocked in. */
  lateBy: number | null;
}

const DAY_MS = 86_400_000;

function iso(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

/**
 * What this worker is booked on, for one week, with their own clock-ins.
 *
 * **Why the task list and not the attendance report.** `GET /api/admin/attendance`
 * carries the same per-day facts, but it is one request per day and it is gated
 * on `system:attendance:read` — a permission nothing else on the worker screen
 * needs, so the whole grid would go dark for an admin who can read the worker
 * perfectly well. `GET /api/tasks/admin` is one windowed request, needs
 * `task:list_any` (which Dispatching already uses), and `TaskWorkerDto` carries
 * `checkinAt` / `checkoutAt` / `outcome` per worker — which is exactly what the
 * grid draws.
 *
 * There is no `workerId` filter on that route, so the window is fetched and
 * matched in memory. That is a real cost and it is bounded on purpose: a week is
 * a week whether this worker is in it or not. A per-worker read is filed in
 * `BACKEND-ASKS.md`.
 *
 * The window is deliberately **one day wider on each side** than the week asked
 * for. The server's `scheduledTo` is inclusive against a timestamp, so a bound
 * of Sunday `00:00` drops every task on Sunday; over-fetching and cutting the
 * range client-side on date keys has no boundary to get wrong.
 */
export function useWorkerShifts(workerId: string, days: Date[]) {
  const { permissions } = useCurrentPermissions();
  const canRead: boolean | null =
    permissions === null ? null : permissions.has("task:list_any");
  const todayKey = useTodayKey();

  const first = days[0];
  const last = days[days.length - 1];

  const from = first ? iso(new Date(first.getTime() - DAY_MS)) : null;
  const to = last ? iso(new Date(last.getTime() + DAY_MS)) : null;

  const query = useQuery({
    queryKey: ["admin-tasks-range", from, to],
    queryFn: () => taskService.getAdminTasksInRange(from!, to!),
    enabled: canRead === true && !!from && !!to,
  });

  const weekKeys = useMemo(() => new Set(days.map(toLocalDateKey)), [days]);

  const shifts = useMemo(
    () => toShifts(query.data ?? [], workerId, weekKeys, todayKey),
    [query.data, workerId, weekKeys, todayKey],
  );

  return {
    shifts,
    /** `null` while the grant set is unknown — not the same as `false`. */
    canRead,
    /** `enabled: false` leaves a query pending forever — check `canRead` first. */
    isPending: canRead === true && query.isPending,
    isError: query.isError,
  };
}

/**
 * Pure, and exported for its test: every branch here fails by showing *less*,
 * and a shift that quietly drops out of a week looks exactly like an idle week.
 */
export function toShifts(
  tasks: TaskItemDto[],
  workerId: string,
  weekKeys: Set<string>,
  /** Local `"yyyy-MM-dd"` for today, from `useTodayKey`. `""` = clock unknown. */
  todayKey: string,
): WorkerShift[] {
  const out: WorkerShift[] = [];

  for (const task of tasks) {
    if (!weekKeys.has(task.scheduledDate)) continue;

    const mine = (task.workers ?? []).find((w) => w.workerId === workerId);
    if (!mine) continue;
    // A worker removed from a task was never on it as far as their week is
    // concerned — except a no-show, which is the whole point of showing it.
    const outcome = normalizeStatus(mine.outcome);
    if (outcome !== "noshow" && VACATED.has(outcome)) continue;

    const lateBy = minutesLate(task.scheduledAt, mine.checkinAt);

    out.push({
      taskId: task.id,
      propertyId: task.propertyId,
      propertyName: (task.propertyName && task.propertyName.trim()) || "",
      scheduledDate: task.scheduledDate,
      scheduledAt: task.scheduledAt,
      status: task.status,
      state: shiftState(task, mine, lateBy, todayKey),
      checkinAt: mine.checkinAt,
      checkoutAt: mine.checkoutAt,
      lateBy,
    });
  }

  return out.sort((a, b) =>
    a.scheduledDate === b.scheduledDate
      ? a.scheduledAt.localeCompare(b.scheduledAt)
      : a.scheduledDate.localeCompare(b.scheduledDate),
  );
}

function minutesLate(
  scheduledAt: string,
  checkinAt: string | null,
): number | null {
  if (!checkinAt) return null;
  const start = Date.parse(scheduledAt);
  const at = Date.parse(checkinAt);
  if (Number.isNaN(start) || Number.isNaN(at)) return null;
  return Math.round((at - start) / 60_000);
}

function shiftState(
  task: TaskItemDto,
  mine: TaskWorkerDto,
  lateBy: number | null,
  todayKey: string,
): ShiftState {
  if (normalizeStatus(mine.outcome) === "noshow") return "missed";
  if (mine.checkinAt && !mine.checkoutAt) return "onSite";
  if (mine.checkinAt)
    return lateBy !== null && lateBy > LATE_GRACE_MINUTES ? "late" : "onTime";

  // Never clocked in. Compared at day granularity, not against the instant: a
  // shift later today has not been missed, and one two hours ago has not
  // necessarily been either — the worker may still arrive. Only a day that is
  // over says nobody came. Day granularity is also what keeps this stable
  // between the server snapshot and hydration.
  const status = normalizeStatus(task.status);
  if (status === "done" || status === "review") return "done";
  if (status === "cancelled") return "scheduled";
  if (!todayKey) return "scheduled";
  return task.scheduledDate < todayKey ? "missed" : "scheduled";
}

export interface WeekSummary {
  shifts: number;
  /** Worked hours, from clock-in/out pairs — not from what was booked. */
  hours: number;
  /**
   * Share of *decided* shifts the worker reached on time, or `null` when none
   * has been decided yet. A week that has not happened has no on-time rate, and
   * rendering `0%` for it would read as a failure rather than as an absence.
   */
  onTime: number | null;
}

/** Pure, and exported for its test — the page and the grid footer share it. */
export function summariseWeek(shifts: WorkerShift[]): WeekSummary {
  let ms = 0;
  let decided = 0;
  let good = 0;

  for (const shift of shifts) {
    if (shift.checkinAt && shift.checkoutAt) {
      const from = Date.parse(shift.checkinAt);
      const to = Date.parse(shift.checkoutAt);
      if (!Number.isNaN(from) && !Number.isNaN(to) && to > from)
        ms += to - from;
    }
    // `scheduled` is undecided by definition, and `done` covers a task closed
    // without this worker ever clocking in — which says nothing about them.
    if (shift.state === "onTime" || shift.state === "onSite") {
      decided++;
      good++;
    } else if (shift.state === "late" || shift.state === "missed") {
      decided++;
    }
  }

  return {
    shifts: shifts.length,
    hours: ms / 3_600_000,
    onTime: decided === 0 ? null : good / decided,
  };
}
