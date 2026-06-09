"use client";

import { useQuery } from "@tanstack/react-query";
import { workerService } from "@/lib/services/worker.service";

export function useWorkerDetail(id: string) {
  return useQuery({
    queryKey: ["worker", id],
    queryFn: () => workerService.getWorkerById(id),
    enabled: !!id,
  });
}

/**
 * Worker rating snapshot. `enabled` should be gated on the `worker_rating:read_any`
 * permission so moderators without it don't trigger a 403.
 */
export function useWorkerRating(id: string, enabled = true) {
  return useQuery({
    queryKey: ["worker-rating", id],
    queryFn: () => workerService.getWorkerRating(id),
    enabled: !!id && enabled,
  });
}
