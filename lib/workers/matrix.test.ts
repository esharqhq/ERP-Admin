import { describe, expect, it } from "vitest";
import type { AttendanceRowDto } from "@/lib/types/attendance.types";
import type { TaskGroupDto } from "@/lib/types/task.types";
import type { WorkerRowDto } from "@/lib/types/worker.types";
import { buildMatrixWeek, chipKind, formatHours } from "@/lib/workers/matrix";

const WEEK = [
  "2026-08-31",
  "2026-09-01",
  "2026-09-02",
  "2026-09-03",
  "2026-09-04",
  "2026-09-05",
  "2026-09-06",
];

function worker(over: Partial<WorkerRowDto> = {}): WorkerRowDto {
  return {
    id: "w1",
    fullName: "Dilnoza Karimova",
    email: "d@uyer.app",
    phoneNumber: null,
    licenseExpiry: null,
    status: "Active",
    onboardingStatus: "Active",
    skills: ["General Worker"],
    rating: 4.8,
    experience: 3,
    completedTasks: 128,
    hasActiveContract: true,
    booked: true,
    createdAt: "2025-11-04T00:00:00Z",
    lastSeenAt: null,
    lastLoginAt: null,
    country: "Germany",
    city: "Berlin",
    agency: null,
    pendingAgency: null,
    pendingAgencyStatus: null,
    ...over,
  };
}

function att(over: Partial<AttendanceRowDto> = {}): AttendanceRowDto {
  return {
    taskId: "t1",
    taskGroupId: "g1",
    taskGroupTitle: "Housekeeping",
    propertyId: "p1",
    propertyName: "Sonnenhof",
    workerId: "w1",
    workerName: "Dilnoza Karimova",
    scheduledDate: "2026-08-31",
    scheduledAt: "2026-08-31T08:00:00",
    taskStatus: "Active",
    present: false,
    checkinAt: null,
    checkinLat: null,
    checkinLng: null,
    checkoutAt: null,
    submittedAt: null,
    outcome: "Pending",
    refusedCheckinCount: 0,
    lastRefusalReason: null,
    lastRefusalAt: null,
    lastRefusalDistanceMeters: null,
    ...over,
  };
}

function group(over: Partial<TaskGroupDto> = {}): TaskGroupDto {
  return {
    id: "g1",
    propertyId: "p1",
    ownerId: "o1",
    title: "Housekeeping",
    defaultStartTime: "08:00:00",
    defaultDeadline: "15:30:00",
    instructions: null,
    status: "Active",
    ratingFloor: 0,
    allowNewWorkers: true,
    eligibleProfessionIds: [],
    dates: [],
    tasks: [
      {
        id: "t1",
        groupId: "g1",
        propertyId: "p1",
        propertyName: "Sonnenhof",
        scheduledDate: "2026-08-31",
        scheduledAt: "2026-08-31T08:00:00",
        deadline: "2026-08-31T15:30:00",
        status: "Active",
        requiredWorkerCount: 1,
        startedAt: null,
        completedAt: null,
        workers: [
          {
            id: "tw1",
            taskId: "t1",
            workerId: "w1",
            workerName: "Dilnoza Karimova",
            outcome: "Pending",
            starRating: null,
            assignedAt: "2026-08-20T00:00:00Z",
            checkinAt: null,
            submittedAt: null,
            checkoutAt: null,
            checkinLat: null,
            checkinLng: null,
          },
        ],
      },
    ],
    createdAt: "2026-08-20T00:00:00Z",
    ...over,
  };
}

const EMPTY_WEEK = WEEK.map(() => [] as AttendanceRowDto[]);

function build(over: Partial<Parameters<typeof buildMatrixWeek>[0]> = {}) {
  return buildMatrixWeek({
    workers: [worker()],
    dayKeys: WEEK,
    attendance: EMPTY_WEEK,
    groups: [],
    ...over,
  });
}

