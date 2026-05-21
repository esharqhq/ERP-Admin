// lib/types/admin-user.types.ts

export type AdminRoleCode = "SUPER_ADMIN" | "MODERATOR";

export interface AdminSummaryDto {
  id: string;
  fullName: string;
  email: string;
  roleCode: string;           // "SUPER_ADMIN" | "custom_xxx" | "MODERATOR"
  roleId: string;             // UUID — PATCH /api/admin/roles/{roleId} uchun kerak
  isVerified: boolean;
  profilePictureUrl: string | null;
  createdAt: string;
}

export interface PermissionDto {
  id: string;
  name: string;               // "worker:list", "kyc:approve", etc.
  description: string | null;
  domain: string;
}

export interface RoleDto {
  id: string;
  code: string;
  name: string;
  appliesTo: string;
  isSystem: boolean;
  isDefault: boolean;
  permissions: PermissionDto[];
}

export interface CreateCustomRoleRequest {
  code: string;               // "custom_<uuid>"
  name: string;               // admin fullName
  appliesTo: "ADMIN";
  isDefault: false;
  permissionNames: string[];
}

export interface UpdateRolePermissionsRequest {
  permissionNames: string[];  // whole-set replacement
}

export interface CreateAdminRequest {
  fullName: string;
  email: string;
  password: string;
  roleCode: string;
}

export interface DeactivateAdminRequest {
  reason?: string;
}
