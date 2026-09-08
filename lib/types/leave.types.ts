// ── Worker leave-request types (mirror GermanyERP.Domain/Models/DTOs/Tasks/WorkerLeaveRequestDtos.cs) ──
// Status enum serializes as its PascalCase NAME (Pending | Approved | Rejected | Cancelled).

export interface WorkerLeaveRequestDto {
  id: string;
  workerId: string;
  targetType: string; // "Task" | "TaskGroup"
  taskId: string | null;
  taskGroupId: string;
  reason: string;
  status: string; // WorkerLeaveRequestStatus name
  supportTicketId: string;
  decidedByAdminId: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  /**
   * The worker's `FullName`, added 2026-09-08 (`cb2d1ee`). Removed this screen's
   * whole-directory read, and with it a silent 100-row cap.
   */
  workerName: string | null;
  /**
   * Earliest `Task.ScheduledAt` among the assignments this request currently
   * affects — the queue's sort key. Added 2026-09-08 (`cb2d1ee`).
   *
   * ⚠ **Computed differently per target** (`WorkerLeaveRequestService.cs:553-585`):
   * a `Task` target returns the task's date **unfiltered**, so an already-started
   * shift carries a **past** timestamp; a `TaskGroup` target is a `MIN` over
   * still-`Pending`, still-future assignments and is `null` when none remain.
   * `null` therefore means "nothing left to protect" — a decided request, or a
   * group whose assignments are gone — never "not urgent".
   */
  soonestAffectedAt: string | null;
}

/** Approve/reject body — the decision note is optional. */
export interface DecideLeaveRequest {
  note?: string | null;
}

/** Filterable statuses for the admin list (plus "all"). */
export const LEAVE_STATUS_FILTERS = [
  "all",
  "Pending",
  "Approved",
  "Rejected",
  "Cancelled",
] as const;
export type LeaveStatusFilter = (typeof LEAVE_STATUS_FILTERS)[number];
