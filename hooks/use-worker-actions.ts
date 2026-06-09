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

export function useSoftDeleteWorker(workerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => workerService.softDeleteWorker(workerId),
    onSuccess: () => {
      // The worker is now IsDeleted, so the detail endpoint 404s — drop its
      // cache rather than refetching it (caller navigates back to the list).
      qc.removeQueries({ queryKey: ["worker", workerId] });
      qc.removeQueries({ queryKey: ["worker-rating", workerId] });
      qc.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}
