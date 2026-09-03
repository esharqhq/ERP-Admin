import { describe, expect, it } from "vitest";
import {
  LATE_GRACE_MINUTES,
  summariseWeek,
  toShifts,
  type WorkerShift,
} from "@/hooks/use-worker-shifts";
import type { TaskItemDto, TaskWorkerDto } from "@/lib/types/task.types";

const ME = "worker-1";

/** Mon 24 Aug 2026 through Sun 30 Aug, the week every case below lives in. */
const WEEK = new Set([
  "2026-08-24",
  "2026-08-25",
  "2026-08-26",
  "2026-08-27",
  "2026-08-28",
  "2026-08-29",
  "2026-08-30",
]);

/** Tue 25 Aug — so Mon is past and Wed onwards is not. */
const TODAY = "2026-08-25";

function assigned(over: Partial<TaskWorkerDto> = {}): TaskWorkerDto {
  return {
    id: "tw-1",
    taskId: "t-1",
    workerId: ME,
    workerName: "Sardor",
    outcome: "Assigned",
    starRating: null,
    assignedAt: "2026-08-20T09:00:00",
    checkinAt: null,
    submittedAt: null,
    checkoutAt: null,
    checkinLat: null,
    checkinLng: null,
    ...over,
  };
}

function task(over: Partial<TaskItemDto> = {}): TaskItemDto {
  return {
    id: "t-1",
    groupId: "g-1",
    propertyId: "p-1",
    propertyName: "Kastanienallee 12",
    scheduledDate: "2026-08-25",
    scheduledAt: "2026-08-25T08:00:00",
    deadline: null,
    status: "Pending",
    requiredWorkerCount: 1,
    startedAt: null,
    completedAt: null,
    workers: [assigned()],
    ...over,
  };
}

describe("toShifts", () => {
  it("keeps only the tasks this worker is on", () => {
    const rows = toShifts(
      [
        task({ id: "mine" }),
        task({ id: "theirs", workers: [assigned({ workerId: "someone-else" })] }),
      ],
      ME,
      WEEK,
      TODAY,
    );

    expect(rows.map((r) => r.taskId)).toEqual(["mine"]);
  });

  it("drops tasks outside the week", () => {
    const rows = toShifts(
      [task({ scheduledDate: "2026-09-07", scheduledAt: "2026-09-07T08:00:00" })],
      ME,
      WEEK,
      TODAY,
    );

    expect(rows).toEqual([]);
  });

  it("drops a worker who was removed, but keeps a no-show", () => {
    const rows = toShifts(
      [
        task({ id: "removed", workers: [assigned({ outcome: "Removed" })] }),
        task({ id: "noshow", workers: [assigned({ outcome: "NoShow" })] }),
      ],
      ME,
      WEEK,
      TODAY,
    );

    expect(rows.map((r) => [r.taskId, r.state])).toEqual([["noshow", "missed"]]);
  });

  it("reads a check-in inside the grace window as on time", () => {
    const [row] = toShifts(
      [
        task({
          workers: [
            assigned({
              checkinAt: `2026-08-25T08:0${LATE_GRACE_MINUTES}:00`,
              checkoutAt: "2026-08-25T11:00:00",
            }),
          ],
        }),
      ],
      ME,
      WEEK,
      TODAY,
    );

    expect(row.state).toBe("onTime");
    expect(row.lateBy).toBe(LATE_GRACE_MINUTES);
  });

  it("reads a check-in past the grace window as late, with the minutes", () => {
    const [row] = toShifts(
      [
        task({
          scheduledAt: "2026-08-25T14:00:00",
          workers: [
            assigned({ checkinAt: "2026-08-25T14:18:00", checkoutAt: "2026-08-25T16:00:00" }),
          ],
        }),
      ],
      ME,
      WEEK,
      TODAY,
    );

    expect(row.state).toBe("late");
    expect(row.lateBy).toBe(18);
  });

  it("reads a check-in with no check-out as on site", () => {
    const [row] = toShifts(
      [task({ workers: [assigned({ checkinAt: "2026-08-25T08:02:00" })] })],
      ME,
      WEEK,
      TODAY,
    );

    expect(row.state).toBe("onSite");
  });

  it("does not call a shift missed until its day is over", () => {
    // Same task, same absent check-in — only the date differs. Today's is still
    // open; yesterday's is not.
    const [today] = toShifts([task()], ME, WEEK, TODAY);
    const [yesterday] = toShifts(
      [task({ scheduledDate: "2026-08-24", scheduledAt: "2026-08-24T08:00:00" })],
      ME,
      WEEK,
      TODAY,
    );

    expect(today.state).toBe("scheduled");
    expect(yesterday.state).toBe("missed");
  });

  it("holds every shift as scheduled while the clock is unknown", () => {
    // The server snapshot is an empty key, and a shift must not flip state on
    // hydration.
    const [row] = toShifts(
      [task({ scheduledDate: "2026-08-24", scheduledAt: "2026-08-24T08:00:00" })],
      ME,
      WEEK,
      "",
    );

    expect(row.state).toBe("scheduled");
  });

  it("sorts by date then start time", () => {
    const rows = toShifts(
      [
        task({ id: "wed", scheduledDate: "2026-08-26", scheduledAt: "2026-08-26T09:00:00" }),
        task({ id: "tue-pm", scheduledAt: "2026-08-25T14:00:00" }),
        task({ id: "tue-am", scheduledAt: "2026-08-25T08:00:00" }),
      ],
      ME,
      WEEK,
      TODAY,
    );

    expect(rows.map((r) => r.taskId)).toEqual(["tue-am", "tue-pm", "wed"]);
  });
});

describe("summariseWeek", () => {
  function shift(over: Partial<WorkerShift>): WorkerShift {
    return {
      taskId: "t",
      propertyId: "p",
      propertyName: "Kastanienallee 12",
      scheduledDate: "2026-08-25",
      scheduledAt: "2026-08-25T08:00:00",
      status: "Pending",
      state: "scheduled",
      checkinAt: null,
      checkoutAt: null,
      lateBy: null,
      ...over,
    };
  }

  it("has no on-time rate for a week that has not happened", () => {
    // `0%` would read as a failure; the absence of a rate is not one.
    expect(summariseWeek([shift({}), shift({})]).onTime).toBeNull();
  });

  it("counts only decided shifts in the on-time rate", () => {
    const summary = summariseWeek([
      shift({ state: "onTime" }),
      shift({ state: "late" }),
      shift({ state: "scheduled" }),
      shift({ state: "done" }),
    ]);

    expect(summary.onTime).toBe(0.5);
    expect(summary.shifts).toBe(4);
  });

  it("clocks hours from check-in pairs, not from what was booked", () => {
    const summary = summariseWeek([
      shift({
        state: "onTime",
        checkinAt: "2026-08-25T08:00:00",
        checkoutAt: "2026-08-25T11:30:00",
      }),
      // Booked, never clocked out — contributes nothing rather than a guess.
      shift({ state: "onSite", checkinAt: "2026-08-25T14:00:00" }),
    ]);

    expect(summary.hours).toBe(3.5);
  });

  it("ignores a check-out that precedes its check-in", () => {
    const summary = summariseWeek([
      shift({
        state: "onTime",
        checkinAt: "2026-08-25T11:00:00",
        checkoutAt: "2026-08-25T08:00:00",
      }),
    ]);

    expect(summary.hours).toBe(0);
  });
});

