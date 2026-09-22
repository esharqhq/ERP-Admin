import { getApiErrorCode, getValidationMessage } from "@/lib/http/api-error";

/**
 * The refusals `POST /api/admin/workers/{id}/restore` and
 * `POST /api/owners/{id}/restore` can answer.
 *
 * ⚠⚠ **`cannot_restore_email_taken` and `cannot_restore_phone_taken` are
 * separate codes and must stay separate messages.** A deleted person's email
 * *and* phone are both released for re-registration, and the phone can clash
 * independently of the email — telling an admin "the email is taken" when it is
 * the phone sends them to check the wrong thing.
 *
 * ⚠ A restore is therefore **conditional**, not a button that always works. That
 * is the whole reason this mapping exists rather than one generic message.
 */
export type RestoreErrorKey =
  | "emailTaken"
  | "phoneTaken"
  | "notDeleted"
  | "notFound"
  | "reasonRequired"
  | "generic";

const CODES: Record<string, RestoreErrorKey> = {
  cannot_restore_email_taken: "emailTaken",
  cannot_restore_phone_taken: "phoneTaken",
  worker_not_deleted: "notDeleted",
  owner_not_deleted: "notDeleted",
  worker_not_found: "notFound",
  owner_not_found: "notFound",
  reason_required: "reasonRequired",
};

/**
 * ⚠ `detail` carries a problem-details message when the refusal arrived with no
 * `error` key at all — a `[Required]` failure is rejected by model binding before
 * the action runs, so a handler reading only `.error` would show nothing.
 */
export function restoreErrorKey(err: unknown): {
  key: RestoreErrorKey;
  detail: string | null;
} {
  const code = getApiErrorCode(err);
  if (code && CODES[code]) return { key: CODES[code], detail: null };
  return { key: "generic", detail: getValidationMessage(err) };
}
