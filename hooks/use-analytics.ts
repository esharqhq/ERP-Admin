"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/lib/services/analytics.service";
import type { WorkerHoursQuery } from "@/lib/types/analytics.types";

/**
 * Admin dashboard home analytics. `enabled` should be gated on
 * `system:analytics:read` so a custom-override admin lacking it doesn't trigger
 * a 403 on the landing page (mirrors the worker-docs / property-docs defensive
 * gating pattern).
 */
export function useAdminHome(enabled = true) {
  return useQuery({
    queryKey: ["analytics-home"],
    queryFn: analyticsService.getAdminHome,
    enabled,
    staleTime: 60_000,
  });
}

/**
 * System-wide worker working-hours. The query key includes every param so a
 * filter change refetches; `enabled` should be gated on `system:analytics:read`
 * (same perm as the analytics home & attendance report).
 */
export function useAdminWorkerHours(query: WorkerHoursQuery, enabled = true) {
  return useQuery({
    queryKey: ["worker-hours", query],
    queryFn: () => analyticsService.getAdminWorkerHours(query),
    enabled,
    staleTime: 60_000,
  });
}