describe("chipKind — the precedence", () => {
  const facts = { assigned: 1, required: 1 };

  it("cancelled outranks everything", () => {
    expect(
      chipKind(att({ taskStatus: "Cancelled", checkinAt: "x" }), 1, 2),
    ).toBe("cancelled");
  });

  it("a checkout reads as done", () => {
    expect(
      chipKind(att({ checkinAt: "2026-08-31T08:05:00", checkoutAt: "2026-08-31T15:30:00" }), facts.assigned, facts.required),
    ).toBe("done");
  });

  /*
    The rung that matters: a worker turned away twice and then let in IS there.
    Drawing them red would let a historical fact override a present one.
  */
  it("a check-in beats an earlier refusal", () => {
    expect(
      chipKind(
        att({ checkinAt: "2026-08-31T08:20:00", refusedCheckinCount: 2 }),
        1,
        1,
      ),
    ).toBe("present");
  });

  it("refusals with no check-in read as refused", () => {
    expect(chipKind(att({ refusedCheckinCount: 1 }), 1, 1)).toBe("refused");
  });

  it("short-staffed only once nothing has happened", () => {
    expect(chipKind(att(), 1, 2)).toBe("short");
    // …and never over a refusal, which is about this worker.
    expect(chipKind(att({ refusedCheckinCount: 1 }), 1, 2)).toBe("refused");
  });

  it("falls through to the quiet default", () => {
    expect(chipKind(att(), 1, 1)).toBe("scheduled");
  });
});

describe("buildMatrixWeek — columns", () => {
  it("counts the platform's bookings and refusals per day", () => {
    const attendance = WEEK.map((_, i) =>
      i === 1
        ? [att({ workerId: "w1" }), att({ workerId: "w9", refusedCheckinCount: 2 })]
        : [],
    );
    const m = build({ attendance });
    expect(m.days[1].booked).toBe(2);
    expect(m.days[1].refused).toBe(1);
  });

  it("does not count a refusal that was followed by a check-in", () => {
    const attendance = WEEK.map((_, i) =>
      i === 0 ? [att({ refusedCheckinCount: 3, checkinAt: "2026-08-31T09:00:00" })] : [],
    );
    expect(build({ attendance }).days[0].refused).toBe(0);
  });

  /* Seven independent reads: a failure is one column wide, never the grid. */
  it("marks only the day whose read failed", () => {
    const attendance: (AttendanceRowDto[] | null)[] = WEEK.map(() => []);
    attendance[3] = null;
    const m = build({ attendance });
    expect(m.days.map((d) => d.failed)).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
  });
});

describe("buildMatrixWeek — open task candidates for the free-day assign flow", () => {
  /*
    A task nobody is on produces NO attendance row, so it is invisible to all
    seven reads. This is the whole reason the groups read exists. (Moved here
    from the now-deleted "open shifts" describe block — reading-A's own
    open-shifts count is gone, but the underlying `indexTasks` assigned-count
    behaviour this exercises is still exactly what feeds this list.)
  */
  it("finds a task with nobody on it, which attendance cannot see", () => {
    const g = group();
    g.tasks[0].workers = [];
    const m = build({ groups: [g], attendance: EMPTY_WEEK });
    expect(m.openTasksByDay[0]).toMatchObject([
      { taskId: "t1", assigned: 0, required: 1 },
    ]);
  });

  it("ignores a task somebody has already left", () => {
    const g = group();
    g.tasks[0].workers = [
      { ...g.tasks[0].workers[0], outcome: "Removed" },
    ];
    expect(build({ groups: [g] }).openTasksByDay[0]).toMatchObject([
      { taskId: "t1", assigned: 0, required: 1 },
    ]);
  });

  it("lists a task that still wants more workers", () => {
    const g = group();
    g.tasks[0].requiredWorkerCount = 2;
    const m = build({ groups: [g] });
    expect(m.openTasksByDay[0]).toMatchObject([
      {
        taskId: "t1",
        groupId: "g1",
        from: "08:00",
        to: "15:30",
        propertyName: "Sonnenhof",
        taskTitle: "Housekeeping",
        assigned: 1,
        required: 2,
      },
    ]);
  });

  it("excludes a task that is already fully staffed", () => {
    const g = group(); // requiredWorkerCount: 1, one worker already assigned
    expect(build({ groups: [g] }).openTasksByDay[0]).toEqual([]);
  });

  it("excludes cancelled and completed tasks even if short", () => {
    for (const status of ["Cancelled", "Completed"]) {
      const g = group();
      g.tasks[0].status = status;
      g.tasks[0].requiredWorkerCount = 2;
      expect(build({ groups: [g] }).openTasksByDay[0], status).toEqual([]);
    }
  });

  it("orders same-day candidates by start time", () => {
    const g = group();
    g.tasks[0].requiredWorkerCount = 2;
    g.tasks.push({
      ...g.tasks[0],
      id: "t2",
      scheduledAt: "2026-08-31T06:00:00",
    });
    const candidates = build({ groups: [g] }).openTasksByDay[0];
    expect(candidates.map((c) => c.taskId)).toEqual(["t2", "t1"]);
  });

  it("drops candidates outside the week on screen — the endpoint is undated", () => {
    const g = group();
    g.tasks[0].scheduledDate = "2026-07-01";
    g.tasks[0].requiredWorkerCount = 2;
    expect(build({ groups: [g] }).openTasksByDay[0]).toEqual([]);
  });
});

