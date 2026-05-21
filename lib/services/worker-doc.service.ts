import { apiClient } from "@/lib/http/client";
import type { WorkerDocumentDto, RejectWorkerDocRequest } from "@/lib/types/worker.types";

export const workerDocService = {
  getDocs: async (workerId: string): Promise<WorkerDocumentDto[]> => {
    const { data } = await apiClient.get<WorkerDocumentDto[]>(
      `/api/admin/workers/${workerId}/docs`,
    );
    return data;
  },

  approveDoc: async (workerId: string, docId: string): Promise<void> => {
    await apiClient.post(`/api/admin/workers/${workerId}/docs/${docId}/approve`);
  },

  rejectDoc: async (
    workerId: string,
    docId: string,
    body: RejectWorkerDocRequest,
  ): Promise<void> => {
    await apiClient.post(`/api/admin/workers/${workerId}/docs/${docId}/reject`, body);
  },
};
