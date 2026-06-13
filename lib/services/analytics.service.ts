import { apiClient } from "@/lib/http/client";
import type { AdminHomeDto } from "@/lib/types/analytics.types";

export const analyticsService = {
  /** Admin dashboard home. Requires `system:analytics:read`. */
  getAdminHome: async (): Promise<AdminHomeDto> => {
    const { data } = await apiClient.get<AdminHomeDto>(
      "/api/analytics/admin/home",
    );
    return data;
  },
};
