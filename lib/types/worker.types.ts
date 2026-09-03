import type {
  ContractPrefillDto,
  OnboardingStatus,
  WorkerStatusFilter,
} from "@/lib/types/onboarding.types";
import type { PagedQuery } from "@/lib/types/paged.types";
import type { WorkerIdentityDto } from "@/lib/types/identity.types";

export interface WorkerProfessionDto {
  id: string;
  code: string | null;
  name: string | null;
}

/**
 * Per-doc decision now persists (backend ask (e), verified live 2026-06-11):
 * `status` is `Pending` | `Approved` | `Rejected`. Drive button state off it —
 * hide Approve/Reject (or show the decision) once `status != "Pending"`.
 */
export interface WorkerDocumentDto {
  id: string;
  type: string | null;
  fileName: string | null;
  /**
   * Storage key as posted — **not a URL**. `Worker/src/api/hooks/useUploadWorkerDoc.ts:33`
   * sends the presign key ("never the publicUrl") and the server echoes it back.
   * Resolve with `resolveFileUrl` (`lib/http/files.ts`) before rendering it.
   */
  fileUrl: string | null;
  status: string;
  rejectReason: string | null;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  createdAt: string;
}

/** One row of `GET /api/admin/workers` (`PagedResult<WorkerRowDto>`). */
export interface WorkerRowDto {
  id: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  /**
   * Coarse account status: `Active` | `Pending` | `Deleted` | `Lapsed` |
   * `Blocked`. ⚠ The old `Blocked` is now `Lapsed` (contract ran out); the new
   * `Blocked` is an admin sanction. The export's `Status` column prints the same
   * words. See `WORKER_STATUS_FILTERS`.
   */
  status: string | null;
  onboardingStatus: OnboardingStatus;
  /**
   * Profession **names**, English only. ⚠ `register-merge` (2026-08-19) shrank the
   * seeded profession table to `GENERAL` alone, so today every worker realistically
   * holds exactly `["General Worker"]` — a screen showing one chip on every row is
   * correct, not broken. Still an array, and an admin can still add more.
   */
  skills: string[] | null;
  rating: number;
  experience: number | null;
  completedTasks: number;
  /**
   * Reconciled mirror of the contract's `isActive` flag, refreshed hourly —
   * can lag real cover by up to an hour. Never use it to decide whether a
   * worker is covered right now; read their contract list for `phase: "InForce"`.
   */
  hasActiveContract: boolean;
  /**
   * Assigned to a task whose status is ACTIVE. ⚠ **Renamed from `onTask` on
   * 2026-08-27 (F-06d).** It means **booked, never working** — it never looks at
   * check-in, which is what the agency portal's `onJob` means. Exported as
   * `Booked`/`Free`.
   */
  booked: boolean;
  createdAt: string;
  /**
   * Last sign-in **or** background token refresh. `null` means **never**, not
   * "unknown" — it is the dormancy signal, and the only recency field that can be
   * filtered or sorted. Label it "Last seen", never "Last activity".
   *
   * ⚠ Unrelated to worker-chat presence, which is a live 90-second socket signal.
   */
  lastSeenAt: string | null;
  /**
   * Last actual sign-in; a refresh does not count. `lastSeenAt >= lastLoginAt`
   * always holds, so the pair side by side is meaningful rather than redundant.
   * ⚠ Read-only — neither filterable nor sortable (`400 invalid_sort_column`).
   */
  lastLoginAt: string | null;
  /**
   * Service country/city **names**, not ids (F-04a). `null` for a worker with no
   * service location — every worker who finished their profile before 2026-08-15
   * is in that state, and ⚠ **either location filter excludes them**, so a
   * location-filtered count is never "all workers". The **ids**, for pre-selecting
   * an edit form, come from `GET /api/admin/workers/{id}`.
   */
  country: string | null;
  city: string | null;
  /**
   * Legal name of a **confirmed** agency link, or `null`. ⚠ A worker whose agency
   * was soft-deleted reads `null`.
   */
  agency: string | null;
  /**
   * Legal name of a link that is **not yet confirmed**, or `null`.
   *
   * ⚠ **Mutually exclusive with `agency`** — the database guarantees at most one
   * live link, so `agency` set ⇒ both pending fields `null`, and `pendingAgency`
   * set ⇒ `agency` is `null`. Render **one slot with two appearances**, never two
   * columns: drawing both is the bug the backend's own first draft had.
   */
  pendingAgency: string | null;
  /** Moves with `pendingAgency`. **Never `"Confirmed"`** — that is what `agency` is for. */
  pendingAgencyStatus: "Proposed" | "Disputed" | null;
}

/**
 * `GET /api/admin/workers` query. `status` (coarse) and `onboardingStatus`
 * (exact stage) AND together. `?onboardingStatus=Review` **is** the review queue.
 */
