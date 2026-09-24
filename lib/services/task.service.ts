import { apiClient } from "@/lib/http/client";
import { idempotent } from "@/lib/http/idempotency";
import type {
  TaskGroupDto,
  TaskItemDto,
  WorkerRatingDto,
  SubmitTaskWorkerStarRequest,
  OverrideTaskWorkerOutcomeRequest,
  CreateTaskGroupRequest,
  CreateSingleTaskRequest,
  AdminSetSupervisorRequest,
  TaskSupervisorDto,
  ForceCloseTaskRequest,
  TaskMediaListItem,
  DecideComplaintRequest,
  TaskStatusDto,
} from "@/lib/types/task.types";

export const taskService = {
  // ── Reads ──────────────────────────────────────────────────────────────────
  /** Admin: all task groups across the system; optionally scoped to one owner or property. */
  getAdminTaskGroups: async (ownerUserId?: string, propertyId?: string): Promise<TaskGroupDto[]> => {
    const params: Record<string, string> = {};
    if (ownerUserId) params.ownerUserId = ownerUserId;
    if (propertyId) params.propertyId = propertyId;
    const { data } = await apiClient.get<TaskGroupDto[]>(
      "/api/tasks/admin/groups",
      { params },
    );
    return data;
  },

  /**
   * `task_group:create_any` (110038, SUPER_ADMIN only) — an admin creates a task
   * group on behalf of a property's owner. The body carries no `ownerUserId`:
   * a `propertyId` already implies its owner.
   *
   * `idempotencyKey` must be **held across retries of one attempt** — a repeat
   * with the same key replays the cached 201 for 24 h instead of filing a second
   * order. Mint it with `newIdempotencyKey()` into a ref, not per call.
   *
   * Both are meaningless here, and neither sits where this note used to imply:
   * `propertyName` is `""` on each entry of the response's **`tasks[]`**
   * (`TaskItemDto`), not on the `TaskGroupDto` itself, and `isEnrolled` is
   * `true` on the wire but **deliberately not modelled** — it is this one
   * route's quirk, so do not add it to `TaskGroupDto`. `Location` points at a
   * PROPERTY-scoped read an admin cannot follow — do not follow it.
   */
  createAdminGroup: async (
    body: CreateTaskGroupRequest,
    idempotencyKey: string,
  ): Promise<TaskGroupDto> => {
    const { data } = await apiClient.post<TaskGroupDto>(
      "/api/tasks/admin/groups",
      body,
      idempotent(idempotencyKey),
    );
    return data;
  },

  /**
   * `POST /api/tasks/admin/single` — one day of work, its own kind (F-07 ·12,
   * `task-lifecycle.md` §0f). Same permission as `createAdminGroup`
   * (`task_group:create_any`, SUPER_ADMIN only), same idempotency rule, and the
   * same `201 TaskGroupDto` — with `kind: "SingleTask"` and one entry in `tasks`.
   *
   * Since 2026-09-23 the booking route refuses one date
   * (`booking_needs_two_or_more_dates`), so a one-day order **must** come here.
   * `buildOrder` makes that choice; callers never pick the route themselves.
   */
  createAdminSingle: async (
    body: CreateSingleTaskRequest,
    idempotencyKey: string,
  ): Promise<TaskGroupDto> => {
    const { data } = await apiClient.post<TaskGroupDto>(
      "/api/tasks/admin/single",
      body,
      idempotent(idempotencyKey),
    );
    return data;
  },

  /**
   * Full task group with dates, tasks and workers.
   *
   * `GET /api/tasks/groups/{id}` accepts **either** the GLOBAL `task_group:read_any`
   * (110031) or the PROPERTY-scoped `task_group:read` (110003) since 2026-09-08
   * (`cb2d1ee`) — the attribute was replaced by a two-way check in the action,
   * because `[RequirePermission]` cannot express OR. Both admin roles are seeded
   * with `read_any`, so no per-environment role grant is needed any more and the
   * whole-platform-list fallback this used to carry is gone.
   */
  getTaskGroup: async (id: string): Promise<TaskGroupDto> => {
    const { data } = await apiClient.get<TaskGroupDto>(`/api/tasks/groups/${id}`);
    return data;
  },

  /** Admin: flat list of all tasks (capped server-side); optionally per owner. */
  getAdminTasks: async (ownerUserId?: string): Promise<TaskItemDto[]> => {
    const params = ownerUserId ? { ownerUserId } : {};
    const { data } = await apiClient.get<TaskItemDto[]>("/api/tasks/admin", {
      params,
    });
    return data;
  },

  /**
   * Admin tasks inside a date window — `task:list_any`.
   *
   * A separate method rather than another optional argument on `getAdminTasks`
   * because the **cap changes**: the unwindowed list is capped at the 500 most
   * recent, and only supplying `scheduledFrom` **and** `scheduledTo` together
   * lifts that to a 5,000-row window ceiling (`TasksController.ListAllTasks`).
   * A half-open window still filters but stays capped at 500, so both bounds are
   * required here and neither is optional.
   *
   * ⚠ The server compares `scheduledTo` **inclusively, against a timestamp**.
   * Pass the instant that ends the last day you want, not that day's midnight —
   * a bound of Sunday `00:00` silently drops every task on Sunday. Callers are
   * expected to over-fetch by a margin and cut the range exactly, client-side,
   * on date keys (`rowsInWeek`), which has no boundary to get wrong.
   */
  getAdminTasksInRange: async (
    scheduledFrom: string,
    scheduledTo: string,
  ): Promise<TaskItemDto[]> => {
    const { data } = await apiClient.get<TaskItemDto[]>("/api/tasks/admin", {
      params: { scheduledFrom, scheduledTo },
    });
    return data;
  },

  getTask: async (taskId: string): Promise<TaskItemDto> => {
    const { data } = await apiClient.get<TaskItemDto>(`/api/tasks/${taskId}`);
    return data;
  },

  /**
   * The complaint queue — every day in `Rejected` (F-07 ·5). `task:list_any`.
   * ⚠ `complaint` is `null` on each row by contract; read it per day with `getTask`.
   * The unwindowed list is capped at 500 rows; open complaints are far fewer.
   */
  getRejectedTasks: async (): Promise<TaskItemDto[]> => {
    const { data } = await apiClient.get<TaskItemDto[]>("/api/tasks/admin", {
      params: { status: "Rejected" },
    });
    return data;
  },

  /** The team's evidence — `task:media:read_any`. ⚠ URL is in `storageKey`. */
  getTaskMedia: async (taskId: string): Promise<TaskMediaListItem[]> => {
    const { data } = await apiClient.get<TaskMediaListItem[]>(`/api/tasks/${taskId}/media`);
    return data;
  },

  /**
   * Rule on a complaint — `task_complaint:decide_any` (SUPER_ADMIN and MODERATOR).
   * Irreversible; both answers close the day. Keyed by the COMPLAINT id.
   */
  decideComplaint: async (
    complaintId: string,
    body: DecideComplaintRequest,
  ): Promise<TaskStatusDto> => {
    const { data } = await apiClient.post<TaskStatusDto>(
      `/api/tasks/complaints/${complaintId}/decide`,
      body,
    );
    return data;
  },

  // ── Admin mutations (all gated server-side by *_any permissions) ─────────────
  /** task_group:cancel_any — cancel any group regardless of ownership. */
  cancelGroup: async (id: string): Promise<void> => {
    await apiClient.post(`/api/tasks/admin/groups/${id}/cancel`);
  },

  /**
   * `task:supervisor_override_any` — **SUPER_ADMIN only**; a MODERATOR gets an
   * empty-bodied `403`, which is the permission filter and never an onboarding
   * problem. Puts an admin in charge of a day nobody can hand in.
   *
   * ⚠ **Send the body.** A request with no body at all is refused by model
   * binding *before* the action runs and answers ASP.NET problem-details with no
   * `error` key — a handler reading `.error` would show the user nothing.
   *
   * Refusals: `400 worker_not_on_day` (the target must already be booked on that
   * day — an override onto an outsider produces a day nobody can hand in),
   * `400 supervisor_change_not_allowed` (F-07 ·3: the day is already DONE or
   * CANCELLED), `400 task_not_found`.
   */
  setSupervisor: async (
    taskId: string,
    body: AdminSetSupervisorRequest,
  ): Promise<TaskSupervisorDto> => {
    const { data } = await apiClient.put<TaskSupervisorDto>(
      `/api/tasks/${taskId}/supervisor`,
      body,
    );
    return data;
  },

  /**
   * `task:force_close_any` (110049) — **SUPER_ADMIN only**, empty-bodied `403`
   * otherwise. Closes a day that is stuck open.
   *
   * ⚠ `reason` is mandatory and is shown to the workers and the owner. Works
   * from `PENDING` / `CHECKED_IN` / `IN_REVIEW`; a day already `DONE` or
   * `CANCELLED` answers `400 task_already_closed`.
   *
   * ⚠⚠ Force-closing marks everyone who never checked in as a **no-show**, which
   * counts against their rating. That belongs in the confirmation, not here.
   */
  forceCloseTask: async (
    taskId: string,
    body: ForceCloseTaskRequest,
  ): Promise<TaskItemDto> => {
    const { data } = await apiClient.post<TaskItemDto>(
      `/api/tasks/${taskId}/force-close`,
      body,
    );
    return data;
  },

  /** task:assign_worker_any — one-off fill of a single under-staffed task. */
  assignWorker: async (
    taskId: string,
    workerId: string,
  ): Promise<TaskItemDto> => {
    const { data } = await apiClient.post<TaskItemDto>(
      `/api/tasks/${taskId}/admin-assign/${workerId}`,
    );
    return data;
  },

  /** task:unassign_worker_any — remove a single TaskWorker assignment. */
  unassignWorker: async (taskId: string, workerId: string): Promise<void> => {
    await apiClient.delete(`/api/tasks/${taskId}/admin-assign/${workerId}`);
  },

  /** task_worker:rate_any — set/update a star rating (1.0–5.0) on a finalized task. */
  rateWorker: async (
    taskId: string,
    workerId: string,
    body: SubmitTaskWorkerStarRequest,
  ): Promise<WorkerRatingDto> => {
    const { data } = await apiClient.put<WorkerRatingDto>(
      `/api/tasks/${taskId}/workers/${workerId}/rating`,
      body,
    );
    return data;
  },

  /** task_worker:mark_outcome_any — override an auto-derived outcome. */
  overrideOutcome: async (
    taskId: string,
    workerId: string,
    body: OverrideTaskWorkerOutcomeRequest,
  ): Promise<WorkerRatingDto> => {
    const { data } = await apiClient.patch<WorkerRatingDto>(
      `/api/tasks/${taskId}/workers/${workerId}/outcome`,
      body,
    );
    return data;
  },
};
