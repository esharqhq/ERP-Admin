export interface PropertyDocDto {
  id: string;
  propertyId: string;
  type: string | null;
  fileName: string | null;
  fileUrl: string | null;
  uploadedByOwnerUserId: string;
  createdAt: string;
}

export interface PropertyDocsBundleDto {
  propertyId: string;
  docsStatus: string | null;
  docsRejectReason: string | null;
  docsReviewedAt: string | null;
  docs: PropertyDocDto[] | null;
}

export interface PropertyDocsApprovalDto {
  propertyId: string;
  docsStatus: string | null;
  docsRejectReason: string | null;
  docsReviewedAt: string | null;
}

export interface PropertyDto {
  id: string;
  bossOwnerUserId: string;
  name: string | null;
  address: string | null;
  lat: number;
  long: number;
  type: string | null;
  entryInstructions: string | null;
  floorCount: number;
  docsStatus: string | null;
  docsRejectReason: string | null;
  docsReviewedAt: string | null;
  createdAt: string;
}
