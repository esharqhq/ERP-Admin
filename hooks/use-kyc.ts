"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kycService } from "@/lib/services/kyc.service";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";

export function useKycList(status?: OnboardingStatus) {
  return useQuery({
    queryKey: ["kyc", status],
    queryFn: () => kycService.getList(status),
  });
}

export function useKycProfile(ownerProfileId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["kyc", "profile", ownerProfileId],
    queryFn: () => kycService.getProfile(ownerProfileId),
    enabled,
  });
}

export function useApproveKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ownerProfileId: string) => kycService.approve(ownerProfileId),
    // Invalidate both react-query caches over GET /api/admin/kyc: this hook's own
    // ["kyc"] list and the ["owners"] cache the Properties owner picker reads
    // (hooks/use-owners.ts) — else a just-approved owner stays stale there.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kyc"] });
      qc.invalidateQueries({ queryKey: ["owners"] });
    },
  });
}

export function useRejectKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ownerProfileId, reason }: { ownerProfileId: string; reason: string }) =>
      kycService.reject(ownerProfileId, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kyc"] });
      qc.invalidateQueries({ queryKey: ["owners"] });
    },
  });
}
