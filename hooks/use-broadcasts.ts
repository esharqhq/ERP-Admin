"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { broadcastService } from "@/lib/services/broadcast.service";
import type { BroadcastStatus } from "@/lib/types/broadcast.types";

/**
 * Paged broadcast rows, server mode (FND-3 `PagedResult<BroadcastRowDto>`).
 * `keepPreviousData` holds the current page on screen while the next one
 * loads, matching `useOwners` — a status-tab or page change should not blank
 * the table and collapse its height.
 */
export function useBroadcastList(params: {
  status?: BroadcastStatus;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ["broadcasts", "list", params],
    queryFn: () => broadcastService.list(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * `f-01-a-broadcast-core.md`: "Poll route 3 until
 * `status` becomes `Sent`" — a 15 s interval while the record is still
 * `Sending`, which self-disables the moment the cached data flips (the
 * function form reads `query.state.data`, not a value captured at mount), and
 * never runs at all for the other four terminal-ish statuses. No effect or
 * manual `stopPolling` needed for the "one final fetch then never again" rule
 * in the design doc — the interval simply stops computing once `status` is no
 * longer `Sending`.
 */
export function useBroadcastDetail(id: string) {
  return useQuery({
    queryKey: ["broadcasts", "detail", id],
    queryFn: () => broadcastService.getById(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === "Sending" ? 15_000 : false,
  });
}
