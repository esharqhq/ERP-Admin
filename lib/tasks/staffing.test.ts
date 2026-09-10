import { describe, expect, it } from "vitest";
import {
  activeWorkers,
  groupStaffing,
  isGroupActive,
  isOpen,
  isShortOfCrew,
  needsWorkers,
} from "@/lib/tasks/staffing";
import type { TaskGroupDto, TaskItemDto, TaskWorkerDto } from "@/lib/types/task.types";

function worker(over: Partial<TaskWorkerDto> = {}): TaskWorkerDto {
  return {
    id: "tw-1",
    taskId: "t-1",
    workerId: "w-1",
    workerName: "Ali K.",
    outcome: "Pending",
    starRating: null,
    assignedAt: "2026-08-13T09:00:00Z",
    checkinAt: null,
    submittedAt: null,
    checkoutAt: null,
    checkinLat: null,
    checkinLng: null,
    ...over,
  };
}

function group(over: Partial<TaskGroupDto> = {}): TaskGroupDto {
  return {
    id: "g-1",
    propertyId: "p-1",
    ownerId: "o-1",
    title: "Walk-in order",
    defaultStartTime: "09:00:00",
    defaultDeadline: null,
    instructions: null,
    status: "Pending",
    ratingFloor: 0,
    allowNewWorkers: true,
    eligibleProfessionIds: [],
    dates: [],
    tasks: [],
    createdAt: "2026-08-13T09:00:00Z",
    ...over,
  };
}

function task(over: Partial<TaskItemDto> = {}): TaskItemDto {
  return {
    id: "t-1",
    groupId: "g-1",
    propertyId: "p-1",
    propertyName: "Walk-in / Manual Orders",
    scheduledDate: "2026-08-20",
    scheduledAt: "2026-08-20T09:00:00Z",
    deadline: null,
    status: "Pending",
    requiredWorkerCount: 1,
    startedAt: null,
    completedAt: null,
    workers: [],
    ...over,
  };
}

describe("activeWorkers", () => {
  it("keeps a worker whose outcome is Pending", () => {
    expect(activeWorkers(task({ workers: [worker()] }))).toHaveLength(1);
  });

  it("keeps a worker who Completed — a finished worker still occupied the slot", () => {
    const t = task({ workers: [worker({ outcome: "Completed" })] });
    expect(activeWorkers(t)).toHaveLength(1);
  });

  it.each(["Removed", "Cancelled", "NoShow"])(
    "drops a worker whose outcome is %s",
    (outcome) => {
      expect(activeWorkers(task({ workers: [worker({ outcome })] }))).toHaveLength(0);
    },
  );

  it("matches the outcome case-insensitively", () => {
    const t = task({ workers: [worker({ outcome: "noshow" })] });
    expect(activeWorkers(t)).toHaveLength(0);
  });

  it("treats a missing workers array as empty", () => {
    const t = { ...task(), workers: undefined } as unknown as TaskItemDto;
    expect(activeWorkers(t)).toEqual([]);
  });
});

describe("isOpen", () => {
  it.each(["Pending", "Active", "pending", "ACTIVE"])("is true for %s", (status) => {
    expect(isOpen(task({ status }))).toBe(true);
  });

  it.each(["Review", "Done", "Cancelled"])("is false for %s", (status) => {
    expect(isOpen(task({ status }))).toBe(false);
  });
});

describe("needsWorkers", () => {
  it("is true for an open task with no active worker", () => {
    expect(needsWorkers(task())).toBe(true);
  });

  it("is false when a vacated worker is the only row but the task is Done", () => {
    const t = task({ status: "Done", workers: [worker({ outcome: "NoShow" })] });
    expect(needsWorkers(t)).toBe(false);
  });

  it("is false for an open task that has an active worker", () => {
    expect(needsWorkers(task({ workers: [worker()] }))).toBe(false);
  });
});

describe("isShortOfCrew", () => {
  it("is true for a partly crewed open task", () => {
    const t = task({ requiredWorkerCount: 3, workers: [worker()] });
    expect(isShortOfCrew(t)).toBe(true);
  });

  it("is false when nobody is on it — that row is Unstaffed, not Short", () => {
    // The two predicates are disjoint on purpose, so the counts beside the tabs
    // never describe the same task twice.
    const t = task({ requiredWorkerCount: 3 });
    expect(isShortOfCrew(t)).toBe(false);
    expect(needsWorkers(t)).toBe(true);
  });

  it("is false when the crew is complete", () => {
    const t = task({
      requiredWorkerCount: 2,
      workers: [worker({ id: "a" }), worker({ id: "b" })],
    });
    expect(isShortOfCrew(t)).toBe(false);
  });

  it("is false when the task is over-staffed, which the server permits", () => {
    const t = task({
      requiredWorkerCount: 1,
      workers: [worker({ id: "a" }), worker({ id: "b" })],
    });
    expect(isShortOfCrew(t)).toBe(false);
  });

  it("counts a vacated row as a gap rather than a body", () => {
    const t = task({
      requiredWorkerCount: 2,
      workers: [worker({ id: "a" }), worker({ id: "b", outcome: "Removed" })],
    });
    expect(isShortOfCrew(t)).toBe(true);
  });

  it("is false for a closed task however short its crew", () => {
    const t = task({
      status: "Done",
      requiredWorkerCount: 4,
      workers: [worker()],
    });
    expect(isShortOfCrew(t)).toBe(false);
  });

  it("is false when nothing is required", () => {
    const t = task({ requiredWorkerCount: 0, workers: [worker()] });
    expect(isShortOfCrew(t)).toBe(false);
  });
});

describe("isGroupActive", () => {
  it("is true for a Pending group", () => {
    expect(isGroupActive(group({ status: "Pending" }))).toBe(true);
  });

  it("is true for an Active group", () => {
    expect(isGroupActive(group({ status: "Active" }))).toBe(true);
  });

  it("is false for a Done group", () => {
    expect(isGroupActive(group({ status: "Done" }))).toBe(false);
  });

  it("is false for a Cancelled group", () => {
    expect(isGroupActive(group({ status: "Cancelled" }))).toBe(false);
  });

  it("matches status case-insensitively", () => {
    expect(isGroupActive(group({ status: "pending" }))).toBe(true);
    expect(isGroupActive(group({ status: "ACTIVE" }))).toBe(true);
    expect(isGroupActive(group({ status: "done" }))).toBe(false);
    expect(isGroupActive(group({ status: "CANCELLED" }))).toBe(false);
  });

  it("is false for an unexpected status string — it must not be treated as active", () => {
    expect(isGroupActive(group({ status: "SomethingUnknown" }))).toBe(false);
  });
});

describe("groupStaffing", () => {
  it("sums filled and required across every task in the group", () => {
    const tasks = [
      task({ id: "t-1", requiredWorkerCount: 1, workers: [worker()] }),
      task({ id: "t-2", requiredWorkerCount: 3, workers: [worker(), worker({ id: "tw-2" })] }),
    ];
    expect(groupStaffing(tasks)).toEqual({ filled: 3, required: 4 });
  });

  it("excludes vacated workers from filled but not from required", () => {
    const tasks = [
      task({ requiredWorkerCount: 2, workers: [worker(), worker({ id: "tw-2", outcome: "Removed" })] }),
    ];
    expect(groupStaffing(tasks)).toEqual({ filled: 1, required: 2 });
  });

  it("returns zeroes for an empty group", () => {
    expect(groupStaffing([])).toEqual({ filled: 0, required: 0 });
  });
});
