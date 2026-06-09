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

/** PropertyType enum serialized as PascalCase string names (global JsonStringEnumConverter). */
export type PropertyType = "Villa" | "Hotel" | "Office" | "Other";

export const PROPERTY_TYPES: PropertyType[] = ["Villa", "Hotel", "Office", "Other"];

/**
 * Body for `PUT /api/properties/{id}` (UpdatePropertyRequest). All strings are
 * `[Required]` server-side; FloorCount is `[Range(0, 500)]`; Type is the enum
 * name. Admins reach this endpoint via the `property:list` branch of the
 * controller's CanAccessPropertyAsync (no admin role holds `property:update`).
 */
export interface UpdatePropertyRequest {
  name: string;
  address: string;
  lat: number;
  long: number;
  type: PropertyType;
  entryInstructions: string;
  floorCount: number;
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
