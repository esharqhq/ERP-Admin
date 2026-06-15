"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ownerService } from "@/lib/services/owner.service";

// ── KYC verification queue (GET /api/admin/kyc) — used by the Contracts owner picker ──

export function useOwnerList(status?: string) {
  return useQuery({
    queryKey: ["owners", status],
    queryFn: () => ownerService.getOwnerList(status),
  });
}

// ── Owner-account directory (GET /api/owners) — distinct from the KYC queue ──

export function useOwnerDirectory(search?: string) {
  return useQuery({
    queryKey: ["owner-directory", search ?? ""],
    queryFn: () => ownerService.listOwners(search),
  });
}

export function useOwner(ownerUserId: string) {
  return useQuery({
    queryKey: ["owner", ownerUserId],
    queryFn: () => ownerService.getOwner(ownerUserId),
    enabled: !!ownerUserId,
  });
}

export function useSoftDeleteOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ownerUserId, reason }: { ownerUserId: string; reason?: string }) =>
      ownerService.deleteOwner(ownerUserId, reason),
    // Invalidate the list only — never the still-mounted ["owner", id] detail observer
    // (delete-then-navigate: removing/invalidating it would refetch the now-deleted id → 404).
    // The caller router.push()es back to the list; the detail query GCs on unmount.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-directory"] });
    },
  });
}

// ── Cross-domain reads on the owner-account detail page (keyed on OwnerUser id) ──

export function useOwnerProperties(ownerUserId: string) {
  return useQuery({
    queryKey: ["owner-properties", ownerUserId],
    queryFn: () => ownerService.getOwnerProperties(ownerUserId),
    enabled: !!ownerUserId,
  });
}

export function useOwnerTaskGroups(ownerUserId: string) {
  return useQuery({
    queryKey: ["owner-task-groups", ownerUserId],
    queryFn: () => ownerService.getOwnerTaskGroups(ownerUserId),
    enabled: !!ownerUserId,
  });
}

export function useOwnerSubAccounts(ownerUserId: string) {
  return useQuery({
    queryKey: ["owner-sub-accounts", ownerUserId],
    queryFn: () => ownerService.getOwnerSubAccounts(ownerUserId),
    enabled: !!ownerUserId,
  });
}
