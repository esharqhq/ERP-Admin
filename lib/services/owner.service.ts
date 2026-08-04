import { apiClient } from "@/lib/http/client";
import type { KycProfileSummaryDto } from "@/lib/types/kyc.types";
import type { OwnerSummaryDto } from "@/lib/types/owner.types";
import type { PropertyDto } from "@/lib/types/property.types";
import type { TaskGroupDto } from "@/lib/types/task.types";

export const ownerService = {
  // ── KYC verification queue (GET /api/admin/kyc) — used by the Contracts owner picker ──

  getOwnerList: async (status?: string): Promise<KycProfileSummaryDto[]> => {
    const params = status !== undefined ? { status } : {};
    const { data } = await apiClient.get<KycProfileSummaryDto[]>("/api/admin/kyc", { params });
    return data;
  },

  // ── Owner-account directory (GET /api/owners) — distinct from the KYC queue ──

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
