// ── Worker skill (profession) requests ─────────────────────────────────────
// Guide: f-06-a-skills-request.md (rev 2026-09-04)
//
// The worker claims a skill, an admin verifies it, and a third thing records what
// is true right now. Three objects, and keeping them apart is the whole model: the
// REQUEST is permanent history (never deleted, even after a reject or a revoke),
// the worker's `professions` say what they hold today, and a certificate lives on
// one claim. A worker with a `Rejected` request and a worker who never asked look
// identical on their profile and different in their request list — so every screen
// here reads the request list, never `professions`.
//
// ⚠ This is NOT "availability". `f-04b-worker-availability` is a separate, live
// feature about which days and hours a worker can work.

import type { PagedQuery } from "@/lib/types/paged.types";

/**
 * ⚠ **TitleCase on the wire.** Never switch over these exhaustively without a
 * default branch: this platform has added enum values before (`onboardingStatus`)
 * and an exhaustive switch fell through.
 */
export type SkillRequestStatus =
  | "Pending"
  | "InfoRequested"
  | "Approved"
  | "Rejected"
  | "Revoked";

export const SKILL_REQUEST_STATUSES = [
  "Pending",
  "InfoRequested",
  "Approved",
  "Rejected",
  "Revoked",
] as const satisfies readonly SkillRequestStatus[];

/**
 * The two states that mean "needs an admin".
 *
 * ⚠ They are reachable **only** by sending no `status` param — the endpoint's
 * `Status` is a single nullable enum, and omitting it filters to exactly these two
 * (`WorkerProfessionRequestService.cs:371`). There is no `status` value that
 * expresses the pair.
 */
export const OPEN_SKILL_REQUEST_STATUSES = [
  "Pending",
  "InfoRequested",
] as const satisfies readonly SkillRequestStatus[];

/** The three terminal states, each its own tab because each is its own question. */
export const DECIDED_SKILL_REQUEST_STATUSES = [
  "Approved",
  "Rejected",
  "Revoked",
] as const satisfies readonly SkillRequestStatus[];

/**
 * The queue's tabs.
 *
 * ⚠ **There is no `all` tab, and adding one is not possible.** `status` takes one
 * enum value; omitting it means the two open states, not everything. An `all` tab
 * could only either send `status=all` (a `400`) or send nothing — which is `open`
 * under a second name. Together these four tabs cover all five statuses exactly
 * once, which is what makes the worker-history fan-out safe to merge without a
 * dedupe.
 */
export const SKILL_REQUEST_TABS = [
  "open",
  "Approved",
  "Rejected",
  "Revoked",
] as const;

export type SkillRequestTab = (typeof SKILL_REQUEST_TABS)[number];

export const DEFAULT_SKILL_REQUEST_TAB: SkillRequestTab = "open";

/**
 * ⚠ **Deliberately never rendered.** The certificate is optional on the request and
 * the worker app is not building the upload, so this is `null` in practice. The type
 * keeps it so the next reader finds a decision rather than a gap: no viewer, no
 * link, no column, no badge. Revisit if the worker app ever ships the upload.
 *
 * A certificate is also invisible to every KYC document route and carries no review
 * state of its own — the decision on the request IS the verdict on the certificate.
 */
export interface SkillRequestCertificateDto {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface SkillRequestDto {
  id: string;
  workerId: string;
  workerFullName: string;
  professionId: string;
  /** UPPER_SNAKE and immutable — key logic on this, never on a display name. */
  professionCode: string;
  /** Denormalised, so a list row needs no second call. */
  professionNameEn: string;
  professionNameDe: string;
  status: SkillRequestStatus;
  /**
   * The years claimed **for this skill** — not the worker's `experience`, which is
   * a separate self-declared number nobody reviews.
   *
   * ⚠ `0` is a valid answer meaning "no years yet", and it is stored as `0`. The
   * field is nullable, so a `null` must not render as "0".
   */
  claimedYears: number | null;
  workerNote: string | null;
  /**
   * ⚠ **Dual-purpose.** While `InfoRequested` this is the admin's *question* to the
   * worker; once `Rejected` it is the *rejection reason* (reject overwrites it).
   * Label it by `status` — see `adminNoteLabelKey`. A generic "Admin note" label is
   * wrong in both states.
   */
  adminNote: string | null;
  workerResponse: string | null;
  respondedAt: string | null;
  /** Set by request-info, reject **and** approve — "when an admin last acted". */
  reviewedAt: string | null;
  /** Non-null only on `Revoked`. */
  revokedAt: string | null;
  revokeReason: string | null;
  certificate: SkillRequestCertificateDto | null;
  createdAt: string;
}

export interface SkillRequestWorkerDto {
  id: string;
  fullName: string;
  /**
   * ⚠ Both can be `null` on a perfectly normal, fully working worker: there is no
   * profile-completeness requirement in this product — it was removed. Render
   * `fullName` as the primary label, treat these as optional, and never block a
   * decision or show an error state because they are missing.
   */
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string;
  onboardingStatus: string;
  experience: number | null;
}

export interface SkillRequestHeldSkillDto {
  professionId: string;
  code: string;
  nameEn: string;
  nameDe: string;
}

/**
 * Three numbers, deliberately, with no task list behind them: an admin deciding
 * "is this person plausibly a window cleaner" is served by "11 tasks, 4.5 rating".
 * `monthsOnPlatform` is whole months since the account was created and is
 * legitimately `0` for a new worker.
 */
export interface SkillRequestHistoryDto {
  completedTasks: number;
  rating: number;
  monthsOnPlatform: number;
}

export interface SkillRequestDetailDto {
  request: SkillRequestDto;
  worker: SkillRequestWorkerDto;
  heldSkills: SkillRequestHeldSkillDto[];
  history: SkillRequestHistoryDto;
}

/**
 * ⚠ **No `sortBy`/`dir`.** The endpoint takes no sort parameter at all — rows come
 * back `createdAt` descending and that is the only order available. `PagedQuery` is
 * not extended for that reason; only its paging half applies.
 */
export interface SkillRequestQuery extends Pick<PagedQuery, "page" | "pageSize"> {
  /** Omitted entirely for the open tab. A `status` of `"all"` is a `400`. */
  status?: SkillRequestStatus;
  workerId?: string;
  professionId?: string;
}

export interface SkillRequestNoteRequest {
  note: string;
}

export interface SkillRequestReasonRequest {
  reason: string;
}
