import { apiClient } from "@/lib/http/client";
import type {
  KycProfileSummaryDto,
  KycApprovalDto,
  RejectKycRequest,
  KycStatus,
} from "@/lib/types/kyc.types";

export const kycService = {
  getList: async (status?: KycStatus): Promise<KycProfileSummaryDto[]> => {
    const params = status !== undefined ? { status } : {};
    const { data } = await apiClient.get<KycProfileSummaryDto[]>("/api/admin/kyc", { params });
    return data;
  },

  approve: async (ownerProfileId: string): Promise<KycApprovalDto> => {
    const { data } = await apiClient.post<KycApprovalDto>(
      `/api/admin/kyc/${ownerProfileId}/approve`,
    );
    return data;
  },

  reject: async (ownerProfileId: string, body: RejectKycRequest): Promise<KycApprovalDto> => {
    const { data } = await apiClient.post<KycApprovalDto>(
      `/api/admin/kyc/${ownerProfileId}/reject`,
      body,
    );
    return data;
  },
};
