import { AxiosError } from "axios";
import { getApiErrorCode } from "@/lib/http/api-error";

/**
 * How the UI should react to a machine error code. The caller decides the
 * widget; this only says which kind of reaction the code deserves.
 */
export type ErrorReaction =
  /** Show under the contract period inputs. */
  | "inline-period"
  /** Show under the reason textarea. */
  | "inline-reason"
  /** State moved under us — refetch and let the screen re-render. */
  | "refetch"
  /** Blocked by a system setting — link the admin to Settings. */
  | "settings-link"
  /** The ACTIVE gate refused because of the subject's cover, not the caller's role. */
  | "gate"
  /** Render the not-found state. */
  | "not-found"
  /** Plain toast. */
  | "toast";

export interface ApiErrorInfo {
  code: string;
  /** Key under the `onboarding.apiErrors` i18n namespace. */
  labelKey: string;
  reaction: ErrorReaction;
}

/**
 * Every code this app can receive from the onboarding, contract, table, lookup and
 * admin-ticket routes. Sources: onboarding-and-active-gate.md §13,
 * contract-lifecycle.md §11, fnd-1 §8, fnd-2 §9, fnd-3 §8.
 *
 * Note the codes that arrive as 400 despite swagger declaring 404 — that is why
 * callers branch on the code, never on the status.
 */
const CATALOG: Record<string, Omit<ApiErrorInfo, "code">> = {
  // ── onboarding review ───────────────────────────────────────────────────
  invalid_onboarding_transition: { labelKey: "invalidOnboardingTransition", reaction: "refetch" },
  rejection_reason_required: { labelKey: "rejectionReasonRequired", reaction: "inline-reason" },
  kyc_documents_required: { labelKey: "kycDocumentsRequired", reaction: "toast" },
  worker_documents_required: { labelKey: "workerDocumentsRequired", reaction: "toast" },
  kyc_profile_not_found: { labelKey: "subjectNotFound", reaction: "not-found" },
  owner_profile_not_found: { labelKey: "subjectNotFound", reaction: "not-found" },
  owner_not_found: { labelKey: "subjectNotFound", reaction: "not-found" },
  worker_not_found: { labelKey: "subjectNotFound", reaction: "not-found" },
  worker_doc_not_found: { labelKey: "documentNotFound", reaction: "not-found" },
  kyc_doc_not_found: { labelKey: "documentNotFound", reaction: "not-found" },

  // ── contract authoring ──────────────────────────────────────────────────
  onboarding_not_approved: { labelKey: "onboardingNotApproved", reaction: "refetch" },
  contract_already_sent: { labelKey: "contractAlreadySent", reaction: "toast" },
  contract_template_not_approved: { labelKey: "contractTemplateNotApproved", reaction: "settings-link" },
  contract_template_missing: { labelKey: "contractTemplateMissing", reaction: "settings-link" },
  invalid_contract_period: { labelKey: "invalidContractPeriod", reaction: "inline-period" },
  contract_period_overlaps: { labelKey: "contractPeriodOverlaps", reaction: "inline-period" },
  contract_period_gap: { labelKey: "contractPeriodGap", reaction: "inline-period" },
  no_active_contract_to_renew: { labelKey: "noActiveContractToRenew", reaction: "toast" },
  invalid_contract_transition: { labelKey: "invalidContractTransition", reaction: "refetch" },
  revision_reason_required: { labelKey: "revisionReasonRequired", reaction: "inline-reason" },
  contract_already_inactive: { labelKey: "contractAlreadyInactive", reaction: "toast" },
  contract_not_found: { labelKey: "contractNotFound", reaction: "not-found" },

  // ── the ACTIVE gate: 403 WITH a body, about the SUBJECT's cover ──────────
  onboarding_incomplete: { labelKey: "gateOnboardingIncomplete", reaction: "gate" },
  contract_expired: { labelKey: "gateContractExpired", reaction: "gate" },
  contract_not_yet_active: { labelKey: "gateContractNotYetActive", reaction: "gate" },
  contract_expiring_imminently: { labelKey: "gateContractExpiringImminently", reaction: "gate" },
  task_date_beyond_contract: { labelKey: "taskDateBeyondContract", reaction: "toast" },
  worker_contract_ends_before_task: { labelKey: "workerContractEndsBeforeTask", reaction: "toast" },
  property_docs_not_approved: { labelKey: "propertyDocsNotApproved", reaction: "toast" },

  // ── tables, exports, lookups, tickets ───────────────────────────────────
  invalid_sort_column: { labelKey: "invalidSortColumn", reaction: "toast" },
  invalid_filter_value: { labelKey: "invalidFilterValue", reaction: "toast" },
  invalid_format: { labelKey: "invalidFormat", reaction: "toast" },
  export_too_large: { labelKey: "exportTooLarge", reaction: "toast" },
  code_exists: { labelKey: "codeExists", reaction: "toast" },
  name_exists: { labelKey: "nameExists", reaction: "toast" },
  country_not_found: { labelKey: "countryNotFound", reaction: "not-found" },
  invalid_target_type: { labelKey: "invalidTargetType", reaction: "toast" },
  target_not_found: { labelKey: "targetNotFound", reaction: "not-found" },
};

export function describeApiError(err: unknown): ApiErrorInfo | null {
  const code = getApiErrorCode(err);
  if (!code) return null;
  const known = CATALOG[code];
  return known
    ? { code, ...known }
    : { code, labelKey: "unknown", reaction: "toast" };
}

function status(err: unknown): number | null {
  return err instanceof AxiosError ? (err.response?.status ?? null) : null;
}

/**
 * An **empty** 403 body means the permission filter refused: the caller's role
 * lacks the permission. Copy must talk about the admin's access, not the subject.
 */
export function isPermissionDenied(err: unknown): boolean {
  return status(err) === 403 && getApiErrorCode(err) === null;
}

/**
 * A 403 **with** a body is the ACTIVE gate: the caller is permitted, but the
 * subject has no signed contract covering today. Copy must talk about the
 * subject's contract — and `contract_not_yet_active` must never say "expired".
 */
export function isGateRefusal(err: unknown): boolean {
  return status(err) === 403 && getApiErrorCode(err) !== null;
}
