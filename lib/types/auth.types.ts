export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthResultDto {
  accessToken: string;
  refreshToken: string;
  expireDate: string;
}

export interface ApiError {
  message: string;
  status: number;
}

export interface AdminRoleRefDto {
  id: string;
  code: string;
  name: string;
}

/** Shape returned by GET /api/profile for an admin (AdminProfileDto). */
export interface AdminProfileDto {
  id: string;
  fullName: string;
  email: string;
  isVerified: boolean;
  profilePictureUrl?: string | null;
  role?: AdminRoleRefDto | null;
}

/** @deprecated retained for import compatibility — use AdminProfileDto. */
export type AdminMeDto = AdminProfileDto;
