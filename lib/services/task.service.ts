import { apiClient } from "@/lib/http/client";
import { idempotent } from "@/lib/http/idempotency";
import type {
  TaskGroupDto,
  TaskItemDto,
  WorkerRatingDto,
  SubmitTaskWorkerStarRequest,
  OverrideTaskWorkerOutcomeRequest,
  CreateTaskGroupRequest,
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
   * Full task group with dates, tasks and workers.
   *
   * The backend exposes no single-group admin read endpoint — the owner route
   * `/api/tasks/groups/{id}` is PROPERTY-scoped (task_group:read) and 403s for
   * an admin, and no `/api/tasks/admin/groups/{id}` exists (verified 2026-06-10).
   * The admin list already returns each group fully nested (dates, tasks,
   * workers), so we derive the detail from it. See BACKEND-ASKS.md.
   *
   * NOTE: assumes the admin groups list is unpaginated/uncapped. If the backend
   * ever caps that list, deep-linking to a group beyond the cap will 404 here.
   */
  getTaskGroup: async (id: string): Promise<TaskGroupDto> => {
    const groups = await taskService.getAdminTaskGroups();
    const group = groups.find((g) => g.id === id);
    if (!group) throw new Error(`Task group ${id} not found`);
    return group;
  },

  /** Admin: flat list of all tasks (capped server-side); optionally per owner. */
  getAdminTasks: async (ownerUserId?: string): Promise<TaskItemDto[]> => {
    const params = ownerUserId ? { ownerUserId } : {};
    const { data } = await apiClient.get<TaskItemDto[]>("/api/tasks/admin", {
      params,
    });
    return data;
  },

  getTask: async (taskId: string): Promise<TaskItemDto> => {
    const { data } = await apiClient.get<TaskItemDto>(`/api/tasks/${taskId}`);
    return data;
  },

  // ── Admin mutations (all gated server-side by *_any permissions) ─────────────
  /** task_group:cancel_any — cancel any group regardless of ownership. */
  cancelGroup: async (id: string): Promise<void> => {
    await apiClient.post(`/api/tasks/admin/groups/${id}/cancel`);
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
