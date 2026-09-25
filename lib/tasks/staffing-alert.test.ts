import { describe, expect, it } from "vitest";
import { staffingAlert } from "@/lib/tasks/staffing-alert";
import type { TaskItemDto } from "@/lib/types/task.types";

function task(id: string, scheduledAt: string): TaskItemDto {
  return {
    id,
    groupId: `g-${id}`,
    propertyId: "p-1",
    propertyName: "Sonnenhof",
    scheduledDate: scheduledAt.slice(0, 10),
    scheduledAt,
    deadline: null,
    status: "Pending",
    requiredWorkerCount: 2,
    startedAt: null,
    completedAt: null,
    closureReason: null,
    supervisorWorkerId: null,
    workSummary: null,
    workers: [],
  } as TaskItemDto;
}

const A = task("a", "2026-09-26T20:00:00Z");
const B = task("b", "2026-09-26T14:00:00Z");
const C = task("c", "2026-09-27T08:00:00Z");

describe("staffingAlert", () => {
  it("takes its counts from the two server answers, not from the rows", () => {
    const alert = staffingAlert([A, B, C], [B], 5);
    expect(alert.within24h).toBe(3);
    expect(alert.within6h).toBe(1);
    expect(alert.within6to24h).toBe(2);
  });

  it("lists the soonest first — the server sends them furthest first", () => {
    const alert = staffingAlert([C, A, B], [B], 5);
    expect(alert.rows.map((r) => r.task.id)).toEqual(["b", "a", "c"]);
  });

  it("flags a row critical when the six-hour answer carries it", () => {
    const alert = staffingAlert([A, B], [B], 5);
    expect(alert.rows.find((r) => r.task.id === "b")?.critical).toBe(true);
    expect(alert.rows.find((r) => r.task.id === "a")?.critical).toBe(false);
  });

  it("keeps a critical day the 24-hour answer lacks — the two reads are not atomic", () => {
    const alert = staffingAlert([A], [B], 5);
    expect(alert.rows.map((r) => r.task.id)).toEqual(["b", "a"]);
    expect(alert.within24h).toBe(2);
  });

  it("cuts to the limit and says how many were left out", () => {
    const alert = staffingAlert([A, B, C], [], 2);
    expect(alert.rows.map((r) => r.task.id)).toEqual(["b", "a"]);
    expect(alert.hidden).toBe(1);
  });

  it("is empty when both answers are", () => {
    expect(staffingAlert([], [], 5)).toEqual({
      within24h: 0,
      within6h: 0,
      within6to24h: 0,
      rows: [],
      hidden: 0,
    });
  });
});
