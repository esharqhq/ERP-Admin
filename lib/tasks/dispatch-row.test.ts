import { describe, expect, it } from "vitest";
import {
  IMMINENT_HOURS,
  crewState,
  durationHours,
  hoursUntil,
  indexGroupFacts,
  imminentUnstaffed,
  propertyHue,
  rowStaffing,
} from "@/lib/tasks/dispatch-row";
import type { TaskItemDto } from "@/lib/types/task.types";

const NOW = Date.UTC(2026, 8, 9, 12, 0, 0);
const HOUR = 3_600_000;

function task(over: Partial<TaskItemDto> = {}): TaskItemDto {
  return {
    id: "t-1",
    propertyId: "p-1",
    scheduledDate: "2026-09-09",
    scheduledAt: new Date(NOW + 3 * HOUR).toISOString(),
    status: "Pending",
    requiredWorkerCount: 1,
    workers: [],
    ...over,
  } as TaskItemDto;
}

function w(outcome = "Pending", checkinAt: string | null = null) {
  return { workerId: "w", outcome, checkinAt } as never;
}

describe("hoursUntil", () => {
  it("truncates rather than rounds, so it never overstates the time left", () => {
    const at = new Date(NOW + 3 * HOUR + 50 * 60_000).toISOString();
    expect(hoursUntil(at, NOW)).toBe(3);
  });

  it("is negative for a task that already started", () => {
    expect(hoursUntil(new Date(NOW - 2 * HOUR).toISOString(), NOW)).toBe(-2);
  });

  it("is zero inside the starting hour", () => {
    expect(hoursUntil(new Date(NOW + 30 * 60_000).toISOString(), NOW)).toBe(0);
  });

  it("is null before the clock is known", () => {
    // useClock() is 0 on the server snapshot.
    expect(hoursUntil(new Date(NOW).toISOString(), 0)).toBeNull();
  });

  it("is null for a missing timestamp", () => {
    expect(hoursUntil(null, NOW)).toBeNull();
  });

  it("is null for an unparseable timestamp", () => {
    expect(hoursUntil("not a date", NOW)).toBeNull();
  });
});

describe("imminentUnstaffed", () => {
  it("counts an open under-staffed task inside the window", () => {
    expect(imminentUnstaffed([task()], NOW)).toBe(1);
  });

  it("counts a task that has already started — worse, not better", () => {
    const t = task({ scheduledAt: new Date(NOW - 5 * HOUR).toISOString() });
    expect(imminentUnstaffed([t], NOW)).toBe(1);
  });

  it("ignores a fully crewed task, however soon it starts", () => {
    const t = task({ requiredWorkerCount: 1, workers: [w()] });
    expect(imminentUnstaffed([t], NOW)).toBe(0);
  });

  it("counts a partly crewed task", () => {
    const t = task({ requiredWorkerCount: 3, workers: [w()] });
    expect(imminentUnstaffed([t], NOW)).toBe(1);
  });

  it("counts a task whose only worker was removed", () => {
    const t = task({ workers: [w("Removed")] });
    expect(imminentUnstaffed([t], NOW)).toBe(1);
  });

  it("ignores a closed task", () => {
    expect(imminentUnstaffed([task({ status: "Cancelled" })], NOW)).toBe(0);
    expect(imminentUnstaffed([task({ status: "Done" })], NOW)).toBe(0);
  });

  it("ignores a task beyond the window", () => {
    const t = task({
      scheduledAt: new Date(NOW + (IMMINENT_HOURS + 1) * HOUR).toISOString(),
    });
    expect(imminentUnstaffed([t], NOW)).toBe(0);
  });

  it("excludes the boundary — 24 h away is not inside 24 h", () => {
    const t = task({
      scheduledAt: new Date(NOW + IMMINENT_HOURS * HOUR).toISOString(),
    });
    expect(imminentUnstaffed([t], NOW)).toBe(0);
  });

  it("is zero before the clock is known, rather than counting everything", () => {
    expect(imminentUnstaffed([task(), task()], 0)).toBe(0);
  });

  it("is zero for an empty list", () => {
    expect(imminentUnstaffed([], NOW)).toBe(0);
  });
});

describe("propertyHue", () => {
  it("is stable for the same id", () => {
    expect(propertyHue("abc")).toBe(propertyHue("abc"));
  });

  it("differs between two ids", () => {
    expect(propertyHue("abc")).not.toBe(propertyHue("abd"));
  });

  it("always yields a legible hsl triple", () => {
    for (const id of ["", "a", "p-1", "9f3c21aa-0000-0000-0000-000000000001"]) {
      expect(propertyHue(id)).toMatch(/^hsl\(\d{1,3} 58% 45%\)$/);
    }
  });
});

