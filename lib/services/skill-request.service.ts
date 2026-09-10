import { apiClient } from "@/lib/http/client";
import { idempotent, newIdempotencyKey } from "@/lib/http/idempotency";
import type { PagedResult } from "@/lib/types/paged.types";
import type {
  SkillRequestDetailDto,
  SkillRequestDto,
  SkillRequestNoteRequest,
  SkillRequestQuery,
  SkillRequestReasonRequest,
} from "@/lib/types/skill-request.types";

const ROOT = "/api/admin/worker-skill-requests";

/**
 * F-06a's admin half — the only door through which a worker's skills can change.
 *
 * ⚠ **Every write here is `403` with a completely EMPTY body when the caller lacks
 * `worker_profession_request:manage`** — no JSON, no code. A MODERATOR holds the
 * read and none of the writes, so callers hide these controls rather than letting
 * them fail into an unrenderable refusal.
 */
export const skillRequestService = {
  /**
   * `worker_profession_request:read` — the queue, newest first.
   *
   * ⚠ **Omitting `status` returns the two OPEN states, not everything**
   * (`Pending` + `InfoRequested`). `status` is a single enum, so no call can ask for
   * all five; `buildSkillRequestQuery` owns that rule. There is no `sort` parameter
   * — `createdAt` descending is the only order.
   */
  list: async (query: SkillRequestQuery): Promise<PagedResult<SkillRequestDto>> => {
    const { data } = await apiClient.get<PagedResult<SkillRequestDto>>(ROOT, {
      params: query,
    });
    return data;
  },

  /**
   * `worker_profession_request:read` — the decision screen: the claim, the worker's
   * basics, what they already hold, and a three-number history summary.
   */
  get: async (id: string): Promise<SkillRequestDetailDto> => {
    const { data } = await apiClient.get<SkillRequestDetailDto>(`${ROOT}/${id}`);
    return data;
  },

  /**
   * `…:manage` — from `Pending` only → `InfoRequested`. Empty note is
   * `400 note_required`.
   *
   * ⚠ The note **is shown to the worker**, so it is written as a question addressed
   * to them. There is no internal-only field here.
   */
  requestInfo: async (
    id: string,
    body: SkillRequestNoteRequest,
  ): Promise<SkillRequestDto> => {
    const { data } = await apiClient.post<SkillRequestDto>(
      `${ROOT}/${id}/request-info`,
      body,
    );
    return data;
  },

  /**
   * `…:manage` — from `Pending` or `InfoRequested` → `Rejected`. Empty reason is
   * `400 reason_required`.
   *
   * ⚠ The reason **is shown to the worker** (it overwrites `adminNote`) and they may
   * ask again afterwards, so it is feedback, not an internal note.
   */
  reject: async (
    id: string,
    body: SkillRequestReasonRequest,
  ): Promise<SkillRequestDto> => {
    const { data } = await apiClient.post<SkillRequestDto>(
      `${ROOT}/${id}/reject`,
      body,
    );
    return data;
  },

  /**
   * `…:manage` — from `Pending` **or** `InfoRequested` → `Approved`, and adds the
   * skill to the worker. **No body.**
   *
   * Approve does not require the question to have been answered: an admin who asked
   * and then made up their mind can decide straight from `InfoRequested`.
   *
   * ⚠ It adds **one** skill and never replaces the set — no endpoint anywhere takes
   * an array of profession ids for a worker, so no client can clear a worker's other
   * skills by accident.
   *
   * ⚠ `idempotencyKey` **must be minted once per user-initiated attempt and held by
   * the caller** (`decision-actions.tsx` keeps it in a ref) so a retry of the same
   * attempt replays instead of deciding twice. Minting it in here on every call
   * would give every retry — including a double-click — a fresh key, which means the
   * header protects against nothing; that was a real defect on `broadcast.service`
   * once. The fallback exists only for a call site that genuinely does not care.
   *
   * Two admins approving at once is safe either way: the loser gets
   * `400 skill_request_invalid_state`, never a `500` and never a duplicate skill.
   */
  approve: async (id: string, idempotencyKey?: string): Promise<SkillRequestDto> => {
    const key = idempotencyKey ?? newIdempotencyKey();
    const { data } = await apiClient.post<SkillRequestDto>(
      `${ROOT}/${id}/approve`,
      undefined,
      idempotent(key),
    );
    return data;
  },

  /**
   * `…:manage` — from `Approved` **only** → `Revoked`, and removes the skill.
   *
   * This is the correction path for a mistaken approval, and it acts on the request
   * row — which is why there is no "remove skill X from worker Y" route: every skill
   * beyond `GENERAL` got there through an approved request, so the request is the
   * handle.
   *
   * Four refusals: `reason_required`, `cannot_revoke_general`,
   * `cannot_revoke_last_skill` (the last two prevented by `canOfferRevoke`) and
   * ⚠ `skill_in_use_by_live_work`, which is **temporary** — it clears once the
   * blocking work is `Done` or `Cancelled`, so callers offer a retry.
   *
   * It does not touch the worker's current jobs, their task outcomes or their
   * rating. Revoke stops *new* work; it never penalises past work.
   */
  revoke: async (
    id: string,
    body: SkillRequestReasonRequest,
  ): Promise<SkillRequestDto> => {
    const { data } = await apiClient.post<SkillRequestDto>(
      `${ROOT}/${id}/revoke`,
      body,
    );
    return data;
  },
};
