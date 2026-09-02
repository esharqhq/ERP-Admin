import { apiClient } from "@/lib/http/client";
import type { ActiveAgencyDto } from "@/lib/types/agency.types";

export const agencyService = {
  /**
   * The picker list — every agency whose partnership is in force, ordered by legal
   * name server-side. `[Authorize]` only, **no permission** (`f-05-c` §4.2), so it
   * never 403s on a role that lacks the agency screens.
   *
   * ⚠ **Unpaged and unfiltered** (`f-05-0` §9) — it returns every live agency in
   * one array. Fine at the expected scale; if that stops being true this is the
   * call to page, not the picker to redesign.
   */
  getActiveAgencies: async (): Promise<ActiveAgencyDto[]> => {
    const { data } = await apiClient.get<ActiveAgencyDto[]>("/api/agencies/active");
    return data;
  },
};
