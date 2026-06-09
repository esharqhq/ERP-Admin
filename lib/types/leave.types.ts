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
