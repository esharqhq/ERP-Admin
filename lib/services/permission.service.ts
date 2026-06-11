import { apiClient } from "@/lib/http/client";

/** Backend: GET /api/admin/permissions (AdminController) — requires system:permission:read. */
export interface PermissionCatalogDto {
  id: string;
  code: number;
  name: string;
  /** English description (backend ask (a) — now populated). */
  description?: string | null;
  /** German description (machine-translated first pass — flag for native review). */
  descriptionDe?: string | null;
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

  /**
   * Current admin's *effective* permission codes (backend ask #5).
   * `[Authorize]`-only — works for MODERATOR and `custom_<uuid>`-role admins,
   * unlike the role catalog (which needs `system:permission:read`). Returns a
   * raw array of code strings; `[]` when the admin has no role assigned.
   */
  getMyPermissions: async (): Promise<string[]> => {
    const { data } = await apiClient.get<string[]>(
      "/api/admin/me/permissions",
    );
    return data;
  },
};
