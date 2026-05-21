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

export function useUpsertSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertSettingRequest) => settingService.upsertSetting(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
