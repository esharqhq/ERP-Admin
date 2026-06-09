"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminUserService } from "@/lib/services/admin-user.service";
import type {
  CreateAdminRequest,
  UpdateAdminRequest,
  AssignAdminRoleRequest,
  DeactivateAdminRequest,
} from "@/lib/types/admin-user.types";

const QUERY_KEY = ["admins"] as const;

export function useAdmins() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: adminUserService.getAdmins,
  });
}

export function useAdmin(id: string) {
  return useQuery({
    queryKey: ["admin", id],
    queryFn: () => adminUserService.getAdmin(id),
    enabled: !!id,
  });
}

export function useCreateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdminRequest) => adminUserService.createAdmin(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateAdmin(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAdminRequest) => adminUserService.updateAdmin(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["admin", id] });
    },
  });
}

export function useAssignAdminRole(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignAdminRoleRequest) => adminUserService.assignRole(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["admin", id] });
    },
  });
}

export function useDeactivateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DeactivateAdminRequest }) =>
      adminUserService.deactivateAdmin(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
