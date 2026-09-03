"use client";

import { useQuery } from "@tanstack/react-query";
import { agencyService } from "@/lib/services/agency.service";

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
