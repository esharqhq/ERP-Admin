import { AxiosError } from "axios";
import { getApiErrorCode, getValidationMessage, looksLikeLeakedMessage } from "@/lib/http/api-error";

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
  /**
   * A server-supplied value to interpolate into the message (via the `{detail}`
   * ICU placeholder), used for the two shapes that carry a field- or value-specific
   * message: problem-details validation ("validation") and the interpolated
   * `invalid_document_type: <value>` code. The server's own wording is more useful
   * than any generic string we could write, even in English on a German screen.
   */
  detail?: string;
}

/**
 * Where a `settings-link` reaction sends the admin. The Settings page reads
 * `?highlight=` and scrolls that key's row into view with a ring, because the
 * page renders every system setting grouped by prefix — without the highlight,
 * "go to Settings" means "find one row among dozens".
 */
export const SETTINGS_DEEP_LINK = "/dashboard/settings?highlight=";

/** The setting each `settings-link` error is actually blocked on. */
export const SETTINGS_LINK_TARGET: Record<string, string> = {
  contract_template_not_approved: "contract.template.approved",
  contract_template_missing: "contract.template.owner.en",
};

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

  // ── KYC document intake (backend 2026-08-07) ─────────────────────────────
  // Distinct from kyc_documents_required, which still means ZERO documents.
  incomplete_document_set: { labelKey: "incompleteDocumentSet", reaction: "toast" },
  invalid_document_type: { labelKey: "invalidDocumentType", reaction: "toast" },

  // ── F-03·1 structured document data ─────────────────────────────────────
  incomplete_identity_data: { labelKey: "incompleteIdentityData", reaction: "toast" },
  onboarding_locked: { labelKey: "onboardingLocked", reaction: "refetch" },
  city_country_mismatch: { labelKey: "cityCountryMismatch", reaction: "toast" },
  city_not_found: { labelKey: "cityNotFound", reaction: "toast" },
  invalid_company_type: { labelKey: "invalidCompanyType", reaction: "toast" },
  company_name_required: { labelKey: "companyNameRequired", reaction: "toast" },
  company_license_number_required: { labelKey: "companyLicenseNumberRequired", reaction: "toast" },
  company_not_found: { labelKey: "companyNotFound", reaction: "not-found" },

  // ── BOSS-only guards — arrive as the third 403 flavour's `detail` code ──
  kyc_submit_requires_boss: { labelKey: "requiresBoss", reaction: "toast" },
  kyc_doc_upload_requires_boss: { labelKey: "requiresBoss", reaction: "toast" },

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
  // `property_docs_not_approved` used to sit here. F-02c deleted the gate *and*
  // the whole property-document feature on 2026-08-07 — every property is
  // task-ready the moment it exists — so the code can never arrive again.

  // ── properties (F-02c) ──────────────────────────────────────────────────
  // Both arrive as 400 on create and update. `not_found` is also what an
  // *omitted* propertyCategoryId produces: it binds to Guid.Empty, which then
  // fails the existence lookup — so this message must read as "pick a
  // category", not as "that category was deleted".
  // ── owners (F-02b·7, F-02b·6) ────────────────────────────────────────────
  // Blocks a delete while the owner has a Pending/Active/Review task. Replaced
  // `boss_has_active_properties`, which no longer exists — and means something
  // different: owning properties never blocked deletion again, only open work
  // does. There is no admin action that clears it (an Active/Review task cannot
  // be cancelled by anyone), so the copy must say "wait", not "cancel them".
  owner_has_open_tasks: { labelKey: "ownerHasOpenTasks", reaction: "toast" },
  // The permanent "Walk-in / Manual Orders" account. One code, four refusals:
  // 409 on edit and delete (acting *on* the owner), 400 on ticket and contract
  // (the owner is an invalid argument to something else).
  owner_is_system: { labelKey: "ownerIsSystem", reaction: "toast" },

  property_category_not_found: { labelKey: "propertyCategoryNotFound", reaction: "toast" },
  property_category_inactive: { labelKey: "propertyCategoryInactive", reaction: "toast" },
  target_owner_must_be_boss: { labelKey: "targetOwnerMustBeBoss", reaction: "toast" },
  property_not_found: { labelKey: "propertyNotFound", reaction: "not-found" },

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

