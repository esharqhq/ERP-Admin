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
  scheduledDate: string; // "yyyy-MM-dd"
  scheduledAt: string;
  deadline: string | null;
  status: string; // TaskItemStatusName
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
