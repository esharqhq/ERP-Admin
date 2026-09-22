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
  status: string; // TaskItemStatusName — read it through `canonicalTaskStatus`
  requiredWorkerCount: number;
  startedAt: string | null;
  /**
   * ⚠ Since F-07 ·3 (2026-09-21) this is the moment the day was HANDED IN, not
   * the moment the owner accepted it. Same field, same type, an earlier instant
   * — accepting used to overwrite it and no longer does. Nothing here computes a
   * duration from it; if anything ever does, re-read `task-lifecycle.md` §0d.
   */
  completedAt: string | null;
  /**
   * How the day ended — F-07 ·3 (2026-09-21). `"OwnerAccepted"` · `"AutoAccepted"`
   * (nobody reviewed it within five hours) · `"ClosedForced"` (an admin forced it)
   * · `"ClosedReplacement"` (⚠ never today — forward-declared for ·5).
   *
   * ⚠⚠ `null` does NOT mean "the owner accepted it". It means the day has not
   * closed, **or** it closed before 2026-09-21. A day cancelled before it ever
   * ran also reads `null`: a cancel is not a close. Never make it a default arm.
   *
   * Typed open on purpose — the set is not closed.
   */
  closureReason: string | null;
  /**
   * Who files and submits this day — F-07 ·4 (2026-09-19). `null` until somebody
   * checks in: the role goes to the **first worker to arrive**, and a
   * better-rated worker arriving later never takes it off them.
   */
  supervisorWorkerId: string | null;
  /**
   * What the supervisor wrote when they handed the day in — F-07 ·4. `null`
   * until submission, and `null` when they left it blank. It is what an operator
   * reads before judging a dispute.
   */
  workSummary: string | null;
  workers: TaskWorkerDto[];
  media?: TaskMediaDto[] | null;
  conversationId?: string | null;
}

/**
 * The day counts that replaced `TaskGroupDto.status` in F-07 ·0 (2026-09-17).
 * They say what the single word could not — "4 of 5 days done" — which is why
 * the word went: it could not describe five days in different states, so every
 * screen guessed differently.
 *
 * ⚠ `rejected` is always `0` today. It is forward-declared so slice ·5 can start
 * filling it without a second breaking change — do not drop the key, and do not
 * treat a non-zero value as impossible.
 */
export interface TaskGroupDayCountsDto {
  total: number;
  pending: number;
  checkedIn: number;
  inReview: number;
  done: number;
  cancelled: number;
  rejected: number;
}

/**
 * How the booking's finished days ended — added by F-07 ·3 (2026-09-21) beside
 * `days`.
 *
 * ⚠ `closedReplacement` is always `0` today — forward-declared for ·5, same
 * discipline as `days.rejected`: keep the key.
 *
 * ⚠ These do NOT sum to `days.done` on any booking that existed before
 * 2026-09-21. Those days carry no reason and are counted by none of the four.
 * That is honest, not a bug — never render the difference as a discrepancy.
 */
export interface TaskGroupClosureCountsDto {
  ownerAccepted: number;
  autoAccepted: number;
  closedForced: number;
  closedReplacement: number;
}

export interface TaskGroupDto {
  id: string;
  propertyId: string;
  ownerId: string;
  title: string | null;
  defaultStartTime: string; // "HH:mm:ss"
  defaultDeadline: string | null;
  instructions: string | null;
  /**
   * No `status`. F-07 ·0 (2026-09-17) deleted it outright — no compatibility
   * alias, on all seven endpoints that return a booking. Declaring a field the
   * server has stopped sending is why `tsc` stayed green while Cancel vanished:
   * the value was `undefined` and every predicate over it took the wrong branch.
   */
  days: TaskGroupDayCountsDto;
  /**
   * ⚠ Optional, unlike `days`. Absent from any booking that closed before
   * 2026-09-21, and only ever rendered — where `days` drives a predicate, and a
   * predicate silently reading `undefined` is the failure this replaces.
   */
  closed?: TaskGroupClosureCountsDto;
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
/**
 * The tasks list's tab set.
 *
 * ⚠ These are **client-side buckets**, not server values, and have been since
 * F-07 ·0 (2026-09-17) deleted `TaskGroupDto.status`. Nothing sends them to the
 * API; the page files each booking with `groupBucket` (lib/tasks/staffing.ts)
 * off its day counts. The words are kept because the i18n keys and the operators'
 * vocabulary both use them — do not send one as a `?status=` value, which is a
 * different, per-DAY enum that now binds `CheckedIn`/`InReview`.
 */
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

/** Body of `PUT /api/tasks/{taskId}/supervisor` — `task:supervisor_override_any`. */
export interface AdminSetSupervisorRequest {
  workerId: string;
}

/** Answer of all three supervisor-move routes. */
export interface TaskSupervisorDto {
  taskId: string;
  supervisorWorkerId: string;
}

/**
 * Body of `POST /api/tasks/{taskId}/force-close` — `task:force_close_any`.
 *
 * ⚠ `reason` is mandatory. It is the only record of why the day ended this way
 * and it is shown to the workers and the owner in their notification.
 */
export interface ForceCloseTaskRequest {
  reason: string;
}
