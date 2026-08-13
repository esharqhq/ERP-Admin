import { describe, expect, it } from "vitest";
import {
  activeWorkers,
  groupStaffing,
  isOpen,
  needsWorkers,
} from "@/lib/tasks/staffing";
import type { TaskItemDto, TaskWorkerDto } from "@/lib/types/task.types";

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
