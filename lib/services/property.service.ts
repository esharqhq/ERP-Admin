import { apiClient } from "@/lib/http/client";
import type {
  PropertyDto,
  PropertyDocsBundleDto,
  PropertyDocsApprovalDto,
  UpdatePropertyRequest,
  CreateAdminPropertyRequest,
} from "@/lib/types/property.types";

export const propertyService = {
  /**
   * `includeDeleted` is honored only if the caller also holds `property:restore`
   * (otherwise the backend forces it false — non-privileged callers never see
   * deleted rows). Pass `ownerUserId` to scope to one BOSS owner.
   */
  getProperties: async (opts?: {
    includeDeleted?: boolean;
    ownerUserId?: string;
  }): Promise<PropertyDto[]> => {
    const params: Record<string, string | boolean> = {};
    if (opts?.includeDeleted) params.includeDeleted = true;
    if (opts?.ownerUserId) params.ownerUserId = opts.ownerUserId;
    const { data } = await apiClient.get<PropertyDto[]>("/api/properties", {
      params,
    });
    return data;
  },

  /** Restore a soft-deleted property. Requires `property:restore`. */
  restoreProperty: async (id: string): Promise<void> => {
    await apiClient.post(`/api/properties/${id}/restore`);
  },

  /**
   * Admin create-on-behalf-of-owner (`property:create_any`). Idempotent — sends
   * X-Idempotency-Key so a retried submit replays the cached 201.
   */
  createAdminProperty: async (
    body: CreateAdminPropertyRequest,
  ): Promise<PropertyDto> => {
    const { data } = await apiClient.post<PropertyDto>(
      "/api/admin/properties",
      body,
      { headers: { "X-Idempotency-Key": crypto.randomUUID() } },
    );
    return data;
  },

  getPropertyById: async (id: string): Promise<PropertyDto> => {
    const { data } = await apiClient.get<PropertyDto>(`/api/properties/${id}`);
    return data;
  },

  // Edit/soft-delete: no admin role holds property:update / property:soft_delete
  // (those are owner-scoped BOSS perms). Admins are authorized via the
  // controller's `Admin → property:list` branch of CanAccessPropertyAsync — so
  // gate the UI on property:list, not the nominal endpoint permission.
  updateProperty: async (id: string, body: UpdatePropertyRequest): Promise<PropertyDto> => {
    const { data } = await apiClient.put<PropertyDto>(`/api/properties/${id}`, body);
    return data;
  },

  softDeleteProperty: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/properties/${id}`);
  },

  getAdminPropertyDocs: async (propertyId: string): Promise<PropertyDocsBundleDto> => {
    const { data } = await apiClient.get<PropertyDocsBundleDto>(
      `/api/admin/properties/${propertyId}/docs`,
    );
    return data;
  },

  approvePropertyDocs: async (propertyId: string): Promise<PropertyDocsApprovalDto> => {
    const { data } = await apiClient.post<PropertyDocsApprovalDto>(
      `/api/admin/properties/${propertyId}/docs/approve`,
    );
    return data;
  },

  rejectPropertyDocs: async (
    propertyId: string,
    reason: string,
  ): Promise<PropertyDocsApprovalDto> => {
    const { data } = await apiClient.post<PropertyDocsApprovalDto>(
      `/api/admin/properties/${propertyId}/docs/reject`,
      { reason },
    );
    return data;
  },

  resetPropertyDocs: async (
    propertyId: string,
    reason: string,
  ): Promise<PropertyDocsApprovalDto> => {
    const { data } = await apiClient.post<PropertyDocsApprovalDto>(
      `/api/admin/properties/${propertyId}/docs/reset`,
      { reason },
    );
    return data;
  },
};
