import { apiClient } from "@/lib/http/client";
import { idempotent } from "@/lib/http/idempotency";

export interface SystemSettingDto {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string | null;
}

export interface UpsertSettingRequest {
  key: string;
  value: string;
  description?: string;
}

export const settingService = {
  getSettings: async (): Promise<SystemSettingDto[]> => {
    const { data } = await apiClient.get<SystemSettingDto[]>("/api/system/settings");
    return data;
  },

  /**
   * `[Idempotent]`. The caller holds the key per body written (`holdKey`), so a
   * retry of the same value replays while a different value gets its own key.
   */
  upsertSetting: async (
    body: UpsertSettingRequest,
    idempotencyKey: string,
  ): Promise<SystemSettingDto> => {
    const { data } = await apiClient.put<SystemSettingDto>(
      "/api/system/settings",
      body,
      idempotent(idempotencyKey),
    );
    return data;
  },
};
