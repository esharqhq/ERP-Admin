import { describe, expect, it } from "vitest";
import {
  flattenTaskRows,
  filterRowsByStatus,
  rowsInWeek,
  toLocalDateKey,
  workerSummary,
} from "@/lib/tasks/weekly-rows";
import type { TaskGroupDto } from "@/lib/types/task.types";

function worker(name: string | null, outcome = "assigned") {
  return {
    id: `w-${name}`,
    taskId: "t1",
    workerId: `id-${name}`,
    workerName: name,
    outcome,
    starRating: null,
    assignedAt: "2026-08-10T00:00:00Z",
    checkinAt: null,
    submittedAt: null,
    checkoutAt: null,
    checkinLat: null,
    checkinLng: null,
  };
}

const GROUP: TaskGroupDto = {
  id: "g1",
  propertyId: "p1",
  ownerId: "o1",
  title: "Weekly cleaning",
  defaultStartTime: "09:00:00",
  defaultDeadline: null,
  instructions: null,
  status: "Pending",
  ratingFloor: 0,
  allowNewWorkers: true,
  eligibleProfessionIds: [],
  dates: [],
  createdAt: "2026-08-01T00:00:00Z",
  tasks: [
    {
      id: "t1",
      groupId: "g1",
      propertyId: "p1",
      propertyName: null,
      scheduledDate: "2026-08-12",
      scheduledAt: "2026-08-12T09:00:00Z",
      deadline: null,
      status: "Pending",
      requiredWorkerCount: 2,
      startedAt: null,
      completedAt: null,
      workers: [worker("Ali"), worker("Bek")],
    },
    {
      id: "t2",
      groupId: "g1",
      propertyId: "p1",
      propertyName: null,
      scheduledDate: "2026-08-20",
      scheduledAt: "2026-08-20T09:00:00Z",
      deadline: null,
      status: "Done",
      requiredWorkerCount: 1,
      startedAt: null,
      completedAt: null,
      workers: [],
    },
  ],
};

describe("toLocalDateKey", () => {
  it("formats a local date without shifting it into another day", () => {
    // Built from local parts, never from toISOString(): a late-evening local
    // date in a positive-offset zone would otherwise land on tomorrow.
    expect(toLocalDateKey(new Date(2026, 7, 12, 23, 30))).toBe("2026-08-12");
  });

  it("pads single-digit months and days", () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("flattenTaskRows", () => {
  it("produces one row per task, carrying the group's title down", () => {
    const rows = flattenTaskRows([GROUP], { p1: "Villa Chilonzor" });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      taskId: "t1",
      groupTitle: "Weekly cleaning",
      propertyName: "Villa Chilonzor",
      scheduledDate: "2026-08-12",
      status: "Pending",
    });
  });

  it("prefers the task's own propertyName when the server sends one", () => {
    const g = {
      ...GROUP,
      tasks: [{ ...GROUP.tasks[0], propertyName: "From server" }],
    };
    expect(flattenTaskRows([g], { p1: "From map" })[0].propertyName).toBe("From server");
  });

  it("falls back to the lookup map when propertyName is empty, not just null", () => {
    // The admin create response is documented as returning "" here, so an empty
    // string must not win over a name we can actually resolve.
    const g = { ...GROUP, tasks: [{ ...GROUP.tasks[0], propertyName: "" }] };
    expect(flattenTaskRows([g], { p1: "Villa" })[0].propertyName).toBe("Villa");
  });

  it("sorts by scheduled date then time", () => {
    const rows = flattenTaskRows([GROUP], {});
    expect(rows.map((r) => r.scheduledDate)).toEqual(["2026-08-12", "2026-08-20"]);
  });

  it("survives a group whose tasks array is missing", () => {
    const g = { ...GROUP, tasks: undefined as unknown as TaskGroupDto["tasks"] };
    expect(flattenTaskRows([g], {})).toEqual([]);
  });

  it("keeps a null group title as an empty string rather than the word null", () => {
    const g = { ...GROUP, title: null };
    expect(flattenTaskRows([g], {})[0].groupTitle).toBe("");
  });
});

describe("rowsInWeek", () => {
  const rows = flattenTaskRows([GROUP], {});
  const week = [
    "2026-08-10",
    "2026-08-11",
    "2026-08-12",
    "2026-08-13",
    "2026-08-14",
    "2026-08-15",
    "2026-08-16",
  ];

  it("keeps only rows whose date is in the week", () => {
    expect(rowsInWeek(rows, week).map((r) => r.taskId)).toEqual(["t1"]);
  });

  it("includes the last day of the week", () => {
    // The whole reason this is a string comparison: an inclusive timestamp
    // bound set to Sunday 00:00 would drop every Sunday and never error.
    const sunday = [{ ...rows[0], scheduledDate: "2026-08-16" }];
    expect(rowsInWeek(sunday, week)).toHaveLength(1);
  });

  it("returns nothing for a week with no work", () => {
    expect(rowsInWeek(rows, ["2026-09-01"])).toEqual([]);
  });
});

describe("filterRowsByStatus", () => {
  const rows = flattenTaskRows([GROUP], {});

  it("returns every row for the all filter", () => {
    expect(filterRowsByStatus(rows, "all")).toHaveLength(2);
  });

  it("matches case-insensitively, because the server casing is not guaranteed", () => {
    expect(filterRowsByStatus(rows, "done").map((r) => r.taskId)).toEqual(["t2"]);
    expect(filterRowsByStatus(rows, "DONE").map((r) => r.taskId)).toEqual(["t2"]);
  });
});

describe("workerSummary", () => {
  const rows = flattenTaskRows([GROUP], {});

  it("names up to two workers", () => {
    expect(workerSummary(rows[0])).toEqual({ names: ["Ali", "Bek"], extra: 0 });
  });

  it("names two and counts the rest", () => {
    const row = { ...rows[0], workers: [worker("A"), worker("B"), worker("C")] };
    expect(workerSummary(row)).toEqual({ names: ["A", "B"], extra: 1 });
  });

  it("reports nobody for an unstaffed task", () => {
    // A real and common state — the owner booked the job and no worker has
    // taken it yet. Not an error.
    expect(workerSummary(rows[1])).toEqual({ names: [], extra: 0 });
  });

  it("ignores workers who vacated the task", () => {
    // removed / cancelled / noshow are not staffing, and the calendar already
    // excludes them from its per-cell count — the two views must agree.
    const row = {
      ...rows[0],
      workers: [worker("Ali"), worker("Gone", "removed"), worker("No", "noshow")],
    };
    expect(workerSummary(row)).toEqual({ names: ["Ali"], extra: 0 });
  });

  it("skips a worker with no name rather than rendering a blank", () => {
    const row = { ...rows[0], workers: [worker(null), worker("Ali")] };
    expect(workerSummary(row)).toEqual({ names: ["Ali"], extra: 0 });
  });
});
