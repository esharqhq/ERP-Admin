import { describe, expect, it } from "vitest";
import { deriveTaskStatus } from "@/lib/tasks/derived-status";
import type { TaskItemDto, TaskWorkerDto } from "@/lib/types/task.types";

const NOW = new Date("2026-09-07T12:00:00Z");

function worker(over: Partial<TaskWorkerDto> = {}): TaskWorkerDto {
  return {
    id: "tw-1",
    taskId: "t-1",
    workerId: "w-1",
    workerName: "Ali K.",
    outcome: "Pending",
    starRating: null,
    assignedAt: "2026-09-01T09:00:00Z",
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
    propertyName: "Sonnenhof",
    scheduledDate: "2026-09-10",
    scheduledAt: "2026-09-10T09:00:00Z",
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

describe("deriveTaskStatus", () => {
  it("rule 1 — Cancelled status wins outright", () => {
    expect(deriveTaskStatus(task({ status: "Cancelled" }), NOW)).toBe("Cancelled");
  });

  it("rule 2 — Done status", () => {
    expect(deriveTaskStatus(task({ status: "Done" }), NOW)).toBe("Done");
  });

  it("rule 3 — InReview status", () => {
    expect(deriveTaskStatus(task({ status: "InReview" }), NOW)).toBe("Review");
  });

  it("rule 3 — still reads the `Review` a stale cache can carry", () => {
    expect(deriveTaskStatus(task({ status: "Review" }), NOW)).toBe("Review");
  });

  it("rule 4 — deadline passed and not Done → Overdue", () => {
    const t = task({
      status: "CheckedIn",
      deadline: "2026-09-01T00:00:00Z",
      workers: [worker()],
    });
    expect(deriveTaskStatus(t, NOW)).toBe("Overdue");
  });

  it("an InReview day past its deadline is Review, not Overdue", () => {
    // Against the raw words this read `Overdue`: `task.status === "Review"` did
    // not match `"InReview"`, so rule 3 was skipped and rule 4 caught it.
    const t = task({
      status: "InReview",
      deadline: "2026-09-01T00:00:00Z",
      workers: [worker()],
    });
    expect(deriveTaskStatus(t, NOW)).toBe("Review");
  });

  it("a CheckedIn day that is staffed and not today is Running, not Open", () => {
    // Against the raw words this fell all the way through to `Open`.
    const t = task({
      status: "CheckedIn",
      scheduledAt: "2026-09-05T09:00:00Z",
      workers: [worker()],
    });
    expect(deriveTaskStatus(t, NOW)).toBe("Running");
  });

  it("rule 5 — no active workers, starts today → Unstaffed", () => {
    const t = task({
      status: "Pending",
      scheduledAt: "2026-09-07T15:00:00Z",
      workers: [],
    });
    expect(deriveTaskStatus(t, NOW)).toBe("Unstaffed");
  });

  it("rule 6 — CheckedIn status, staffed, not today → Running", () => {
    const t = task({
      status: "CheckedIn",
      scheduledAt: "2026-09-05T09:00:00Z",
      workers: [worker()],
    });
    expect(deriveTaskStatus(t, NOW)).toBe("Running");
  });

  it("rule 7 — fully staffed and scheduled in the future → Scheduled", () => {
    const t = task({
      status: "Pending",
      scheduledAt: "2026-09-10T09:00:00Z",
      requiredWorkerCount: 1,
      workers: [worker()],
    });
    expect(deriveTaskStatus(t, NOW)).toBe("Scheduled");
  });

  it("rule 8 — default fallback → Open", () => {
    const t = task({
      status: "Pending",
      scheduledAt: "2026-09-10T09:00:00Z",
      requiredWorkerCount: 2,
      workers: [worker()],
    });
    expect(deriveTaskStatus(t, NOW)).toBe("Open");
  });

  it("boundary — Overdue wins over Unstaffed when both apply", () => {
    const t = task({
      status: "Pending",
      deadline: "2026-09-01T00:00:00Z",
      scheduledAt: "2026-09-07T08:00:00Z",
      workers: [],
    });
    expect(deriveTaskStatus(t, NOW)).toBe("Overdue");
  });

  it("boundary — Cancelled wins over everything, even an overdue+unstaffed shape", () => {
    const t = task({
      status: "Cancelled",
      deadline: "2026-09-01T00:00:00Z",
      scheduledAt: "2026-09-07T08:00:00Z",
      workers: [],
    });
    expect(deriveTaskStatus(t, NOW)).toBe("Cancelled");
  });

  it("boundary — Review pins even when the deadline has passed", () => {
    const t = task({
      status: "Review",
      deadline: "2026-09-01T00:00:00Z",
    });
    expect(deriveTaskStatus(t, NOW)).toBe("Review");
  });
});
