"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { kycService } from "@/lib/services/kyc.service";
import { summariseDetail, type QueueDetail } from "@/lib/onboarding/queue-detail";

/**
 * The per-row extras the owner queue's columns need — company, per-file verdicts
 * and the submission date — for the rows **currently on screen**.
 *
 * ## Why this exists at all
 *
 * `GET /api/admin/kyc` returns eight fields
 * (`Backend/GermanyERP.Domain/Models/DTOs/Kyc/KycDtos.cs`) and none of the four the
 * design's row draws. `GET /api/admin/kyc/{ownerProfileId}` returns all of them.
 * There is no third option: `OwnerRowDto` carries no company either, so the owners
 * list cannot be joined in the way the contracts list is. Filed as ask #24.
 *
 * ## Why this is not the N+1 it looks like
 *
 * It is bounded to one page — 25 rows by default, not the whole queue — and every
 * entry is keyed **`["kyc", "profile", id]`, the key `useKycProfile` uses**. So
 * paging back is free, and clicking a row opens a detail page whose data is
 * already in the cache. The read that pays for these columns also removes the
 * detail screen's spinner.
 *
 * It is still a real cost, and it is the reason `MAX_DOTS` and the page size
 * matter. If the queue ever pages 100 at a time, this is the thing to revisit.
 *
 * ## What it deliberately does not do
 *
 * No `retry`. One row's detail failing must not hold the table: that row's extras
 * stay `undefined` and its cells render as unknown rather than as zero — see
 * `waitingDays`, which returns `null` rather than `0` for a detail that has not
 * arrived.
 */
export function useQueueDetails(profileIds: string[]): {
  details: Map<string, QueueDetail>;
  /** True while any visible row's extras are still out. */
  isPending: boolean;
} {
  const ids = useMemo(
    () => Array.from(new Set(profileIds.filter(Boolean))),
    [profileIds],
  );

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["kyc", "profile", id],
      queryFn: () => kycService.getProfile(id),
      // The bundle behind a row changes only when an admin decides something, and
      // deciding invalidates this key. A minute of staleness on a queue costs
      // nothing and stops a tab switch from refetching twenty-five rows.
      staleTime: 60_000,
      retry: false,
    })),
  });

  const details = useMemo(() => {
    const map = new Map<string, QueueDetail>();
    results.forEach((result, i) => {
      if (result.data) map.set(ids[i], summariseDetail(result.data));
    });
    return map;
  }, [results, ids]);

  return { details, isPending: results.some((r) => r.isPending) };
}
