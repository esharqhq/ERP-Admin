// lib/services/role.service.ts
import { apiClient } from "@/lib/http/client";
import type {
  RoleDto,
  PermissionDto,
  CreateCustomRoleRequest,
  UpdateRolePermissionsRequest,
} from "@/lib/types/admin-user.types";

export const roleService = {
  getPermissions: async (): Promise<PermissionDto[]> => {
    const { data } = await apiClient.get<PermissionDto[]>("/api/admin/permissions");
    return data;
  },

  getRoles: async (): Promise<RoleDto[]> => {
    const { data } = await apiClient.get<RoleDto[]>("/api/admin/roles");
    return data;
  },

  createRole: async (body: CreateCustomRoleRequest): Promise<RoleDto> => {
    const { data } = await apiClient.post<RoleDto>("/api/admin/roles", body);
    return data;
  },

  updateRolePermissions: async (
    roleId: string,
    body: UpdateRolePermissionsRequest,
  ): Promise<RoleDto> => {
    const { data } = await apiClient.patch<RoleDto>(`/api/admin/roles/${roleId}`, body);
    return data;
  },
};
