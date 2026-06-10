"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractService } from "@/lib/services/contract.service";
import type { CreateContractRequest } from "@/lib/types/contract.types";

const OWNER_KEY = ["owner-contracts"] as const;
const WORKER_KEY = ["worker-contracts"] as const;

// ── Owner ──────────────────────────────────────────────────────────────────
export function useOwnerContracts() {
  return useQuery({
    queryKey: OWNER_KEY,
    queryFn: contractService.listOwner,
  });
}

export function useCreateOwnerContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ownerUserId,
      body,
    }: {
      ownerUserId: string;
      body: CreateContractRequest;
    }) => contractService.createOwner(ownerUserId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: OWNER_KEY }),
  });
}

export function useRenewOwnerContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ownerUserId,
      body,
    }: {
      ownerUserId: string;
      body: CreateContractRequest;
    }) => contractService.renewOwner(ownerUserId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: OWNER_KEY }),
  });
}

export function useDeactivateOwnerContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) =>
      contractService.deactivateOwner(contractId),
    onSuccess: () => qc.invalidateQueries({ queryKey: OWNER_KEY }),
  });
}

// ── Worker ───────────────────────────────────────────────────────────────────
export function useWorkerContracts() {
  return useQuery({
    queryKey: WORKER_KEY,
    queryFn: contractService.listWorker,
  });
}

export function useCreateWorkerContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      workerId,
      body,
    }: {
      workerId: string;
      body: CreateContractRequest;
    }) => contractService.createWorker(workerId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKER_KEY }),
  });
}

export function useRenewWorkerContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      workerId,
      body,
    }: {
      workerId: string;
      body: CreateContractRequest;
    }) => contractService.renewWorker(workerId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKER_KEY }),
  });
}

export function useDeactivateWorkerContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) =>
      contractService.deactivateWorker(contractId),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKER_KEY }),
  });
}
