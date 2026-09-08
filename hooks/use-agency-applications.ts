"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agencyService } from "@/lib/services/agency.service";
import { uploadService } from "@/lib/services/upload.service";
import type {
  AdminIntakeRequest,
  AgencyApplicationDetailDto,
  AgencyApplicationDocumentType,
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

/**
 * The second intake door — an agency that phoned instead of using the form.
 *
 * ⚠ **The caller must keep the whole response.** It is the only moment the
 * plaintext upload token exists outside the applicant's inbox: the row stores a
 * hash, it can never be re-shown, and there is no resend door.
 */
export function useCreateAdminApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminIntakeRequest) =>
      agencyService.createAdminApplication(body),
    onSuccess: (res) => {
      // The new row exists at `Pending`, so the queue is stale — and the detail
      // is already in hand, so seed it rather than making the next screen wait.
      qc.setQueryData([...ROOT, res.application.id], res.application);
      qc.invalidateQueries({ queryKey: [...ROOT, "list"] });
    },
  });
}

/**
 * presign → upload → confirm, as one mutation, because a caller has no use for
 * the intermediate states and every one of them is a failure the panel reports
 * the same way.
 *
 * ⚠ **A failure at step 2 or 3 leaves an orphaned object in storage and no row,
 * and there is no cleanup door.** So a retry re-runs from step 1 with a fresh
 * key: a key whose upload failed is not known-good, and re-confirming it is how
 * `storage_key_mismatch` or `file_not_found` becomes permanent.
 *
 * Step 2 reuses `uploadService.putBytes`, which honours the returned `method`
 * (`"POST"` here, despite the field name), sends raw bytes and — load-bearing —
 * **never attaches the bearer token**, because the presigned URL carries its own
 * HMAC.
 *
 * ⚠ The invalidations are for **other** observers. The intake dialog holds no
 * query on this application, so its own list of uploaded documents comes from
 * each returned DTO rather than from a refetch that would never run.
 */
export function useUploadApplicationDocument(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      type,
      uploadToken,
    }: {
      file: File;
      type: AgencyApplicationDocumentType;
      uploadToken: string;
    }) => {
      const presigned = await agencyService.presignDocument(applicationId, {
        uploadToken,
        fileName: file.name,
        type,
      });
      await uploadService.putBytes(
        presigned.presignedUploadUrl,
        file,
        presigned.method,
      );
      return agencyService.confirmDocument(applicationId, {
        uploadToken,
        storageKey: presigned.storageKey,
        type,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ROOT, applicationId] });
      qc.invalidateQueries({ queryKey: [...ROOT, "list"] });
    },
  });
}
