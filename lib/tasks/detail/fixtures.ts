import type {
  TaskComplaintDto,
  TaskGroupDto,
  TaskItemDto,
  TaskWorkerDto,
} from "@/lib/types/task.types";

/**
 * Test-only builders for `lib/tasks/detail/*.test.ts`. Not a `.test.ts`, so
 * vitest never runs it; no app code imports it.
 *
 * ⚠ Times are written WITHOUT a zone ("2026-10-05T08:00:00"), so they parse as
 * LOCAL time and every assertion about "08:00" or "minutes past start" holds in
 * whatever zone the test runner uses. The server sends `…Z`; the app renders in
 * local time, so local fixtures test what the admin sees.
 */
export const at = (local: string): number => new Date(local).getTime();

export function worker(over: Partial<TaskWorkerDto> = {}): TaskWorkerDto {
  return {
    id: "tw-1",
    taskId: "t-1",
    workerId: "w-1aaaaaaaaaaaa",
    workerName: "Sardor Aliyev",
    outcome: "Pending",
    starRating: null,
    assignedAt: "2026-09-24T10:00:00",
    checkinAt: null,
    submittedAt: null,
    checkoutAt: null,
    checkinLat: null,
    checkinLng: null,
    checkinDoor: null,
    ...over,
  };
}

export function day(over: Partial<TaskItemDto> = {}): TaskItemDto {
  return {
    id: "t-1",
    groupId: "g-1",
    propertyId: "p-1",
    propertyName: "Torstraße 88",
    scheduledDate: "2026-10-05",
    scheduledAt: "2026-10-05T08:00:00",
    deadline: "2026-10-05T12:00:00",
    status: "Pending",
    requiredWorkerCount: 3,
    startedAt: null,
    completedAt: null,
    closureReason: null,
    supervisorWorkerId: null,
    workSummary: null,
    workers: [],
    ...over,
  };
}

export function booking(over: Partial<TaskGroupDto> = {}): TaskGroupDto {
  return {
    id: "g-1",
    propertyId: "p-1",
    ownerId: "o-1",
    title: "Office cleaning · Torstraße 88",
    defaultStartTime: "08:00:00",
    defaultDeadline: "12:00:00",
    instructions: "Key box at the side entrance.",
    days: { total: 1, pending: 1, checkedIn: 0, inReview: 0, done: 0, cancelled: 0, rejected: 0 },
    ratingFloor: 4,
    allowNewWorkers: true,
    eligibleProfessionIds: [],
    dates: [],
    tasks: [day()],
    createdAt: "2026-09-24T10:12:00",
    kind: "Booking",
    ownerProvidesTools: true,
    addOnNote: null,
    cityId: null,
    ...over,
  };
}

export function complaint(over: Partial<TaskComplaintDto> = {}): TaskComplaintDto {
  return {
    id: "c-1",
    taskId: "t-1",
    raisedByOwnerUserId: "o-1",
    reason: "Kitchen floor left wet and sticky.",
    raisedAt: "2026-10-02T13:40:00",
    decision: "Open",
    decidedByAdminId: null,
    decidedAt: null,
    decisionNote: null,
    supportTicketId: null,
    photos: [],
    ...over,
  };
}
