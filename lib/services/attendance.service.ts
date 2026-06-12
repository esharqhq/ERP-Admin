import { apiClient } from "@/lib/http/client";
import type { AttendanceRowDto } from "@/lib/types/attendance.types";

export const attendanceService = {
  /**
   * Attendance rows for `date` (YYYY-MM-DD). Omit `date` → backend defaults to
   * today (UTC). Requires `system:attendance:read`.
   */
  getAttendance: async (date?: string): Promise<AttendanceRowDto[]> => {
    const { data } = await apiClient.get<AttendanceRowDto[]>(
      "/api/admin/attendance",
      { params: date ? { date } : undefined },
    );
    return data;
  },
};
