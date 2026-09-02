"use client";

import { useQueries } from "@tanstack/react-query";
import { attendanceService } from "@/lib/services/attendance.service";
import type { AttendanceRowDto } from "@/lib/types/attendance.types";
import type { DayKey } from "@/lib/ui/week";

export interface AttendanceDay {
  key: DayKey;
  rows: AttendanceRowDto[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export interface AttendanceWeek {
  days: AttendanceDay[];
  /** Index-aligned with the week; `null` for a day that failed. For the builder. */
  rowsByDay: (AttendanceRowDto[] | null)[];
  /** Nothing has landed yet — the grid draws skeletons rather than an empty week. */
  isLoading: boolean;
  /** **Every** day failed, which usually means the permission, not the network. */
  isAllFailed: boolean;
  failedCount: number;
}

/**
 * A week of attendance, as **seven independent reads**.
 *
 * `GET /api/admin/attendance?date=` answers one day, platform-wide, whatever the
 * page size — so the column axis is free and the row axis stays the paged worker
 * list. Seven requests fill the whole grid for 5 workers or for 100.
 *
 * ⚠ **The per-day shape is the design's partial-failure contract, not an
 * implementation detail.** Seven requests mean a failure is **one column wide**:
 * that column greys out and keeps its own retry while the other six stay usable.
 * A `Promise.all` — or any aggregate `isError` — would make one dropped request
 * fail the whole week, which is precisely the behaviour §07 rejects. Keep the
 * array.
 *
 * Gate `enabled` on `system:attendance:read`, the same permission the attendance
 * page uses; without it all seven 403 and `isAllFailed` says so once rather than
 * seven times.
 */
export function useAttendanceWeek(
  dayKeys: DayKey[],
  enabled = true,
): AttendanceWeek {
  const results = useQueries({
    queries: dayKeys.map((key) => ({
      queryKey: ["attendance", key],
      queryFn: () => attendanceService.getAttendance(key),
      enabled,
      // A day's attendance changes as people check in, so this is the one read on
      // the screen that should not be held for minutes. The default (`0`) is
      // right; naming it here stops a future global default from freezing it.
      staleTime: 0,
    })),
  });

  const days: AttendanceDay[] = dayKeys.map((key, i) => {
    const r = results[i];
    return {
      key,
      rows: r?.data ?? [],
      isLoading: r?.isLoading ?? false,
      isError: r?.isError ?? false,
      refetch: () => void r?.refetch(),
    };
  });

  const failedCount = days.filter((d) => d.isError).length;

  return {
    days,
    /*
      `null` marks a failed day so the builder can tell "nobody was booked" apart
      from "we do not know". An empty array for a failed read would draw a
      confidently empty column — the worst of the three possible answers.
    */
    rowsByDay: days.map((d) => (d.isError ? null : d.rows)),
    isLoading: days.some((d) => d.isLoading),
    isAllFailed: failedCount === dayKeys.length && dayKeys.length > 0,
    failedCount,
  };
}
