"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { permissionService } from "@/lib/services/permission.service";
import { useAuthStore } from "@/store/auth.store";

/**
 * Resolve the current admin's *effective* permission codes from the backend
 * (ask #5: `GET /api/admin/me/permissions`).
 *
 * The JWT carries only the role *code* (no permission claims). This endpoint is
 * `[Authorize]`-only, so it resolves the real grant set for SUPER_ADMIN,
 * MODERATOR, *and* `custom_<uuid>`-role admins alike — unlike the role catalog,
 * which needs `system:permission:read` (MODERATOR lacks it) and so forced us to
 * fail open for moderators before.
 *
 * Semantics:
 *  - While the query is loading / on transient error → `permissions = null`
 *    ("unknown → don't hide anything", fail OPEN — avoids a blank UI flash).
 *  - Once resolved → a `Set` of the real codes (even `[]` for a role-less admin),
 *    so gating is fail CLOSED and finally honest. Backend still enforces every
 *    `[RequirePermission]` regardless.
 */
export function useCurrentPermissions() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    // Keep the ["current-permissions"] key so useUpdateRole's invalidation still
    // refreshes the grant set after a role edit. No roleCode in the key — the
    // endpoint is per-user via the JWT.
    queryKey: ["current-permissions"],
    queryFn: permissionService.getMyPermissions,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Memoized so the Set reference is stable as long as query.data is the same
  // array reference. Without this, every render creates a new Set, which breaks
  // any useEffect dependency array that includes `permissions`.
  const permissions: Set<string> | null = useMemo(
    () => (query.data ? new Set(query.data) : null),
    [query.data],
  );

  return { permissions, isLoading: query.isLoading };
}

/**
 * True when the current admin holds `code`. Fails open ONLY while the grant set
 * is still unknown (null) or no code is given; once loaded, an absent code
 * returns false (backend still enforces independently).
 */
export function useHasPermission(code?: string): boolean {
  const { permissions } = useCurrentPermissions();
  if (!code) return true;
  if (permissions === null) return false;
  return permissions.has(code);
}
