import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminMeDto, AuthResultDto } from "@/lib/types/auth.types";
import { authCookie, expiredAuthCookie } from "@/lib/auth/session-cookie";
import { recordActivity } from "@/lib/auth/idle";

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
  /** `remember`: the login form's "Keep me signed in" (`lib/auth/session-cookie.ts`). */
  setTokens: (result: AuthResultDto, remember: boolean) => void;
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

      setTokens: (result, remember) => {
        if (typeof document !== "undefined") {
          document.cookie = authCookie({ remember, secure: location.protocol === "https:" });
          // Signing in is activity: the idle hour starts here (`lib/auth/idle.ts`).
          recordActivity();
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
          document.cookie = expiredAuthCookie;
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
