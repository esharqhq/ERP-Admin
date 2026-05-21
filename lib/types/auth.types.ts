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

export interface AdminMeDto {
  sub: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}
