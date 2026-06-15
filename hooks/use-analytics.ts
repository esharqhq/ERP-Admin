"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/lib/services/analytics.service";

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
