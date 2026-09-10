import { getApiErrorCode, getValidationMessage } from "@/lib/http/api-error";

/**
 * F-06a's own error catalogue, keyed to `skillRequests.errors.*`.
 *
 * ⚠ **No error in this feature carries a `detail` key.** A shared handler that
 * reads `detail` for the human message renders `undefined` here, which is why every
 * code maps to our own copy instead.
 *
 * ⚠ Its own mapper, not an extension of another screen's: `note_required` and
 * `reason_required` mean different things on different verbs here, and two of these
 * codes need wording no generic catalogue would give them (see below).
 */
const BY_CODE: Record<string, string> = {
  // The four decision verbs
  note_required: "noteRequired",
  reason_required: "reasonRequired",
  skill_request_not_found: "notFound",
  profession_already_held: "alreadyHeld",
  /**
   * ⚠ **Temporary, and the copy must say so.** The worker is on live work they
   * qualify for *only* via this skill; it clears on its own once that work is
   * `Done` or `Cancelled`. Word it "you can remove it once that work finishes",
   * never "cannot", and offer a retry rather than a dead end. The error carries no
   * list of the blocking jobs, deliberately, so the code stays machine-matchable.
   */
  skill_in_use_by_live_work: "inUseByLiveWork",
  /**
   * ⚠ Also what a lost race returns when two admins decide at once — verified safe
   * on the backend: the second gets this `400`, never a `500` and never a duplicate
   * skill. So the copy is "someone else already handled this", and the fix is to
   * refresh the queue.
   */
  skill_request_invalid_state: "invalidState",
  // Refusals the UI prevents rather than surfaces (`canOfferRevoke`), mapped so a
  // stale screen still says something true instead of "unknown error".
  cannot_revoke_general: "cannotRevokeGeneral",
  cannot_revoke_last_skill: "cannotRevokeLastSkill",
};

/**
 * The `skillRequests.errors.*` key for a thrown value.
 *
 * `validation` covers the one shape that is **not** this feature's envelope: an
 * omitted required field is refused by ASP.NET before the handler runs and arrives
 * as problem-details with no `error` field at all.
 */
export function skillRequestErrorKey(err: unknown): string {
  const code = getApiErrorCode(err);
  if (code && BY_CODE[code]) return BY_CODE[code];
  if (getValidationMessage(err)) return "validation";
  return "unknown";
}
