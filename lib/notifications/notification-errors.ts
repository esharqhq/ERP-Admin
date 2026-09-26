import { AxiosError } from "axios";

/**
 * `notification-bell.md` §11.5 / §12: `DELETE /api/notifications/{id}` answers a
 * **bodyless 404** for an id that does not exist *and* for one that belongs to
 * someone else — deliberately identical (§11.6). From this bell either way means
 * the row is not ours to show, so a 404 is "already gone": keep it removed, no
 * error. Every other failure is a real one and rolls the row back.
 */
export function isAlreadyGone(err: unknown): boolean {
  return err instanceof AxiosError && err.response?.status === 404;
}
