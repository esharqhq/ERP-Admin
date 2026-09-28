import { describe, expect, it } from "vitest";
import { registerSummary } from "@/lib/tasks/register/summary";
import type { TaskItemDto } from "@/lib/types/task.types";

const NOW = new Date(2026, 8, 27, 10, 0);
const at = (d: number, h: number) => new Date(2026, 8, d, h, 0).toISOString();
const t = (over: Partial<TaskItemDto>) => ({
  id: Math.random().toString(), groupId: "g", propertyId: "p", propertyName: "P", scheduledDate: "",
  scheduledAt: at(27, 12), deadline: at(27, 18), status: "Pending", requiredWorkerCount: 2,
  startedAt: null, completedAt: null, closureReason: null, supervisorWorkerId: null, workSummary: null,
  workers: [], ...over,
}) as TaskItemDto;
const w = { id: "tw", taskId: "t", workerId: "w", workerName: "A", outcome: "Pending", starRating: null,
  assignedAt: "", checkinAt: null, submittedAt: null, checkoutAt: null, checkinLat: null, checkinLng: null, checkinDoor: null };

describe("registerSummary", () => {
  it("counts the four tiles", () => {
    const s = registerSummary([
      t({}),                                                     // unstaffed today
      t({ scheduledAt: at(29, 9), deadline: at(29, 15), workers: [w] }), // short, next 7
      t({ scheduledAt: at(26, 9), deadline: at(26, 15), status: "CheckedIn" }), // overdue
      t({ scheduledAt: at(30, 9), deadline: at(30, 15), requiredWorkerCount: 1, workers: [w] }), // planned, full
      t({ scheduledAt: at(20, 9), deadline: at(20, 15), status: "Done" }), // ignored
    ], NOW);
    // next7 = today, the 29th and the 30th; yesterday's overdue day is outside it.
    expect(s).toEqual({ unstaffedToday: 1, short: 2, overdue: 1, next7: 3 });
  });
});
