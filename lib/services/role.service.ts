// lib/services/role.service.ts
import { apiClient } from "@/lib/http/client";
import type {
  RoleDto,
  CreateRoleRequest,
  UpdateRoleRequest,
} from "@/lib/types/admin-user.types";

export const roleService = {
  getRoles: async (): Promise<RoleDto[]> => {
    const { data } = await apiClient.get<RoleDto[]>("/api/admin/roles");
    return data;
  },

  createRole: async (body: CreateRoleRequest): Promise<RoleDto> => {
    const { data } = await apiClient.post<RoleDto>("/api/admin/roles", body, {
      headers: { "X-Idempotency-Key": crypto.randomUUID() },
    });
    return data;
  },

  updateRole: async (roleId: string, body: UpdateRoleRequest): Promise<RoleDto> => {
    const { data } = await apiClient.patch<RoleDto>(`/api/admin/roles/${roleId}`, body);
    return data;
  },
};
