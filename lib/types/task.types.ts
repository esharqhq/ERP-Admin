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
 *
 * `lat`/`long` are optional **on this type** because whether they are required is
 * keyed on the property, not on the caller — see the two fields below. The
 * enforcement therefore lives in the builders: `buildWalkInOrder` refuses without
 * them, `buildOrder` never sends them.
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
  /**
   * The order's own address, `-90`..`90` (F-06c, handoff `f-02b-6` §3 and
   * `f-06-c-checkin-proof.md` §4). **Required when `propertyId` is the walk-in
   * property and REFUSED for any other property** — the same body therefore
   * succeeds or fails on the `propertyId` alone:
   *
   * - walk-in property, both sent → `201`; this becomes the geofence target for
   *   every task in the order
   * - walk-in property, either missing → `400 walkin_location_required`
   * - any ordinary property, sent → `400 group_location_not_allowed`
   *
   * ⚠ **Send both or neither.** `lat` without `long` is refused as
   * `walkin_location_required`, which is why the drafts carry a single
   * `{ lat, long } | null` and never two separate fields.
   *
   * ⚠ **No read-back and no edit path** (§4.2, tracked upstream as
   * `G_WalkInGroupLocationNotReadableOrEditable`): `TaskGroupDto` does not return
   * these and `PUT /api/tasks/groups/{id}` cannot change them. An order filed at
   * the wrong address can only be cancelled and re-filed, and every check-in at
   * that job is refused with `outside_geofence` in the meantime.
   */
  lat?: number;
  /** The order's own address, `-180`..`180`. ⚠ `long`, **not** `lng` — the
   * check-in doors use `lng`, the group and property doors use `long`. That
   * inconsistency is the existing contract and was deliberately not tidied. */
  long?: number;
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
