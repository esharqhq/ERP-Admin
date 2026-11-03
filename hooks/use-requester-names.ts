"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ownerService } from "@/lib/services/owner.service";
import { workerService } from "@/lib/services/worker.service";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import {
  idsToFetch,
  requesterIdentity,
  requesterKind,
  type RequesterIdentity,
  type RequesterProfile,
} from "@/lib/support/requester";

/** Module-level, so `useQueries` sees one function and memoises its output. */
type ReadProfile = { id: string } & RequesterProfile;
function dataOnly(
  results: { data?: ReadProfile | undefined }[],
): (ReadProfile | undefined)[] {
  return results.map((r) => r.data);
}

export interface RequesterRef {
  id: string;
  type: string;
}

/**
 * The names behind support-ticket requesters, keyed by `requesterUserId`.
 *
 * The ticket DTOs carry no name (`lib/support/requester.ts`). So:
 * - owners come from the BOSS directory, one request for all of them, under the
 *   same key `useOwnerDirectory` uses;
 * - an owner missing from it (a sub-account) and every worker is read by id,
 *   under the same keys as `useOwner` / `useWorkerDetail`, so a detail page
 *   opened afterwards is already cached, and the other way round.
 *
 * Each read is gated on its own grant, and an unknown grant set reads nothing
 * (fail closed). A requester that could not be read is simply absent from the
 * map, and the caller shows the type and a short id instead.
 */
export function useRequesterNames(
  refs: RequesterRef[],
): ReadonlyMap<string, RequesterIdentity> {
  const { permissions } = useCurrentPermissions();
  const can = (code: string) => permissions?.has(code) === true;

  const hasOwners = refs.some((r) => requesterKind(r.type) === "owner");
  const canListOwners = can("owner:list");

  const directory = useQuery({
    queryKey: ["owner-directory", ""],
    queryFn: () => ownerService.listOwners(),
    enabled: hasOwners && canListOwners,
  });

  // Wait for the directory before reading owners one by one, or every owner
  // would be fetched twice on a cold inbox.
  const directoryIds = useMemo(
    () => (directory.data ? new Set(directory.data.map((o) => o.id)) : null),
    [directory.data],
  );
  const directorySettled = !canListOwners || !directory.isPending;

  const refsKey = refs.map((r) => `${r.id}:${r.type}`).join(",");
  const { owners, workers } = useMemo(
    () => idsToFetch(refs, directoryIds),
    // refsKey stands in for refs, which is a fresh array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refsKey, directoryIds],
  );

  const canReadOwner = can("owner:read") && directorySettled;
  const canReadWorker = can("worker:read");

  // `combine` hands back the same array while no result changed, so the map
  // below is rebuilt only when a name actually arrives.
  const readData = useQueries({
    queries: [
      ...owners.map((id) => ({
        queryKey: ["owner", id],
        queryFn: () => ownerService.getOwner(id),
        enabled: canReadOwner,
        retry: false,
      })),
      ...workers.map((id) => ({
        queryKey: ["worker", id],
        queryFn: () => workerService.getWorkerById(id),
        enabled: canReadWorker,
        retry: false,
      })),
    ],
    combine: dataOnly,
  });

  return useMemo(() => {
    const map = new Map<string, RequesterIdentity>();
    for (const o of directory.data ?? []) map.set(o.id, requesterIdentity(o));
    for (const d of readData) if (d) map.set(d.id, requesterIdentity(d));
    return map;
  }, [directory.data, readData]);
}
