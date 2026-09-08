"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agencyService } from "@/lib/services/agency.service";
import type {
  CreateAgencyRequest,
  UpdateAgencyRequest,
} from "@/lib/types/agency.types";

/**
 * Agencies that can be picked today, for the workers table's `?agencyId=` filter.
 *
 * Held for an hour like the other reference lists (`useCountries`, `useCities`) —
 * partnerships change on a legal timescale, not a browsing one, and this list is
 * read on every visit to a filtered table.
 *
 * No `enabled` gate: the endpoint carries no permission, so unlike `useWorkers`
 * there is no role that can turn it into a 403.
 */
export function useActiveAgencies() {
  return useQuery({
    queryKey: ["agencies", "active"],
    queryFn: () => agencyService.getActiveAgencies(),
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * The partner list. Unlike `useActiveAgencies` this is the admin read
 * (`agency:read` 170002), so it **must** be gated — a MODERATOR holds no agency
 * permission at all and would take a bodiless 403.
 *
 * Short `staleTime`, deliberately unlike the hour the picker holds: this is the
 * list an operator has just edited, and a stale row after a save reads as a lost
 * write.
 */
export function useAgencies(enabled = true) {
  return useQuery({
    queryKey: ["agencies", "list"],
    queryFn: () => agencyService.getAgencies(),
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * The four writes all invalidate `["agencies"]` rather than `["agencies","list"]`,
 * which also drops `["agencies","active"]` — a new or deleted partner changes who
 * the workers table's `?agencyId=` filter can offer.
 */
function useAgencyInvalidation() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["agencies"] });
}

export function useCreateAgency() {
  const invalidate = useAgencyInvalidation();
  return useMutation({
    mutationFn: (body: CreateAgencyRequest) => agencyService.createAgency(body),
    onSuccess: invalidate,
  });
}

export function useUpdateAgency(id: string) {
  const invalidate = useAgencyInvalidation();
  return useMutation({
    mutationFn: (body: UpdateAgencyRequest) =>
      agencyService.updateAgency(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteAgency() {
  const invalidate = useAgencyInvalidation();
  return useMutation({
    mutationFn: (id: string) => agencyService.deleteAgency(id),
    onSuccess: invalidate,
  });
}

/**
 * No invalidation: re-sending the link changes nothing readable on `AgencyDto`.
 * `isVerified` moves only when the **agency** consumes the link, which no admin
 * action can bring forward.
 */
export function useResendAgencyInvite() {
  return useMutation({
    mutationFn: (id: string) => agencyService.resendSetPassword(id),
  });
}
