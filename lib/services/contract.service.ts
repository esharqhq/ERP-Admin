import { apiClient } from "@/lib/http/client";
import type {
  AdminOwnerContractDto,
  AdminWorkerContractDto,
  CreateContractRequest,
} from "@/lib/types/contract.types";

export const contractService = {
  // ── Owner contracts ────────────────────────────────────────────────────────
  /** owner_contract:read_any — all owner contracts across all owners. */
  listOwner: async (): Promise<AdminOwnerContractDto[]> => {
    const { data } = await apiClient.get<AdminOwnerContractDto[]>(
      "/api/contracts/admin/owner",
    );
    return data;
  },

  /** owner_contract:create_any — create/upsert a contract for any owner user. */
  createOwner: async (
    ownerUserId: string,
    body: CreateContractRequest,
  ): Promise<void> => {
    await apiClient.post(`/api/contracts/admin/owner/${ownerUserId}`, body);
  },

  /** owner_contract:renew_any — requires an existing active contract (else 400). */
  renewOwner: async (
    ownerUserId: string,
    body: CreateContractRequest,
  ): Promise<void> => {
    await apiClient.post(
      `/api/contracts/admin/owner/${ownerUserId}/renew`,
      body,
    );
  },

  /** owner_contract:deactivate_any — force-deactivate by contract id (writes audit). */
  deactivateOwner: async (contractId: string): Promise<void> => {
    await apiClient.delete(`/api/contracts/admin/owner/${contractId}`);
  },

  // ── Worker contracts ───────────────────────────────────────────────────────
  /** worker_contract:read_any */
  listWorker: async (): Promise<AdminWorkerContractDto[]> => {
    const { data } = await apiClient.get<AdminWorkerContractDto[]>(
      "/api/contracts/admin/worker",
    );
    return data;
  },

  /** worker_contract:create_any */
  createWorker: async (
    workerId: string,
    body: CreateContractRequest,
  ): Promise<void> => {
    await apiClient.post(`/api/contracts/admin/worker/${workerId}`, body);
  },

  /** worker_contract:renew_any — requires an existing active contract (else 400). */
  renewWorker: async (
    workerId: string,
    body: CreateContractRequest,
  ): Promise<void> => {
    await apiClient.post(`/api/contracts/admin/worker/${workerId}/renew`, body);
  },

  /** worker_contract:deactivate_any */
  deactivateWorker: async (contractId: string): Promise<void> => {
    await apiClient.delete(`/api/contracts/admin/worker/${contractId}`);
  },
};
