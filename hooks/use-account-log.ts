"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  auditService,
  type AuditLogEntryDto,
} from "@/lib/services/audit.service";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";

/**
 * The admin actions recorded against one account, newest first.
 *
 * ⚠ **This is not a lifecycle feed, and the card that renders it must not claim
 * to be one.** `GET /api/admin/audit-log` is the super-admin audit trail: it
 * records what an *admin* did, keyed on `(targetEntity, targetId)`. Three
 * consequences, each verified against the backend source rather than assumed:
 *
 * - **Per-document verdicts are absent.** `WorkerDocApproved` / `OwnerKycDocApproved`
 *   are written with `targetId: doc.Id`
 *   (`GermanyERP.Services/Workers/WorkerDocService.cs:304`,
 *   `.../Kyc/KycService.cs:826`), so they are unreachable from a subject id. The
 *   subject is in the metadata, which is not a filterable column.
 * - **Contract events are absent** for the same reason — `ContractSent` /
 *   `ContractSigned` key on the contract id.
 * - **Nothing the subject did is here at all.** There is no audit member for a
 *   registration, a KYC submission, a sub-account invite or a ticket, so those
 *   rows of the design cannot be drawn from this source.
 *
 * A per-subject lifecycle feed is filed in `BACKEND-ASKS.md`. Until it exists the
 * card states what it holds and names what it excludes, because a partial feed
 * presented as a complete one is the single worst thing this surface could do.
 *
 * **Two ids, not one.** The owner side writes against `OwnerUser` (deactivation,
 * keyed on the user id) *and* `OwnerProfile` (KYC verdicts and legal-name
 * corrections, keyed on the profile id), so an owner's entries only assemble
 * from both. The worker side writes everything against `WorkerUser` and passes
 * one id. Nulls are skipped, so a caller may pass a profile id that has not
 * arrived yet.
 */
export function useAccountLog(targetIds: (string | null | undefined)[]) {
  /**
   * Read through `useCurrentPermissions` rather than `useHasPermission`: that
   * hook collapses "denied" and "not resolved yet" into one `false`, which is
   * right for a button and wrong here, where the card states the refusal in
   * words and would assert it for one paint on a cold start.
   */
  const { permissions } = useCurrentPermissions();
  const canRead: boolean | null =
    permissions === null ? null : permissions.has("system:audit:read");

  const ids = useMemo(
    () => Array.from(new Set(targetIds.filter((id): id is string => !!id))),
    [targetIds],
  );

  const results = useQueries({
    queries: ids.map((targetId) => ({
      // Same shape as `useAuditLog`'s key, so an entry fetched here and one
      // fetched by the audit screen share a cache slot rather than racing.
      queryKey: ["audit-log", { targetId }],
      queryFn: () => auditService.getAuditLog({ targetId }),
      enabled: canRead === true,
      retry: false,
    })),
  });

  const entries = useMemo(() => {
    const merged: AuditLogEntryDto[] = [];
    for (const result of results) {
      if (result.data) merged.push(...result.data);
    }
    // One entry cannot be written against two target ids, so no de-duplication
    // is needed — only an ordering across the two lists.
    return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [results]);

  return {
    entries,
    /** `null` while the grant set is unknown — not the same as `false`. */
    canRead,
    /** `enabled: false` leaves a query pending forever — check `canRead` first. */
    isPending: canRead === true && results.some((r) => r.isPending),
    isError: results.some((r) => r.isError),
  };
}
