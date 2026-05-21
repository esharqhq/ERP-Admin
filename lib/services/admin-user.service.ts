import { apiClient } from "@/lib/http/client";
import type {
  AdminSummaryDto,
  CreateAdminRequest,
  DeactivateAdminRequest,
  ChangeAdminRoleRequest,
} from "@/lib/types/admin-user.types";

export const adminUserService = {
  getAdmins: async (): Promise<AdminSummaryDto[]> => {
    const { data } = await apiClient.get<AdminSummaryDto[]>("/api/admin/users");
    return data;
  },

  createAdmin: async (body: CreateAdminRequest): Promise<AdminSummaryDto> => {
    const { data } = await apiClient.post<AdminSummaryDto>("/api/admin/users", body);
    return data;
  },

  deactivateAdmin: async (id: string, body: DeactivateAdminRequest): Promise<void> => {
    await apiClient.post(`/api/admin/users/${id}/deactivate`, body);
  },

  changeAdminRole: async (id: string, body: ChangeAdminRoleRequest): Promise<void> => {
    await apiClient.post(`/api/admin/users/${id}/role`, body);
  },
};
