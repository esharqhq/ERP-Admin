"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { propertyService } from "@/lib/services/property.service";
import type {
  UpdatePropertyRequest,
  CreateAdminPropertyRequest,
} from "@/lib/types/property.types";

/**
 * Property list. `enabled` should be gated on `property:list` when used as a
 * filter picker on a page gated by a *different* permission (e.g. working-hours,
 * gated `system:analytics:read`), so a custom-override admin lacking
 * `property:list` doesn't 403 on the picker (fail-open class).
 */
/**
 * `withMedia` embeds every row's gallery, which is what the Photos column and the
 * "no photos" tile read. It is part of the **query key**: a cache entry fetched
 * without it holds `media: null` on every row, and serving that to a caller that
 * asked for galleries would report the whole table as having none.
 */
export function useProperties(enabled = true, withMedia = false) {
  return useQuery({
    queryKey: ["properties", { withMedia }],
    queryFn: () => propertyService.getProperties(withMedia ? { withMedia: true } : undefined),
    enabled,
  });
}

/**
 * Who else can act on this property — the identity card's "Team with access".
 *
 * Reads under `property:list` for an admin (the route short-circuits), so it
 * needs no gate of its own beyond the one that opened the page. Inactive rows are
 * dropped here rather than in the card: a revoked membership is history, and the
 * card asks who can act **now**.
 */
export function usePropertyMemberships(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["properties", propertyId, "memberships"],
    queryFn: () => propertyService.getMemberships(propertyId!),
    enabled: Boolean(propertyId),
    select: (rows) => rows.filter((m) => m.isActive),
  });
}

/**
 * Soft-deleted properties for the restore view. `enabled` should be gated on
 * `property:restore` — the backend only honors `includeDeleted` for callers
 * holding it, so a non-privileged admin would just get the live list back.
 */
export function useDeletedProperties(enabled = true) {
  return useQuery({
    queryKey: ["properties", "deleted"],
    queryFn: () => propertyService.getProperties({ includeDeleted: true }),
    enabled,
    select: (rows) => rows.filter((p) => p.isDeleted),
  });
}

export function useCreateAdminProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAdminPropertyRequest) =>
      propertyService.createAdminProperty(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useRestoreProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => propertyService.restoreProperty(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function usePropertyById(id: string) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: () => propertyService.getPropertyById(id),
    enabled: !!id,
  });
}

export function useUpdateProperty(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePropertyRequest) => propertyService.updateProperty(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property", id] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

/**
 * Soft-delete a property. The caller navigates away on success — so we ONLY
 * invalidate the list. Do NOT invalidate/remove ["property", id]: its observer
 * is still mounted on the detail page being deleted from, and would 404-refetch
 * the now-deleted id (see [[erp-admin-build-state]] delete-then-navigate gotcha).
 */
export function useSoftDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => propertyService.softDeleteProperty(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

/**
 * A property's photo gallery, read-only. Needs no `enabled` permission gate the
 * way the other defensive hooks here do: an admin reaches this endpoint through
 * its `property:list` branch, which is the same permission that gates the whole
 * properties section — a caller who got this far already holds it.
 */
export function usePropertyMedia(propertyId: string) {
  return useQuery({
    queryKey: ["property-media", propertyId],
    queryFn: () => propertyService.getPropertyMedia(propertyId),
    enabled: !!propertyId,
  });
}

// The four property-docs hooks (useAdminPropertyDocs / useApprove / useReject /
// useReset) were deleted with the backend feature they called — see the note at
// the bottom of `lib/services/property.service.ts`. They had already stopped
// firing before deletion: their call site gated on `property:doc:read_any`, a
// permission F-02c hard-deleted, so `useHasPermission` returned false and the
// request was never issued. Dead code, not a live 404.
