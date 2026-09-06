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

export function useBroadcastDetail(id: string) {
  return useQuery({
    queryKey: ["broadcasts", "detail", id],
    queryFn: () => broadcastService.getById(id),
    enabled: !!id,
  });
}
