import { apiClient } from "@/lib/http/client";
import type { AvailabilityDto } from "@/lib/types/availability.types";

export const availabilityService = {
  /**
   * One worker's declared schedule. `worker:read`.
   *
   * ⚠ **One worker per request — there is no bulk read.** That single fact is why
   * the Matrix draws booked work as its ground and layers availability on one
   * expanded row at a time: a 25-row page would otherwise be 25 requests and a
   * 100-row page 100, for one screen.
   *
   * ⚠ `from`/`to` bound the **exceptions only** — the base and the seven weekday
   * rows always come back in full. The server's default window is *today … +90
   * days*, so a read of a **past** week that omits the bounds returns no
   * exceptions at all and the caller silently draws the plain weekday pattern with
   * every override missing. Always pass the week.
   */
  getWorkerAvailability: async (
    workerId: string,
    from?: string,
    to?: string,
  ): Promise<AvailabilityDto> => {
    const { data } = await apiClient.get<AvailabilityDto>(
      `/api/admin/workers/${workerId}/availability`,
      { params: from && to ? { from, to } : undefined },
    );
    return data;
  },
};
