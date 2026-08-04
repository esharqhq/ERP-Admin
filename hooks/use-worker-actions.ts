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
    mutationFn: (reason: string) =>
      workerService.rejectWorker(workerId, { reason }),
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
      // Only invalidate the list. Do NOT remove/invalidate ["worker", id] /
      // ["worker-rating", id]: their observers are still mounted on the detail
      // page, so touching them forces an immediate refetch against the now-deleted
      // worker (→ 404). The caller navigates back to the list; those queries GC
      // on unmount. ["worker", id] isn't a prefix of ["workers"], so this is safe.
      qc.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}
