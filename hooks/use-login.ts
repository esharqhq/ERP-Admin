"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import type { LoginDto } from "@/lib/types/auth.types";

export function useLogin() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const setAdminMe = useAuthStore((s) => s.setAdminMe);
  const router = useRouter();

  return useMutation({
    // `remember` stays in the panel: it decides the routing cookie's lifetime
    // and is not part of the login request.
    mutationFn: ({ email, password }: LoginDto & { remember: boolean }) =>
      authService.login({ email, password }),
    onSuccess: async (data, { remember }) => {
      setTokens(data, remember);
      try {
        const me = await authService.getProfile();
        setAdminMe(me);
      } catch {
        // non-fatal: proceed to dashboard
      }
      router.push("/dashboard");
    },
  });
}
