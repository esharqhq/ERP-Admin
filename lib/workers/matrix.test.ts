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
    hideUnbooked: false,
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

describe("buildMatrixWeek — demand and open shifts", () => {
  it("totals assigned and required across every task of the day", () => {
    const g = group();
    g.tasks[0].requiredWorkerCount = 3;
    const m = build({ groups: [g] });
    expect(m.demand[0]).toMatchObject({ assigned: 1, required: 3, taskCount: 1 });
  });

  /*
    A task nobody is on produces NO attendance row, so it is invisible to all
    seven reads. This is the whole reason the groups read exists.
  */
  it("finds a task with nobody on it, which attendance cannot see", () => {
    const g = group();
    g.tasks[0].workers = [];
    const m = build({ groups: [g], attendance: EMPTY_WEEK });
    expect(m.openShifts[0]).toBe(1);
    expect(m.demand[0]).toMatchObject({ assigned: 0, required: 1 });
  });

  it("ignores a task somebody has already left", () => {
    const g = group();
    g.tasks[0].workers = [
      { ...g.tasks[0].workers[0], outcome: "Removed" },
    ];
    expect(build({ groups: [g] }).openShifts[0]).toBe(1);
  });

  it("leaves cancelled and completed tasks out of demand", () => {
    for (const status of ["Cancelled", "Completed"]) {
      const g = group();
      g.tasks[0].status = status;
      const m = build({ groups: [g] });
      expect(m.demand[0].taskCount, status).toBe(0);
      expect(m.openShifts[0], status).toBe(0);
    }
  });

  /* The endpoint is undated and returns every group ever created. */
  it("drops tasks outside the week on screen", () => {
    const g = group();
    g.tasks[0].scheduledDate = "2026-07-01";
    expect(build({ groups: [g] }).demand[0].taskCount).toBe(0);
  });

  it("spans the day from the earliest start to the latest deadline", () => {
    const g = group();
    g.tasks.push({
      ...g.tasks[0],
      id: "t2",
      scheduledAt: "2026-08-31T06:00:00",
      deadline: "2026-08-31T19:00:00",
    });
    expect(build({ groups: [g] }).demand[0].window).toBe("06:00–19:00");
  });

  it("names the property when the day has one, and counts them when it has more", () => {
    const g = group();
    expect(build({ groups: [g] }).demand[0]).toMatchObject({
      label: "Sonnenhof",
      propertyCount: 1,
    });
    g.tasks.push({ ...g.tasks[0], id: "t2", propertyName: "Arte Hotel" });
    expect(build({ groups: [g] }).demand[0]).toMatchObject({
      label: "",
      propertyCount: 2,
    });
  });
});

describe("buildMatrixWeek — open task candidates for the free-day assign flow", () => {
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

describe("buildMatrixWeek — hiding the unbooked", () => {
  const workers = [worker({ id: "w1" }), worker({ id: "w2" }), worker({ id: "w3" })];
  const attendance = WEEK.map((_, i) => (i === 0 ? [att({ workerId: "w2" })] : []));

  it("keeps everyone when the bar is off", () => {
    const m = buildMatrixWeek({
      workers,
      dayKeys: WEEK,
      attendance,
      groups: [],
      hideUnbooked: false,
    });
    expect(m.rows).toHaveLength(3);
    expect(m.hiddenCount).toBe(0);
  });

  it("drops the workless rows and says how many", () => {
    const m = buildMatrixWeek({
      workers,
      dayKeys: WEEK,
      attendance,
      groups: [],
      hideUnbooked: true,
    });
    expect(m.rows.map((r) => r.worker.id)).toEqual(["w2"]);
    expect(m.hiddenCount).toBe(2);
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
