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
    mutationFn: (credentials: LoginDto) => authService.login(credentials),
    onSuccess: async (data) => {
      setTokens(data);
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
