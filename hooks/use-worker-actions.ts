"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { workerService } from "@/lib/services/worker.service";

export function useApproveWorker(workerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => workerService.approveWorker(workerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worker", workerId] });
      qc.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}

export function useRejectWorker(workerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) =>
      workerService.rejectWorker(workerId, reason ? { reason } : {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worker", workerId] });
      qc.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}
