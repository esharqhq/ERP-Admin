import { apiClient } from "@/lib/http/client";
import type {
  AdminProfileDto,
  AuthResultDto,
  ChangePasswordDto,
  LoginDto,
  RefreshTokenDto,
} from "@/lib/types/auth.types";

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

  /**
   * Change the current admin's password. 400 `{ error: "invalid_current_password" }`
   * when CurrentPassword is wrong. Changing the password does NOT invalidate the
   * existing JWT, so the session stays valid afterwards.
   */
  changePassword: async (dto: ChangePasswordDto): Promise<void> => {
    await apiClient.post("/api/profile/password", dto);
  },
};
