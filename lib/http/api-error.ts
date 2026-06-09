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
