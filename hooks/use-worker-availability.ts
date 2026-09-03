"use client";

import { useQuery } from "@tanstack/react-query";
import { availabilityService } from "@/lib/services/availability.service";
import type { DayKey } from "@/lib/ui/week";

/**
 * One worker's declared week — the Matrix's expanded-row strip.
 *
 * **`enabled` is the whole point.** This costs one request per worker and there is
 * no bulk read, so it must stay idle until a row is actually opened. Passing
 * `enabled` as "is this row expanded" is what keeps a 100-row page at zero
 * availability requests instead of a hundred.
 *
 * The week is in the key, so paging to another week re-reads rather than showing
 * the previous week's exceptions against the new dates.
 */
export function useWorkerAvailability(
  workerId: string | null,
  window: { from: DayKey; to: DayKey },
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["worker-availability", workerId, window.from, window.to],
    queryFn: () =>
      availabilityService.getWorkerAvailability(
        workerId as string,
        window.from,
        window.to,
      ),
    enabled: enabled && Boolean(workerId),
    // A schedule is edited by hand and rarely; re-reading it every time a row is
    // collapsed and reopened would spend a request to learn nothing.
    staleTime: 5 * 60 * 1000,
  });
}
