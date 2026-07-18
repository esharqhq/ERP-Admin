import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminMeDto, AuthResultDto } from "@/lib/types/auth.types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expireDate: string | null;
  isAuthenticated: boolean;
  adminMe: AdminMeDto | null;
  /**
   * Last-known effective permission codes for the signed-in admin, persisted so
   * a page refresh can hydrate the grant set synchronously (like adminMe) and
   * skip the "everything visible → filtered" flash while GET /me/permissions
   * re-fetches. Null until the first successful fetch of a session.
   */
  cachedPermissions: string[] | null;
  setTokens: (result: AuthResultDto) => void;
  setAdminMe: (me: AdminMeDto) => void;
  setCachedPermissions: (codes: string[]) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      expireDate: null,
      isAuthenticated: false,
      adminMe: null,
      cachedPermissions: null,

      setTokens: (result) => {
        if (typeof document !== "undefined") {
          document.cookie = `auth-token=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        }
        set({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expireDate: result.expireDate,
          isAuthenticated: true,
        });
      },

      setAdminMe: (me) => set({ adminMe: me }),

      setCachedPermissions: (codes) => set({ cachedPermissions: codes }),

      clearAuth: () => {
        if (typeof document !== "undefined") {
          document.cookie = "auth-token=; path=/; max-age=0";
        }
        set({
          accessToken: null,
          refreshToken: null,
          expireDate: null,
          isAuthenticated: false,
          adminMe: null,
          cachedPermissions: null,
        });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expireDate: state.expireDate,
        isAuthenticated: state.isAuthenticated,
        adminMe: state.adminMe,
        cachedPermissions: state.cachedPermissions,
      }),
    },
  ),
);
