"use client";

import { useEffect, useMemo } from "react";
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
 *  - `permissions = null` ONLY on a genuinely cold start — first login of a
 *    session with nothing cached yet. Consumers must treat null as "unknown →
 *    hide" (fail CLOSED), so a limited admin never sees a flash of UI they
 *    aren't allowed to see. RouteGuard/Can already do this.
 *  - On a page refresh the last-known set is hydrated synchronously from the
 *    persisted auth store (like adminMe), so `permissions` is non-null on the
 *    first render and nothing flashes while GET /me/permissions re-validates in
 *    the background.
 *  - Once (re)fetched → a `Set` of the real codes (even `[]` for a role-less
 *    admin). Backend still enforces every `[RequirePermission]` regardless.
 */
export function useCurrentPermissions() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const cachedPermissions = useAuthStore((s) => s.cachedPermissions);
  const setCachedPermissions = useAuthStore((s) => s.setCachedPermissions);

  const query = useQuery({
    // Keep the ["current-permissions"] key so useUpdateRole's invalidation still
    // refreshes the grant set after a role edit. No roleCode in the key — the
    // endpoint is per-user via the JWT.
    queryKey: ["current-permissions"],
    queryFn: permissionService.getMyPermissions,
    enabled: isAuthenticated,
    // A super admin can edit this admin's grants mid-session (custom-role flow),
    // so the set must converge without a re-login: light 60s poll while the tab
    // is visible + refetch on focus + instant refetch on any API 403 (see
    // lib/http/on-forbidden.ts). Ideal future upgrade: SignalR push.
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
    // Seed from the persisted last-known set so a refresh renders the correct
    // gated UI immediately. `initialDataUpdatedAt: 0` marks it stale so the
    // query still refetches on mount to correct any drift (role changed while
    // logged out); backend enforcement makes a brief stale set harmless.
    initialData: cachedPermissions ?? undefined,
    initialDataUpdatedAt: 0,
  });

  // Persist every resolved set so the next refresh hydrates instantly. Structural
  // sharing keeps query.data's reference stable when the codes are unchanged, so
  // this only writes when the grant set actually changes.
  useEffect(() => {
    if (query.data) setCachedPermissions(query.data);
  }, [query.data, setCachedPermissions]);

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
 * True when the current admin holds `code`. No code given → true (nothing to
 * gate). While the grant set is unknown (null, cold start) → false, so gated UI
 * stays hidden until permissions are known rather than flashing. Backend still
 * enforces every code independently.
 */
export function useHasPermission(code?: string): boolean {
  const { permissions } = useCurrentPermissions();
  if (!code) return true;
  if (permissions === null) return false;
  return permissions.has(code);
}
