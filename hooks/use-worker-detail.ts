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
