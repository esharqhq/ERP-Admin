import type {
  AdminOwnerContractDto,
  AdminWorkerContractDto,
} from "@/lib/types/contract.types";
import { isCoveredNow, type ContractPhase } from "@/lib/types/onboarding.types";

/**
 * One row of the contracts registry, normalized so the owner and worker tabs
 * render through the same table.
 *
 * **`isActive` is deliberately absent.** It is a mirror reconciled hourly, so in
 * the window after a period starts and before the job runs it disagrees with
 * reality — a live contract reads inactive and offers the wrong affordances.
 * `phase` is computed on every read. Leaving the mirror off the row type is what
 * stops it being reached for again.
 */
export interface RegistryRow {
  contractId: string;
  /** Owner: ownerUserId (authoring routes are keyed on it). Worker: workerId. */
  partyId: string;
  /** Owner only: the Docs detail route is keyed on ownerProfileId, not ownerUserId. */
  partyProfileId: string | null;
  /** The display name — the account label. */
  partyName: string | null;
  /**
   * The legal name off the passport, which is what the linked PDF prints. Carried
   * **beside** `partyName` rather than replacing it because the two are allowed
   * to differ and an admin needs to see both (`contract-lifecycle.md` §7.7).
   *
   * ⚠ Whatever renders this must show nothing when it is `null` — never fall back
   * to `partyName`. A row that silently substitutes the display name is the exact
   * behaviour this field was added to end.
   */
  partyLegalName: string | null;
  partyEmail: string | null;
  eligibleFrom: string;
  eligibleTo: string;
  fileName: string | null;
  fileUrl: string | null;
  phase: ContractPhase;
  sentAt: string | null;
  signedAt: string | null;
  renewalStartsAt: string | null;
  createdAt: string;
}

export function ownerRegistryRow(dto: AdminOwnerContractDto): RegistryRow {
  return {
    contractId: dto.id,
    partyId: dto.ownerUserId,
    partyProfileId: dto.ownerProfileId,
    partyName: dto.ownerFullName,
    partyLegalName: dto.ownerLegalName,
    partyEmail: dto.ownerEmail,
    eligibleFrom: dto.eligibleFrom,
    eligibleTo: dto.eligibleTo,
    fileName: dto.fileName,
    fileUrl: dto.fileUrl,
    phase: dto.phase,
    sentAt: dto.sentAt,
    signedAt: dto.signedAt,
    renewalStartsAt: dto.renewalStartsAt,
    createdAt: dto.createdAt,
  };
}

export function workerRegistryRow(dto: AdminWorkerContractDto): RegistryRow {
  return {
    contractId: dto.id,
    partyId: dto.workerId,
    partyProfileId: null,
    partyName: dto.workerFullName,
    partyLegalName: dto.workerLegalName,
    partyEmail: dto.workerEmail,
    eligibleFrom: dto.eligibleFrom,
    eligibleTo: dto.eligibleTo,
    fileName: dto.fileName,
    fileUrl: dto.fileUrl,
    phase: dto.phase,
    sentAt: dto.sentAt,
    signedAt: dto.signedAt,
    renewalStartsAt: dto.renewalStartsAt,
    createdAt: dto.createdAt,
  };
}

/**
 * Renew extends existing or queued cover. An ended period has nothing to extend —
 * that subject needs a new contract authored in the Docs workspace, and offering
 * "Renew" there sends the admin down a path the server refuses
 * (`400 no_active_contract_to_renew`).
 */
export function canRenew(phase: ContractPhase): boolean {
  return isCoveredNow(phase) || phase === "Scheduled";
}

/**
 * Force-deactivate is legal from **every phase that has not already ended**,
 * including `Draft` and `Sent`.
 *
 * ⚠ Corrected 2026-08-10 after reading the backend. An earlier version of this
 * function returned `InForce || Scheduled`, on the reasoning that "terminate ends
 * cover, so it needs cover to end" and an unsigned draft is recalled instead. The
 * backend disagrees, deliberately:
 * `Backend/index/controllers/contracts.md:37` —
 *
 *   > "Force-deactivate → `status = Terminated` (**not** `Expired`, the period had
 *   > not elapsed) + `isActive = false`; always writes
 *   > `OWNER_CONTRACT_FORCE_DEACTIVATED`. **Legal from `Draft`/`Sent` too, so a bad
 *   > contract can be withdrawn**"
 *
 * Recall and withdraw are different acts. Recall (`Sent → Draft`) keeps the row and
 * its history so the corrected contract stays one row; withdraw kills a contract
 * that should never have existed. Hiding the second one leaves an admin who authored
 * a wrong draft with no way to retire it.
 */
export function canTerminate(phase: ContractPhase): boolean {
  return phase !== "Expired" && phase !== "Lapsed" && phase !== "Terminated";
}

/**
 * Sent and silent. Nothing on the backend chases an unsigned contract: the
 * subject gets one notification at send, and the expiry ladder only watches
 * *signed* cover. Surfacing this is the point of the registry (spec §5).
 */
export function isAwaitingSignature(phase: ContractPhase): boolean {
  return phase === "Sent";
}
