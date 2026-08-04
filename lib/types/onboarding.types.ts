/**
 * v2 onboarding + contract vocabulary. Every value is serialized BY NAME in JSON
 * (`"Review"`, never `2`) in both directions.
 *
 * Verified against the live API 2026-08-04; re-verified by scripts/verify-v2.mjs.
 * Guides: docs/onboarding-and-active-gate.md §1, contract-lifecycle.md §5.
 */

/** The single onboarding state machine, shared by owners and workers. */
export const ONBOARDING_STATUSES = [
  "Kyc",
  "Review",
  "Rejected",
  "Approved",
  "Contract",
  "Active",
] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

/** Stored contract lifecycle, written by admin/subject actions. */
export const CONTRACT_STATUSES = [
  "Draft",
  "Sent",
  "Signed",
  "Expired",
  "Terminated",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

/**
 * Computed on every read, never stored — this is what the UI renders.
 * `InForce` is the only value that means "covering today".
 */
export const CONTRACT_PHASES = [
  "Draft",
  "Sent",
  "Scheduled",
  "InForce",
  "Lapsed",
  "Expired",
  "Terminated",
] as const;
export type ContractPhase = (typeof CONTRACT_PHASES)[number];

/** Coarse account filter on the admin owner/worker tables (`?status=`). */
export const ACCOUNT_STATUS_FILTERS = [
  "Active",
  "Pending",
  "Deleted",
  "Blocked",
] as const;
export type AccountStatusFilter = (typeof ACCOUNT_STATUS_FILTERS)[number];

export type SortDir = "Asc" | "Desc";

export type OnboardingSubjectType = "Owner" | "Worker";

/** Returned by both admin approve endpoints so the admin can go straight to authoring. */
export interface ContractPrefillDto {
  subjectType: OnboardingSubjectType;
  /** Owner: the ownerProfileId. Worker: the workerId. */
  subjectId: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
}

/**
 * `true` only when a contract row is covering today.
 *
 * Deliberately takes a phase, not an onboardingStatus: the stored status is a
 * projection refreshed by an hourly job and reads `Active` in two windows where
 * the server's live gate refuses the subject with 403. Never answer "is this
 * subject covered?" from `onboardingStatus`.
 */
export function isCoveredNow(phase: ContractPhase | null | undefined): boolean {
  return phase === "InForce";
}
