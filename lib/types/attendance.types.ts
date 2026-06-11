/**
 * Admin attendance report (backend ask #2: GET /api/admin/attendance?date=).
 * Wire shape verified against the live API 2026-06-11 — one row per assigned
 * worker for tasks scheduled that day (absent workers included).
 */
export interface AttendanceRowDto {
  taskId: string;
  taskGroupId: string;
  /** May be null. */
  taskGroupTitle: string | null;
  propertyId: string;
  propertyName: string;
  workerId: string;
  workerName: string;
  /** YYYY-MM-DD. */
  scheduledDate: string;
  /** ISO instant. */
  scheduledAt: string;
  taskStatus: string;
  /** `checkinAt != null`. No-shows surface as `present: false` with null check-in fields. */
  present: boolean;
  checkinAt: string | null;
  checkinLat: number | null;
  checkinLng: number | null;
  checkoutAt: string | null;
  submittedAt: string | null;
  outcome: string;
}
