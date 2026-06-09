// ── Admin contract types (mirror GermanyERP.Domain/Models/DTOs/Contracts/ContractDtos.cs) ──
// Both admin write endpoints (owner + worker) take the same 4-field body — the party id is
// in the route, not the body (admin worker create/renew reuse CreateOwnerContractRequest).

export interface AdminOwnerContractDto {
  id: string;
  eligibleFrom: string;
  eligibleTo: string;
  fileName: string;
  fileUrl: string;
  isActive: boolean;
  createdAt: string;
  ownerProfileId: string;
  ownerUserId: string;
  ownerFullName: string;
  ownerEmail: string;
}

export interface AdminWorkerContractDto {
  id: string;
  eligibleFrom: string;
  eligibleTo: string;
  fileName: string;
  fileUrl: string;
  isActive: boolean;
  createdAt: string;
  workerId: string;
  workerFullName: string;
  workerEmail: string;
}

/** Body for create/renew (CreateOwnerContractRequest). Dates are ISO-8601 strings. */
export interface CreateContractRequest {
  eligibleFrom: string;
  eligibleTo: string;
  fileName: string;
  fileUrl: string;
}

export type ContractType = "owner" | "worker";
