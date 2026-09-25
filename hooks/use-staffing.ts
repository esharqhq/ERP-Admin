"use client";

import { useQuery } from "@tanstack/react-query";
import { taskService } from "@/lib/services/task.service";
import type { StaffingLevel } from "@/lib/types/task.types";

/**
 * Re-read every minute. The list is time-bound on the server — a day enters it
 * as its start comes within 24 h and leaves it the moment it starts — so a card
 * left open on a wall screen has to follow the clock, not only a mutation.
 */
const STAFFING_REFETCH_MS = 60_000;

/**
 * One rung of the admin "Critical list" (F-07 ·8).
 *
 * The key sits under `["admin-tasks"]` on purpose: `invalidateTasks` already
 * clears that prefix, so assigning a worker anywhere drops the day from the card
 * without a new key to remember.
 */
export function useStaffingList(level: StaffingLevel, enabled = true) {
  return useQuery({
    queryKey: ["admin-tasks", "staffing", level],
    queryFn: () => taskService.getStaffingList(level),
    enabled,
    refetchInterval: STAFFING_REFETCH_MS,
  });
}
