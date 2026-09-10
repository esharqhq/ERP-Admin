import { apiClient } from "@/lib/http/client";
import type { PagedResult } from "@/lib/types/paged.types";
import type {
  AgencyLinkQuery,
  AgencyLinkRowDto,
  AttachLinkRequest,
  ResolveLinkRequest,
} from "@/lib/types/agency.types";

/**
 * The worker↔agency link's four admin doors (F-05c §5).
 *
 * **Its own file, not more methods on `agency.service.ts`.** That file is 208
 * lines across two resources already; links are a third with a different route
 * prefix (`/api/admin/`), a different permission pair
 * (`agency_link:read_any` 170003 / `agency_link:manage_any` 170004) and a
 * different lifecycle. Files that change together live together.
 */
export const agencyLinkService = {
  /** `agency_link:read_any` (170003). ⚠ `?status=Disputed` **is** the dispute queue. */
  getLinks: async (
    query: AgencyLinkQuery = {},
  ): Promise<PagedResult<AgencyLinkRowDto>> => {
    const { data } = await apiClient.get<PagedResult<AgencyLinkRowDto>>(
      "/api/admin/agency-links",
      { params: query },
    );
    return data;
  },

  /**
   * `agency_link:manage_any` (170004). Creates a `Proposed`/`ADMIN` link.
   *
   * ⚠ The worker is notified — bell **and** push **and** email — and must
   * confirm. Until they do, the link is not a badge anywhere.
   */
  attachLink: async (body: AttachLinkRequest): Promise<AgencyLinkRowDto> => {
    const { data } = await apiClient.post<AgencyLinkRowDto>(
      "/api/admin/agency-links",
      body,
    );
    return data;
  },

  /**
   * ⚠ **One endpoint, two acts.** On `Proposed`/`WORKER` it agrees with a
   * worker's claim; on `Disputed` it is **the overrule** — ruling against a
   * person who said the link was wrong, recorded separately in the audit log.
   * The state decides, not the caller.
   *
   * ⚠ Refused with `agency_link_not_awaiting_you` on a link an admin created:
   * that row waits on the worker, and closing it here would remove their only
   * chance to object.
   */
  confirmLink: async (
    id: string,
    body: ResolveLinkRequest,
  ): Promise<AgencyLinkRowDto> => {
    const { data } = await apiClient.post<AgencyLinkRowDto>(
      `/api/admin/agency-links/${id}/confirm`,
      body,
    );
    return data;
  },

  /**
   * The only door to `Rejected`, reachable from `Proposed` (either direction),
   * `Disputed` **or `Confirmed`**. `reason` is always required.
   *
   * ⚠ **Nothing notifies the worker.** A worker who disputed a link and had it
   * rejected is not told, so no copy may imply they will hear back.
   */
  rejectLink: async (
    id: string,
    body: ResolveLinkRequest,
  ): Promise<AgencyLinkRowDto> => {
    const { data } = await apiClient.post<AgencyLinkRowDto>(
      `/api/admin/agency-links/${id}/reject`,
      body,
    );
    return data;
  },
};
