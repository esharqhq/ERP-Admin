"use client";

import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "@/lib/services/attendance.service";

/**
 * Attendance rows for `date` (YYYY-MM-DD). `enabled` should be gated on
 * `system:attendance:read` so a custom-override admin lacking it doesn't 403.
 */
export function useAttendance(date: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["attendance", date ?? "today"],
    queryFn: () => attendanceService.getAttendance(date),
    enabled,
  });
}
