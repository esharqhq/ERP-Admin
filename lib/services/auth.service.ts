import { apiClient } from "@/lib/http/client";
import type { AdminProfileDto, AuthResultDto, LoginDto, RefreshTokenDto } from "@/lib/types/auth.types";

export const authService = {
  login: async (credentials: LoginDto): Promise<AuthResultDto> => {
    const { data } = await apiClient.post<AuthResultDto>(
      "/api/Auth/login?userType=Admin",
      credentials,
    );
    return data;
  },

  refresh: async (dto: RefreshTokenDto): Promise<AuthResultDto> => {
    const { data } = await apiClient.post<AuthResultDto>(
      "/api/Auth/refresh",
      dto,
    );
    return data;
  },

  getProfile: async (): Promise<AdminProfileDto> => {
    const { data } = await apiClient.get<AdminProfileDto>("/api/profile");
    return data;
  },
};
