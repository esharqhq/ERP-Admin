import { apiClient } from "@/lib/http/client";
import type { KycProfileSummaryDto } from "@/lib/types/kyc.types";
import type {
  AdminOwnerProfileDto,
  AdminUpdateOwnerProfileRequest,
  OwnerListQuery,
  OwnerRowDto,
  OwnerSummaryDto,
} from "@/lib/types/owner.types";
import type { PagedResult } from "@/lib/types/paged.types";
import type { PropertyDto } from "@/lib/types/property.types";
import type { TaskGroupDto } from "@/lib/types/task.types";

export const ownerService = {
  // ── KYC verification queue (GET /api/admin/kyc) — used by the Contracts owner picker ──

  getOwnerList: async (status?: string): Promise<KycProfileSummaryDto[]> => {
    const params = status !== undefined ? { status } : {};
    const { data } = await apiClient.get<KycProfileSummaryDto[]>("/api/admin/kyc", { params });
    return data;
  },

  // ── The owners TABLE (FND-3) — paged, filtered, BOSS-owners only ──

  /**
   * `GET /api/admin/owners` (`owner:list`). The table's real source: it carries
   * `status`, `onboardingStatus`, `propertyCount` and `ownerType`, none of
   * which the `bosses` picker list below has.
   *
   * Errors: `400 invalid_sort_column` / `invalid_filter_value`.
   */
  getOwners: async (query: OwnerListQuery = {}): Promise<PagedResult<OwnerRowDto>> => {
    const { data } = await apiClient.get<PagedResult<OwnerRowDto>>(
      "/api/admin/owners",
      { params: query },
    );
    return data;
  },

  // ── Owner picker list — distinct from the table above and from the KYC queue ──

  /**
   * Unpaginated and unfiltered by design: this is what a picker wants. Do not
   * reach for it to build a table — see `getOwners`.
   */
  listOwners: async (search?: string): Promise<OwnerSummaryDto[]> => {
    const params = search ? { search } : {};
    const { data } = await apiClient.get<OwnerSummaryDto[]>("/api/admin/owners/bosses", { params });
    return data;
  },

  getOwner: async (ownerUserId: string): Promise<OwnerSummaryDto> => {
    const { data } = await apiClient.get<OwnerSummaryDto>(`/api/owners/${ownerUserId}`);
    return data;
  },

  getOwnerSubAccounts: async (ownerUserId: string): Promise<OwnerSummaryDto[]> => {
    const { data } = await apiClient.get<OwnerSummaryDto[]>(
      `/api/owners/${ownerUserId}/sub-accounts`,
    );
    return data;
  },

  /** Soft-delete an owner. `reason` is recorded in the OWNER_DEACTIVATED audit entry. */
  deleteOwner: async (ownerUserId: string, reason?: string): Promise<void> => {
    const params = reason ? { reason } : {};
    await apiClient.delete(`/api/owners/${ownerUserId}`, { params });
  },

  /**
   * Admin corrects an owner's **legal** name (F-02b·7). SUPER_ADMIN-only —
   * `owner:profile:update_any` (30005), which MODERATOR does not hold.
   *
   * A `200` does not prove anything changed: a no-op edit returns the current
   * values and writes no audit entry. Compare the response if you need to know.
   */
  updateOwner: async (
    ownerUserId: string,
    body: AdminUpdateOwnerProfileRequest,
  ): Promise<AdminOwnerProfileDto> => {
    const { data } = await apiClient.put<AdminOwnerProfileDto>(
      `/api/owners/${ownerUserId}`,
      body,
    );
    return data;
  },

  // ── Cross-domain reads used on the owner-account detail page (keyed on OwnerUser id) ──

  getOwnerProperties: async (ownerUserId: string): Promise<PropertyDto[]> => {
    const { data } = await apiClient.get<PropertyDto[]>("/api/properties", {
      params: { ownerUserId },
    });
    return data;
  },

  // GET /api/tasks/admin/groups returns the FULL TaskGroupDto list (NOT a summary
  // projection) — propertyName/firstDate must be derived client-side by consumers.
  getOwnerTaskGroups: async (ownerUserId: string): Promise<TaskGroupDto[]> => {
    const { data } = await apiClient.get<TaskGroupDto[]>(
      "/api/tasks/admin/groups",
      { params: { ownerUserId } },
    );
    return data;
  },
};
