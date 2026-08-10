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

// ── Lifecycle: send / recall / terminate, either side ───────────────────────
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

/**
 * Force-deactivate, either side. Legal from every phase that hasn't already
 * ended — `Draft`/`Sent` included, so a bad contract can be withdrawn rather
 * than merely recalled (see `canTerminate` in `lib/contracts/registry-row.ts`).
 *
 * The entry point lives in `components/docs-workspace/contract-panel.tsx`
 * (Docs detail) as of this task. `app/[locale]/dashboard/contracts/page.tsx`
 * still wires this same hook too — that screen's mutations are removed in a
 * later phase, not this one.
 *
 * Replaces the former `useDeactivateOwnerContract` / `useDeactivateWorkerContract`,
 * whose invalidation was too narrow (their own contract list only). Terminating
 * changes the subject's cover, not just the contract row, so this invalidates:
 *  - `keyFor(type)`: the contract list on this side — the terminated row's phase
 *    changes.
 *  - `["kyc"]` (owner) / `["workers"]` (worker): the subject queue — onboarding
 *    status may follow — and the Docs table's cover column, which is joined
 *    from the contract list client-side. `["kyc"]` also covers the owner
 *    profile detail query (`["kyc", "profile", id]`) by prefix.
 *  - `["notifications"]`: other admins get a bell row for
 *    `OWNER_CONTRACT_FORCE_DEACTIVATED` / the worker equivalent.
 *
 * ⚠ A terminate never deletes the subject record (contrast the trap documented
 * in `hooks/use-owners.ts`), so invalidating the subject's own detail query is
 * safe here — it just isn't reachable generically: this hook only ever sees a
 * `contractId`, never the owner/worker id the detail screens key their own
 * queries on.
 */
export function useTerminateContract(type: ContractType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => contractService.terminate(type, contractId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keyFor(type) });
      qc.invalidateQueries({ queryKey: [type === "owner" ? "kyc" : "workers"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
