import { describe, expect, it } from "vitest";
import { computeLeaveScope } from "@/lib/leave/scope";
import type { TaskGroupDto, TaskItemDto } from "@/lib/types/task.types";
import type { WorkerLeaveRequestDto } from "@/lib/types/leave.types";

const NOW = Date.parse("2026-09-08T12:00:00Z");
const WORKER = "w-1";
const GROUP = "g-1";

function task(
  id: string,
  opts: {
    /** hours from NOW; negative = already started */
    at: number;
    status?: string;
    required?: number;
    /** the subject worker's outcome, or null to leave them off the task */
    outcome?: string | null;
    checkinAt?: string | null;
    /** other bodies already on the task, all Pending */
    others?: number;
  },
): TaskItemDto {
  const scheduledAt = new Date(NOW + opts.at * 3_600_000).toISOString();
  const workers = [];
  if (opts.outcome !== null) {
    workers.push({
      id: `tw-${id}`,
      taskId: id,
      workerId: WORKER,
      workerName: "Dilnoza Karimova",
      outcome: opts.outcome ?? "Pending",
      starRating: null,
      assignedAt: scheduledAt,
      checkinAt: opts.checkinAt ?? null,
      submittedAt: null,
      checkoutAt: null,
      checkinLat: null,
      checkinLng: null,
    });
  }
  for (let i = 0; i < (opts.others ?? 0); i++) {
    workers.push({
      id: `tw-${id}-o${i}`,
      taskId: id,
      workerId: `other-${i}`,
      workerName: "Other",
      outcome: "Pending",
      starRating: null,
      assignedAt: scheduledAt,
      checkinAt: null,
      submittedAt: null,
      checkoutAt: null,
      checkinLat: null,
      checkinLng: null,
    });
  }
  return {
    id,
    groupId: GROUP,
    propertyId: "p-1",
    propertyName: "Sonnenhof",
    scheduledDate: scheduledAt.slice(0, 10),
    scheduledAt,
    deadline: null,
    status: opts.status ?? "Pending",
    startedAt: null,
    completedAt: null,
    requiredWorkerCount: opts.required ?? 3,
    workers,
    media: null,
    conversationId: null,
  } as TaskItemDto;
}

function group(tasks: TaskItemDto[]): TaskGroupDto {
  return {
    id: GROUP,
    propertyId: "p-1",
    ownerId: "o-1",
    title: "Housekeeping",
    defaultStartTime: "08:00:00",
    defaultDeadline: null,
    instructions: null,
    status: "Pending",
    ratingFloor: 0,
    allowNewWorkers: true,
    eligibleProfessionIds: [],
    dates: [],
    tasks,
    createdAt: new Date(NOW).toISOString(),
    isEnrolled: true,
  } as unknown as TaskGroupDto;
}

function request(
  targetType: "Task" | "TaskGroup",
  taskId: string | null = null,
): WorkerLeaveRequestDto {
  return {
    id: "lr-1",
    workerId: WORKER,
    targetType,
    taskId,
    taskGroupId: GROUP,
    reason: "Family emergency",
    status: "Pending",
    supportTicketId: "st-1",
    decidedByAdminId: null,
    decidedAt: null,
    decisionNote: null,
    createdAt: new Date(NOW).toISOString(),
    workerName: "Dilnoza Karimova",
    soonestAffectedAt: null,
  };
}