export interface WorkerListQuery extends PagedQuery {
  search?: string;
  status?: WorkerStatusFilter;
  onboardingStatus?: OnboardingStatus;
  /** Repeatable, match-any — `?professionIds=a&professionIds=b`. */
  professionIds?: string[];
  /** 0–5. Outside that range is `400 invalid_filter_value`. */
  ratingMin?: number;
  /** When true, unrated workers are kept alongside the ratingMin set. */
  includeUnrated?: boolean;
  experienceMin?: number;
  experienceMax?: number;
  completedMin?: number;
  completedMax?: number;
  registeredFrom?: string;
  registeredTo?: string;
  /** ⚠ Reads the hourly mirror above, not live cover. */
  hasActiveContract?: boolean;
  /** ⚠ Was `onTask` until 2026-08-27. See the row field. */
  booked?: boolean;
  /**
   * Has a job starting **within 3 days**, both ends included. The 3 is fixed
   * server-side and is not a parameter.
   */
  startingSoon?: boolean;
  /**
   * Has had **no booking** on any non-cancelled task since `now − 7 days`. ⚠ It
   * counts bookings, not work finished, and it is the one filter whose `true` arm
   * is the negative predicate.
   */
  idleWeek?: boolean;
  /**
   * `YYYY-MM-DD`. Who **told us** they can work that day; a dated exception beats
   * the normal week in either direction.
   *
   * ⚠ A worker who has never filled in a schedule **never matches** — absence is
   * unknown, not unavailable. ⚠ It recommends and does **not** gate: nothing stops
   * an "unavailable" worker being assigned.
   */
  availableOn?: string;
  /**
   * Range over `lastSeenAt`. ⚠ Never matches a worker who has never signed in
   * (`NULL <= x` is false in SQL) — use `neverLoggedIn` for that population, and
   * ⚠ pairing either bound with `neverLoggedIn=true` is `400 invalid_filter_value`.
   */
  lastSeenFrom?: string;
  lastSeenTo?: string;
  /**
   * Three-state: `true` never seen · `false` has been seen · **omit → both**. An
   * unchecked control must send *nothing*, not `false`.
   */
  neverLoggedIn?: boolean;
  /**
   * The worker's service country/city, by **id** while the row returns names
   * (F-04a). An unknown id is an empty page, not a `400`, and a deactivated city
   * still matches the workers holding it.
   */
  countryId?: string;
  cityId?: string;
  /** **Confirmed links only** — a claim is not membership (F-05c). */
  agencyId?: string;
  /**
   * ⚠ Both arms key on a **confirmed** link, so a Proposed or Disputed worker
   * counts as `Independent` — which matches the row's own “AGENCY —” reading, so
   * the two can never disagree. AND-combines with `agencyId`, so `Independent` plus
   * an id is an empty page; an unparseable value **is** a 400.
   */
  agencySource?: WorkerAgencySource;
}

/** `?agencySource=` — the third arm of the agency filter (2026-08-27). */
export const WORKER_AGENCY_SOURCES = ["Independent", "ViaAgency"] as const;
export type WorkerAgencySource = (typeof WORKER_AGENCY_SOURCES)[number];

/** `sortBy` whitelist — anything else is `400 invalid_sort_column`. */
export const WORKER_SORT_COLUMNS = [
  "fullName",
  "createdAt",
  "rating",
  "experience",
  "completedTasks",
  /** ⚠ Under `Desc` the never-seen workers come **first** — `NULL`s sort first. */
  "lastSeenAt",
] as const;

export interface WorkerDetailDto {
  id: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  age: number | null;
  gender: string | null;
  experience: number | null;
  onboardingStatus: OnboardingStatus;
  onboardingRejectReason: string | null;
  onboardingReviewedAt: string | null;
  isVerified: boolean;
  rating: number;
  profilePictureUrl: string | null;
  professions: WorkerProfessionDto[] | null;
  documents: WorkerDocumentDto[] | null;
  /**
   * F-03·1. The admin read is one of only two places this block is served — the worker
   * app itself has no self-read route for it.
   */
  identity: WorkerIdentityDto;
}

/**
 * WorkerRating snapshot (`GET /api/admin/workers/{id}/rating`). `displayRating`
 * is null when `isNew` (fewer than the spec threshold of completed tasks) — the
 * UI shows a "New" badge instead of a number. `completionRate` is a 0..1 fraction.
 */
export interface WorkerRatingDto {
  workerId: string;
  displayRating: number | null;
  isNew: boolean;
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  label: string;
  calculatedAt: string;
}

export interface WorkerApprovalDto {
  id: string;
  onboardingStatus: OnboardingStatus;
  onboardingRejectReason: string | null;
  prefill: ContractPrefillDto;
}

/** `reason` is required since F-03 — empty is `400 rejection_reason_required`. */
export interface RejectWorkerRequest {
  reason: string;
}

export interface RejectWorkerDocRequest {
  reason?: string;
}
