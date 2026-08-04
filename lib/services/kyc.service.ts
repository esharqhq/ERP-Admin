import { apiClient } from "@/lib/http/client";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";
import type {
  KycApprovalDto,
  KycProfileDto,
  KycProfileSummaryDto,
  RejectKycRequest,
} from "@/lib/types/kyc.types";

export const kycService = {
  /**
   * `status` is an OnboardingStatus **name** (`"Review"`), not a number.
   * The review queue is `?status=Review`; omit it for every owner with a KYC row.
   */
  getList: async (
    status?: OnboardingStatus,
  ): Promise<KycProfileSummaryDto[]> => {
    const params = status !== undefined ? { status } : {};
    const { data } = await apiClient.get<KycProfileSummaryDto[]>(
      "/api/admin/kyc",
      { params },
    );
    return data;
  },

  getProfile: async (ownerProfileId: string): Promise<KycProfileDto> => {
    const { data } = await apiClient.get<KycProfileDto>(
      `/api/admin/kyc/${ownerProfileId}`,
    );
    return data;
  },

  /** Same profile, looked up by the owner **account** id. */
  getProfileByUser: async (ownerUserId: string): Promise<KycProfileDto> => {
    const { data } = await apiClient.get<KycProfileDto>(
      `/api/admin/kyc/owner/${ownerUserId}`,
    );
    return data;
  },

  /** `Review → Approved`. Legal only from `Review`; else 400 invalid_onboarding_transition. */
  approve: async (ownerProfileId: string): Promise<KycApprovalDto> => {
    const { data } = await apiClient.post<KycApprovalDto>(
      `/api/admin/kyc/${ownerProfileId}/approve`,
    );
    return data;
  },

  /** `Review → Rejected`. `reason` is required. */
  reject: async (
    ownerProfileId: string,
    body: RejectKycRequest,
  ): Promise<KycApprovalDto> => {
    const { data } = await apiClient.post<KycApprovalDto>(
      `/api/admin/kyc/${ownerProfileId}/reject`,
      body,
    );
    return data;
  },
};
