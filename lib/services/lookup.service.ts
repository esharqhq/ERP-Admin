import { apiClient } from "@/lib/http/client";
import type { PropertyCategoryDto } from "@/lib/types/lookup.types";

export const lookupService = {
  /**
   * FND-1 property categories. The GET carries **no** `[RequirePermission]` —
   * any authenticated user may read it, so this needs no permission gate.
   *
   * Returns **active categories only** by default. `includeInactive` is honored
   * solely for callers holding `property_category:update`; for anyone else the
   * backend forces it false rather than refusing, so the flag is safe to send
   * and its effect is not guaranteed. Pass it on the management screen (which
   * must show deactivated rows to reactivate them), leave it off for pickers —
   * assigning a deactivated category to a property is `400
   * property_category_inactive`.
   */
  getPropertyCategories: async (
    includeInactive = false,
  ): Promise<PropertyCategoryDto[]> => {
    const params = includeInactive ? { includeInactive: true } : {};
    const { data } = await apiClient.get<PropertyCategoryDto[]>(
      "/api/property-categories",
      { params },
    );
    return data;
  },
};
