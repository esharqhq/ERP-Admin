"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingService } from "@/lib/services/setting.service";
import type { UpsertSettingRequest } from "@/lib/services/setting.service";

const QUERY_KEY = ["settings"] as const;

export function useSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: settingService.getSettings,
  });
}

/** `idempotencyKey` comes from the caller, held per body written (`holdKey`). */
export function useUpsertSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: UpsertSettingRequest; idempotencyKey: string }) =>
      settingService.upsertSetting(body, idempotencyKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
