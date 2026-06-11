export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

/**
 * Body for POST /api/profile/password (ChangePasswordDto). Both fields are
 * `[Required, MinLength(6)]` on the backend; works for any authenticated user
 * type including Admin (AuthService.ChangePasswordAsync has an Admin branch).
 */
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

/**
 * Body for PUT /api/profile (UpdateProfileRequest). Multi-type shape, but for an
 * ADMIN only `fullName` + `profilePictureUrl` take effect — all other fields are
 * ignored, and email is immutable here (changing it is reserved for admin:update).
 * Returns 200 { message: "profile_updated" }. See backend ask (d).
 */
export interface UpdateProfileRequest {
  fullName: string;
  profilePictureUrl?: string | null;
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
