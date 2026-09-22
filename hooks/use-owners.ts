"use client";

import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ownerService } from "@/lib/services/owner.service";
import { kycService } from "@/lib/services/kyc.service";
import {
  OWNER_SUMMARY_TILES,
  type OwnerSummaryCounts,
} from "@/lib/owners/summary";
import type {
  AdminUpdateOwnerProfileRequest,
  OwnerListQuery,
} from "@/lib/types/owner.types";
import type { KycProfileDto } from "@/lib/types/kyc.types";

// ── The owners TABLE (FND-3) ────────────────────────────────────────────────

/**
 * Paged, filtered owner rows. `keepPreviousData` holds the current page on
 * screen while the next one loads, so paging and tab changes do not blank the
 * table and collapse its height under the cursor.
 *
 * `enabled` should be gated on `owner:list` when used as a filter/search
 * picker on a page whose own gate is a *different* permission (the broadcast
 * Custom-audience picker, e.g.) — same fail-open class `useWorkers` already
 * documents, so an admin lacking `owner:list` doesn't 403 on the picker and
 * force the spurious permission refetch `lib/http/on-forbidden.ts` triggers.
 */
export function useOwners(query: OwnerListQuery = {}, enabled = true) {
  return useQuery({
    queryKey: ["owners-table", query],
    queryFn: () => ownerService.getOwners(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

// ── KYC verification queue (GET /api/admin/kyc) — used by the Contracts owner picker ──

/**
 * `enabled` exists for the one caller that already knows the owner: the property
 * create dialog opened from an owner's own detail page locks the owner, so this
 * queue would be a read it never looks at — and one that 403s for an admin who
 * holds `property:create_any` without the grant behind it, which forces a
 * permission refetch (`lib/http/on-forbidden.ts`) for nothing.
 */
export function useOwnerList(status?: string, enabled = true) {
  return useQuery({
    queryKey: ["owners", status],
    queryFn: () => ownerService.getOwnerList(status),
    enabled,
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

/**
 * The soft-deleted owners, for the restore screen.
 *
 * ⚠ `?status=Deleted` was accepted and **always answered `total: 0`** until
 * 2026-09-07; it returns rows now. Gate `enabled` on `owner:restore` — the
 * screen is SUPER_ADMIN-only and a MODERATOR gets an empty-bodied `403`.
 */
/**
 * The four counts above the owners table, as four one-row reads.
 *
 * The mirror of `useWorkerSummary`, and four requests for the same reason: there
 * is no counts endpoint, so each tile probes its own population with
 * `pageSize: 1` and keeps only `total`.
 *
 * The probes do **not** carry the table's filters. That is the point — the strip
 * says what is true of the directory, not of the current narrowing, and a count
 * that moved with the filters would answer a question nobody asked.
 *
 * **A failed or refused probe reports `0`.** A zero tile draws as cleared and
 * colourless with no action, which is a better reading than an alarming tile
 * built on a number that never arrived; the table below is where a `403` on
 * `owner:list` gets named.
 */
export function useOwnerSummary(enabled = true): {
  counts: OwnerSummaryCounts;
  isLoading: boolean;
} {
  const results = useQueries({
    queries: OWNER_SUMMARY_TILES.map((tile) => ({
      // Shares the ["owners-table"] prefix with the list on purpose: an approve,
      // a reject or a soft-delete invalidates that prefix, and these four counts
      // describe exactly the populations those verbs move between.
      queryKey: ["owners-table", "count", tile.id],
      queryFn: () => ownerService.getOwners({ ...tile.query, page: 1, pageSize: 1 }),
      enabled,
      staleTime: 5 * 60 * 1000,
    })),
  });

  return {
    counts: Object.fromEntries(
      OWNER_SUMMARY_TILES.map((tile, i) => [tile.id, results[i]?.data?.total ?? 0]),
    ),
    // Every tile lands together or the strip flickers four times on first paint.
    isLoading: results.some((r) => r.isLoading),
  };
}

export function useDeletedOwners(enabled = true) {
  return useQuery({
    queryKey: ["owners-deleted"],
    queryFn: () => ownerService.getOwners({ status: "Deleted", pageSize: 100 }),
    enabled,
  });
}

/**
 * Bring a deleted owner back — `POST /api/owners/{id}/restore`.
 *
 * ⚠ The same row returns, with its history. Re-registering is not a restore.
 */
export function useRestoreOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      ownerService.restoreOwner(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owners-deleted"] });
      qc.invalidateQueries({ queryKey: ["owners-table"] });
      qc.invalidateQueries({ queryKey: ["owner-directory"] });
    },
  });
}

export function useSoftDeleteOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ownerUserId, reason }: { ownerUserId: string; reason?: string }) =>
      ownerService.deleteOwner(ownerUserId, reason),
    // Invalidate the lists only — never the still-mounted ["owner", id] detail observer
    // (delete-then-navigate: removing/invalidating it would refetch the now-deleted id → 404).
    // The caller router.push()es back to the list; the detail query GCs on unmount.
    //
    // Both list keys are named. c4458ee moved the owners page off the unpaged
    // picker onto ["owners-table"] and left this pointing at the old key alone,
    // so a deleted owner stayed on screen for the 60s global staleTime.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-directory"] });
      qc.invalidateQueries({ queryKey: ["owners-table"] });
    },
  });
}

