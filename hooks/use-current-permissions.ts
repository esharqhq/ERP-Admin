"use client";

import { useQuery } from "@tanstack/react-query";
import { roleService } from "@/lib/services/role.service";
import { useAuthStore } from "@/store/auth.store";

/**
 * Resolve the current admin's effective permission names.
 *
 * The JWT carries only the role *code* (no permission claims — see
 * GermanyERP.AuthService GenerateAccessToken), so we resolve the role's
 * permission set via GET /api/admin/roles. That endpoint requires
 * `system:permission:read` (held by SUPER_ADMIN, not MODERATOR). For admins
 * who cannot read roles, or whose role can't be matched, we **fail open**
 * (return null) — client gating is cosmetic; the backend still enforces every
 * `[RequirePermission]`. See backend ask #5 for a proper effective-permissions
 * endpoint.
 *
 * Returns `permissions = null` to mean "unknown → don't hide anything".
 */
export function useCurrentPermissions() {
  const roleCode = useAuthStore((s) => s.adminMe?.role?.code);

  const query = useQuery({
    queryKey: ["current-permissions", roleCode],
    queryFn: roleService.getRoles,
    enabled: !!roleCode,
    staleTime: 5 * 60_000,
    retry: false,
  });

  let permissions: Set<string> | null = null;
  if (query.data && roleCode) {
    const role = query.data.find((r) => r.code === roleCode);
    if (role) permissions = new Set(role.permissions ?? []);
  }

  return { permissions, isLoading: query.isLoading };
}

/**
 * True when the current admin holds `code`. Fails open: when the permission set
 * is unknown (null) or no code is given, returns true (backend still enforces).
 */
export function useHasPermission(code?: string): boolean {
  const { permissions } = useCurrentPermissions();
  if (!code) return true;
  if (permissions === null) return true;
  return permissions.has(code);
}