describe("rowStaffing", () => {
  it("reads a bare task as fully short", () => {
    expect(rowStaffing(task({ requiredWorkerCount: 3 }))).toEqual({
      filled: 0,
      required: 3,
      gap: 3,
      covered: false,
    });
  });

  it("counts only active bodies", () => {
    const t = task({ requiredWorkerCount: 3, workers: [w(), w("Removed")] });
    expect(rowStaffing(t)).toEqual({ filled: 1, required: 3, gap: 2, covered: false });
  });

  it("reads an exact crew as covered", () => {
    const t = task({ requiredWorkerCount: 1, workers: [w()] });
    expect(rowStaffing(t).covered).toBe(true);
  });

  it("floors the gap at zero when over-staffed, and still reads as covered", () => {
    const t = task({ requiredWorkerCount: 1, workers: [w(), w()] });
    expect(rowStaffing(t)).toEqual({ filled: 2, required: 1, gap: 0, covered: true });
  });
});

describe("crewState", () => {
  it("reads a checked-in worker", () => {
    expect(crewState({ outcome: "Pending", checkinAt: "2026-09-09T08:02:00Z" })).toBe(
      "checkedIn",
    );
  });

  it("reads an assigned worker who has not arrived", () => {
    expect(crewState({ outcome: "Pending", checkinAt: null })).toBe("assigned");
  });

  it.each(["Removed", "Cancelled", "NoShow", "removed", "NOSHOW"])(
    "reads %s as vacated",
    (outcome) => {
      expect(crewState({ outcome, checkinAt: null })).toBe("vacated");
    },
  );

  it("reads vacated even when the worker had checked in — the outcome wins", () => {
    expect(
      crewState({ outcome: "NoShow", checkinAt: "2026-09-09T08:00:00Z" }),
    ).toBe("vacated");
  });

  it("treats a missing outcome as assigned rather than throwing", () => {
    expect(crewState({ outcome: "", checkinAt: null })).toBe("assigned");
  });
});

describe("durationHours", () => {
  it("rounds a clean span to whole hours", () => {
    expect(
      durationHours("2026-09-09T08:00:00Z", "2026-09-09T14:00:00Z"),
    ).toBe(6);
  });

  it("rounds a ragged span to the nearest hour", () => {
    expect(
      durationHours("2026-09-09T08:00:00Z", "2026-09-09T14:40:00Z"),
    ).toBe(7);
  });

  it("is null without a deadline — most tasks have none", () => {
    expect(durationHours("2026-09-09T08:00:00Z", null)).toBeNull();
  });

  it("is null when the deadline is not after the start", () => {
    expect(
      durationHours("2026-09-09T08:00:00Z", "2026-09-09T08:00:00Z"),
    ).toBeNull();
    expect(
      durationHours("2026-09-09T08:00:00Z", "2026-09-09T07:00:00Z"),
    ).toBeNull();
  });

  it("is null for an unparseable bound", () => {
    expect(durationHours("nope", "2026-09-09T14:00:00Z")).toBeNull();
  });
});

describe("indexGroupFacts", () => {
  const group = (over = {}) => ({
    id: "g-1",
    title: "Housekeeping",
    ratingFloor: 3.5,
    allowNewWorkers: false,
    eligibleProfessionIds: ["prof-1"],
    ...over,
  });

  it("indexes by group id", () => {
    const map = indexGroupFacts([group(), group({ id: "g-2", title: "Turnover" })]);
    expect(map.get("g-1")?.title).toBe("Housekeeping");
    expect(map.get("g-2")?.title).toBe("Turnover");
  });

  it("carries the eligibility facts the task row has no source for", () => {
    expect(indexGroupFacts([group()]).get("g-1")).toEqual({
      title: "Housekeeping",
      ratingFloor: 3.5,
      allowNewWorkers: false,
      eligibleProfessionIds: ["prof-1"],
    });
  });

  it("reads a null title as absent — it is optional server-side", () => {
    expect(indexGroupFacts([group({ title: null })]).get("g-1")?.title).toBeNull();
  });

  it("reads a whitespace-only title as absent rather than drawing a blank line", () => {
    expect(indexGroupFacts([group({ title: "   " })]).get("g-1")?.title).toBeNull();
  });

  it("trims a title's own padding", () => {
    expect(indexGroupFacts([group({ title: " Housekeeping " })]).get("g-1")?.title).toBe(
      "Housekeeping",
    );
  });

  it("survives a missing profession list", () => {
    const map = indexGroupFacts([
      group({ eligibleProfessionIds: undefined }) as never,
    ]);
    expect(map.get("g-1")?.eligibleProfessionIds).toEqual([]);
  });

  it("is empty for an empty list", () => {
    expect(indexGroupFacts([]).size).toBe(0);
  });
});
