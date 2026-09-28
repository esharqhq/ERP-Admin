import { describe, expect, it } from "vitest";
import { buildRegisterRows } from "@/lib/tasks/register/rows";
import type { TaskGroupDto, TaskItemDto, TaskWorkerDto } from "@/lib/types/task.types";

const NOW = new Date(2026, 8, 27, 10, 0); // local 27 Sep 2026 10:00

function worker(over: Partial<TaskWorkerDto> = {}): TaskWorkerDto {
  return {
    id: "tw-1", taskId: "t-1", workerId: "w-1", workerName: "Ali", outcome: "Pending",
    starRating: null, assignedAt: "2026-09-20T09:00:00Z", checkinAt: null, submittedAt: null,
    checkoutAt: null, checkinLat: null, checkinLng: null, checkinDoor: null, ...over,
  } as TaskWorkerDto;
}

function task(over: Partial<TaskItemDto> = {}): TaskItemDto {
  return {
    id: "t-1", groupId: "g-1", propertyId: "p-1", propertyName: "Sonnenhof",
    scheduledDate: "2026-09-27", scheduledAt: new Date(2026, 8, 27, 12, 0).toISOString(),
    deadline: new Date(2026, 8, 27, 18, 0).toISOString(), status: "Pending",
    requiredWorkerCount: 2, startedAt: null, completedAt: null, closureReason: null,
    supervisorWorkerId: null, workSummary: null, workers: [], ...over,
  } as TaskItemDto;
}

function group(over: Partial<TaskGroupDto> = {}): TaskGroupDto {
  return {
    id: "g-1", propertyId: "p-1", ownerId: "o-1", title: "House cleaning",
    defaultStartTime: "12:00:00", defaultDeadline: "18:00:00", instructions: null,
    days: { total: 2, pending: 2, checkedIn: 0, inReview: 0, done: 0, cancelled: 0, rejected: 0 },
    ratingFloor: 4, allowNewWorkers: true, eligibleProfessionIds: ["pr-1"], dates: [], tasks: [],
    createdAt: "2026-09-01T08:00:00Z", kind: "Booking", ...over,
  } as TaskGroupDto;
}

const byId = (...gs: TaskGroupDto[]) => new Map(gs.map((g) => [g.id, g]));

describe("buildRegisterRows", () => {
  it("joins the day to its booking", () => {
    const [row] = buildRegisterRows([task()], byId(group()), NOW);
    expect(row.title).toBe("House cleaning");
    expect(row.repeating).toBe(true);
    expect(row.professionIds).toEqual(["pr-1"]);
    expect(row.ownerId).toBe("o-1");
    expect(row.ratingFloor).toBe(4);
  });

  it("still yields a row when the booking is not in the list", () => {
    const [row] = buildRegisterRows([task({ groupId: "missing" })], byId(group()), NOW);
    expect(row.group).toBeNull();
    expect(row.title).toBeNull();
    expect(row.professionIds).toEqual([]);
    expect(row.repeating).toBe(false);
  });

  it("marks a single task as not repeating", () => {
    const [row] = buildRegisterRows([task()], byId(group({ kind: "SingleTask" })), NOW);
    expect(row.repeating).toBe(false);
  });

  it("reads times and the day key in local time", () => {
    const late = task({ scheduledAt: new Date(2026, 8, 27, 23, 30).toISOString(), deadline: null });
    const [row] = buildRegisterRows([late], byId(group()), NOW);
    expect(row.dayKey).toBe("2026-09-27");
    expect(row.startTime).toBe("23:30");
    expect(row.endTime).toBeNull();
  });

  it("flags an unstaffed day starting today and one starting within 4 hours", () => {
    const [row] = buildRegisterRows([task()], byId(group()), NOW);
    expect(row.unstaffedToday).toBe(true);
    expect(row.startsSoon).toBe(true);
    expect(row.assignable).toBe(true);
  });

  it("is not assignable once full, and counts over-staffing", () => {
    const full = task({ requiredWorkerCount: 1, workers: [worker(), worker({ id: "tw-2", workerId: "w-2" })] });
    const [row] = buildRegisterRows([full], byId(group()), NOW);
    expect(row.staffing.gap).toBe(0);
    expect(row.over).toBe(1);
    expect(row.assignable).toBe(false);
  });

  it("is not assignable once cancelled", () => {
    const [row] = buildRegisterRows([task({ status: "Cancelled" })], byId(group()), NOW);
    expect(row.status).toBe("Cancelled");
    expect(row.assignable).toBe(false);
  });

  it("knows whether anyone checked in", () => {
    const t = task({ workers: [worker({ checkinAt: "2026-09-27T09:00:00Z" })] });
    expect(buildRegisterRows([t], byId(group()), NOW)[0].hasCheckin).toBe(true);
  });

  it("does not crash on a day whose workers list is missing", () => {
    const t = task({ workers: null as unknown as TaskWorkerDto[] });
    expect(buildRegisterRows([t], byId(group()), NOW)[0].hasCheckin).toBe(false);
  });

  it("knows whether the day is still open, full or not", () => {
    const full = task({ requiredWorkerCount: 1, workers: [worker()] });
    const [open] = buildRegisterRows([full], byId(group()), NOW);
    expect(open.open).toBe(true);
    expect(open.assignable).toBe(false);
    expect(buildRegisterRows([task({ status: "Cancelled" })], byId(group()), NOW)[0].open).toBe(false);
    expect(buildRegisterRows([task({ status: "Done" })], byId(group()), NOW)[0].open).toBe(false);
  });

  it("survives an unparseable start", () => {
    const [row] = buildRegisterRows([task({ scheduledAt: "not-a-date" })], byId(group()), NOW);
    expect(Number.isNaN(row.startMs)).toBe(true);
    expect(row.startTime).toBe("–");
    expect(row.startsSoon).toBe(false);
  });
});
