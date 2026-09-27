// lib/tasks/register/rows.ts

import { deriveTaskStatus, type DerivedTaskStatus } from "@/lib/tasks/derived-status";
import { durationHours, rowStaffing, type RowStaffing } from "@/lib/tasks/dispatch-row";
import { isOpen } from "@/lib/tasks/staffing";
import { toDayKey } from "@/lib/ui/week";
import type { TaskGroupDto, TaskItemDto } from "@/lib/types/task.types";

const HOUR_MS = 3_600_000;
/** Design 06 · Schedule: "Red when it starts within 4 h." */
const SOON_HOURS = 4;

export interface RegisterRow {
  task: TaskItemDto;
  group: TaskGroupDto | null;
  title: string | null;
  repeating: boolean;
  status: DerivedTaskStatus;
  staffing: RowStaffing;
  over: number;
  professionIds: string[];
  dayKey: string;
  startMs: number;
  startTime: string;
  endTime: string | null;
  durationH: number | null;
  unstaffedToday: boolean;
  startsSoon: boolean;
  /** Still to be worked (`isOpen`: pending or checked in) — not Done, Cancelled, in review… */
  open: boolean;
  /** Open **and** a body short — what Assign is offered on. */
  assignable: boolean;
  ownerId: string | null;
  ratingFloor: number | null;
  createdAt: string | null;
  hasCheckin: boolean;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * One row per day of work (spec §3). `TaskItemDto` carries no title, professions,
 * kind or owner — those live on the booking, joined here by `groupId`. A day whose
 * booking is missing from the cached list still renders: a list that drops rows
 * it cannot label hides work.
 *
 * Times and the day key are **local** — the admin plans in their own clock, and a
 * UTC slice would put a 23:30 day on tomorrow's date.
 */
export function buildRegisterRows(
  tasks: TaskItemDto[],
  groupsById: ReadonlyMap<string, TaskGroupDto>,
  now: Date,
): RegisterRow[] {
  const nowMs = now.getTime();
  return tasks.map((task) => {
    const group = groupsById.get(task.groupId) ?? null;
    const start = new Date(task.scheduledAt);
    const startMs = start.getTime();
    const valid = !Number.isNaN(startMs);
    const end = task.deadline ? new Date(task.deadline) : null;
    const staffing = rowStaffing(task);
    const status = deriveTaskStatus(task, now);
    const untilStart = startMs - nowMs;
    const open = isOpen(task);
    return {
      task,
      group,
      title: group?.title ?? null,
      repeating: group?.kind === "Booking",
      status,
      staffing,
      over: Math.max(0, staffing.filled - staffing.required),
      professionIds: group?.eligibleProfessionIds ?? [],
      dayKey: valid ? toDayKey(start) : task.scheduledDate,
      startMs,
      startTime: valid ? hhmm(start) : "–",
      endTime: end && !Number.isNaN(end.getTime()) ? hhmm(end) : null,
      durationH: durationHours(task.scheduledAt, task.deadline),
      unstaffedToday: status === "Unstaffed",
      startsSoon: valid && untilStart >= 0 && untilStart < SOON_HOURS * HOUR_MS,
      open,
      assignable: open && staffing.gap > 0,
      ownerId: group?.ownerId ?? null,
      ratingFloor: group?.ratingFloor ?? null,
      createdAt: group?.createdAt ?? null,
      hasCheckin: (task.workers ?? []).some((w) => Boolean(w.checkinAt)),
    };
  });
}
