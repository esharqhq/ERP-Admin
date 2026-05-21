"use client";

import { useQuery } from "@tanstack/react-query";
import { workerService } from "@/lib/services/worker.service";

export function useWorkers(isApproved?: boolean) {
  return useQuery({
    queryKey: ["workers", isApproved],
    queryFn: () => workerService.getWorkers(isApproved),
  });
}
