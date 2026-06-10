import { apiClient } from "@/lib/http/client";

/** Backend: GET /api/admin/permissions (AdminController) — requires system:permission:read. */
export interface PermissionCatalogDto {
  id: string;
  code: number;
  name: string;
  description?: string | null;
  domain: string;
  scope: string;
}

export const permissionService = {
  /** Full registry of permissions (code/name/domain/scope), ordered by code. */
  getCatalog: async (): Promise<PermissionCatalogDto[]> => {
    const { data } = await apiClient.get<PermissionCatalogDto[]>(
      "/api/admin/permissions",
    );
    return data;
  },
};
