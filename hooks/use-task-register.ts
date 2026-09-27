"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminTaskGroups } from "@/hooks/use-tasks";
import { useProperties } from "@/hooks/use-properties";
import { useWalkInOwnerId } from "@/hooks/use-owners";
import { useClock } from "@/hooks/use-today";
import { taskService } from "@/lib/services/task.service";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { buildRegisterRows } from "@/lib/tasks/register/rows";
import type { RegisterLookups, RegisterWindow } from "@/lib/tasks/register/filters";

/**
 * The register's rows (spec §2): the day window from the server, joined to the
 * cached booking list. ⚠ The key is the `admin-tasks-range` family on purpose —
 * `invalidateTasks` clears it by prefix, so an Assign anywhere refreshes this.
 */
export function useTaskRegister(window: RegisterWindow) {
  const now = useClock();
  const tasks = useQuery({
    queryKey: ["admin-tasks-range", window.fromIso, window.toIso],
    queryFn: () => taskService.getAdminTasksInRange(window.fromIso, window.toIso),
  });
  const groups = useAdminTaskGroups();
  const properties = useProperties();
  const walkIn = useWalkInOwnerId();

  const groupsById = useMemo(
    () => new Map((groups.data ?? []).map((g) => [g.id, g])),
    [groups.data],
  );
  const lookups = useMemo<RegisterLookups>(() => ({
    cityByProperty: new Map(
      (properties.data ?? []).flatMap((p) => (p.city ? [[p.id, p.city.id] as const] : [])),
    ),
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
    isLoading: tasks.isLoading || groups.isLoading || !now,
    isError: tasks.isError && !isPermissionDenied(tasks.error),
    isForbidden: tasks.isError && isPermissionDenied(tasks.error),
    refetch: () => void tasks.refetch(),
  };
}
