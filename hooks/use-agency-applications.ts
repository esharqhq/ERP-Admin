"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agencyService } from "@/lib/services/agency.service";
import type {
  AgencyApplicationDetailDto,
  AgencyApplicationQuery,
  ApproveApplicationRequest,
  ReviewTextRequest,
} from "@/lib/types/agency.types";

const ROOT = ["agency-applications"] as const;

/**
 * The review queue. Server mode, so the whole query goes in the key — a different
 * filter set is a different cached page, not the same page re-narrowed.
 *
 * `enabled` must be gated on `agency_application:read`; unlike the agencies list
 * a MODERATOR **does** hold it, so this is the one agency read they can make.
 */
export function useAgencyApplications(
  query: AgencyApplicationQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: [...ROOT, "list", query],
    queryFn: () => agencyService.getApplications(query),
    enabled,
  });
}

/**
 * One application. ⚠ **`refetch` is part of this hook's public surface**: every
 * read mints ~5-minute `previewUrl`s, so the viewer's reload calls it rather than
 * re-requesting an image whose signature has expired.
 */
export function useAgencyApplication(id: string, enabled = true) {
  return useQuery({
    queryKey: [...ROOT, id],
    queryFn: () => agencyService.getApplication(id),
    enabled: Boolean(id) && enabled,
  });
}

/**
 * All three verbs return the **full detail DTO**, so each writes it straight into
 * the detail cache before invalidating the list.
 *
 * ⚠ Invalidating alone would blank the pane the admin is reading while the
 * refetch is in flight — and on approve it would also drop the `createdAgencyId`
 * the handoff dialog needs.
 */
function useReviewMutation<TBody>(
  id: string,
  call: (body: TBody) => Promise<AgencyApplicationDetailDto>,
  alsoInvalidate: readonly unknown[][] = [],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: (detail) => {
      qc.setQueryData([...ROOT, id], detail);
      qc.invalidateQueries({ queryKey: [...ROOT, "list"] });
      for (const key of alsoInvalidate) qc.invalidateQueries({ queryKey: key });
    },
  });
}

export function useRequestInfo(id: string) {
  return useReviewMutation<ReviewTextRequest>(id, (body) =>
    agencyService.requestInfo(id, body),
  );
}

export function useRejectApplication(id: string) {
  return useReviewMutation<ReviewTextRequest>(id, (body) =>
    agencyService.rejectApplication(id, body),
  );
}

/**
 * ⚠ Also invalidates `["agencies"]`: approve **created an agency**, and both the
 * partner list and the workers table's `?agencyId=` picker read that key.
 */
export function useApproveApplication(id: string) {
  return useReviewMutation<ApproveApplicationRequest>(
    id,
    (body) => agencyService.approveApplication(id, body),
    [["agencies"]],
  );
}
