import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminMeDto, AuthResultDto } from "@/lib/types/auth.types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expireDate: string | null;
  isAuthenticated: boolean;
  adminMe: AdminMeDto | null;
  setTokens: (result: AuthResultDto) => void;
  setAdminMe: (me: AdminMeDto) => void;
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
      }),
    },
  ),
);
