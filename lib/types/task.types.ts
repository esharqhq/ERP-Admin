// ── Admin Task domain types (mirror GermanyERP.Domain/Models/DTOs/Tasks/TaskDtos.cs) ──
// Backend serializes enums as their string NAME (JsonStringEnumConverter is registered
// globally in Program.cs). Compare case-insensitively in the UI via normalizeStatus().

export type TaskItemStatusName =
  | "Pending"
  | "Active"
  | "Review"
  | "Done"
  | "Cancelled";

export type TaskGroupStatusName = "Pending" | "Active" | "Done" | "Cancelled";

export type TaskWorkerOutcomeName =
  | "Pending"
  | "Completed"
  | "NoShow"
  | "Removed"
  | "Cancelled";

export interface TaskMediaDto {
  id: string;
  taskId: string;
  uploaderId: string;
  type: string;
  url: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface TaskWorkerDto {
  id: string;
  taskId: string;
  workerId: string;
  workerName: string | null;
  outcome: string; // TaskWorkerOutcomeName
  starRating: number | null;
  assignedAt: string;
  checkinAt: string | null;
  submittedAt: string | null;
  checkoutAt: string | null;
  checkinLat: number | null;
  checkinLng: number | null;
}

export interface TaskGroupDateDto {
  id: string;
  scheduledDate: string; // "yyyy-MM-dd"
}

export interface TaskItemDto {
  id: string;
  groupId: string;
  propertyId: string;
  propertyName: string | null;
  scheduledDate: string; // "yyyy-MM-dd"
  scheduledAt: string;
  deadline: string | null;
  status: string; // TaskItemStatusName
  requiredWorkerCount: number;
  startedAt: string | null;
  completedAt: string | null;
  workers: TaskWorkerDto[];
  media?: TaskMediaDto[] | null;
  conversationId?: string | null;
}

export interface TaskGroupDto {
  id: string;
  propertyId: string;
  ownerId: string;
  title: string | null;
  defaultStartTime: string; // "HH:mm:ss"
  defaultDeadline: string | null;
  instructions: string | null;
  status: string; // TaskGroupStatusName
  ratingFloor: number;
  allowNewWorkers: boolean;
  eligibleProfessionIds: string[];
  dates: TaskGroupDateDto[];
  tasks: TaskItemDto[];
  createdAt: string;
}

/**
 * Body of `POST /api/tasks/admin/groups` (`task_group:create_any`, 110038) — and
 * of the owner-side `POST /api/tasks/groups`. There is deliberately no admin
 * shape and no `ownerUserId`: a `propertyId` already implies its owner.
 *
 * The five optional fields are unused by the walk-in form; they are typed so the
 * next consumer does not have to re-derive the contract.
 */
export interface CreateTaskGroupRequest {
  propertyId: string;
  title: string;
  /** `"HH:mm:ss"` — a bare `"HH:mm"` is not accepted. */
  defaultStartTime: string;
  defaultWorkerLimit: number;
  /** Explicit dates, `"YYYY-MM-DD"`, **not** a range. One task per date. */
  dates: string[];
  defaultDeadline?: string | null;
  instructions?: string | null;
  /** Not shown to workers. */
  internalNote?: string | null;
  /** `0.0`–`5.0`; omitted leaves it wide open. */
  ratingFloor?: number;
  /** Omitted or empty means any profession. */
  eligibleProfessionIds?: string[];
  /** Defaults to `true` server-side. */
  allowNewWorkers?: boolean;
}

/** Response of rate / outcome-override (mirror WorkerRatingDto). */
export interface WorkerRatingDto {
  workerId: string;
  displayRating: number | null;
  isNew: boolean;
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  label: string;
  calculatedAt: string;
}

export interface SubmitTaskWorkerStarRequest {
  stars: number; // 1.0 – 5.0
}

export interface OverrideTaskWorkerOutcomeRequest {
  outcome: string; // TaskWorkerOutcomeName (sent as enum name string)
}

/** Filterable task-group statuses for the admin Tasks list (plus "all"). */
export const TASK_GROUP_STATUS_FILTERS = [
  "all",
  "Pending",
  "Active",
  "Done",
  "Cancelled",
] as const;
export type TaskGroupStatusFilter = (typeof TASK_GROUP_STATUS_FILTERS)[number];

export const TASK_WORKER_OUTCOMES: TaskWorkerOutcomeName[] = [
  "Pending",
  "Completed",
  "NoShow",
  "Removed",
  "Cancelled",
];

/** Case-insensitive status normaliser (backend may send any casing). */
export function normalizeStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase();
}
