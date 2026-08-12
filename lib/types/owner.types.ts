import type { AccountStatusFilter, OnboardingStatus } from "@/lib/types/onboarding.types";
import type { PagedQuery } from "@/lib/types/paged.types";

/**
 * Owner-account directory (distinct from the KYC verification queue).
 * Backed by `GET /api/admin/owners/bosses` — an **unpaginated, unfiltered**
 * list meant for pickers. For the owners *table*, use `OwnerRowDto` below;
 * this shape carries no status, no onboarding stage and no property count.
 * Also backs `GET /api/owners/{id}` (`owner:read`).
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

/**
 * `"Default"` marks the single permanent "Walk-in / Manual Orders" account
 * (F-02b·6). Derived server-side from `OwnerUser.IsSystem`, never stored as
 * this string.
 *
 * It is the **one check** that should hide Edit, Delete, Message and Create
 * contract: each of those has its own refusal against this account
 * (`owner_is_system`), and discovering four separate errors is worse than
 * seeing three disabled buttons.
 */
export type OwnerType = "Regular" | "Default";

/**
 * One row of `GET /api/admin/owners` (`PagedResult<OwnerRowDto>`, FND-3).
 * BOSS-owners only — sub-accounts never appear.
 */
export interface OwnerRowDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  /** Coarse account lifecycle: Active | Pending | Deleted | Blocked. */
  status: string;
  /**
   * ⚠ A **string**, deliberately not `OnboardingStatus`. The Default Owner has
   * no onboarding record at all and reports `"NotApplicable"` — a seventh value
   * the stored state machine's enum does not have and must never gain
   * (F-02b·6 §4.1). Typing this as the union would make an exhaustive `switch`
   * look safe while the walk-in row falls straight through it.
   */
  onboardingStatus: string;
  isVerified: boolean;
  propertyCount: number;
  createdAt: string;
  ownerType: OwnerType;
}

/**
 * `GET /api/admin/owners` query.
 *
 * `status` (coarse) and `onboardingStatus` (exact stage) AND together — pick
 * one axis per control rather than mixing them.
 *
 * ⚠ Omitting `ownerType` returns **both** types, so the walk-in row is included
 * by default and every unfiltered count is one higher than it was before
 * F-02b·6. That is deliberate: hiding it would make a search for "Walk-in"
 * return nothing and read as "no such account". Pass `Regular` for the old
 * population exactly.
 *
 * There is no `onboardingStatus=NotApplicable` — the filter accepts only the
 * six stored stages. Use `ownerType=Default` to reach the walk-in row.
 */
export interface OwnerListQuery extends PagedQuery {
  search?: string;
  status?: AccountStatusFilter;
  onboardingStatus?: OnboardingStatus;
  ownerType?: OwnerType;
  registeredFrom?: string;
  registeredTo?: string;
  propertyCountMin?: number;
  propertyCountMax?: number;
}

// ── Admin owner profile edit (F-02b·7, PUT /api/owners/{id}) ────────────────

/**
 * Body of `PUT /api/owners/{id}`.
 *
 * Every field is optional and an omitted or blank one means **leave
 * unchanged** — there is deliberately no way to clear a value here, so a form
 * that sends all fields on every save cannot wipe the ones it did not touch.
 *
 * `reason` is typed as required even though the schema marks it optional: it
 * is validated in the service rather than by model attributes, specifically so
 * the failure keeps this API's `{error}` envelope, and a blank one is
 * `400 reason_required`.
 */
export interface AdminUpdateOwnerProfileRequest {
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  reason: string;
}

/**
 * Response of `PUT /api/owners/{id}`.
 *
 * `fullName` is the **display** name the owner chose at registration. It is
 * returned for context, is not editable here, and is deliberately never
 * reconciled with the legal `firstName`/`lastName` pair — expect the two to
 * differ legitimately; that is not a data error.
 *
 * `firstName`, `lastName` and `onboardingStatus` are all `null` for a
 * sub-account, which has no identity record at all.
 */
export interface AdminOwnerProfileDto {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  /** Serialized by name (`"Kyc"` … `"Active"`), never as a number. */
  onboardingStatus: string | null;
  updatedAt: string | null;
}
