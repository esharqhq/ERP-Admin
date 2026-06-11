// hooks/use-permissions.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roleService } from "@/lib/services/role.service";
import { permissionService } from "@/lib/services/permission.service";
import type {
  CreateRoleRequest,
  UpdateRoleRequest,
} from "@/lib/types/admin-user.types";

export function useAllRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: roleService.getRoles,
    staleTime: 30_000,
  });
}

/** Full permission registry (GET /api/admin/permissions). Requires system:permission:read. */
export function usePermissionCatalog() {
  return useQuery({
    queryKey: ["permission-catalog"],
    queryFn: permissionService.getCatalog,
    staleTime: 10 * 60_000,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoleRequest) => roleService.createRole(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, body }: { roleId: string; body: UpdateRoleRequest }) =>
      roleService.updateRole(roleId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admins"] });
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["current-permissions"] });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => roleService.deleteRole(roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}
