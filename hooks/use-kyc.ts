"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kycService } from "@/lib/services/kyc.service";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";
import type { PagedQuery } from "@/lib/types/paged.types";

/**
 * The owner KYC queue, one page at a time.
 *
 * ⚠ Paging is part of the key. `GET /api/admin/kyc` became a `PagedResult` on
 * 2026-09-08 with `pageSize` defaulting to 25; keying only on `status` would
 * serve page 2 out of page 1's cache entry.
 */
export function useKycList(status?: OnboardingStatus, paging: PagedQuery = {}) {
  return useQuery({
    queryKey: ["kyc", status, paging.page ?? null, paging.pageSize ?? null],
    queryFn: () => kycService.getList(status, paging),
  });
}

export function useKycProfile(ownerProfileId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["kyc", "profile", ownerProfileId],
    queryFn: () => kycService.getProfile(ownerProfileId),
    enabled,
  });
}

/**
 * Per-document verdicts on one owner's KYC bundle. They move no status and notify
 * nobody, so they only ever invalidate this profile's own read — the queue's rows
 * are unaffected by a file-level decision.
 */
export function useApproveKycDoc(ownerProfileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => kycService.approveDoc(ownerProfileId, docId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["kyc", "profile", ownerProfileId] }),
  });
}

export function useRejectKycDoc(ownerProfileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, reason }: { docId: string; reason: string }) =>
      kycService.rejectDoc(ownerProfileId, docId, { reason }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["kyc", "profile", ownerProfileId] }),
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
