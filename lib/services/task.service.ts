import { apiClient } from "@/lib/http/client";
import type {
  TaskGroupDto,
  TaskItemDto,
  WorkerRatingDto,
  SubmitTaskWorkerStarRequest,
  OverrideTaskWorkerOutcomeRequest,
} from "@/lib/types/task.types";

export const taskService = {
  // ── Reads ──────────────────────────────────────────────────────────────────
  /** Admin: all task groups across the system; optionally scoped to one owner. */
  getAdminTaskGroups: async (ownerUserId?: string): Promise<TaskGroupDto[]> => {
    const params = ownerUserId ? { ownerUserId } : {};
    const { data } = await apiClient.get<TaskGroupDto[]>(
      "/api/tasks/admin/groups",
      { params },
    );
    return data;
  },

  /** Full task group with dates, tasks and eligibility. */
  getTaskGroup: async (id: string): Promise<TaskGroupDto> => {
    const { data } = await apiClient.get<TaskGroupDto>(
      `/api/tasks/groups/${id}`,
    );
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
