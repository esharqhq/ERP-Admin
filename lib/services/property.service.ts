import { apiClient } from "@/lib/http/client";
import type {
  PropertyDto,
  PropertyMediaDto,
  UpdatePropertyRequest,
  CreateAdminPropertyRequest,
} from "@/lib/types/property.types";

export const propertyService = {
  /**
   * `includeDeleted` is honored only if the caller also holds `property:restore`
   * (otherwise the backend forces it false — non-privileged callers never see
   * deleted rows). Pass `ownerUserId` to scope to one BOSS owner.
   */
  getProperties: async (opts?: {
    includeDeleted?: boolean;
    ownerUserId?: string;
  }): Promise<PropertyDto[]> => {
    const params: Record<string, string | boolean> = {};
    if (opts?.includeDeleted) params.includeDeleted = true;
    if (opts?.ownerUserId) params.ownerUserId = opts.ownerUserId;
    const { data } = await apiClient.get<PropertyDto[]>("/api/properties", {
      params,
    });
    return data;
  },

  /** Restore a soft-deleted property. Requires `property:restore`. */
  restoreProperty: async (id: string): Promise<void> => {
    await apiClient.post(`/api/properties/${id}/restore`);
  },

  /**
   * Admin create-on-behalf-of-owner (`property:create_any`).
   *
   * ⚠ **The idempotency key below is wrong and does not do its job.** The route
   * is `[Idempotent]` (24 h Redis cache) so that a *retried* submit replays the
   * cached 201 instead of authoring a second property — which requires the key
   * to stay the same across retries of one intent. Minting it here gives every
   * attempt a fresh key, so a retry creates a duplicate: exactly what the header
   * exists to prevent. The correct shape is `contract.service.ts`'s — the caller
   * mints one key per user-initiated attempt (a ref, not state) and passes it in.
   * Deferred to the create-dialog rework rather than fixed here, because that is
   * where the call site that must hold the key is being rebuilt anyway.
   */
  createAdminProperty: async (
    body: CreateAdminPropertyRequest,
  ): Promise<PropertyDto> => {
    const { data } = await apiClient.post<PropertyDto>(
      "/api/admin/properties",
      body,
      { headers: { "X-Idempotency-Key": crypto.randomUUID() } },
    );
    return data;
  },

  getPropertyById: async (id: string): Promise<PropertyDto> => {
    const { data } = await apiClient.get<PropertyDto>(`/api/properties/${id}`);
    return data;
  },

  // Edit/soft-delete: no admin role holds property:update / property:soft_delete
  // (those are owner-scoped BOSS perms). Admins are authorized via the
  // controller's `Admin → property:list` branch of CanAccessPropertyAsync — so
  // gate the UI on property:list, not the nominal endpoint permission.
  updateProperty: async (id: string, body: UpdatePropertyRequest): Promise<PropertyDto> => {
    const { data } = await apiClient.put<PropertyDto>(`/api/properties/${id}`, body);
    return data;
  },

  softDeleteProperty: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/properties/${id}`);
  },

  /**
   * A property's photo gallery. Admins reach it through branch 1 of the
   * endpoint's three-branch check (an Admin-type caller holding global
   * `property:list`); the owner-side and worker branches do not apply here.
   *
   * **Read-only for this app.** There is deliberately no upload or delete
   * counterpart — see `PropertyMediaDto` for why an admin cannot mutate a
   * gallery, and note there is currently no admin takedown path for a photo an
   * owner uploaded.
   */
  getPropertyMedia: async (propertyId: string): Promise<PropertyMediaDto[]> => {
    const { data } = await apiClient.get<PropertyMediaDto[]>(
      `/api/properties/${propertyId}/media`,
    );
    return data;
  },
};

// The property-document review feature was deleted outright by F-02c (2026-08-07),
// not re-gated: `PropertyDocsController` and `AdminPropertyDocsController` are gone
// and all seven of their routes 404. The four methods that called them
// (getAdminPropertyDocs / approve / reject / reset) were removed with it. Their
// eight `property:doc:*` permission codes are hard-deleted and must never be
// recycled, so nothing here can be revived by granting a permission.
