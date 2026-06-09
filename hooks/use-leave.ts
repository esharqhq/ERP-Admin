"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { leaveService } from "@/lib/services/leave.service";

export function useLeaveRequests(status?: string) {
  return useQuery({
    queryKey: ["leave-requests", status ?? "all"],
    queryFn: () => leaveService.listAll(status),
  });
}

function useInvalidateLeave() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["leave-requests"] });
    // Approve resolves the linked support ticket server-side; refresh tickets too.
    qc.invalidateQueries({ queryKey: ["support-tickets"] });
  };
}

export function useApproveLeave() {
  const invalidate = useInvalidateLeave();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string | null }) =>
      leaveService.approve(id, note),
    onSuccess: invalidate,
  });
}

export function useRejectLeave() {
  const invalidate = useInvalidateLeave();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string | null }) =>
      leaveService.reject(id, note),
    onSuccess: invalidate,
  });
}
