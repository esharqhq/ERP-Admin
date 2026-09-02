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

/**
 * Coarse account filter on the admin owner table (`?status=`).
 *
 * ⚠ **`Blocked` was renamed `Lapsed` on 2026-08-28** — same numeric code, same
 * rows, new word. It has always meant *"was signed at some point and is not live
 * now"*, i.e. the contract ran out; it never meant a sanction. The word moved
 * because a real administrative block now exists on the worker side and the two
 * were indistinguishable under one name.
 *
 * ⚠ **The owner table has no `Blocked`, and sending it is a `400
 * status_not_supported_for_owners`** on the list *and* the export. That is why
 * this list is the owner's four and `WORKER_STATUS_FILTERS` below is its own —
 * one shared union would make the refused value spellable here.
 */
export const ACCOUNT_STATUS_FILTERS = [
  "Active",
  "Pending",
  "Deleted",
  "Lapsed",
] as const;
export type AccountStatusFilter = (typeof ACCOUNT_STATUS_FILTERS)[number];

/**
 * The worker table's `?status=`: the owner's four plus a fifth.
 *
 * `Blocked` here is an **admin sanction** — stored, not derived, and unrelated to
 * contracts: a blocked worker holding a live contract still reports `Blocked`.
 * The buckets **partition**, so `Active`, `Pending` and `Lapsed` all exclude
 * blocked workers and the counts sum to the table total.
 */
export const WORKER_STATUS_FILTERS = [
  ...ACCOUNT_STATUS_FILTERS,
  "Blocked",
] as const;
export type WorkerStatusFilter = (typeof WORKER_STATUS_FILTERS)[number];

export type SortDir = "Asc" | "Desc";

export type OnboardingSubjectType = "Owner" | "Worker";

/** Returned by both admin approve endpoints so the admin can go straight to authoring. */
export interface ContractPrefillDto {
  subjectType: OnboardingSubjectType;
  /** Owner: the ownerProfileId. Worker: the workerId. */
  subjectId: string;
  /** The account label only — not the name to author the contract against. */
  fullName: string | null;
  /**
   * The passport name the contract will actually print — new 2026-08-11
   * (PR #67). Use **this** for the contracting-party field of an authoring form
   * and keep `fullName` as the account label; before it existed the prefill
   * handed over only `fullName`, so an admin authored against one name and
   * produced a document stating another with nothing on screen showing it.
   *
   * ⚠ `null` when no passport name is on file — render nothing rather than
   * falling back to `fullName` (`onboarding-and-active-gate.md` §10.3).
   */
  legalName: string | null;
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
