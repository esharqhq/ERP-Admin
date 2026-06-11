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

  /**
   * Soft-delete a role (`system:role:delete`). 204 on success. Errors:
   * 404 role_not_found, 400 system_role_immutable (built-in role),
   * 409 role_in_use (still assigned to a live admin/owner/worker or membership).
   */
  deleteRole: async (roleId: string): Promise<void> => {
    await apiClient.delete(`/api/admin/roles/${roleId}`);
  },
};
