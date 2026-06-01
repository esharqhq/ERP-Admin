"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { propertyService } from "@/lib/services/property.service";

export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: () => propertyService.getProperties(),
  });
}

export function usePropertyById(id: string) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: () => propertyService.getPropertyById(id),
    enabled: !!id,
  });
}

export function useAdminPropertyDocs(propertyId: string) {
  return useQuery({
    queryKey: ["property-docs", propertyId],
    queryFn: () => propertyService.getAdminPropertyDocs(propertyId),
    enabled: !!propertyId,
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
