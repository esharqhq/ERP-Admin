"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ownerService } from "@/lib/services/owner.service";

export function useOwnerList(status?: string) {
  return useQuery({
    queryKey: ["owners", status],
    queryFn: () => ownerService.getOwnerList(status),
  });
}

export function useOwnerFromList(ownerProfileId: string) {
  return useQuery({
    queryKey: ["owners"],
    queryFn: () => ownerService.getOwnerList(),
    select: (data) => data.find((o) => o.ownerProfileId === ownerProfileId),
    enabled: !!ownerProfileId,
  });
}

export function useApproveOwnerKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ownerProfileId: string) => ownerService.approveKyc(ownerProfileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owners"] });
    },
  });
}

export function useRejectOwnerKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ownerProfileId, reason }: { ownerProfileId: string; reason: string }) =>
      ownerService.rejectKyc(ownerProfileId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owners"] });
    },
  });
}

export function useDeleteOwner() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (ownerUserId: string) => ownerService.deleteOwner(ownerUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owners"] });
      router.push("/dashboard/owners");
    },
  });
}

export function useOwnerByUserId(ownerUserId: string) {
  return useQuery({
    queryKey: ["owner-by-user", ownerUserId],
    queryFn: () => ownerService.getOwnerByUserId(ownerUserId),
    enabled: !!ownerUserId,
  });
}

export function useOwnerProperties(ownerUserId: string) {
  return useQuery({
    queryKey: ["owner-properties", ownerUserId],
    queryFn: () => ownerService.getOwnerProperties(ownerUserId),
    enabled: !!ownerUserId,
  });
}

export function useOwnerTaskGroups(ownerUserId: string) {
  return useQuery({
    queryKey: ["owner-task-groups", ownerUserId],
    queryFn: () => ownerService.getOwnerTaskGroups(ownerUserId),
    enabled: !!ownerUserId,
  });
}
