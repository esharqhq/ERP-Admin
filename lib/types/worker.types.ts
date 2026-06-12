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
  fileUrl: string | null;
  status: string;
  rejectReason: string | null;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  createdAt: string;
}

export interface WorkerSummaryDto {
  id: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  isApproved: boolean;
  isVerified: boolean;
  rating: number;
  createdAt: string;
}

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
  isApproved: boolean;
  isVerified: boolean;
  rating: number;
  profilePictureUrl: string | null;
  professions: WorkerProfessionDto[] | null;
  documents: WorkerDocumentDto[] | null;
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
  isApproved: boolean;
}

export interface RejectWorkerRequest {
  reason?: string;
}

export interface RejectWorkerDocRequest {
  reason?: string;
}
