import { isCoveredNow } from "@/lib/types/onboarding.types";
import type {
  ContractPhase,
  ContractStatus,
} from "@/lib/types/onboarding.types";

/** Fields every contract row shares, owner and worker alike. */
interface ContractRowBase {
  id: string;
  eligibleFrom: string;
  eligibleTo: string;
  fileName: string | null;
  /**
   * The admin-supplied **source** document, echoed back exactly as posted — so it
   * is absolute when this panel uploaded it (`uploadService.upload` returns the
   * backend's `publicUrl`) and a bare storage key when another client did. Not a
   * signed URL either way. `resolveFileUrl` (`lib/http/files.ts`) handles both.
   */
  fileUrl: string | null;
  /** Lagging mirror reconciled hourly. Prefer `phase` in every case. */
  isActive: boolean;
  createdAt: string;
  /** Stored lifecycle, written by admin/subject actions. */
  status: ContractStatus;
  /** Computed per read — this is what the UI renders. */
  phase: ContractPhase;
  sentAt: string | null;
  signedAt: string | null;
  /**
   * Counter-signed final PDF. Short-lived signed URL minted per read (~300 s):
   * follow it immediately, never cache it. A 404 usually means "expired link".
   */
  documentUrl: string | null;
  /**
   * Unsigned PDF the subject reads before signing. Set **only while `Sent`**.
   * Minted from `status`, not from storage — a fresh URL that still 404s means
   * the artifact is genuinely missing.
   */
  previewUrl: string | null;
  /**
   * How the subject signed. `"Drawn"` is the only shipped member — SMS was ruled
   * out 2026-08-07 (`index/gaps/closed/2026-08-07-sms-signature.md`) and the enum
   * seam is reserved, not pending.
   *
   * `null` means either "not signed yet" **or** "signed before F-03·3 shipped" —
   * the two are told apart by `signedAt`. Present on the admin DTOs deliberately:
   * "was this properly signed?" is a compliance question and this is its answer.
   */
  signatureMethod: "Drawn" | null;
  /** Why this contract came back — admin recall or the subject's rejection. */
  revisionReason: string | null;
  revisionRequestedByUserId: string | null;
  revisionRequestedAt: string | null;
  /** When the contract taking over from this one begins. Set only on the InForce row. */
  renewalStartsAt: string | null;
}

export interface AdminOwnerContractDto extends ContractRowBase {
  ownerProfileId: string;
  /** Contract-authoring routes are keyed on this, not on ownerProfileId. */
  ownerUserId: string;
  /** The **display** name, typed at register and changed by the user. */
  ownerFullName: string | null;
  /**
   * The **legal** name off the passport — new 2026-08-11 (PR #67), and what the
   * contract PDF's `CLIENT` party block actually prints. It is allowed to differ
   * from `ownerFullName`, so a row labelled with the display name alone can name
   * a different party than the document it links to.
   *
   * ⚠ `null` when no passport name is on file, and it **never** falls back to
   * the display name — render nothing, not the other name
   * (`contract-lifecycle.md` §7.7). It also does *not* govern
   * `{{owner.firstName}}` / `{{owner.lastName}}` inside authored clause text.
   */
  ownerLegalName: string | null;
  ownerEmail: string | null;
}

export interface AdminWorkerContractDto extends ContractRowBase {
  workerId: string;
  workerFullName: string | null;
  /** The worker's passport name. Same rules as `ownerLegalName`. */
  workerLegalName: string | null;
  workerEmail: string | null;
}

/** Shared body fields. Dates MUST carry an explicit UTC offset (else 500). */
export interface ContractPeriodFields {
  eligibleFrom: string;
  eligibleTo: string;
  fileName: string;
  /** presign `storageKey`, uploaded under `category: "contract-sources"`. */
  fileUrl: string;
}

/**
 * Owner create/renew/draft-edit body. `generalTerms`/`extraClauses` feed the
 * generated PDF and are owner-only. `commissionPercent`/`paymentOrder` were
 * removed backend-side on 2026-09-03 — the server never rejects them, it
 * silently discards them, so don't add them back.
 */
export interface CreateOwnerContractRequest extends ContractPeriodFields {
  generalTerms?: string | null;
  extraClauses?: string | null;
}

/** Worker body has no term fields — worker clause content is a later backend slice. */
export type CreateWorkerContractRequest = ContractPeriodFields;

/** Body for recall (admin) — `reason` is required. */
export interface ContractRevisionRequest {
  reason: string;
}

export type ContractType = "owner" | "worker";

/** The row that unlocks the account today, or null. */
export function findInForce<T extends { phase: ContractPhase }>(
  contracts: T[] | undefined,
): T | null {
  return contracts?.find((c) => isCoveredNow(c.phase)) ?? null;
}

/** Rows sent but never signed — nothing on the backend chases these. */
export function findUnsigned<T extends { phase: ContractPhase }>(
  contracts: T[] | undefined,
): T[] {
  return (contracts ?? []).filter((c) => c.phase === "Sent");
}
