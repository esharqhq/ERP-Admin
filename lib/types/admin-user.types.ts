// lib/types/admin-user.types.ts

export type AdminRoleCode = "SUPER_ADMIN" | "MODERATOR";

export interface AdminSummaryDto {
  id: string;
  fullName: string;
  email: string;
  roleCode: string;           // "SUPER_ADMIN" | "custom_xxx" | "MODERATOR"
  roleId: string;             // UUID — needed for PATCH /api/admin/roles/{roleId}
  isVerified: boolean;
  profilePictureUrl: string | null;
  createdAt: string;
}


export interface RoleDto {
  id: string;
  code: string | null;
  name: string | null;
  appliesTo: string | null;
  isSystem: boolean;
  isDefault: boolean;
  permissions: string[];   // swagger: array of permission name strings
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
