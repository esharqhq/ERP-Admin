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

/**
 * Countries, for scoping the owner company-city filter. Held for an hour like the
 * categories above — reference data that changes rarely and is read per screen.
 */
export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: () => lookupService.getCountries(),
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Cities under one country. **Idle until a country is chosen** — there is no
 * endpoint that returns cities without one, and calling with `undefined` would
 * request `/api/countries/undefined/cities` and take a 404.
 *
 * `countryId` is part of the key, so switching country serves that country's list
 * rather than the previous one.
 */
export function useCities(countryId?: string) {
  return useQuery({
    queryKey: ["cities", countryId ?? null],
    queryFn: () => lookupService.getCities(countryId as string),
    enabled: Boolean(countryId),
    staleTime: 60 * 60 * 1000,
  });
}
