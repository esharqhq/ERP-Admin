"use client";

import { useQuery } from "@tanstack/react-query";
import { workerService } from "@/lib/services/worker.service";

/**
 * Worker list. `enabled` should be gated on `worker:list` when used as a filter
 * picker on a page whose own gate is a *different* permission (e.g. the
 * working-hours page is gated `system:analytics:read`), so a custom-override
 * admin lacking `worker:list` doesn't 403 on the picker (fail-open class).
 */
export function useWorkers(isApproved?: boolean, enabled = true) {
  return useQuery({
    queryKey: ["workers", isApproved],
    queryFn: () => workerService.getWorkers(isApproved),
    enabled,
  });
}
