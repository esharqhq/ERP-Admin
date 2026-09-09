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

/**
 * The refusals **un**assigning owns copy for. Read off `AdminUnassignWorkerAsync`
 * (`TaskService.cs:826-869`), whose only exit paths are these three plus the
 * empty-bodied `403` for a missing `task:unassign_worker_any`.
 *
 * `task_not_unassignable` is the one that actually happens: the guard refuses
 * `Done` / `Cancelled` / **`Review`**, and Review is reachable by simply having
 * the board open — a worker submits their work while the admin is deciding, and
 * the × they were about to click is already refused. Until now that failed
 * silently, which is the whole reason this classifier exists.
 *
 * ⚠ Not the same set as assigning, and not a superset of it either. Sharing one
 * set would put `worker_limit_reached` copy behind a dialog that can never
 * produce it, and would hide the fact that these two doors fail for different
 * reasons.
 */
export const UNASSIGN_ERRORS = new Set([
  "task_not_unassignable",
  "assignment_not_found",
  "task_not_found",
]);

/**
 * Same ladder as `classifyAssignError`, same reasons, different local set —
 * permission, then the shared onboarding catalog, then this module's codes, then
 * generic.
 *
 * A separate function rather than a parameter on the one above: the two doors
 * genuinely own different vocabularies, and a shared classifier with a `mode`
 * argument would let a caller word a refusal its endpoint cannot return.
 */
export function classifyUnassignError(error: unknown): AssignErrorKind {
  if (isPermissionDenied(error)) return { kind: "permission" };

  const info = describeApiError(error);
  if (!info) return { kind: "unknown" };
  if (info.labelKey !== "unknown") return { kind: "catalog", labelKey: info.labelKey };
  if (UNASSIGN_ERRORS.has(info.code)) return { kind: "legacy", code: info.code };
  return { kind: "unknown" };
}
