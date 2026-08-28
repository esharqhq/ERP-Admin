"use client";

import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { contractService } from "@/lib/services/contract.service";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import {
  indexCover,
  ownerContractUserId,
  workerContractSubjectId,
} from "@/lib/onboarding/subject-row";
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

/**
 * The contract period governing one owner — for a screen that shows a single
 * account rather than a queue.
 *
 * Reads the same unpaginated list under the same query key, so on a panel where
 * the Docs workspace has already been opened this costs no request at all, and
 * joins it in memory. There is no per-owner admin read to prefer.
 *
 * Joined on `ownerUserId`, not `ownerProfileId`: a screen keyed on the account
 * would otherwise have to wait for the KYC read to learn the profile id, and
 * would report "no contract" whenever that read merely 404'd.
 *
 * `indexCover` also decides *which* row governs — a renewed owner holds an
 * `InForce` row and a `Scheduled` one at once, and the latest is the wrong
 * answer to "covered until when".
 */
export function useOwnerContractCover(ownerUserId: string) {
  /**
   * Read through `useCurrentPermissions` rather than `useHasPermission`, which
   * collapses "denied" and "not known yet" into one `false`. That collapse is the
   * right default for a *button* — hiding it costs nothing — but this caller
   * states the refusal in words, and on a cold start (the first login of a
   * session, nothing cached) it would assert "not visible with your permissions"
   * for one paint before the real period arrived. `null` keeps the two apart.
   */
  const { permissions } = useCurrentPermissions();
  const canRead: boolean | null =
    permissions === null ? null : permissions.has("owner_contract:read_any");

  const query = useOwnerContracts(canRead === true && !!ownerUserId);

  const cover = useMemo(
    () =>
      indexCover(query.data ?? [], ownerContractUserId).get(ownerUserId) ?? null,
    [query.data, ownerUserId],
  );

  return {
    cover,
    /** `null` while the grant set is unknown — not the same as `false`. */
    canRead,
    /** `enabled: false` leaves a query pending forever — check `canRead` first. */
    isPending: query.isPending,
    error: query.error,
  };
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

/**
 * The contract period governing one worker. See `useOwnerContractCover` — same
 * join, same reasons, the other side.
 *
 * It exists because nothing else on the worker screen answers *"can this worker
 * actually be assigned today"*. `WorkerRowDto.hasActiveContract` looks like it
 * does and must not be used for it: that flag is a mirror an hourly job
 * reconciles, so it says `true` inside the window where the server's live gate
 * has already started refusing. The phase behind this period is computed per
 * read, so only this may say a worker is covered.
 */
export function useWorkerContractCover(workerId: string) {
  const { permissions } = useCurrentPermissions();
  const canRead: boolean | null =
    permissions === null ? null : permissions.has("worker_contract:read_any");

  const query = useWorkerContracts(canRead === true && !!workerId);

  const cover = useMemo(
    () =>
      indexCover(query.data ?? [], workerContractSubjectId).get(workerId) ?? null,
    [query.data, workerId],
  );

  return {
    cover,
    /** `null` while the grant set is unknown — not the same as `false`. */
    canRead,
    /** `enabled: false` leaves a query pending forever — check `canRead` first. */
    isPending: query.isPending,
    error: query.error,
  };
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
 * The invalidation list for a successful terminate, pulled out of the mutation
 * so it can be exercised directly against a real `QueryClient` — see
 * `hooks/use-contracts.test.ts` — without rendering anything.
 *
 * Terminating changes the subject's cover, not just the contract row, so this
 * invalidates:
 *  - `keyFor(type)`: the contract list on this side — the terminated row's phase
 *    changes.
 *  - `["kyc"]` (owner) / `["workers"]` (worker): the subject queue — onboarding
 *    status may follow — and the Docs table's cover column, which is joined
 *    from the contract list client-side. `["kyc"]` also covers the owner
 *    profile detail query (`["kyc", "profile", id]`) by prefix, but this
 *    function invalidates that key explicitly too rather than leaning on the
 *    coincidence — see `subjectId` below.
 *  - `["notifications"]`: other admins get a bell row for
 *    `OWNER_CONTRACT_FORCE_DEACTIVATED` / the worker equivalent.
 *  - the subject's own Docs detail query: `["kyc", "profile", subjectId]` for
 *    owner, `["worker", subjectId]` for worker. The worker one is not a prefix
 *    of anything above — singular `"worker"` vs. plural `"workers"` — so
 *    without this, terminating a worker's contract from the Docs detail left
 *    that screen's status and stepper stale until a reload.
 *
 * ⚠ `subjectId` for "owner" is the **KYC profile id** (`useKycProfile`'s key,
 * and the Docs detail route param), **not** `ownerUserId` — a real bug here:
 * an earlier version of the owner call site passed `ownerUserId` (the id
 * contract-authoring routes use), which built a key nothing in the cache
 * matches, silently making this whole explicit step dead code — masked
 * because the `["kyc"]` prefix invalidation above happened to still refresh
 * the same query by accident, which is the exact failure mode this function
 * exists to stop relying on. `subjectId` is required (not optional) precisely
 * so a caller cannot forget to pass one; it cannot, on its own, stop a caller
 * from passing the *wrong* one — that needs branded id types, judged too wide
 * a change for this fix. Get the id from `hooks/use-contracts.test.ts` if
 * unsure which one is expected.
 *
 * ⚠ A terminate never deletes the subject record (contrast the trap documented
 * in `hooks/use-owners.ts`), so invalidating the subject's own detail query is
 * safe here. Do not widen this to a caller where the mutation might remove the
 * subject entirely — that would refetch a now-404ing query.
 */
export function invalidateAfterTerminate(
  qc: QueryClient,
  type: ContractType,
  subjectId: string,
) {
  qc.invalidateQueries({ queryKey: keyFor(type) });
  qc.invalidateQueries({ queryKey: [type === "owner" ? "kyc" : "workers"] });
  qc.invalidateQueries({ queryKey: ["notifications"] });
  // A caller with no mounted subject-detail query to refresh (the legacy
  // registry, below) passes "" rather than omitting the argument — required,
  // not optional, so a forgetful caller fails to compile instead of silently
  // skipping this step. "" is falsy, so it still skips the query-key build
  // below rather than invalidating a key nothing could ever be cached under.
  if (subjectId) {
    qc.invalidateQueries({
      queryKey: type === "owner" ? ["kyc", "profile", subjectId] : ["worker", subjectId],
    });
  }
}

/**
 * Force-deactivate, either side. Legal from every phase that hasn't already
 * ended — `Draft`/`Sent` included, so a bad contract can be withdrawn rather
 * than merely recalled (see `canTerminate` in `lib/contracts/registry-row.ts`).
 *
 * The entry point lives in `components/docs-workspace/contract-panel.tsx`
 * (Docs detail), and is now the only one — the contracts registry screen that
 * also wired this hook was deleted as unused.
 *
 * Replaces the former `useDeactivateOwnerContract` / `useDeactivateWorkerContract`,
 * whose invalidation was too narrow (their own contract list only).
 *
 * `subjectId` is the owner/worker id the caller's own detail query is keyed
 * on (do not derive it from cached contract data — pass what the caller
 * already knows), and is required for exactly that reason. See
 * `invalidateAfterTerminate` for what it unlocks and the id mix-up to avoid.
 */
export function useTerminateContract(type: ContractType, subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => contractService.terminate(type, contractId),
    onSuccess: () => invalidateAfterTerminate(qc, type, subjectId),
  });
}
