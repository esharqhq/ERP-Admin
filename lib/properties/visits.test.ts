import { describe, expect, it } from "vitest";
import { countVisitsSince, newestPhotoAt, upcomingVisits } from "@/lib/properties/visits";
import type { PropertyMediaDto } from "@/lib/types/property.types";
import type { TaskGroupDto, TaskItemDto, TaskWorkerDto } from "@/lib/types/task.types";

function worker(over: Partial<TaskWorkerDto> = {}): TaskWorkerDto {
  return { workerId: "w1", fullName: "Ali", outcome: "Pending", ...over } as TaskWorkerDto;
}

function task(over: Partial<TaskItemDto> = {}): TaskItemDto {
  return {
    id: "t1",
    groupId: "g1",
    propertyId: "p1",
    propertyName: null,
    scheduledDate: "2026-09-03",
    scheduledAt: "2026-09-03T06:00:00Z",
    deadline: null,
    status: "Pending",
    requiredWorkerCount: 2,
    startedAt: null,
    completedAt: null,
    workers: [worker(), worker({ workerId: "w2" })],
    ...over,
  };
}

function group(tasks: TaskItemDto[], over: Partial<TaskGroupDto> = {}): TaskGroupDto {
  return {
    id: "g1",
    propertyId: "p1",
    ownerId: "o1",
    title: "Stairwell clean",
    defaultStartTime: "06:00:00",
    defaultDeadline: null,
    instructions: null,
    status: "Pending",
    ratingFloor: 0,
    allowNewWorkers: true,
    eligibleProfessionIds: [],
    dates: [],
    tasks,
    createdAt: "2026-08-01T00:00:00Z",
    ...over,
  };
}

const NOW = Date.parse("2026-09-01T00:00:00Z");

describe("upcomingVisits", () => {
  it("returns the tasks still ahead, soonest first", () => {
    const groups = [
      group([
        task({ id: "late", scheduledAt: "2026-09-05T06:00:00Z" }),
        task({ id: "soon", scheduledAt: "2026-09-02T06:00:00Z" }),
      ]),
    ];
    expect(upcomingVisits(groups, NOW).map((v) => v.task.id)).toEqual(["soon", "late"]);
  });

  it("drops a task that has already happened", () => {
    const groups = [group([task({ scheduledAt: "2026-08-30T06:00:00Z" })])];
    expect(upcomingVisits(groups, NOW)).toEqual([]);
  });

  // A cancelled or finished task is not a visit anybody is waiting for.
  it("drops cancelled and done tasks even when they are ahead", () => {
    const groups = [
      group([
        task({ id: "c", status: "Cancelled", scheduledAt: "2026-09-04T06:00:00Z" }),
        task({ id: "d", status: "Done", scheduledAt: "2026-09-04T06:00:00Z" }),
        task({ id: "p", status: "Pending", scheduledAt: "2026-09-04T06:00:00Z" }),
      ]),
    ];
    expect(upcomingVisits(groups, NOW).map((v) => v.task.id)).toEqual(["p"]);
  });

  it("carries the group's title, since a task has none of its own", () => {
    const groups = [group([task()], { title: "Bin room deep clean" })];
    expect(upcomingVisits(groups, NOW)[0].title).toBe("Bin room deep clean");
  });

  /**
   * `requiredWorkerCount`, never `workers.length` alone: a task needing two
   * bodies with one booked is still short, and the side column has to say so.
   */
  it("marks a task short of its required count as unassigned", () => {
    const groups = [
      group([
        task({ id: "full", requiredWorkerCount: 2 }),
        task({ id: "short", requiredWorkerCount: 3 }),
        task({ id: "empty", requiredWorkerCount: 1, workers: [] }),
      ]),
    ];
    const byId = new Map(upcomingVisits(groups, NOW).map((v) => [v.task.id, v.unassigned]));
    expect(byId.get("full")).toBe(false);
    expect(byId.get("short")).toBe(true);
    expect(byId.get("empty")).toBe(true);
  });

  /**
   * A withdrawn worker still has a row. Counting it would report a task as
   * staffed that nobody is going to turn up to — the same rule `activeWorkers`
   * enforces everywhere else.
   */
  it("does not count a removed worker towards the requirement", () => {
    const groups = [
      group([
        task({
          requiredWorkerCount: 2,
          workers: [worker(), worker({ workerId: "w2", outcome: "Removed" })],
        }),
      ]),
    ];
    expect(upcomingVisits(groups, NOW)[0].unassigned).toBe(true);
  });

  it("flattens across groups", () => {
    const groups = [
      group([task({ id: "a", scheduledAt: "2026-09-04T06:00:00Z" })], { id: "g1" }),
      group([task({ id: "b", scheduledAt: "2026-09-02T06:00:00Z" })], { id: "g2" }),
    ];
    expect(upcomingVisits(groups, NOW).map((v) => v.task.id)).toEqual(["b", "a"]);
  });

  it("is empty with no clock, rather than ordering against 1970", () => {
    expect(upcomingVisits([group([task()])], 0)).toEqual([]);
  });
});

describe("countVisitsSince", () => {
  it("counts tasks inside the window", () => {
    const groups = [
      group([
        task({ scheduledAt: "2026-08-20T06:00:00Z" }),
        task({ scheduledAt: "2026-08-25T06:00:00Z" }),
        // Outside a 90-day window ending at NOW.
        task({ scheduledAt: "2025-01-01T06:00:00Z" }),
      ]),
    ];
    expect(countVisitsSince(groups, NOW, 90)).toBe(2);
  });

  // The label reads "Visits · 90 days" — work that was called off was not a visit.
  it("excludes cancelled tasks", () => {
    const groups = [
      group([
        task({ scheduledAt: "2026-08-20T06:00:00Z", status: "Cancelled" }),
        task({ scheduledAt: "2026-08-21T06:00:00Z", status: "Done" }),
      ]),
    ];
    expect(countVisitsSince(groups, NOW, 90)).toBe(1);
  });

  it("counts future tasks inside the window too", () => {
    const groups = [group([task({ scheduledAt: "2026-09-03T06:00:00Z" })])];
    expect(countVisitsSince(groups, NOW, 90)).toBe(1);
  });

  it("is zero with no clock", () => {
    expect(countVisitsSince([group([task()])], 0, 90)).toBe(0);
  });
});

describe("newestPhotoAt", () => {
  const photo = (createdAt: string) => ({ createdAt }) as PropertyMediaDto;

  it("returns the most recent upload whatever the array order", () => {
    expect(
      newestPhotoAt([photo("2026-01-14T00:00:00Z"), photo("2026-08-12T00:00:00Z")]),
    ).toBe("2026-08-12T00:00:00Z");
  });

  it("returns null for an empty gallery", () => {
    expect(newestPhotoAt([])).toBeNull();
  });

  /**
   * ⚠ `null` means the read did not carry `?withMedia=true`. Returning a date
   * would let a caller conclude the gallery is stale when it was never fetched.
   */
  it("returns null for a gallery that was never fetched", () => {
    expect(newestPhotoAt(null)).toBeNull();
  });
});
