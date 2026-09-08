import { apiClient } from "@/lib/http/client";
import type { PagedResult } from "@/lib/types/paged.types";
import type {
  ActiveAgencyDto,
  AdminIntakeRequest,
  AdminIntakeResponse,
  AgencyApplicationDetailDto,
  AgencyApplicationDocumentDto,
  AgencyApplicationQuery,
  AgencyApplicationRowDto,
  AgencyDto,
  ApproveApplicationRequest,
  ConfirmDocumentRequest,
  CreateAgencyRequest,
  PresignDocumentRequest,
  PresignDocumentResponse,
  ReviewTextRequest,
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

  /**
   * The review queue. `agency_application:read` (170005) — held by MODERATOR too.
   * ⚠ `?status=Pending` is the work queue.
   */
  getApplications: async (
    query: AgencyApplicationQuery,
  ): Promise<PagedResult<AgencyApplicationRowDto>> => {
    const { data } = await apiClient.get<PagedResult<AgencyApplicationRowDto>>(
      "/api/agency-applications",
      { params: query },
    );
    return data;
  },

  /**
   * `agency_application:read` (170005). ⚠ This route **does** answer a
   * `404 { error: "application_not_found", detail }` — unlike the public document
   * doors, which answer `invalid_or_expired_token` for an unknown id so that a
   * stranger cannot learn which ids exist. Reaching this one already required a
   * permission.
   *
   * ⚠ Every call mints fresh `previewUrl`s. That is what the viewer's reload is for.
   */
  getApplication: async (id: string): Promise<AgencyApplicationDetailDto> => {
    const { data } = await apiClient.get<AgencyApplicationDetailDto>(
      `/api/agency-applications/${id}`,
    );
    return data;
  },

  /**
   * `agency_application:manage` (170006). The note is **required** (≤2000) and
   * lands in `infoRequestNote`; a missing or blank one is `400 note_required`.
   *
   * ⚠ Legal from `InfoRequested` as well as `Pending` — asking twice replaces the
   * note and re-stamps the reviewer, so the button stays enabled.
   */
  requestInfo: async (
    id: string,
    body: ReviewTextRequest,
  ): Promise<AgencyApplicationDetailDto> => {
    const { data } = await apiClient.post<AgencyApplicationDetailDto>(
      `/api/agency-applications/${id}/request-info`,
      body,
    );
    return data;
  },

  /**
   * `agency_application:manage` (170006). Same field name as request-info,
   * **required**, but it lands in `decisionReason` — a different column. A blank
   * one is `400 reason_required`.
   */
  rejectApplication: async (
    id: string,
    body: ReviewTextRequest,
  ): Promise<AgencyApplicationDetailDto> => {
    const { data } = await apiClient.post<AgencyApplicationDetailDto>(
      `/api/agency-applications/${id}/reject`,
      body,
    );
    return data;
  },

  /**
   * `agency_application:manage` (170006). **This creates the account.**
   *
   * ⚠ A `200` means the account EXISTS, not that the agency can log in: login
   * reads `signedOn`/`validUntil` live on every attempt, and a freshly approved
   * agency normally has neither. `createdAgencyId` on the response names the new
   * agency, and `PUT /api/agencies/{id}` is the moment access opens.
   */
  approveApplication: async (
    id: string,
    body: ApproveApplicationRequest,
  ): Promise<AgencyApplicationDetailDto> => {
    const { data } = await apiClient.post<AgencyApplicationDetailDto>(
      `/api/agency-applications/${id}/approve`,
      body,
    );
    return data;
  },

  /** `agency_application:manage` (170006). ⚠ Keep the whole response — see the DTO. */
  createAdminApplication: async (
    body: AdminIntakeRequest,
  ): Promise<AdminIntakeResponse> => {
    const { data } = await apiClient.post<AdminIntakeResponse>(
      "/api/agency-applications/admin",
      body,
    );
    return data;
  },

  /**
   * Step 1 of three. **No login** — authorised by the upload token in the body.
   *
   * ⚠ An unknown application id answers `invalid_or_expired_token`, **not** a
   * `404`: a `404` would confirm which ids exist. Unknown app, wrong token and
   * expired token are indistinguishable, so one message must serve all three.
   */
  presignDocument: async (
    applicationId: string,
    body: PresignDocumentRequest,
  ): Promise<PresignDocumentResponse> => {
    const { data } = await apiClient.post<PresignDocumentResponse>(
      `/api/agency-applications/${applicationId}/documents/presign`,
      body,
    );
    return data;
  },

  /** Step 3 of three. `previewUrl` comes back `null` — the uploader has the file. */
  confirmDocument: async (
    applicationId: string,
    body: ConfirmDocumentRequest,
  ): Promise<AgencyApplicationDocumentDto> => {
    const { data } = await apiClient.post<AgencyApplicationDocumentDto>(
      `/api/agency-applications/${applicationId}/documents`,
      body,
    );
    return data;
  },
};
