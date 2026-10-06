"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminTaskGroups } from "@/hooks/use-tasks";
import { useProperties } from "@/hooks/use-properties";
import { useWalkInOwnerId } from "@/hooks/use-owners";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { useClock } from "@/hooks/use-today";
import { taskService } from "@/lib/services/task.service";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { buildRegisterRows } from "@/lib/tasks/register/rows";
import type { RegisterLookups, RegisterWindow } from "@/lib/tasks/register/filters";

/**
 * The register's rows (spec §2): the day window from the server, joined to the
 * cached booking list. ⚠ The key is the `admin-tasks-range` family on purpose —
 * `invalidateTasks` clears it by prefix, so an Assign anywhere refreshes this.
 *
 * `window` is `null` until the page knows today (`registerRange`); nothing is
 * asked for until then, and the register reports loading.
 */
export function useTaskRegister(window: RegisterWindow | null) {
  const now = useClock();
  const tasks = useQuery({
    queryKey: ["admin-tasks-range", window?.fromIso ?? null, window?.toIso ?? null],
    queryFn: () => taskService.getAdminTasksInRange(window!.fromIso, window!.toIso),
    enabled: Boolean(now && window),
  });
  const groups = useAdminTaskGroups();
  const properties = useProperties();
  // The walk-in lookup lists owners — without `owner:list` it would be a 403,
  // and the band hides its Walk-in toggle anyway (`registerFields`).
  const canListOwners = useHasPermission("owner:list");
  const walkIn = useWalkInOwnerId(canListOwners);

  const groupsById = useMemo(
    () => new Map((groups.data ?? []).map((g) => [g.id, g])),
    [groups.data],
  );
  const lookups = useMemo<RegisterLookups>(() => ({
    cityByProperty: new Map(
      (properties.data ?? []).flatMap((p) => (p.city ? [[p.id, p.city.id] as const] : [])),
    ),
    bossByProperty: new Map((properties.data ?? []).map((p) => [p.id, p.bossOwnerUserId] as const)),
    walkInOwnerId: walkIn.isSuccess ? walkIn.data : undefined,
  }), [properties.data, walkIn.isSuccess, walkIn.data]);

  const rows = useMemo(
    () => (now ? buildRegisterRows(tasks.data ?? [], groupsById, new Date(now)) : []),
    [tasks.data, groupsById, now],
  );

  return {
    rows,
    count: tasks.data?.length ?? 0,
    lookups,
    // The clock is 0 on the server snapshot; rows wait for it rather than guess "today".
    // A disabled query is not `isLoading` (TanStack v5), hence `!window` too.
    isLoading: tasks.isLoading || groups.isLoading || !now || !window,
    isError: tasks.isError && !isPermissionDenied(tasks.error),
    isForbidden: tasks.isError && isPermissionDenied(tasks.error),
    refetch: () => void tasks.refetch(),
  };
}
