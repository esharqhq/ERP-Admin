"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/lib/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import type {
  AdminProfileDto,
  ChangePasswordDto,
  UpdateProfileRequest,
} from "@/lib/types/auth.types";

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

/**
 * Update the current admin's own name + avatar (PUT /api/profile). On success we
 * both refetch ["profile"] and write the new values back into the auth store so
 * the sidebar/header chip (which read `adminMe`) update immediately.
 */
export function useUpdateProfile() {
  const qc = useQueryClient();
  const setAdminMe = useAuthStore((s) => s.setAdminMe);
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => authService.updateProfile(body),
    onSuccess: (_d, body) => {
      const current = useAuthStore.getState().adminMe;
      if (current) {
        setAdminMe({
          ...current,
          fullName: body.fullName,
          profilePictureUrl: body.profilePictureUrl ?? null,
        });
      }
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
