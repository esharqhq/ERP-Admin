"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workerDocService } from "@/lib/services/worker-doc.service";

/**
 * Worker documents list. `enabled` should be gated on `worker:doc:read_any` so an
 * admin on a custom-override role without it doesn't trigger a 403 on page load
 * (mirrors `useWorkerRating`'s defensive gating on the same detail page).
 */
export function useWorkerDocs(workerId: string, enabled = true) {
  return useQuery({
    queryKey: ["worker-docs", workerId],
    queryFn: () => workerDocService.getDocs(workerId),
    enabled: !!workerId && enabled,
  });
}

export function useApproveWorkerDoc(workerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => workerDocService.approveDoc(workerId, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["worker-docs", workerId] }),
  });
}

export function useRejectWorkerDoc(workerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, reason }: { docId: string; reason: string }) =>
      workerDocService.rejectDoc(workerId, docId, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["worker-docs", workerId] }),
  });
}
