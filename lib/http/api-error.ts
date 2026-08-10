import { AxiosError } from "axios";

/**
 * Backend errors come back as `{ error: "<code>" }` (e.g. "worker_limit_reached",
 * "boss_has_active_properties", "profession_in_use") on 400/409 responses — see the
 * controllers' `catch (InvalidOperationException ex) { return BadRequest({ error }) }`.
 * Pull that machine code out of any thrown value so callers can map it to a localized
 * message. Returns null when the shape is unknown (network error, plain string, etc.).
 */
export function getApiErrorCode(err: unknown): string | null {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { error?: unknown } | undefined;
    if (data && typeof data.error === "string") return data.error;
  }
  return null;
}

/**
 * Not every 400 uses this project's `{error}` envelope. `[Required]` failures and
 * enum-name deserialization failures are refused by ASP.NET **before** the action
 * runs, so they arrive as problem-details with no `error` field at all — a blank
 * rejection reason is the everyday case (`Backend/index/controllers/kyc.md:37`).
 * Without this the admin who left the box empty is told "unknown error".
 */
export function getValidationMessage(err: unknown): string | null {
  if (!(err instanceof AxiosError)) return null;
  const data = err.response?.data as { errors?: unknown } | undefined;
  const bag = data?.errors;
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) return null;
  for (const value of Object.values(bag as Record<string, unknown>)) {
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
      return value[0];
    }
  }
  return null;
}

/**
 * True when an `error` value is prose rather than a code.
 *
 * `G_ArgumentExceptionMessageLeaksIntoErrorField` (open): nine controller sites do
 * `catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }) }`,
 * so any library throwing inside those blocks becomes the `error` value verbatim —
 * including its wording, which changes on upgrade. It has shipped once already, on
 * `GET /api/admin/owners`. Every real code in this API is lower snake_case, so the
 * shape is enough to tell them apart, and a leaked sentence must not be shown to an
 * admin as if it were a diagnosis.
 */
export function looksLikeLeakedMessage(code: string): boolean {
  return !/^[a-z][a-z0-9_]*$/.test(code);
}
