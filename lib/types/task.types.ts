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
  /**
   * F-07 ·2 (2026-09-22) — `"WorkerTapped"` · `"WorkerScannedDisplay"` ·
   * `"OwnerScannedWorker"` · `null`. Read through `checkinDoorKind`; the set is
   * not closed. ⚠ On `OwnerScannedWorker` the two coordinates above are the
   * scanner's phone. ⚠ `null` = never checked in **or** checked in before
   * 2026-09-22. Same field as `AttendanceRowDto.checkinDoor`.
   */
  checkinDoor: string | null;
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
   * · `"ClosedReplacement"` (an admin upheld the owner's complaint — live since ·5, 2026-09-21).
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
  /**
   * F-07 ·5. ⚠ Filled by `GET /api/tasks/{taskId}` ONLY. Every list, `PATCH`,
   * admin-assign and the tasks nested in a booking serve `null` even on a
   * disputed day — `null` means "none, or a door that does not load it". Read
   * "disputed" from `status === "Rejected"`.
   */
  complaint?: TaskComplaintDto | null;
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
 * `closedReplacement` counts days an admin closed by upholding a complaint (F-07 ·5, live since 2026-09-21).
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
  /**
   * F-07 ·12 (2026-09-23). Every row created before that date reads `"Booking"`,
   * including one-date bookings — nothing was re-labelled. Typed as `string` on
   * top of the two known words: a third kind must not fall through a switch.
   */
  kind?: TaskGroupKind | (string & {});
  /**
   * F-07 ·7 (2026-09-23). `null` = a booking created before the question
   * existed — render "not specified", never "no".
   */
  ownerProvidesTools?: boolean | null;
  /** F-07 ·7. A note nothing in the system acts on. */
  addOnNote?: string | null;
  /** F-07 ·9b (2026-09-23). Set only on a walk-in order; `null` on every ordinary booking. */
  cityId?: string | null;
}

export type TaskGroupKind = "Booking" | "SingleTask";

/**
 * Every field the two admin create doors share (`task-lifecycle.md` §0f·3): the
 * booking door takes `dates`, the single-task door takes one `date`, and nothing
 * else differs. There is deliberately no admin shape and no `ownerUserId`: a
 * `propertyId` already implies its owner.
 *
 * The optional fields the forms do not collect (`internalNote`, `ratingFloor`,
 * `eligibleProfessionIds`, `allowNewWorkers`) are typed so the next consumer does
 * not have to re-derive the contract.
 *
 * `lat`/`long`/`cityId` are optional **on this type** because whether they are
 * required is keyed on the property, not on the caller — see the fields below.
 * The enforcement therefore lives in the builders: `buildWalkInOrder` refuses
 * without them, `buildOrder` never sends them.
 */
export interface CreateTaskBaseRequest {
  propertyId: string;
  title: string;
  /** `"HH:mm:ss"` — a bare `"HH:mm"` is not accepted. */
  defaultStartTime: string;
  defaultWorkerLimit: number;
  /**
   * `HH:mm:ss`. Must be AFTER the start: equal is `400 deadline_not_after_start`
   * (F-07 ·10). An earlier one is accepted and is a broken night job.
   */
  defaultDeadline?: string | null;
  /**
   * ⚠ **Required since F-07 ·7 (2026-09-23)** — `[Required]`, so missing, `""` or
   * whitespace is a problem-details 400 and nothing is created.
   */
  instructions: string;
  /**
   * ⚠ **Required since F-07 ·7** — `true` = the owner provides the cleaning
   * tools, `false` = the company brings them. No default: the server's `bool?`
   * exists so an omitted answer is refused rather than recorded as `false`.
   */
  ownerProvidesTools: boolean;
  /** F-07 ·7. Optional, ≤ 2,000 characters counted before trimming. A note only. */
  addOnNote?: string | null;
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
  /**
   * F-07 ·9b (2026-09-23). A walk-in order's own city — **required on the walk-in
   * property** (`400 walkin_city_required`) and **refused on any other**
   * (`400 group_city_not_allowed`). A separate requirement from `lat`/`long`:
   * neither substitutes for the other.
   */
  cityId?: string;
}

/**
 * `POST /api/tasks/admin/groups` — a booking. **Two or more distinct dates**
 * since F-07 ·12 (2026-09-23): one is `400 booking_needs_two_or_more_dates`.
 */
export interface CreateTaskGroupRequest extends CreateTaskBaseRequest {
  /** Explicit dates, `"YYYY-MM-DD"`, **not** a range. One task per date. */
  dates: string[];
}

/**
 * `POST /api/tasks/admin/single` — one day of work, its own kind (F-07 ·12,
 * `task-lifecycle.md` §0f·3). SUPER_ADMIN only (`task_group:create_any`); answers
 * `201 TaskGroupDto` with `kind: "SingleTask"`.
 */
export interface CreateSingleTaskRequest extends CreateTaskBaseRequest {
  /** `"YYYY-MM-DD"`. Its start must be in the future (`task_date_in_past`). */
  date: string;
}

