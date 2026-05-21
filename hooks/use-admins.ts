"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminUserService } from "@/lib/services/admin-user.service";
import type {
  CreateAdminRequest,
  DeactivateAdminRequest,
} from "@/lib/types/admin-user.types";

const QUERY_KEY = ["admins"] as const;

export function useAdmins() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: adminUserService.getAdmins,
  });
}

export function useCreateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdminRequest) => adminUserService.createAdmin(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
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