function status(err: unknown): number | null {
  return err instanceof AxiosError ? (err.response?.status ?? null) : null;
}

/** True for the middleware's fall-through shape, `{"error":"forbidden",...}` — with or without `detail`. */
function isForbiddenShape(err: unknown): boolean {
  if (!(err instanceof AxiosError)) return false;
  const data = err.response?.data as { error?: unknown } | undefined;
  return data?.error === "forbidden";
}

/** The middleware's fall-through shape puts the real code in `detail`, not `error`. */
function forbiddenDetail(err: unknown): string | null {
  if (!isForbiddenShape(err)) return null;
  const data = (err as AxiosError).response?.data as { detail?: unknown } | undefined;
  return typeof data?.detail === "string" ? data.detail : null;
}

/**
 * Some services interpolate the offending value into the code:
 * `WorkerDocService.cs:75` throws `$"invalid_document_type: {req.DocumentType}"`
 * while `KycService.cs:395` throws the bare code for the same failure. Splitting
 * on the first `": "` lets one catalog entry serve both, and keeps the value as
 * detail — which is the useful half, since "which type was wrong" is the question
 * the admin has.
 */
function splitCode(raw: string): { code: string; detail: string | null } {
  const at = raw.indexOf(": ");
  return at === -1
    ? { code: raw, detail: null }
    : { code: raw.slice(0, at), detail: raw.slice(at + 2) };
}

export function describeApiError(err: unknown): ApiErrorInfo | null {
  // `{"error":"forbidden","detail":"<code>"}` — read the code out of `detail`.
  const forbidden = forbiddenDetail(err);
  const raw = forbidden ?? getApiErrorCode(err);

  if (!raw) {
    // Problem-details: no code, but a usable field message.
    const validation = getValidationMessage(err);
    return validation
      ? { code: "validation", labelKey: "validation", reaction: "toast", detail: validation }
      : null;
  }

  // Split before the leaked-message check — the interpolated tail's colon and
  // capital would otherwise make a real code look like leaked prose.
  const { code, detail } = splitCode(raw);

  // A leaked library sentence is not a code and must not be matched or displayed.
  if (looksLikeLeakedMessage(code)) {
    return { code: "unknown", labelKey: "unknown", reaction: "toast" };
  }

  const known = CATALOG[code];
  if (!known) return { code, labelKey: "unknown", reaction: "toast" };
  return detail ? { code, ...known, detail } : { code, ...known };
}

/**
 * An **empty** 403 body means the permission filter refused: the caller's role lacks
 * the permission. The middleware's `{"error":"forbidden",...}` shape means the same
 * thing — an authorization failure that simply wasn't mapped by its controller — so it
 * counts here too, regardless of whether a `detail` code rode along.
 */
export function isPermissionDenied(err: unknown): boolean {
  if (status(err) !== 403) return false;
  return getApiErrorCode(err) === null || isForbiddenShape(err);
}

/**
 * A 403 **with** a gate code is the ACTIVE gate: the caller is permitted, but the
 * subject has no signed contract covering today. Copy must talk about the subject's
 * contract — and `contract_not_yet_active` must never say "expired". Requires the
 * resolved code to actually be a cataloged `"gate"` code — an unmapped or unexpected
 * 403 (including the middleware's bare `forbidden` shape) is never reported as one.
 */
export function isGateRefusal(err: unknown): boolean {
  if (status(err) !== 403) return false;
  if (isForbiddenShape(err)) return false;
  const code = getApiErrorCode(err);
  if (!code) return false;
  return CATALOG[code]?.reaction === "gate";
}
