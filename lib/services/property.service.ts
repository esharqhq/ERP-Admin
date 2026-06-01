import { apiClient } from "@/lib/http/client";
import type {
  PropertyDto,
  PropertyDocsBundleDto,
  PropertyDocsApprovalDto,
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
