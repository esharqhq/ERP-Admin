import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";

/**
 * The only admin-assign refusals a **page** owns copy for. Everything else about a
 * refused assignment — the gate codes and `worker_contract_ends_before_task` — is in
 * the shared onboarding catalog. `worker_not_approved` no longer exists.
 */
export const LEGACY_ASSIGN_ERRORS = new Set([
  "worker_below_rating_floor",
  "worker_profession_not_eligible",
  "worker_limit_reached",
  "worker_has_overlapping_assignment",
]);

export type AssignErrorKind =
  | { kind: "permission" }
  | { kind: "catalog"; labelKey: string }
  | { kind: "legacy"; code: string }
  | { kind: "unknown" };

/**
 * Which namespace an admin-assign refusal should be worded from.
 *
 * Returns a kind rather than a string because the two call sites word the same
 * refusal from different namespaces — Dispatch from its page-local `errors.*`, the
 * Walk-In sheet from `workers.assignErrors`. What must not diverge between them is
 * this decision, so it lives here once and each caller renders it.
 *
 * The catalog check comes before the legacy check on purpose: a code the shared
 * catalog covers must be worded from the catalog even if a page also happens to
 * carry a key for it. Never interpolate a raw code into a namespace that may not
 * hold it — next-intl would render its missing-key path string.
 */
export function classifyAssignError(error: unknown): AssignErrorKind {
  if (isPermissionDenied(error)) return { kind: "permission" };

  const info = describeApiError(error);
  if (!info) return { kind: "unknown" };
  if (info.labelKey !== "unknown") return { kind: "catalog", labelKey: info.labelKey };
  if (LEGACY_ASSIGN_ERRORS.has(info.code)) return { kind: "legacy", code: info.code };
  return { kind: "unknown" };
}
