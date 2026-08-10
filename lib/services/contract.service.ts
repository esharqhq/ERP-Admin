import { apiClient } from "@/lib/http/client";
import type {
  AdminOwnerContractDto,
  AdminWorkerContractDto,
  ContractRevisionRequest,
  ContractType,
  CreateOwnerContractRequest,
  CreateWorkerContractRequest,
} from "@/lib/types/contract.types";

/**
 * Both renew routes require this header, and the key must stay **the same across
 * retries of one intent** — that is the whole point: a replay returns the cached
 * 201 for 24 h instead of authoring a second draft.
 *
 * So the caller supplies it. Generating it in here would give every retry a fresh
 * key, turning a retried renewal into a duplicate contract — exactly what the
 * header exists to prevent.
 */
function idempotent(key: string) {
  return { headers: { "X-Idempotency-Key": key } };
}

/**
 * Mint one key per user-initiated renewal attempt and hold it (a ref, not state)
 * for as long as that attempt may be retried. Do not call it per request.
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export const contractService = {
  // ── Owner ──────────────────────────────────────────────────────────────────
  /** owner_contract:read_any. Unpaginated and unfiltered — every owner's rows. */
  listOwner: async (): Promise<AdminOwnerContractDto[]> => {
    const { data } = await apiClient.get<AdminOwnerContractDto[]>(
      "/api/contracts/admin/owner",
    );
    return data;
  },

  getOwner: async (contractId: string): Promise<AdminOwnerContractDto> => {
    const { data } = await apiClient.get<AdminOwnerContractDto>(
      `/api/contracts/admin/owner/${contractId}`,
    );
    return data;
  },

  /**
   * Author a Draft. Keyed on the owner **account** id. 409 onboarding_not_approved
   * unless the subject is Approved or Active. `eligibleFrom` may come back snapped
   * to the previous cover's boundary — always re-seed the form from the response.
   */
  createOwner: async (
    ownerUserId: string,
    body: CreateOwnerContractRequest,
  ): Promise<AdminOwnerContractDto> => {
    const { data } = await apiClient.post<AdminOwnerContractDto>(
      `/api/contracts/admin/owner/${ownerUserId}`,
      body,
    );
    return data;
  },

  /** Edit a Draft. Legal only while Draft, else 400 invalid_contract_transition. */
  updateOwnerDraft: async (
    contractId: string,
    body: CreateOwnerContractRequest,
  ): Promise<AdminOwnerContractDto> => {
    const { data } = await apiClient.put<AdminOwnerContractDto>(
      `/api/contracts/admin/owner/${contractId}`,
      body,
    );
    return data;
  },

  /** Draft → Sent. Renders the preview PDF; 409 while the template is unapproved. */
  sendOwner: async (contractId: string): Promise<AdminOwnerContractDto> => {
    const { data } = await apiClient.post<AdminOwnerContractDto>(
      `/api/contracts/admin/owner/${contractId}/send`,
    );
    return data;
  },

  /** Sent → Draft with a reason. Not termination — this is "I want to fix this". */
  recallOwner: async (
    contractId: string,
    body: ContractRevisionRequest,
  ): Promise<AdminOwnerContractDto> => {
    const { data } = await apiClient.post<AdminOwnerContractDto>(
      `/api/contracts/admin/owner/${contractId}/recall`,
      body,
    );
    return data;
  },

  /**
   * Requires an existing active contract, else 400 no_active_contract_to_renew.
   * `idempotencyKey` comes from `newIdempotencyKey()` and must be reused on retry.
   */
  renewOwner: async (
    ownerUserId: string,
    body: CreateOwnerContractRequest,
    idempotencyKey: string,
  ): Promise<AdminOwnerContractDto> => {
    const { data } = await apiClient.post<AdminOwnerContractDto>(
      `/api/contracts/admin/owner/${ownerUserId}/renew`,
      body,
      idempotent(idempotencyKey),
    );
    return data;
  },

  // ── Worker (identical lifecycle, 4-field body) ─────────────────────────────
  listWorker: async (): Promise<AdminWorkerContractDto[]> => {
    const { data } = await apiClient.get<AdminWorkerContractDto[]>(
      "/api/contracts/admin/worker",
    );
    return data;
  },

  getWorker: async (contractId: string): Promise<AdminWorkerContractDto> => {
    const { data } = await apiClient.get<AdminWorkerContractDto>(
      `/api/contracts/admin/worker/${contractId}`,
    );
    return data;
  },

  createWorker: async (
    workerId: string,
    body: CreateWorkerContractRequest,
  ): Promise<AdminWorkerContractDto> => {
    const { data } = await apiClient.post<AdminWorkerContractDto>(
      `/api/contracts/admin/worker/${workerId}`,
      body,
    );
    return data;
  },

  updateWorkerDraft: async (
    contractId: string,
    body: CreateWorkerContractRequest,
  ): Promise<AdminWorkerContractDto> => {
    const { data } = await apiClient.put<AdminWorkerContractDto>(
      `/api/contracts/admin/worker/${contractId}`,
      body,
    );
    return data;
  },

  sendWorker: async (contractId: string): Promise<AdminWorkerContractDto> => {
    const { data } = await apiClient.post<AdminWorkerContractDto>(
      `/api/contracts/admin/worker/${contractId}/send`,
    );
    return data;
  },

  recallWorker: async (
    contractId: string,
    body: ContractRevisionRequest,
  ): Promise<AdminWorkerContractDto> => {
    const { data } = await apiClient.post<AdminWorkerContractDto>(
      `/api/contracts/admin/worker/${contractId}/recall`,
      body,
    );
    return data;
  },

  renewWorker: async (
    workerId: string,
    body: CreateWorkerContractRequest,
    idempotencyKey: string,
  ): Promise<AdminWorkerContractDto> => {
    const { data } = await apiClient.post<AdminWorkerContractDto>(
      `/api/contracts/admin/worker/${workerId}/renew`,
      body,
      idempotent(idempotencyKey),
    );
    return data;
  },

  /**
   * Force-deactivate by contract id (writes audit; sets `status = Terminated`,
   * not `Expired` — the period hadn't elapsed). The entry point lives in
   * `components/docs-workspace/contract-panel.tsx` (Docs detail), gated on
   * `{owner|worker}_contract:deactivate_any` and `canTerminate(phase)` from
   * `lib/contracts/registry-row.ts` — reached via `useTerminateContract` in
   * `hooks/use-contracts.ts`. Legal from `Draft`/`Sent` too, where the UI calls
   * it "withdraw" rather than "terminate": same endpoint, different meaning to
   * the admin depending on whether cover had actually started.
   *
   * That Docs-detail panel is now the **only** caller: the contracts registry
   * screen that also wired this was deleted as unused.
   */
  terminate: async (type: ContractType, contractId: string): Promise<void> => {
    await apiClient.delete(`/api/contracts/admin/${type}/${contractId}`);
  },
};
