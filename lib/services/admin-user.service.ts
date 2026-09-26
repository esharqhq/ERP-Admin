import { apiClient } from "@/lib/http/client";
import { idempotent } from "@/lib/http/idempotency";
import type {
  AdminSummaryDto,
  AdminDetailDto,
  CreateAdminRequest,
  UpdateAdminRequest,
  AssignAdminRoleRequest,
  DeactivateAdminRequest,
} from "@/lib/types/admin-user.types";

export const adminUserService = {
  getAdmins: async (): Promise<AdminSummaryDto[]> => {
    const { data } = await apiClient.get<AdminSummaryDto[]>("/api/admin/users");
    return data;
  },

  getAdmin: async (id: string): Promise<AdminDetailDto> => {
    const { data } = await apiClient.get<AdminDetailDto>(`/api/admin/users/${id}`);
    return data;
  },

  createAdmin: async (body: CreateAdminRequest): Promise<AdminSummaryDto> => {
    const { data } = await apiClient.post<AdminSummaryDto>("/api/admin/users", body);
    return data;
  },

  updateAdmin: async (id: string, body: UpdateAdminRequest): Promise<AdminDetailDto> => {
    const { data } = await apiClient.patch<AdminDetailDto>(`/api/admin/users/${id}`, body);
    return data;
  },

  /**
   * `[Idempotent]`. The caller mints the key once per intended role and holds it
   * across retries — minting it here, as this once did, gave every retry a fresh
   * key and so protected against nothing.
   */
  assignRole: async (
    id: string,
    body: AssignAdminRoleRequest,
    idempotencyKey: string,
  ): Promise<AdminDetailDto> => {
    const { data } = await apiClient.post<AdminDetailDto>(
      `/api/admin/users/${id}/role`,
      body,
      idempotent(idempotencyKey),
    );
    return data;
  },

  /**
   * `[Idempotent]`, key held per target admin by the caller. ⚠ The route answers
   * `204`, and the backend's `IdempotentAttribute` caches only an `ObjectResult`,
   * so today a replay never happens here — the key is sent so this becomes
   * correct the moment the attribute caches bodiless 2xx too.
   */
  deactivateAdmin: async (
    id: string,
    body: DeactivateAdminRequest,
    idempotencyKey: string,
  ): Promise<void> => {
    await apiClient.post(
      `/api/admin/users/${id}/deactivate`,
      body,
      idempotent(idempotencyKey),
    );
  },
};
