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

/**
 * BOSS-owner directory. `enabled` should be gated on `owner:list` when this is
 * used as a *supporting* read on a page gated by a different permission — the
 * properties table joins it purely to resolve owner names, and a custom-override
 * admin holding `property:list` but not `owner:list` must get a dash in that
 * column rather than a 403 on page load (an API 403 also forces a permission
 * refetch — see `lib/http/on-forbidden.ts`). The owners page itself, which is
 * already gated on `owner:list`, can leave it at the default.
 */
export function useOwnerDirectory(search?: string, enabled = true) {
  return useQuery({
    queryKey: ["owner-directory", search ?? ""],
    queryFn: () => ownerService.listOwners(search),
    enabled,
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