/**
 * `POST /api/tasks/admin/groups/{id}/clone` — repeat an existing booking or
 * single task, in ANY state, as new work on new dates (F-07 ·10,
 * `task-lifecycle.md` §0i·3; `TaskDtos.cs` `CloneTaskGroupRequest`). Answers
 * `201 TaskGroupDto`. `task_group:create_any` (SUPER_ADMIN only), `[Idempotent]`.
 *
 * Only `dates` is required; **every other field means something different when
 * absent**, which is why `buildCloneOrder` omits rather than nulls:
 *
 * - the property, worker limit, rating floor, skills, allow-new-workers, add-on
 *   note and internal note are always copied — there is no field for them;
 * - workers, statuses, check-ins, photos, outcomes and ratings are never copied.
 */
export interface CloneTaskGroupRequest {
  /**
   * `YYYY-MM-DD`, required. The DISTINCT count decides the new kind — one date
   * is a `SingleTask`, two or more a `Booking` — whatever the source was.
   */
  dates: string[];
  /** `HH:mm:ss`. Omitted or `null` = copy the source's. */
  defaultStartTime?: string | null;
  /**
   * `HH:mm:ss`. Omitted or `null` = copy the source's — ⚠ **but only if it is
   * still after the (new) start**; otherwise it is dropped and the day gets the
   * standard 8 hours. A sent value is used as sent: equal to the start is
   * `400 deadline_not_after_start`.
   *
   * ⚠ There is no way to say "no deadline" on this route: `null` means "copy".
   */
  defaultDeadline?: string | null;
  /**
   * ⚠ **Gap-fill only** (§0i·4), like `instructions` and `ownerProvidesTools`:
   * send it only when the source's is `null`/blank — then it is required
   * (`clone_title_required`). Sending one the source already has is
   * `400 clone_field_already_set`, not a quiet override. A blank string counts as
   * not sent.
   */
  title?: string;
  /** Gap-fill only — `clone_instructions_required` when the source has none. */
  instructions?: string;
  /** Gap-fill only — `clone_tools_answer_required` when the source's is `null`. */
  ownerProvidesTools?: boolean;
  /**
   * **Walk-in only.** Omitted = copy the order's city, sent = replace it.
   * Required when a walk-in order filed before 2026-09-23 has none
   * (`walkin_city_required`); refused on an ordinary source
   * (`group_city_not_allowed`).
   */
  cityId?: string;
  /**
   * **Walk-in only, as a pair** with `long`. Omit both = copy the order's
   * address, send both = replace it; one alone is `walkin_location_required`.
   * `-90`..`90` — out of range is a problem-details 400.
   */
  lat?: number;
  /** `-180`..`180`. ⚠ `long`, not `lng`, as on the create doors. */
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

/**
 * The only values `PATCH …/workers/{workerId}/outcome` accepts since the rating
 * card (`task-lifecycle.md` §0j, 2026-09-25). `Pending` has always been refused;
 * `Cancelled` is refused on every day now. Narrower than `TaskWorkerOutcomeName`
 * on purpose — rows still *carry* those two, but nothing may *send* them.
 */
export type OverrideOutcomeTarget = "Completed" | "NoShow" | "Removed";

/** `?staffing=` on `GET /api/tasks/admin` (F-07 ·8, `TaskStaffingFilter`). */
export type StaffingLevel = "Warning" | "Critical";

export interface OverrideTaskWorkerOutcomeRequest {
  outcome: OverrideOutcomeTarget;
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

// ── F-07 ·5 — complaints ─────────────────────────────────────────────────────
// ⚠ The guide names these doors but never gives the shapes; read from
// `Backend/GermanyERP.Domain/Models/DTOs/Tasks/TaskDtos.cs:263-293` and filed
// as a doc bug in BACKEND-ASKS.md.

/** `Open` while the day sits in `Rejected`. Typed open: the set is not promised closed. */
export type TaskComplaintDecision = "Open" | "SidedWithOwner" | "SidedWithWorker";

export interface TaskComplaintPhotoDto {
  id: string;
  /** Absolute, unsigned. */
  url: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface TaskComplaintDto {
  id: string;
  taskId: string;
  raisedByOwnerUserId: string;
  reason: string;
  raisedAt: string;
  decision: TaskComplaintDecision | (string & {});
  decidedByAdminId: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  /** `null` on a walk-in day: nobody can log in as the walk-in owner, so no ticket opens. */
  supportTicketId: string | null;
  photos: TaskComplaintPhotoDto[];
}

/**
 * One row of `GET /api/tasks/{taskId}/media` — ⚠ NOT `TaskMediaDto`. The route
 * hand-builds its answer and names the photo URL **`storageKey`** (kept by the
 * backend on purpose; `index/dtos/tasks.md:35`). It is an absolute URL.
 */
export interface TaskMediaListItem {
  id: string;
  taskId: string;
  uploaderId: string;
  /** `"Before"` | `"After"` | `"Video"`. */
  type: string;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  /** Which workers the supervisor said this photo covers. `[]` = nobody. */
  workerIds: string[] | null;
}

/** `POST /api/tasks/complaints/{complaintId}/decide`. `Open` is refused at the door. */
export interface DecideComplaintRequest {
  decision: "SidedWithOwner" | "SidedWithWorker";
  /** ≤ 2000. Shown to the owner and the workers in notification 80. */
  note?: string;
}

/** The answer of every day transition, the decide door included. */
export interface TaskStatusDto {
  taskId: string;
  status: string;
  timestamp: string | null;
}
