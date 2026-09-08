import { apiClient } from "@/lib/http/client";
import type {
  ActiveAgencyDto,
  AgencyDto,
  CreateAgencyRequest,
  UpdateAgencyRequest,
} from "@/lib/types/agency.types";

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

  /**
   * Every live agency. ⚠ **Unpaged, unfiltered, and takes no query parameters at
   * all** — the whole set arrives in one array, ordered by `legalName`
   * server-side. `agency:read` (170002).
   */
  getAgencies: async (): Promise<AgencyDto[]> => {
    const { data } = await apiClient.get<AgencyDto[]>("/api/agencies");
    return data;
  },

  /**
   * `agency:create` (170001). Also **mails a one-time set-password link** — valid
   * 72 hours, usable once. ⚠ A `201` means the rows were written and the mail was
   * *queued*; if it never arrives the repair is `resendSetPassword`, not a second
   * create, which answers `agency_email_taken`.
   */
  createAgency: async (body: CreateAgencyRequest): Promise<AgencyDto> => {
    const { data } = await apiClient.post<AgencyDto>("/api/agencies", body);
    return data;
  },

  /** `agency:update` (170007). The only writer of the two contract dates. */
  updateAgency: async (
    id: string,
    body: UpdateAgencyRequest,
  ): Promise<AgencyDto> => {
    const { data } = await apiClient.put<AgencyDto>(`/api/agencies/${id}`, body);
    return data;
  },

  /**
   * Soft delete. ⚠ **Gated on `agency:create` (170001), not a delete permission** —
   * there is no `agency:delete` code. It releases the login email, so the same
   * company can be created or approved again as a **new row**; its worker links
   * survive untouched.
   */
  deleteAgency: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/agencies/${id}`);
  },

  /**
   * `agency:create` (170001). ⚠ **Invalidates the previous link** — only the newest
   * one works. It is the only way to re-issue; `POST /api/auth/resend-otp` does not
   * work for an agency and never will.
   */
  resendSetPassword: async (id: string): Promise<void> => {
    await apiClient.post(`/api/agencies/${id}/resend-set-password`);
  },
};
