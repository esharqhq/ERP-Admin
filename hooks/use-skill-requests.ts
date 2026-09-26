"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { skillRequestService } from "@/lib/services/skill-request.service";
import {
  DECIDED_SKILL_REQUEST_STATUSES,
  type SkillRequestDto,
  type SkillRequestNoteRequest,
  type SkillRequestQuery,
  type SkillRequestReasonRequest,
} from "@/lib/types/skill-request.types";

const ROOT = ["skill-requests"] as const;

/**
 * The decision queue. Server mode, so the whole query goes in the key — a different
 * filter set is a different cached page, not the same page re-narrowed.
 *
 * `enabled` must be gated on `worker_profession_request:read`. A MODERATOR **does**
 * hold it: this is a queue they can open, and only the four verbs are closed to
 * them.
 */
export function useSkillRequests(query: SkillRequestQuery, enabled = true) {
  return useQuery({
    queryKey: [...ROOT, "list", query],
    queryFn: () => skillRequestService.list(query),
    enabled,
  });
}

/** One request, with the worker, their held skills and the history summary. */
export function useSkillRequest(id: string, enabled = true) {
  return useQuery({
    queryKey: [...ROOT, "detail", id],
    queryFn: () => skillRequestService.get(id),
    enabled: enabled && Boolean(id),
  });
}

/**
 * Every list and detail this feature holds, plus the worker read whose
 * `professions` an approve or a revoke changes.
 *
 * ⚠ Approve **adds** a skill and revoke **removes** one, so the worker's own detail
 * is stale after either — a screen still showing the old skill set would be wrong
 * about what work that worker can take. The key is `["worker", id]`
 * (`hooks/use-worker-detail.ts:8`); an invalidation aimed at a key nothing is stored
 * under fails silently.
 */
function useDecisionInvalidation() {
  const qc = useQueryClient();
  return (workerId?: string) => {
    void qc.invalidateQueries({ queryKey: ROOT });
    if (workerId) {
      void qc.invalidateQueries({ queryKey: ["worker", workerId] });
    }
  };
}

/** `…:manage` — asks the worker a question and moves the request to InfoRequested. */
export function useRequestSkillInfo() {
  const invalidate = useDecisionInvalidation();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SkillRequestNoteRequest }) =>
      skillRequestService.requestInfo(id, body),
    onSuccess: (request) => invalidate(request.workerId),
  });
}

/** `…:manage` — the reason is shown to the worker, who may ask again afterwards. */
export function useRejectSkillRequest() {
  const invalidate = useDecisionInvalidation();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SkillRequestReasonRequest }) =>
      skillRequestService.reject(id, body),
    onSuccess: (request) => invalidate(request.workerId),
  });
}

/**
 * `…:manage` — adds the skill to the worker.
 *
 * ⚠ `idempotencyKey` comes from the caller, minted once per attempt and held in a
 * ref — see `skillRequestService.approve`. This hook deliberately does not mint one.
 */
export function useApproveSkillRequest() {
  const invalidate = useDecisionInvalidation();
  return useMutation({
    mutationFn: ({ id, idempotencyKey }: { id: string; idempotencyKey: string }) =>
      skillRequestService.approve(id, idempotencyKey),
    onSuccess: (request) => invalidate(request.workerId),
  });
}

/**
 * `…:manage` — removes the skill.
 *
 * ⚠ `skill_in_use_by_live_work` is a **retryable** refusal, not a failed mutation to
 * hide: callers keep the dialog open and offer the retry.
 */
export function useRevokeSkillRequest() {
  const invalidate = useDecisionInvalidation();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SkillRequestReasonRequest }) =>
      skillRequestService.revoke(id, body),
    onSuccess: (request) => invalidate(request.workerId),
  });
}

/**
 * One worker's **whole** request history, newest first.
 *
 * ⚠ **Four calls, and there is no way to do it in one.** The endpoint's `status` is
 * a single enum whose absence means exactly `Pending` + `InfoRequested`
 * (`WorkerProfessionRequestService.cs:371`), so a full history is the bare call plus
 * one per decided status. The four result sets are therefore **disjoint and
 * complete** — all five statuses, each covered once — which is why the merge needs
 * no dedupe. A duplicate id would mean the backend's default changed, so the merge
 * says so rather than quietly de-duplicating.
 *
 * The worker detail page already fires a comparable number of reads (shifts,
 * documents, rating, agency link, conversations) and React Query caches each of
 * these independently.
 */
export function useWorkerSkillRequestHistory(workerId: string, enabled = true) {
  const results = useQueries({
    queries: [undefined, ...DECIDED_SKILL_REQUEST_STATUSES].map((status) => ({
      queryKey: [...ROOT, "list", { workerId, status, page: 1, pageSize: 100 }],
      queryFn: () =>
        skillRequestService.list({ workerId, status, page: 1, pageSize: 100 }),
      enabled: enabled && Boolean(workerId),
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);

  /**
   * Merged inline rather than in a `useMemo`. `useQueries` returns a fresh array
   * every render, so any dependency list over it is either a lie or an
   * `eslint-disable` — and the obvious key, `dataUpdatedAt`, does not move when a
   * query turns from success to error, so the memo would serve stale rows on a
   * failure. Four arrays of at most 100 rows cost nothing to merge per render.
   */
  const merged: SkillRequestDto[] = [];
  const seen = new Set<string>();
  for (const result of results) {
    for (const row of result.data?.items ?? []) {
      if (seen.has(row.id)) {
        // Disjointness is the backend's contract, not a hope: if it ever stops
        // holding, a silent de-dupe would hide the change until something else
        // broke. Say so and keep the first copy.
        console.warn(
          `[skill-requests] duplicate request ${row.id} across status reads — ` +
            `the queue's default status filter may have changed`,
        );
        continue;
      }
      seen.add(row.id);
      merged.push(row);
    }
  }
  const rows = merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { rows, isLoading, isError };
}
