"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { workerService } from "@/lib/services/worker.service";
import type { WorkerListQuery } from "@/lib/types/worker.types";
import {
  WORKER_SUMMARY_TILES,
  type WorkerSummaryCounts,
} from "@/lib/workers/summary";

/**
 * Worker list. `enabled` should be gated on `worker:list` when used as a filter
 * picker on a page whose own gate is a *different* permission (e.g. the
 * working-hours page is gated `system:analytics:read`), so a custom-override
 * admin lacking `worker:list` doesn't 403 on the picker (fail-open class).
 */
export function useWorkers(query: WorkerListQuery = {}, enabled = true) {
  return useQuery({
    queryKey: ["workers", query],
    queryFn: () => workerService.getWorkers(query),
    enabled,
  });
}

/**
 * The four counts above the table, as four one-row reads.
 *
 * **Four requests, deliberately.** There is no counts endpoint — see
 * `lib/workers/summary.ts` — so each tile probes its own population with
 * `pageSize: 1` and keeps only `total`. Four small reads beside the page's own is
 * the price of the strip; it is paid once per filter-independent visit, because
 * these queries do **not** carry the table's filters. That is the point: the strip
 * says what is true of the platform, not of the current narrowing, and a count
 * that moved with the filters would answer a question nobody asked.
 *
 * **A failed or refused probe reports `0`.** `SummaryTile` draws a zero as cleared
 * and colourless, with no action — which is a far better reading than an alarming
 * tile built on a number that never arrived. So there is no error surface here on
 * purpose; the table below is where a `403` on `worker:list` gets named.
 */
export function useWorkerSummary(enabled = true): {
  counts: WorkerSummaryCounts;
  isLoading: boolean;
} {
  const results = useQueries({
    queries: WORKER_SUMMARY_TILES.map((tile) => ({
      /*
        Shares the `["workers"]` prefix with the list on purpose: an approve, a
        block or an unblock invalidates that prefix, and the four counts describe
        exactly the populations those verbs move between. A private prefix would
        leave the strip claiming "4 waiting in review" for five minutes after the
        fourth was approved.
      */
      queryKey: ["workers", "count", tile.id],
      queryFn: () =>
        workerService.getWorkers({ ...tile.query, page: 1, pageSize: 1 }),
      enabled,
      // Reference-ish: these move when an admin acts, not while they read. Five
      // minutes keeps a tab switch free without letting the strip go stale enough
      // to contradict the table.
      staleTime: 5 * 60 * 1000,
    })),
  });

  return {
    counts: Object.fromEntries(
      WORKER_SUMMARY_TILES.map((tile, i) => [tile.id, results[i]?.data?.total ?? 0]),
    ),
    // Every tile lands together or the strip flickers four times on first paint.
    isLoading: results.some((r) => r.isLoading),
  };
}
