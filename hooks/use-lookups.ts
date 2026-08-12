"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lookupService } from "@/lib/services/lookup.service";
import type {
  CreatePropertyCategoryRequest,
  UpdatePropertyCategoryRequest,
} from "@/lib/types/lookup.types";

const CATEGORY_KEY = ["property-categories"] as const;

/**
 * Property categories. Two distinct cache entries — `includeInactive` is part
 * of the key, because the inactive-inclusive list is a strict superset and
 * sharing one entry would let a management screen's fetch leak deactivated
 * categories into a picker that must not offer them.
 *
 * Lookup data changes rarely and is read on several screens, so it is held for
 * an hour rather than refetched per mount.
 */
export function usePropertyCategories(includeInactive = false) {
  return useQuery({
    queryKey: [...CATEGORY_KEY, includeInactive],
    queryFn: () => lookupService.getPropertyCategories(includeInactive),
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Both mutations invalidate the **prefix**, not the entry they were called from.
 * The two `includeInactive` variants are separate cache entries, and every
 * picker in the app reads the active-only one — invalidating just the
 * management screen's inactive-inclusive entry would leave those pickers
 * serving an hour-stale list that omits a category the admin just created.
 */
export function useCreatePropertyCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePropertyCategoryRequest) =>
      lookupService.createPropertyCategory(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORY_KEY }),
  });
}

/** Also the deactivate/reactivate path — `isActive` is a normal field on this patch. */
export function useUpdatePropertyCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePropertyCategoryRequest }) =>
      lookupService.updatePropertyCategory(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORY_KEY }),
  });
}
