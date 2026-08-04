import type {
  ContractPrefillDto,
  OnboardingStatus,
} from "@/lib/types/onboarding.types";

/**
 * Owner KYC document. Deliberately has **no** review fields: unlike worker
 * documents there is no per-document status, reason or reviewer on the owner
 * side, and no admin endpoint to set one. Owner review is account-level only.
 */
export interface KycDocDto {
  id: string;
  /** `OwnerKYCDocType` name — render via `onboarding.docType.*`. */
  type: string | null;
  fileName: string | null;
  /** Storage key as posted; fetch at `{filesBase}/files/{fileUrl}` (public, no auth). */
  fileUrl: string | null;
  createdAt: string;
}

/** One row of `GET /api/admin/kyc` — a bare array, not a paged envelope. */
export interface KycProfileSummaryDto {
  /** Admin KYC routes are keyed on this. */
  ownerProfileId: string;
  /** Admin contract-authoring routes are keyed on this. Not interchangeable. */
  ownerUserId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  onboardingStatus: OnboardingStatus;
  onboardingRejectReason: string | null;
  onboardingReviewedAt: string | null;
  documentCount: number;
}

/** `GET /api/admin/kyc/{ownerProfileId}` and `/api/admin/kyc/owner/{ownerUserId}`. */
export interface KycProfileDto {
  ownerProfileId: string;
  ownerUserId: string;
  onboardingStatus: OnboardingStatus;
  onboardingRejectReason: string | null;
  onboardingReviewedAt: string | null;
  documents: KycDocDto[] | null;
}

/**
 * Approve/reject response. `prefill` exists because approval alone unlocks
 * nothing — the admin must go on to author and send a contract.
 */
export interface KycApprovalDto {
  ownerProfileId: string;
  onboardingStatus: OnboardingStatus;
  onboardingRejectReason: string | null;
  prefill: ContractPrefillDto;
}

/** `reason` is required — an empty string is `400 rejection_reason_required`. */
export interface RejectKycRequest {
  reason: string;
}
