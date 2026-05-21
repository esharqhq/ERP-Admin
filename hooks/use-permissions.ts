// hooks/use-permissions.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roleService } from "@/lib/services/role.service";
import type {
  CreateCustomRoleRequest,
  UpdateRolePermissionsRequest,
} from "@/lib/types/admin-user.types";

export function useAllRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: roleService.getRoles,
    staleTime: 30_000,
  });
}

export function useCreateRole() {
  return useMutation({
    mutationFn: (data: CreateCustomRoleRequest) => roleService.createRole(data),
  });
}

export function useUpdateRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, body }: { roleId: string; body: UpdateRolePermissionsRequest }) =>
      roleService.updateRolePermissions(roleId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admins"] });
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}