/**
 * The owner's KYC profile, keyed on the **OwnerUser** id. Supplies the two
 * things Owner Detail otherwise has no source for: `onboardingStatus`, which
 * decides whether the legal name is admin-editable, and `identity`, which
 * prefills the edit form.
 *
 * `retry: false` because the two interesting outcomes are terminal — a `404`
 * (no profile row) and a `403` (no `kyc:review`) are answers, not failures, and
 * retrying them only delays the guard that reads them.
 */
export function useOwnerKyc(ownerUserId: string) {
  return useQuery({
    queryKey: ["owner-kyc", ownerUserId],
    queryFn: () => kycService.getProfileByOwner(ownerUserId),
    enabled: !!ownerUserId,
    retry: false,
  });
}

/**
 * The id of the permanent "Walk-in / Manual Orders" account, or `null`.
 *
 * `GET /api/owners/{id}` carries no `ownerType`/`isSystem` and the owners table
 * has no id filter, so this is the only way the detail page can recognise that
 * account today. **Temporary** — delete this hook and read the field directly
 * once the backend adds it to `OwnerSummaryDto`.
 *
 * `staleTime: Infinity` because a bootstrap account id cannot change under a
 * running session: this costs one request per session, not one per owner.
 *
 * An **empty** page (no walk-in row) resolves to `null` — that is the
 * unseeded-environment case. A **refused** (403, missing `owner:list`) or
 * **failed** (500, network) request is NOT folded into `null`: it leaves the
 * query in its `error` state instead, and every caller must branch on
 * `isError` separately rather than treat an unresolved id as "no such
 * account".
 *
 * This is why a caller may not simply swallow the error to match a tidy
 * `string | null` contract: the owner detail page's walk-in guard treats an
 * unresolved id as "this is not the walk-in account" and re-enables Edit,
 * Delete, Message and Create contract against it — actions the server will
 * refuse (`409 owner_is_system`, or a 400 for ticket/contract) once the
 * lookup that failed is retried and turns out to have been the walk-in
 * account all along. A caller that can distinguish "no such account" from
 * "couldn't check" should say so, not collapse both into the same
 * failure-open `null`.
 */
export function useWalkInOwnerId() {
  return useQuery({
    queryKey: ["walk-in-owner-id"],
    queryFn: async () => {
      const page = await ownerService.getOwners({ ownerType: "Default", pageSize: 1 });
      // `items` is nullable on the envelope, and an unseeded environment
      // legitimately returns an empty page — both resolve to null, not a throw.
      return page.items?.[0]?.id ?? null;
    },
    staleTime: Infinity,
    retry: false,
  });
}

/**
 * The admin legal-name correction (F-02b·7).
 *
 * The `200` body already carries the three fields that can have changed, so it
 * is merged into the cached KYC profile rather than invalidating it.
 * Invalidating would refetch a route needing `kyc:review` (40011) — which
 * `owner:profile:update_any` (30005) does not imply — so an admin holding only
 * 30005 would save successfully and then be shown a `403` where the result
 * belongs.
 *
 * `["owners-table"]` is deliberately left alone: the table renders `fullName`,
 * the display name, which this endpoint never writes.
 */
export function useUpdateOwner(ownerUserId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminUpdateOwnerProfileRequest) =>
      ownerService.updateOwner(ownerUserId, body),
    onSuccess: (updated) => {
      qc.setQueryData<KycProfileDto>(["owner-kyc", ownerUserId], (prev) =>
        prev
          ? {
              ...prev,
              onboardingStatus: (updated.onboardingStatus ??
                prev.onboardingStatus) as KycProfileDto["onboardingStatus"],
              identity: {
                ...prev.identity,
                firstName: updated.firstName,
                lastName: updated.lastName,
              },
            }
          : prev,
      );
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
