"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workerDocService } from "@/lib/services/worker-doc.service";

export function useWorkerDocs(workerId: string) {
  return useQuery({
    queryKey: ["worker-docs", workerId],
    queryFn: () => workerDocService.getDocs(workerId),
    enabled: !!workerId,
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
