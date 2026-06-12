"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { propertyService } from "@/lib/services/property.service";
import type {
  UpdatePropertyRequest,
  CreateAdminPropertyRequest,
} from "@/lib/types/property.types";

export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: () => propertyService.getProperties(),
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
 * Admin property-docs bundle. `enabled` should be gated on `property:doc:read_any`
 * so an admin on a custom-override role without it doesn't trigger a 403 on page
 * load (mirrors the worker-docs / worker-rating defensive gating).
 */
export function useAdminPropertyDocs(propertyId: string, enabled = true) {
  return useQuery({
    queryKey: ["property-docs", propertyId],
    queryFn: () => propertyService.getAdminPropertyDocs(propertyId),
    enabled: !!propertyId && enabled,
  });
}

export function useApprovePropertyDocs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (propertyId: string) => propertyService.approvePropertyDocs(propertyId),
    onSuccess: (_, propertyId) => {
      qc.invalidateQueries({ queryKey: ["property-docs", propertyId] });
      qc.invalidateQueries({ queryKey: ["property", propertyId] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useRejectPropertyDocs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, reason }: { propertyId: string; reason: string }) =>
      propertyService.rejectPropertyDocs(propertyId, reason),
    onSuccess: (_, { propertyId }) => {
      qc.invalidateQueries({ queryKey: ["property-docs", propertyId] });
      qc.invalidateQueries({ queryKey: ["property", propertyId] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useResetPropertyDocs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, reason }: { propertyId: string; reason: string }) =>
      propertyService.resetPropertyDocs(propertyId, reason),
    onSuccess: (_, { propertyId }) => {
      qc.invalidateQueries({ queryKey: ["property-docs", propertyId] });
      qc.invalidateQueries({ queryKey: ["property", propertyId] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}
