import { apiClient } from "@/lib/http/client";
import type {
  KycProfileSummaryDto,
  KycProfileDto,
  KycApprovalDto,
} from "@/lib/types/kyc.types";
import type { PropertyDto } from "@/lib/types/property.types";
import type { AdminTaskGroupSummaryDto } from "@/lib/types/task.types";

export const ownerService = {
  getOwnerList: async (status?: string): Promise<KycProfileSummaryDto[]> => {
    const params = status !== undefined ? { status } : {};
    const { data } = await apiClient.get<KycProfileSummaryDto[]>("/api/admin/kyc", { params });
    return data;
  },

  approveKyc: async (ownerProfileId: string): Promise<KycApprovalDto> => {
    const { data } = await apiClient.post<KycApprovalDto>(
      `/api/admin/kyc/${ownerProfileId}/approve`,
    );
    return data;
  },

  rejectKyc: async (ownerProfileId: string, reason: string): Promise<KycApprovalDto> => {
    const { data } = await apiClient.post<KycApprovalDto>(
      `/api/admin/kyc/${ownerProfileId}/reject`,
      { reason },
    );
    return data;
  },

  deleteOwner: async (ownerUserId: string): Promise<void> => {
    await apiClient.delete(`/api/owners/${ownerUserId}`);
  },

  getOwnerByUserId: async (ownerUserId: string): Promise<KycProfileDto> => {
    const { data } = await apiClient.get<KycProfileDto>(
      `/api/admin/kyc/owner/${ownerUserId}`,
    );
    return data;
  },

  getOwnerProperties: async (ownerUserId: string): Promise<PropertyDto[]> => {
    const { data } = await apiClient.get<PropertyDto[]>("/api/properties", {
      params: { ownerUserId },
    });
    return data;
  },

  getOwnerTaskGroups: async (ownerUserId: string): Promise<AdminTaskGroupSummaryDto[]> => {
    const { data } = await apiClient.get<AdminTaskGroupSummaryDto[]>(
      "/api/tasks/admin/groups",
      { params: { ownerUserId } },
    );
    return data;
  },
};
