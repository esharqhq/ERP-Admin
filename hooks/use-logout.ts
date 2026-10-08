"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { signOutHere } from "@/lib/http/sign-out-here";

/** Ends the session on this browser. See `lib/http/sign-out.ts` for why each step exists. */
export function useLogout() {
  const queryClient = useQueryClient();
  const locale = useLocale();

  return useCallback(() => {
    void signOutHere(locale, () => queryClient.clear());
  }, [queryClient, locale]);
}
