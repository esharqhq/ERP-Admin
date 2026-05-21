"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kycService } from "@/lib/services/kyc.service";
import type { KycStatus } from "@/lib/types/kyc.types";

export function useKycList(status?: KycStatus) {
  return useQuery({
    queryKey: ["kyc", status],
    queryFn: () => kycService.getList(status),
  });
}

export function useApproveKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ownerProfileId: string) => kycService.approve(ownerProfileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kyc"] }),
  });
}

export function useRejectKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ownerProfileId, reason }: { ownerProfileId: string; reason: string }) =>
      kycService.reject(ownerProfileId, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kyc"] }),
  });
}
