import { describe, expect, it } from "vitest";
import { groupTasksByDay, isUrgentDay } from "@/lib/tasks/day-groups";
import type { TaskItemDto } from "@/lib/types/task.types";

let seq = 0;

/**
 * `staffed` mirrors `needsWorkers` — open (Pending/Active) with no active worker
 * is unstaffed. A `removed` outcome does not fill a slot, which is the one case
 * worth an explicit test.
 */
function task(scheduledDate: string, over: Partial<TaskItemDto> = {}): TaskItemDto {
  seq += 1;
  return {
    id: `task-${seq}`,
    groupId: "g1",
    propertyId: "p1",
    propertyName: "Sonnenhof",
    scheduledDate,
    scheduledAt: `${scheduledDate}T08:00:00Z`,
    deadline: null,
    status: "Pending",
    requiredWorkerCount: 1,
    workers: [],
    ...over,
  } as TaskItemDto;
}

function worker(outcome = "Pending") {
  return { id: "tw", taskId: "t", workerId: "w", outcome } as never;
}

const TODAY = "2026-09-09";

describe("groupTasksByDay", () => {
  it("returns nothing for an empty list", () => {
    expect(groupTasksByDay([], TODAY)).toEqual([]);
  });

  it("folds tasks on the same day into one group", () => {
    const groups = groupTasksByDay(
      [task(TODAY), task(TODAY), task(TODAY)],
      TODAY,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].tasks).toHaveLength(3);
  });

  it("orders groups soonest first, so an elapsed day leads", () => {
    const groups = groupTasksByDay(
      [task("2026-09-11"), task("2026-09-07"), task(TODAY)],
      TODAY,
    );
    expect(groups.map((g) => g.key)).toEqual([
      "2026-09-07",
      "2026-09-09",
      "2026-09-11",
    ]);
  });

  it("keeps the given order of tasks within a day", () => {
    const first = task(TODAY);
    const second = task(TODAY);
    const groups = groupTasksByDay([first, second], TODAY);
    expect(groups[0].tasks.map((t) => t.id)).toEqual([first.id, second.id]);
  });

  it("names each day's relation to today", () => {
    const groups = groupTasksByDay(
      [
        task("2026-09-07"),
        task(TODAY),
        task("2026-09-10"),
        task("2026-09-14"),
      ],
      TODAY,
    );
    expect(groups.map((g) => g.relation)).toEqual([
      "elapsed",
      "today",
      "tomorrow",
      "future",
    ]);
  });

  it("finds tomorrow across a month boundary", () => {
    const groups = groupTasksByDay([task("2026-10-01")], "2026-09-30");
    expect(groups[0].relation).toBe("tomorrow");
  });

  it("finds tomorrow across a year boundary", () => {
    const groups = groupTasksByDay([task("2027-01-01")], "2026-12-31");
    expect(groups[0].relation).toBe("tomorrow");
  });

  it("finds tomorrow across a leap day", () => {
    const groups = groupTasksByDay([task("2028-02-29")], "2028-02-28");
    expect(groups[0].relation).toBe("tomorrow");
  });

  it("treats every day as future before the clock is known", () => {
    // `useTodayKey()` is "" on the server snapshot — nothing may be marked urgent
    // off a placeholder date.
    const groups = groupTasksByDay([task("2026-09-07"), task(TODAY)], "");
    expect(groups.map((g) => g.relation)).toEqual(["future", "future"]);
  });

  it("counts unstaffed tasks per day", () => {
    const groups = groupTasksByDay(
      [
        task(TODAY),
        task(TODAY, { workers: [worker()] }),
        task(TODAY),
      ],
      TODAY,
    );
    expect(groups[0].unstaffed).toBe(2);
  });

  it("counts a task whose only worker was removed as unstaffed", () => {
    const groups = groupTasksByDay(
      [task(TODAY, { workers: [worker("Removed")] })],
      TODAY,
    );
    expect(groups[0].unstaffed).toBe(1);
  });

  it("does not count a closed task as unstaffed even with nobody on it", () => {
    const groups = groupTasksByDay(
      [task(TODAY, { status: "Cancelled" }), task(TODAY, { status: "Done" })],
      TODAY,
    );
    expect(groups[0].tasks).toHaveLength(2);
    expect(groups[0].unstaffed).toBe(0);
  });
});

describe("isUrgentDay", () => {
  const urgent = (date: string, tasks: TaskItemDto[]) =>
    isUrgentDay(groupTasksByDay(tasks, TODAY).find((g) => g.key === date)!);

  it("marks an elapsed day with an unstaffed task", () => {
    expect(urgent("2026-09-07", [task("2026-09-07")])).toBe(true);
  });

  it("marks today with an unstaffed task", () => {
    expect(urgent(TODAY, [task(TODAY)])).toBe(true);
  });

  it("does not mark a fully staffed today — urgency needs something to be urgent about", () => {
    expect(urgent(TODAY, [task(TODAY, { workers: [worker()] })])).toBe(false);
  });

  it("does not mark tomorrow, because urgency is time and not staffing", () => {
    expect(urgent("2026-09-10", [task("2026-09-10")])).toBe(false);
  });

  it("does not mark a future day", () => {
    expect(urgent("2026-09-20", [task("2026-09-20")])).toBe(false);
  });
});
