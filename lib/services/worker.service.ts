import { apiClient } from "@/lib/http/client";
import type {
  WorkerSummaryDto,
  WorkerDetailDto,
  WorkerApprovalDto,
  WorkerRatingDto,
  RejectWorkerRequest,
} from "@/lib/types/worker.types";

export const workerService = {
  getWorkers: async (isApproved?: boolean): Promise<WorkerSummaryDto[]> => {
    const params = isApproved !== undefined ? { isApproved } : {};
    const { data } = await apiClient.get<WorkerSummaryDto[]>("/api/admin/workers", { params });
    return data;
  },

  getWorkerById: async (id: string): Promise<WorkerDetailDto> => {
    const { data } = await apiClient.get<WorkerDetailDto>(`/api/admin/workers/${id}`);
    return data;
  },

  approveWorker: async (id: string): Promise<WorkerApprovalDto> => {
    const { data } = await apiClient.post<WorkerApprovalDto>(`/api/admin/workers/${id}/approve`);
    return data;
  },

  rejectWorker: async (id: string, body: RejectWorkerRequest = {}): Promise<WorkerApprovalDto> => {
    const { data } = await apiClient.post<WorkerApprovalDto>(`/api/admin/workers/${id}/reject`, body);
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