describe("buildMatrixWeek — rows", () => {
  it("puts a worker's chips in the day they belong to, sorted by start", () => {
    const attendance = WEEK.map((_, i) =>
      i === 0
        ? [
            att({ taskId: "t2", scheduledAt: "2026-08-31T16:00:00" }),
            att({ taskId: "t1", scheduledAt: "2026-08-31T08:00:00" }),
          ]
        : [],
    );
    const cells = build({ attendance }).rows[0].cells;
    expect(cells[0].chips.map((c) => c.from)).toEqual(["08:00", "16:00"]);
    expect(cells[1].chips).toEqual([]);
  });

  it("gives a worker with nothing booked seven empty cells", () => {
    const m = build();
    expect(m.rows[0].cells).toHaveLength(7);
    expect(m.rows[0].taskCount).toBe(0);
    expect(m.rows[0].hours).toBeNull();
  });

  it("totals the hours it can and counts the ones it cannot", () => {
    const g = group();
    g.tasks.push({ ...g.tasks[0], id: "t2", deadline: null });
    const attendance = WEEK.map((_, i) =>
      i === 0 ? [att({ taskId: "t1" }), att({ taskId: "t2" })] : [],
    );
    const row = build({ groups: [g], attendance }).rows[0];
    expect(row.hours).toBeCloseTo(7.5); // 08:00 → 15:30
    expect(row.untimedCount).toBe(1);
    expect(row.taskCount).toBe(2);
  });

  it("carries the staffing fraction only when more than one worker is wanted", () => {
    const g = group();
    const attendance = WEEK.map((_, i) => (i === 0 ? [att()] : []));
    expect(build({ groups: [g], attendance }).rows[0].cells[0].chips[0].staffing).toBeNull();
    g.tasks[0].requiredWorkerCount = 2;
    expect(build({ groups: [g], attendance }).rows[0].cells[0].chips[0].staffing).toEqual({
      assigned: 1,
      required: 2,
    });
  });

  it("keeps a refusal's distance, and tolerates a refusal without one", () => {
    const attendance = WEEK.map((_, i) =>
      i === 0
        ? [
            att({
              refusedCheckinCount: 2,
              lastRefusalReason: "OutsideGeofence",
              lastRefusalDistanceMeters: 142.3,
            }),
            att({
              taskId: "t2",
              refusedCheckinCount: 1,
              lastRefusalReason: "GpsRequired",
            }),
          ]
        : [],
    );
    const chips = build({ attendance }).rows[0].cells[0].chips;
    expect(chips[0]).toMatchObject({
      kind: "refused",
      refusedDistanceMeters: 142.3,
      refusedReason: "OutsideGeofence",
    });
    expect(chips[1]).toMatchObject({ kind: "refused", refusedDistanceMeters: null });
  });
});

describe("buildMatrixWeek — row order", () => {
  /*
    Adapted from the deleted "hiding the unbooked" describe block: the same
    fixture (three workers, one booked) once proved a worker with no booking
    could be filtered out; now it proves the opposite on purpose — nobody is
    ever dropped, matching the design's own "no hidden-worker notice".
  */
  it("shows every worker the Table's filters matched — nobody hidden", () => {
    const workers = [worker({ id: "w1" }), worker({ id: "w2" }), worker({ id: "w3" })];
    const attendance = WEEK.map((_, i) => (i === 0 ? [att({ workerId: "w2" })] : []));
    const m = buildMatrixWeek({ workers, dayKeys: WEEK, attendance, groups: [] });
    expect(m.rows).toHaveLength(3);
  });
});

describe("formatHours", () => {
  it("reads hours as clock time, not as decimals", () => {
    expect(formatHours(38.5)).toBe("38:30");
    expect(formatHours(6)).toBe("6:00");
    expect(formatHours(7.25)).toBe("7:15");
  });

  it("never prints a sixtieth minute", () => {
    expect(formatHours(5.9999)).toBe("6:00");
  });
});
