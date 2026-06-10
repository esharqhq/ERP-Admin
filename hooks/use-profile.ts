"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { authService } from "@/lib/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import type { AdminProfileDto, ChangePasswordDto } from "@/lib/types/auth.types";

/**
 * The current admin's own profile (GET /api/profile → AdminProfileDto).
 *
 * Seeded from the persisted auth store so the page renders instantly, then
 * refetched on mount for freshness (`staleTime: 0` — `initialData` would
 * otherwise be treated as fresh and skip the fetch). `use-login` swallows a
 * failed getProfile (`catch {}`), so `adminMe` can be null on arrival —
 * fetching here is the more robust source. We do NOT write back to the store:
 * the only mutation on this page (password) changes no profile field, so there
 * is nothing to re-sync.
 */
export function useMyProfile() {
  const adminMe = useAuthStore((s) => s.adminMe);

  const query = useQuery<AdminProfileDto>({
    queryKey: ["profile"],
    queryFn: authService.getProfile,
    initialData: adminMe ?? undefined,
    staleTime: 0,
  });

  return {
    profile: query.data ?? adminMe,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/** Change the current admin's own password (POST /api/profile/password). */
export function useChangePassword() {
  return useMutation({
    mutationFn: (dto: ChangePasswordDto) => authService.changePassword(dto),
  });
}
