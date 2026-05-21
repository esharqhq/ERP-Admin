import { apiClient } from "@/lib/http/client";

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

  upsertSetting: async (body: UpsertSettingRequest): Promise<SystemSettingDto> => {
    const { data } = await apiClient.put<SystemSettingDto>("/api/system/settings", body);
    return data;
  },
};
