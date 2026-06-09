import { apiClient } from "@/lib/http/client";
import type { WorkerLeaveRequestDto } from "@/lib/types/leave.types";

export const leaveService = {
  /** worker_leave_request:list_any — every leave request; optional status name filter. */
  listAll: async (status?: string): Promise<WorkerLeaveRequestDto[]> => {
    const params = status ? { status } : {};
    const { data } = await apiClient.get<WorkerLeaveRequestDto[]>(
      "/api/worker-leave-requests/admin/all",
      { params },
    );
    return data;
  },

  /**
   * worker_leave_request:approve — approves a PENDING request: deletes the affected
   * TaskWorker row(s) and auto-resolves the linked support ticket (server-side, one tx).
   */
  approve: async (
    id: string,
    note?: string | null,
  ): Promise<WorkerLeaveRequestDto> => {
    const { data } = await apiClient.post<WorkerLeaveRequestDto>(
      `/api/worker-leave-requests/${id}/approve`,
      { note: note || null },
    );
    return data;
  },

  /** worker_leave_request:reject — rejects a PENDING request; mutates no assignments. */
  reject: async (
    id: string,
    note?: string | null,
  ): Promise<WorkerLeaveRequestDto> => {
    const { data } = await apiClient.post<WorkerLeaveRequestDto>(
      `/api/worker-leave-requests/${id}/reject`,
      { note: note || null },
    );
    return data;
  },
};
