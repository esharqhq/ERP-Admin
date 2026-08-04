import type {
  ContractPrefillDto,
  OnboardingStatus,
} from "@/lib/types/onboarding.types";
import type {
  OwnerCompanyDto,
  OwnerIdentityDto,
} from "@/lib/types/identity.types";

/**
 * Owner KYC document. F-03·1 gave owner documents the same per-document review
 * fields workers already had — status, reason and reviewer are now tracked per
 * document, not just at the account level.
 */
export interface KycDocDto {
  id: string;
  /** `OwnerKYCDocType` name — render via `onboarding.docType.*`. */
  type: string | null;
  fileName: string | null;
  /** Storage key as posted; fetch at `{filesBase}/files/{fileUrl}` (public, no auth). */
  fileUrl: string | null;
  /** F-03·1. TitleCase on the wire: "Pending" | "Approved" | "Rejected". */
  status: string | null;
  /** Set by a per-document reject; cleared when the document is approved. */
  rejectReason: string | null;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
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
  /** F-03·1. Always present; its fields are null until the subject fills them. */
  identity: OwnerIdentityDto;
  /** F-03·1. **Null means the owner is a natural person** — do not default it to an object. */
  company: OwnerCompanyDto | null;
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
