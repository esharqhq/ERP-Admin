/**
 * Owner-account directory (distinct from the KYC verification queue).
 * Backed by `GET /api/owners` (`owner:list`) / `GET /api/owners/{id}` (`owner:read`).
 * Mirrors `OwnerSummaryDto` in GermanyERP.Domain — covers every OwnerUser
 * (BOSS owners + MANAGER / PROPERTY_ADMIN sub-accounts), keyed on the OwnerUser id.
 */
export interface OwnerSummaryDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  isVerified: boolean;
  /** BaseRole code, e.g. "BOSS" | "MANAGER" | "PROPERTY_ADMIN"; null if unset. */
  roleCode: string | null;
  createdAt: string;
}
