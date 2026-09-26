import { AxiosError } from "axios";
import { getApiErrorCode, getValidationMessage } from "@/lib/http/api-error";

/**
 * Why the activity log could not load — which of the shared table states the page
 * draws (`TableState` with the binder's sentence, `TableForbidden`, `TableError`).
 *
 * Mapped in the project's order:
 * 1. `{ error }` — `GetAuditLog` throws none of its own. The one code that can
 *    arrive is the auth middleware's `{"error":"forbidden"}` 403, which means the
 *    same as an empty one (see `isPermissionDenied` in `lib/onboarding/errors.ts`);
 *    any other code is one nobody has named and gets the generic copy, not a guess;
 * 2. problem-details with no `error` field — a query param the binder refused.
 *    `action` must be the C# member name (`buildAuditQuery` converts it), so this
 *    should not happen; if it does, the page prints the binder's own sentence
 *    rather than an empty list;
 * 3. an **empty** `403` — the admin lacks `system:audit:read`. Without this it
 *    read as "no activity yet", the same indistinguishable-empty bug as the cap.
 */
export type AuditErrorKey = "validation" | "forbidden" | "unknown";

export function auditErrorKey(err: unknown): AuditErrorKey {
  const code = getApiErrorCode(err);
  if (code) return code === "forbidden" ? "forbidden" : "unknown";
  if (getValidationMessage(err)) return "validation";
  if (err instanceof AxiosError && err.response?.status === 403) return "forbidden";
  return "unknown";
}