describe("computeLeaveScope — TaskGroup target", () => {
  it("deletes a future pending assignment and calls it vacated", () => {
    const scope = computeLeaveScope(
      request("TaskGroup"),
      group([task("t1", { at: 48 })]),
      NOW,
    );
    expect(scope.rows.map((r) => r.effect)).toEqual(["vacated"]);
    expect(scope.vacated).toBe(1);
    expect(scope.noShow).toBe(0);
  });

  it("flips a past-start pending assignment to a no-show", () => {
    const scope = computeLeaveScope(
      request("TaskGroup"),
      group([task("t1", { at: -4 })]),
      NOW,
    );
    expect(scope.rows.map((r) => r.effect)).toEqual(["noshow"]);
    expect(scope.noShow).toBe(1);
    expect(scope.vacated).toBe(0);
  });

  // The two Task-status arms of OnTaskGroupWorkerExitedAsync. Dropping either
  // turns a finished shift into a no-show the backend would never write.
  it("leaves a past-start assignment on a Done task alone", () => {
    const scope = computeLeaveScope(
      request("TaskGroup"),
      group([task("t1", { at: -48, status: "Done" })]),
      NOW,
    );
    expect(scope.rows.map((r) => r.effect)).toEqual(["kept"]);
    expect(scope.noShow).toBe(0);
  });

  it("leaves a past-start assignment on a Cancelled task alone", () => {
    const scope = computeLeaveScope(
      request("TaskGroup"),
      group([task("t1", { at: -48, status: "Cancelled" })]),
      NOW,
    );
    expect(scope.rows.map((r) => r.effect)).toEqual(["kept"]);
  });

  it("leaves a past-start assignment already resolved alone", () => {
    const scope = computeLeaveScope(
      request("TaskGroup"),
      group([task("t1", { at: -48, outcome: "Completed" })]),
      NOW,
    );
    expect(scope.rows.map((r) => r.effect)).toEqual(["kept"]);
  });

  // The deletion filter is `status == Pending && scheduledAt > now`, so an
  // ACTIVE task in the future satisfies neither branch.
  it("leaves a future Active task alone", () => {
    const scope = computeLeaveScope(
      request("TaskGroup"),
      group([task("t1", { at: 4, status: "Active" })]),
      NOW,
    );
    expect(scope.rows.map((r) => r.effect)).toEqual(["kept"]);
  });

  it("never marks one task both vacated and no-show", () => {
    const scope = computeLeaveScope(
      request("TaskGroup"),
      group([
        task("t1", { at: 48 }),
        task("t2", { at: -4 }),
        task("t3", { at: -48, status: "Done" }),
      ]),
      NOW,
    );
    expect(scope.vacated + scope.noShow).toBe(2);
    expect(scope.rows).toHaveLength(3);
  });

  it("ignores tasks the worker is not on", () => {
    const scope = computeLeaveScope(
      request("TaskGroup"),
      group([task("t1", { at: 48 }), task("t2", { at: 48, outcome: null })]),
      NOW,
    );
    expect(scope.rows.map((r) => r.taskId)).toEqual(["t1"]);
  });

  it("orders rows by when the shift starts", () => {
    const scope = computeLeaveScope(
      request("TaskGroup"),
      group([task("t3", { at: 72 }), task("t1", { at: -4 }), task("t2", { at: 24 })]),
      NOW,
    );
    expect(scope.rows.map((r) => r.taskId)).toEqual(["t1", "t2", "t3"]);
  });

  it("reports staffing as it will read after the decision", () => {
    const scope = computeLeaveScope(
      request("TaskGroup"),
      group([task("t1", { at: 48, required: 3, others: 1 })]),
      NOW,
    );
    // 2 of 3 today; the leaver is one of them, so 1 of 3 after.
    expect(scope.rows[0].filledAfter).toBe(1);
    expect(scope.rows[0].required).toBe(3);
  });

  it("does not decrement staffing on a kept task", () => {
    const scope = computeLeaveScope(
      request("TaskGroup"),
      group([task("t1", { at: -48, status: "Done", others: 2 })]),
      NOW,
    );
    expect(scope.rows[0].filledAfter).toBe(3);
  });

  // isEnrolled is emitted neutrally at admin call sites, so no_active_enrolment
  // — the only server gate on a group target — cannot be pre-checked.
  it("pre-checks nothing on a group target", () => {
    const scope = computeLeaveScope(
      request("TaskGroup"),
      group([task("t1", { at: 48 })]),
      NOW,
    );
    expect(scope.blockers).toEqual([]);
    expect(scope.gatesPrecheckable).toBe(false);
  });

  it("returns an unresolved scope when the group is not loaded", () => {
    const scope = computeLeaveScope(request("TaskGroup"), null, NOW);
    expect(scope.resolved).toBe(false);
    expect(scope.rows).toEqual([]);
  });
});

describe("computeLeaveScope — Task target", () => {
  it("touches only the requested date, not the rest of the group", () => {
    const scope = computeLeaveScope(
      request("Task", "t2"),
      group([task("t1", { at: 24 }), task("t2", { at: 48 }), task("t3", { at: 72 })]),
      NOW,
    );
    expect(scope.rows.map((r) => r.taskId)).toEqual(["t2"]);
    expect(scope.vacated).toBe(1);
  });

  it("pre-checks task_already_started", () => {
    const scope = computeLeaveScope(
      request("Task", "t1"),
      group([task("t1", { at: 48, status: "Active" })]),
      NOW,
    );
    expect(scope.blockers).toEqual(["task_already_started"]);
    expect(scope.gatesPrecheckable).toBe(true);
  });

  it("pre-checks worker_already_checked_in", () => {
    const scope = computeLeaveScope(
      request("Task", "t1"),
      group([task("t1", { at: 48, checkinAt: "2026-09-08T07:55:00Z" })]),
      NOW,
    );
    expect(scope.blockers).toEqual(["worker_already_checked_in"]);
  });

  it("reports both blockers when both hold", () => {
    const scope = computeLeaveScope(
      request("Task", "t1"),
      group([
        task("t1", { at: -1, status: "Active", checkinAt: "2026-09-08T07:55:00Z" }),
      ]),
      NOW,
    );
    expect(scope.blockers).toEqual([
      "task_already_started",
      "worker_already_checked_in",
    ]);
  });

  // A refused approve mutates nothing, so the scope must not advertise a
  // vacated shift above a box saying the server will refuse.
  it("vacates nothing when a gate blocks the approve", () => {
    const scope = computeLeaveScope(
      request("Task", "t1"),
      group([task("t1", { at: 48, status: "Active" })]),
      NOW,
    );
    expect(scope.vacated).toBe(0);
    expect(scope.rows.map((r) => r.effect)).toEqual(["kept"]);
  });

  it("does not decrement staffing on a blocked approve", () => {
    const scope = computeLeaveScope(
      request("Task", "t1"),
      group([
        task("t1", { at: 48, required: 3, others: 1, checkinAt: "2026-09-08T07:00:00Z" }),
      ]),
      NOW,
    );
    expect(scope.rows[0].filledAfter).toBe(2);
  });

  it("has no blockers on a clean future pending task", () => {
    const scope = computeLeaveScope(
      request("Task", "t1"),
      group([task("t1", { at: 48 })]),
      NOW,
    );
    expect(scope.blockers).toEqual([]);
  });

  it("is unresolved when the requested task is not in the group", () => {
    const scope = computeLeaveScope(
      request("Task", "missing"),
      group([task("t1", { at: 48 })]),
      NOW,
    );
    expect(scope.resolved).toBe(false);
  });
});
