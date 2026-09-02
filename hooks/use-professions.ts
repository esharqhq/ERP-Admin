"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { professionService } from "@/lib/services/profession.service";
import type {
  CreateProfessionRequest,
  UpdateProfessionRequest,
} from "@/lib/types/profession.types";

const KEY = ["professions"] as const;

/**
 * The profession lookup.
 *
 * `includeInactive` is part of the key: the inactive-inclusive list is a strict
 * superset, and sharing one cache entry would let the management screen's fetch
 * leak deactivated professions into a picker that must not offer them. Same rule
 * as `usePropertyCategories`.
 */
export function useProfessions(includeInactive = false) {
  return useQuery({
    queryKey: [...KEY, includeInactive],
    queryFn: () => professionService.list(includeInactive),
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Both mutations invalidate the **prefix**, not the entry they were called from —
 * the two `includeInactive` variants are separate entries and every picker in the
 * app reads the active-only one.
 */
function useInvalidateProfessions() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEY });
}

export function useCreateProfession() {
  const invalidate = useInvalidateProfessions();
  return useMutation({
    mutationFn: (body: CreateProfessionRequest) => professionService.create(body),
    onSuccess: invalidate,
  });
}

/** Also the deactivate/reactivate path — `isActive` is a normal field on this patch. */
export function useUpdateProfession() {
  const invalidate = useInvalidateProfessions();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProfessionRequest }) =>
      professionService.update(id, body),
    onSuccess: invalidate,
  });
}

/**
 * Deactivation, which is what the retired `DELETE` became.
 *
 * Its own hook rather than a call site passing `{ isActive: false }` by hand: the
 * screen asks a destructive-looking question and this is the one verb that answers
 * it, so naming it keeps the confirm dialog honest about what it does — the row is
 * hidden from pickers, not erased, and `{ isActive: true }` brings it back
 * losslessly.
 */
export function useDeactivateProfession() {
  const invalidate = useInvalidateProfessions();
  return useMutation({
    mutationFn: (id: string) => professionService.update(id, { isActive: false }),
    onSuccess: invalidate,
  });
}

export function useReactivateProfession() {
  const invalidate = useInvalidateProfessions();
  return useMutation({
    mutationFn: (id: string) => professionService.update(id, { isActive: true }),
    onSuccess: invalidate,
  });
}
