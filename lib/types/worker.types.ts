import type {
  AccountStatusFilter,
  ContractPrefillDto,
  OnboardingStatus,
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
  /** Coarse account status: Active | Pending | Deleted | Blocked. */
  status: string | null;
  onboardingStatus: OnboardingStatus;
  employeeType: string | null;
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
  onTask: boolean;
  createdAt: string;
}

/**
 * `GET /api/admin/workers` query. `status` (coarse) and `onboardingStatus`
 * (exact stage) AND together. `?onboardingStatus=Review` **is** the review queue.
 */
export interface WorkerListQuery extends PagedQuery {
  search?: string;
  status?: AccountStatusFilter;
  onboardingStatus?: OnboardingStatus;
  employeeType?: string;
  /** Repeatable, match-any. */
  professionIds?: string[];
  ratingMin?: number;
  /** When true, unrated workers are kept alongside the ratingMin set. */
  includeUnrated?: boolean;
  experienceMin?: number;
  experienceMax?: number;
  completedMin?: number;
  completedMax?: number;
  registeredFrom?: string;
  registeredTo?: string;
  hasActiveContract?: boolean;
  onTask?: boolean;
}

/** `sortBy` whitelist — anything else is `400 invalid_sort_column`. */
export const WORKER_SORT_COLUMNS = [
  "fullName",
  "createdAt",
  "rating",
  "experience",
  "completedTasks",
] as const;

export interface WorkerDetailDto {
  id: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  employeeType: string | null;
  age: number | null;
  address: string | null;
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
