import { apiClient } from "@/lib/http/client";
import type {
  AdminSummaryDto,
  AdminDetailDto,
  CreateAdminRequest,
  UpdateAdminRequest,
  AssignAdminRoleRequest,
  DeactivateAdminRequest,
} from "@/lib/types/admin-user.types";

export const adminUserService = {
  getAdmins: async (): Promise<AdminSummaryDto[]> => {
    const { data } = await apiClient.get<AdminSummaryDto[]>("/api/admin/users");
    return data;
  },

  getAdmin: async (id: string): Promise<AdminDetailDto> => {
    const { data } = await apiClient.get<AdminDetailDto>(`/api/admin/users/${id}`);
    return data;
  },

  createAdmin: async (body: CreateAdminRequest): Promise<AdminSummaryDto> => {
    const { data } = await apiClient.post<AdminSummaryDto>("/api/admin/users", body);
    return data;
  },

  updateAdmin: async (id: string, body: UpdateAdminRequest): Promise<AdminDetailDto> => {
    const { data } = await apiClient.patch<AdminDetailDto>(`/api/admin/users/${id}`, body);
    return data;
  },

  assignRole: async (id: string, body: AssignAdminRoleRequest): Promise<AdminDetailDto> => {
    const { data } = await apiClient.post<AdminDetailDto>(`/api/admin/users/${id}/role`, body, {
      headers: { "X-Idempotency-Key": crypto.randomUUID() },
    });
    return data;
  },

  deactivateAdmin: async (id: string, body: DeactivateAdminRequest): Promise<void> => {
    await apiClient.post(`/api/admin/users/${id}/deactivate`, body);
  },
};
