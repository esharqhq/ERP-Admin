"use client";

import { useQuery } from "@tanstack/react-query";
import { lookupService } from "@/lib/services/lookup.service";

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
    queryKey: ["property-categories", includeInactive],
    queryFn: () => lookupService.getPropertyCategories(includeInactive),
    staleTime: 60 * 60 * 1000,
  });
}
