import { apiClient } from "@/lib/http/client";
import type { PagedResult } from "@/lib/types/paged.types";
import type {
  WorkerListQuery,
  WorkerRowDto,
  WorkerDetailDto,
  WorkerApprovalDto,
  WorkerRatingDto,
  RejectWorkerRequest,
} from "@/lib/types/worker.types";

export const workerService = {
  /**
   * Paged since FND-3 — the old array shape and the `?isApproved` filter are gone.
   * `professionIds` must be serialized as a repeated key, which is axios's default
   * for arrays only with `indexes: null`; pass it explicitly.
   */
  getWorkers: async (
    query: WorkerListQuery = {},
  ): Promise<PagedResult<WorkerRowDto>> => {
    const { data } = await apiClient.get<PagedResult<WorkerRowDto>>(
      "/api/admin/workers",
      {
        params: query,
        paramsSerializer: { indexes: null },
      },
    );
    return data;
  },

  /**
   * `worker:restore` (80047) — **SUPER_ADMIN only**; anyone else gets an
   * empty-bodied `403`. Brings back the **same row**: same id, task history,
   * contracts, ratings, documents, agency link.
   *
   * ⚠ `reason` is mandatory (`400 reason_required`), and the body must be sent —
   * a bodiless request is refused by model binding before the action runs.
   *
   * ⚠⚠ **The restore is CONDITIONAL.** A deleted person's email and phone were
   * released for re-registration, so somebody may already hold either:
   * `409 cannot_restore_email_taken` and `409 cannot_restore_phone_taken` are
   * **separate** codes. Also `409 worker_not_deleted` and `404 worker_not_found`.
   *
   * ⚠ **Chat groups a restored worker owned do not come back** — the delete
   * handed them to a successor irreversibly.
   */
  restoreWorker: async (id: string, reason: string): Promise<void> => {
    await apiClient.post(`/api/admin/workers/${id}/restore`, { reason });
  },

  getWorkerById: async (id: string): Promise<WorkerDetailDto> => {
    const { data } = await apiClient.get<WorkerDetailDto>(`/api/admin/workers/${id}`);
    return data;
  },

  approveWorker: async (id: string): Promise<WorkerApprovalDto> => {
    const { data } = await apiClient.post<WorkerApprovalDto>(`/api/admin/workers/${id}/approve`);
    return data;
  },

  /** `reason` is required — the server 400s on an empty one. */
  rejectWorker: async (
    id: string,
    body: RejectWorkerRequest,
  ): Promise<WorkerApprovalDto> => {
    const { data } = await apiClient.post<WorkerApprovalDto>(
      `/api/admin/workers/${id}/reject`,
      body,
    );
    return data;
  },

  getWorkerRating: async (id: string): Promise<WorkerRatingDto> => {
    const { data } = await apiClient.get<WorkerRatingDto>(`/api/admin/workers/${id}/rating`);
    return data;
  },

  // 204 No Content. Backend sets IsDeleted=true and writes a WORKER_DEACTIVATED audit.
  softDeleteWorker: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/admin/workers/${id}`);
  },
};
