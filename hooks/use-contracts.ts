"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractService } from "@/lib/services/contract.service";
import type {
  AdminOwnerContractDto,
  AdminWorkerContractDto,
  ContractRevisionRequest,
  ContractType,
  CreateOwnerContractRequest,
  CreateWorkerContractRequest,
} from "@/lib/types/contract.types";

const OWNER_KEY = ["owner-contracts"] as const;
const WORKER_KEY = ["worker-contracts"] as const;

function keyFor(type: ContractType) {
  return type === "owner" ? OWNER_KEY : WORKER_KEY;
}

// ── Owner ──────────────────────────────────────────────────────────────────
/**
 * Every owner's contract rows, unpaginated, under one query key — so a screen that
 * needs one subject's period per row joins this list client-side instead of issuing
 * a request per row.
 *
 * `enabled` exists so a caller that already knows the admin lacks
 * `owner_contract:read_any` can skip the request rather than provoke a 403 and let
 * the error path decide the UI (an API 403 also forces a permission refetch, see
 * `lib/http/on-forbidden.ts`).
 */
export function useOwnerContracts(enabled = true) {
  return useQuery({
    queryKey: OWNER_KEY,
    queryFn: contractService.listOwner,
    enabled,
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
      body: CreateOwnerContractRequest;
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
      idempotencyKey,
    }: {
      ownerUserId: string;
      body: CreateOwnerContractRequest;
      /** From `newIdempotencyKey()`, minted once per renewal attempt and reused on retry. */
      idempotencyKey: string;
    }) => contractService.renewOwner(ownerUserId, body, idempotencyKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: OWNER_KEY }),
  });
}

export function useUpdateOwnerContractDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      body,
    }: {
      contractId: string;
      body: CreateOwnerContractRequest;
    }) => contractService.updateOwnerDraft(contractId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: OWNER_KEY }),
  });
}

/**
 * Kept as a single `terminate` call under the hood (see contract.service.ts) —
 * `app/[locale]/dashboard/contracts/page.tsx` still wires this hook to a
 * deactivate action in the UI. Follow-up: remove that UI entry point in the
 * Phase 2 plan, since contract termination is not meant to be exposed here.
 */
export function useDeactivateOwnerContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) =>
      contractService.terminate("owner", contractId),
    onSuccess: () => qc.invalidateQueries({ queryKey: OWNER_KEY }),
  });
}

// ── Worker ───────────────────────────────────────────────────────────────────
/** See `useOwnerContracts` — same shape, same reason for `enabled`. */
export function useWorkerContracts(enabled = true) {
  return useQuery({
    queryKey: WORKER_KEY,
    queryFn: contractService.listWorker,
    enabled,
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
      body: CreateWorkerContractRequest;
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
      idempotencyKey,
    }: {
      workerId: string;
      body: CreateWorkerContractRequest;
      /** From `newIdempotencyKey()`, minted once per renewal attempt and reused on retry. */
      idempotencyKey: string;
    }) => contractService.renewWorker(workerId, body, idempotencyKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKER_KEY }),
  });
}

export function useUpdateWorkerContractDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      body,
    }: {
      contractId: string;
      body: CreateWorkerContractRequest;
    }) => contractService.updateWorkerDraft(contractId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKER_KEY }),
  });
}

/** See `useDeactivateOwnerContract` — same rationale, worker side. */
export function useDeactivateWorkerContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) =>
      contractService.terminate("worker", contractId),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKER_KEY }),
  });
}

// ── Lifecycle: send / recall, either side ───────────────────────────────────
/** Draft → Sent, either side. */
export function useSendContract(type: ContractType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      contractId: string,
    ): Promise<AdminOwnerContractDto | AdminWorkerContractDto> =>
      type === "owner"
        ? contractService.sendOwner(contractId)
        : contractService.sendWorker(contractId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keyFor(type) }),
  });
}

/** Sent → Draft with a reason, either side. */
export function useRecallContract(type: ContractType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      body,
    }: {
      contractId: string;
      body: ContractRevisionRequest;
    }): Promise<AdminOwnerContractDto | AdminWorkerContractDto> =>
      type === "owner"
        ? contractService.recallOwner(contractId, body)
        : contractService.recallWorker(contractId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keyFor(type) }),
  });
}
