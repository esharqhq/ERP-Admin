import { apiClient } from "@/lib/http/client";
import type {
  AdminHomeDto,
  WorkerHoursAggregateDto,
  WorkerHoursQuery,
} from "@/lib/types/analytics.types";

export const analyticsService = {
  /** Admin dashboard home. Requires `system:analytics:read`. */
  getAdminHome: async (): Promise<AdminHomeDto> => {
    const { data } = await apiClient.get<AdminHomeDto>(
      "/api/analytics/admin/home",
    );
    return data;
  },

  /**
   * System-wide worker working-hours ("time on site"). Requires
   * `system:analytics:read`. All query params are optional; only the keys that
   * are set are sent (undefined values are dropped). Empty result → 200 with
   * zeroed totals, never 404. Invalid query (`from > to`, bad granularity) → 400.
   */
  getAdminWorkerHours: async (
    query: WorkerHoursQuery = {},
  ): Promise<WorkerHoursAggregateDto> => {
    const params: Record<string, string> = {};
    if (query.from) params.from = query.from;
    if (query.to) params.to = query.to;
    if (query.granularity) params.granularity = query.granularity;
    if (query.workerId) params.workerId = query.workerId;
    if (query.propertyId) params.propertyId = query.propertyId;

    const { data } = await apiClient.get<WorkerHoursAggregateDto>(
      "/api/analytics/admin/hours",
      { params },
    );
    return data;
  },
};
