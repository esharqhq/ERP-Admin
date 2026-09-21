import { describe, expect, it } from "vitest";
import {
  activeWorkers,
  groupStaffing,
  groupBucket,
  isGroupActive,
  isOpen,
  isShortOfCrew,
  needsWorkers,
} from "@/lib/tasks/staffing";
import type {
  TaskGroupDayCountsDto,
  TaskGroupDto,
  TaskItemDto,
  TaskWorkerDto,
} from "@/lib/types/task.types";

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
    days: { total: 1, pending: 1, checkedIn: 0, inReview: 0, done: 0, cancelled: 0, rejected: 0 },
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
    closureReason: null,
    supervisorWorkerId: null,
    workSummary: null,
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

/**
 * ⚠ This block replaces the `status`-word one. F-07 ·0 (2026-09-17) deleted
 * `TaskGroupDto.status` outright, so those cases could not be updated — there is
 * no word left to pass in. The old block's last case asserted that an unknown
 * word is NOT active; the counts invert that default deliberately, and the
 * reason is in the "missing or empty `days`" case below.
 */
describe("isGroupActive, off day counts", () => {
  const days = (p: Partial<TaskGroupDayCountsDto> = {}): TaskGroupDayCountsDto => ({
    total: 0, pending: 0, checkedIn: 0, inReview: 0,
    done: 0, cancelled: 0, rejected: 0, ...p,
  });
  const withDays = (d: TaskGroupDayCountsDto) => group({ days: d });

  it("keeps a booking whose first day has started", () => {
    // The measured bug §0·2 names: a booking vanished from the list the moment
    // its first day began, while its remaining days were still joinable.
    expect(isGroupActive(withDays(days({ total: 5, checkedIn: 1, done: 4 })))).toBe(true);
  });

  it("keeps a booking waiting on the owner to accept", () => {
    expect(isGroupActive(withDays(days({ total: 2, inReview: 1, done: 1 })))).toBe(true);
  });

  it("closes a booking once every day is settled", () => {
    expect(isGroupActive(withDays(days({ total: 4, done: 3, cancelled: 1 })))).toBe(false);
    expect(isGroupActive(withDays(days({ total: 3, cancelled: 3 })))).toBe(false);
  });

  it("counts `rejected` as settled, against the day ·5 fills it", () => {
    expect(isGroupActive(withDays(days({ total: 2, done: 1, rejected: 1 })))).toBe(false);
  });

  it("treats a missing or empty `days` as active", () => {
    // Cancel offered on a finished booking is a refused request; Cancel hidden
    // on a live one is a support ticket. Open is the safe default.
    expect(isGroupActive({} as TaskGroupDto)).toBe(true);
    expect(isGroupActive(withDays(days({ total: 0 })))).toBe(true);
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

describe("groupBucket", () => {
  const days = (p: Partial<TaskGroupDayCountsDto> = {}): TaskGroupDayCountsDto => ({
    total: 0, pending: 0, checkedIn: 0, inReview: 0,
    done: 0, cancelled: 0, rejected: 0, ...p,
  });
  const withDays = (d: TaskGroupDayCountsDto) => group({ days: d });

  it("is Pending while no day has moved", () => {
    expect(groupBucket(withDays(days({ total: 3, pending: 3 })))).toBe("Pending");
  });

  it("is Active the moment one day has started", () => {
    expect(groupBucket(withDays(days({ total: 3, pending: 2, checkedIn: 1 })))).toBe("Active");
  });

  it("is Active while a day waits on the owner", () => {
    expect(groupBucket(withDays(days({ total: 2, inReview: 1, done: 1 })))).toBe("Active");
  });

  it("is Done once every day settled and any of them was worked", () => {
    expect(groupBucket(withDays(days({ total: 4, done: 4 })))).toBe("Done");
  });

  it("is Done, not Cancelled, when only some days were cancelled", () => {
    // Calling this booking cancelled would deny three days of work that happened.
    expect(groupBucket(withDays(days({ total: 4, done: 3, cancelled: 1 })))).toBe("Done");
  });

  it("is Cancelled only when every day was cancelled", () => {
    expect(groupBucket(withDays(days({ total: 3, cancelled: 3 })))).toBe("Cancelled");
  });

  it("files a booking with no days under Pending", () => {
    expect(groupBucket(withDays(days({ total: 0 })))).toBe("Pending");
  });
});
