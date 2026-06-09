// lib/types/admin-user.types.ts

export type AdminRoleCode = "SUPER_ADMIN" | "MODERATOR";

/** Nested role ref on admin summary/detail (backend RoleSummaryDto). */
export interface RoleSummaryDto {
  id: string;
  code: string;
  name: string;
}

/** GET /api/admin/users — AdminSummaryDto (role is null only for orphaned accounts). */
export interface AdminSummaryDto {
  id: string;
  fullName: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
  role: RoleSummaryDto | null;
}

/** GET /api/admin/users/{id} — AdminDetailDto. profilePictureUrl is detail-only. */
export interface AdminDetailDto {
  id: string;
  fullName: string;
  email: string;
  isVerified: boolean;
  profilePictureUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
  role: RoleSummaryDto | null;
}

/** GET /api/admin/roles — RoleDto. NOTE: appliesTo is PascalCase ("Admin"). */
export interface RoleDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  appliesTo: string;       // "Admin" | "Owner" | "Worker" (PascalCase in responses)
  isSystem: boolean;
  isDefault: boolean;
  permissions: string[];   // permission name strings
}

/** POST /api/admin/roles — CreateRoleRequest. appliesTo parsed case-insensitively; code stored UPPERCASE. */
export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string | null;
  appliesTo: "ADMIN";
  isDefault: boolean;
  permissionNames: string[];
}

/** PATCH /api/admin/roles/{id} — UpdateRoleRequest. Omitted fields are left unchanged. */
export interface UpdateRoleRequest {
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  permissionNames?: string[];  // whole-set replacement when present
}

export interface CreateAdminRequest {
  fullName: string;
  email: string;
  password: string;
  roleCode: string;
}

/** PATCH /api/admin/users/{id} — UpdateAdminRequest. Each field optional; null/omitted = unchanged. */
export interface UpdateAdminRequest {
  fullName?: string;
  email?: string;
  profilePictureUrl?: string | null;
}

/** POST /api/admin/users/{id}/role — AssignAdminRoleRequest. */
export interface AssignAdminRoleRequest {
  roleCode: string;
}

export interface DeactivateAdminRequest {
  reason?: string;
}

/** True when `code` is a per-admin custom-override role. Codes are stored UPPERCASE. */
export function isCustomRoleCode(code: string | null | undefined): boolean {
  return !!code && code.toLowerCase().startsWith("custom_");
}
