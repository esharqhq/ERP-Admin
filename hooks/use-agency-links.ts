"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agencyLinkService } from "@/lib/services/agency-link.service";
import type {
  AgencyLinkQuery,
  AttachLinkRequest,
  ResolveLinkRequest,
} from "@/lib/types/agency.types";

const ROOT = ["agency-links"] as const;

/**
 * The links queue. Server mode, so the whole query goes in the key — a different
 * filter set is a different cached page, not the same page re-narrowed.
 *
 * `enabled` must be gated on `agency_link:read_any`. ⚠ A MODERATOR **does** hold
 * it (`DatabaseSeeder.cs:1954`) and holds no write grant, so this screen must
 * render completely for a role that can press nothing.
 */
export function useAgencyLinks(query: AgencyLinkQuery, enabled = true) {
  return useQuery({
    queryKey: [...ROOT, "list", query],
    queryFn: () => agencyLinkService.getLinks(query),
    enabled,
  });
}

/**
 * ⚠ **Every verb invalidates two keys, and the second one is the point.** The
 * worker's detail (`["worker", id]`) carries `agencyLink`, and three of the four
 * verbs are pressed on that card — invalidating only the list would leave the
 * card showing the state it was in before the click.
 *
 * ⚠ **`workerId` is passed even to confirm and reject**, whose routes do not
 * take it, because it is what this second invalidation needs. Both the queue row
 * and the card have it to hand.
 *
 * ⚠ **No `setQueryData` shortcut**, unlike phase 3's review verbs: these
 * endpoints answer with the **link**, not with the worker detail, so there is
 * nothing to write into `["worker", id]` without inventing the rest of that DTO.
 */
function useLinkInvalidation() {
  const qc = useQueryClient();
  return (workerId: string) => {
    qc.invalidateQueries({ queryKey: ROOT });
    qc.invalidateQueries({ queryKey: ["worker", workerId] });
  };
}

export function useAttachLink() {
  const invalidate = useLinkInvalidation();
  return useMutation({
    mutationFn: (body: AttachLinkRequest) => agencyLinkService.attachLink(body),
    onSuccess: (_link, body) => invalidate(body.workerId),
  });
}

export function useConfirmLink() {
  const invalidate = useLinkInvalidation();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      workerId: string;
      body: ResolveLinkRequest;
    }) => agencyLinkService.confirmLink(vars.id, vars.body),
    onSuccess: (_link, vars) => invalidate(vars.workerId),
  });
}

export function useRejectLink() {
  const invalidate = useLinkInvalidation();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      workerId: string;
      body: ResolveLinkRequest;
    }) => agencyLinkService.rejectLink(vars.id, vars.body),
    onSuccess: (_link, vars) => invalidate(vars.workerId),
  });
}
