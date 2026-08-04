/**
 * F-03·1 structured document data (PR #47, live 2026-08-03). The subject writes all
 * of this; the admin panel only ever reads it — there is deliberately no admin
 * correction endpoint, so the correction loop is reject-with-reason → subject edits
 * → subject re-submits.
 */

/** Legal names off the passport. Allowed to differ from the account's display name; never reconciled. */
export interface OwnerIdentityDto {
  firstName: string | null;
  lastName: string | null;
  passportNumber: string | null;
  /** Not validated as future-dated by the server. The expiry ladder acts on it. */
  passportExpiry: string | null;
}

/** The owner block plus the worker's own service licence. */
export interface WorkerIdentityDto extends OwnerIdentityDto {
  /** The worker's own service licence, not a company's. Optional even at submit. */
  licenseExpiry: string | null;
}

export const COMPANY_TYPES = [
  "Llc",
  "Gmbh",
  "IndividualEntrepreneur",
  "SoleTrader",
  "Other",
] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

/**
 * Present only when the owner is a legal entity. **A null company means the owner is a
 * natural person** — the absence is the fact. There is no `isLegalEntity` flag and no
 * CompanyType member meaning "not a company"; never default this to an empty object.
 *
 * Carries the resolved country/city names in both localizations alongside the ids, so
 * the block renders without an FND-1 lookup call.
 */
export interface OwnerCompanyDto {
  id: string;
  name: string | null;
  type: CompanyType;
  licenseNumber: string | null;
  /** Watched by the expiry ladder — a lapse reverts the owner to `Kyc`. */
  licenseExpiry: string | null;
  registrationDate: string | null;
  countryId: string;
  countryNameDe: string | null;
  countryNameEn: string | null;
  cityId: string | null;
  cityNameDe: string | null;
  cityNameEn: string | null;
  taxNumber: string | null;
}
