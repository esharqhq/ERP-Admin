import { apiClient } from "@/lib/http/client";
import type {
  PropertyDto,
  PropertyDocsBundleDto,
  PropertyDocsApprovalDto,
  UpdatePropertyRequest,
} from "@/lib/types/property.types";

export const propertyService = {
  getProperties: async (): Promise<PropertyDto[]> => {
    const { data } = await apiClient.get<PropertyDto[]>("/api/properties");
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
