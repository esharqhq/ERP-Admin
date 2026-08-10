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

  /**
   * Per-document verdict, the owner mirror of the worker routes. Rides the same
   * account-level permissions (`kyc:approve` / `kyc:reject`), so a panel that can
   * already decide a bundle can decide a file.
   *
   * Two behaviours the caller must account for: it does **not** move
   * `onboardingStatus`, and it notifies **nobody** — the bundle-level decision is
   * the only thing that reaches the owner. Approving also clears `rejectReason`.
   * A `docId` under the wrong `ownerProfileId` is `404 kyc_doc_not_found`.
   */
  approveDoc: async (ownerProfileId: string, docId: string): Promise<void> => {
    await apiClient.post(
      `/api/admin/kyc/${ownerProfileId}/docs/${docId}/approve`,
    );
  },

  /** `reason` is required; a blank one is rejected before the service even sees it. */
  rejectDoc: async (
    ownerProfileId: string,
    docId: string,
    body: RejectKycRequest,
  ): Promise<void> => {
    await apiClient.post(
      `/api/admin/kyc/${ownerProfileId}/docs/${docId}/reject`,
      body,
    );
  },
};
