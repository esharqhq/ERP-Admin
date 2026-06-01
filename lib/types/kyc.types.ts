export type KycStatus = 1 | 2 | 3;

export const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  1: "Pending",
  2: "Approved",
  3: "Rejected",
};

export interface KycDocDto {
  id: string;
  category: string | null;
  type: string | null;
  fileName: string | null;
  fileUrl: string | null;
  createdAt: string;
}

export interface KycProfileSummaryDto {
  ownerProfileId: string;
  ownerUserId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  kycStatus: string | null;
  isApproved: boolean;
  kycRejectReason: string | null;
  kycReviewedAt: string | null;
  kycId: string | null;
  documentCount: number;
}

export interface KycProfileDto extends KycProfileSummaryDto {
  documents: KycDocDto[];
}

export interface KycApprovalDto {
  ownerProfileId: string;
  kycStatus: string | null;
  isApproved: boolean;
  kycRejectReason: string | null;
}

export interface RejectKycRequest {
  reason?: string;
}
