// lib/types/admin-user.types.ts

export type AdminRoleCode = "SUPER_ADMIN" | "MODERATOR";

export interface AdminSummaryDto {
  id: string;
  fullName: string;
  email: string;
  roleCode: AdminRoleCode;
  isVerified: boolean;
  profilePictureUrl: string | null;
  createdAt: string;
}

export interface CreateAdminRequest {
  fullName: string;
  email: string;
  password: string;
  roleCode: AdminRoleCode;
}

export interface DeactivateAdminRequest {
  reason?: string;
}

export interface ChangeAdminRoleRequest {
  roleCode: AdminRoleCode;
}
