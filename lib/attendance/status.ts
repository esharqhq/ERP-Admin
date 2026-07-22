import type { AttendanceRowDto } from "@/lib/types/attendance.types";

export type AttendanceStatus = "present" | "late" | "absent";

/** Minutes after the scheduled start before a check-in counts as late. */
export const LATE_GRACE_MINUTES = 5;

/** Sort severity: absent (worst) → late → present (best). */
export const STATUS_ORDER: Record<AttendanceStatus, number> = {
  absent: 0,
  late: 1,
  present: 2,
};

/**
 * Derive a single mutually-exclusive status for one attendance row.
 * Absent = no check-in. Late = checked in > LATE_GRACE_MINUTES after the
 * scheduled start. Otherwise Present. Unparseable timestamps degrade to Present
 * (we can't prove lateness).
 */
export function deriveStatus(row: AttendanceRowDto): AttendanceStatus {
  if (!row.present || !row.checkinAt) return "absent";
  const scheduled = Date.parse(row.scheduledAt);
  const checkedIn = Date.parse(row.checkinAt);
  if (Number.isNaN(scheduled) || Number.isNaN(checkedIn)) return "present";
  return checkedIn > scheduled + LATE_GRACE_MINUTES * 60_000 ? "late" : "present";
}

export interface AttendanceSummary {
  assigned: number;
  present: number;
  late: number;
  absent: number;
  /** (present + late) / assigned as a rounded %, 0 when there are no rows. */
  rate: number;
}

export function summarize(statuses: AttendanceStatus[]): AttendanceSummary {
  let present = 0;
  let late = 0;
  let absent = 0;
  for (const s of statuses) {
    if (s === "present") present++;
    else if (s === "late") late++;
    else absent++;
  }
  const assigned = statuses.length;
  const rate = assigned === 0 ? 0 : Math.round(((present + late) / assigned) * 100);
  return { assigned, present, late, absent, rate };
}
