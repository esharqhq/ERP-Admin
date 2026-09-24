"use client";

import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { taskService } from "@/lib/services/task.service";
import { useTodayKey } from "@/hooks/use-today";
import { dispatchWindow } from "@/lib/tasks/dispatch-window";
import {
  describeGroupCancel,
  type GroupCancelOutcome,
} from "@/lib/tasks/cancel-outcome";
import type { OrderRequest } from "@/lib/tasks/order";
import type {
  SubmitTaskWorkerStarRequest,
  OverrideTaskWorkerOutcomeRequest,
  TaskGroupDayCountsDto,
} from "@/lib/types/task.types";

/**
 * ⚠ **`enabled` matters more here than on most reads.** With no scope this route
 * returns **every task group on the platform**, and a caller waiting for an id
 * (`useAdminTaskGroups(undefined, property?.id)`) passes `undefined` on its first
 * render — so without a gate it fetches the whole system once, then refetches
 * scoped, and the unscoped response stays in the cache under its own key.
 *
 * Callers that genuinely want the system-wide list simply omit both arguments and
 * leave `enabled` at its default.
 */
export function useAdminTaskGroups(
  ownerUserId?: string,
  propertyId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["admin-task-groups", ownerUserId ?? null, propertyId ?? null],
    queryFn: () => taskService.getAdminTaskGroups(ownerUserId, propertyId),
    enabled,
  });
}

export function useTaskGroup(id: string) {
  return useQuery({
    queryKey: ["task-group", id],
    queryFn: () => taskService.getTaskGroup(id),
    enabled: !!id,
  });
}

export function useAdminTasks(ownerUserId?: string) {
  return useQuery({
    queryKey: ["admin-tasks", ownerUserId ?? null],
    queryFn: () => taskService.getAdminTasks(ownerUserId),
  });
}

/**
 * The Dispatch board's queue: a **windowed** admin task list.
 *
 * ⚠ Not `useAdminTasks()`, and the difference is correctness rather than volume.
 * Unwindowed, the route is `OrderByDescending(ScheduledAt).Take(500)`, so the 500
 * rows it returns are the ones scheduled **furthest into the future** — past 500
 * future tasks, today's work is absent from the board, silently. Both bounds
 * together also lift the cap to 5,000. `dispatchWindow` owns the reasoning and
 * the two constants.
 *
 * Shares the `["admin-tasks-range", from, to]` key family with `useWorkerShifts`,
 * so `invalidateTasks` already reaches it by prefix — an assignment made anywhere
 * refreshes this board without a new key to remember.
 *
 * `useTodayKey()` is `""` until the clock is known (it is `0`/`""` on the server
 * snapshot by design), so the query stays disabled for that first pass rather
 * than fetching a window built from a placeholder date.
 */
export function useDispatchQueue() {
  const todayKey = useTodayKey();

  const window = useMemo(() => {
    if (!todayKey) return null;
    const [y, m, d] = todayKey.split("-").map(Number);
    // Local midnight of today — `dispatchWindow` reads only the local Y/M/D, so
    // this is identical to passing `new Date()` and makes `todayKey` the whole
    // memo dependency.
    return dispatchWindow(new Date(y, m - 1, d));
  }, [todayKey]);

  const query = useQuery({
    queryKey: ["admin-tasks-range", window?.from ?? null, window?.to ?? null],
    queryFn: () => taskService.getAdminTasksInRange(window!.from, window!.to),
    enabled: !!window,
  });

  return { ...query, window };
}

/**
 * Exported as a plain function so its key list is testable without rendering —
 * `hooks/use-tasks.test.ts` asserts it against a real `QueryClient`.
 *
 * `["owner-task-groups"]` is here because `useOwnerTaskGroups` reads it and
 * `WeeklyWorkCard` renders from it. Without it, assigning a worker from
 * Dispatching left the owner detail page's weekly card stale until a reload.
 *
 * `["admin-tasks-range"]` is the same story on the worker side: `useWorkerShifts`
 * reads a windowed task list under that key and the worker detail grid renders
 * from it, so an assignment made anywhere has to reach it too. It is a *prefix* —
 * the key carries the window bounds, and every cached week has to go, not only
 * the one on screen.
 */
export function invalidateTasks(qc: QueryClient, groupId?: string) {
  qc.invalidateQueries({ queryKey: ["admin-task-groups"] });
  qc.invalidateQueries({ queryKey: ["admin-tasks"] });
  qc.invalidateQueries({ queryKey: ["admin-tasks-range"] });
  qc.invalidateQueries({ queryKey: ["owner-task-groups"] });
  if (groupId) qc.invalidateQueries({ queryKey: ["task-group", groupId] });
}

function useInvalidateTasks() {
  const qc = useQueryClient();
  return (groupId?: string) => invalidateTasks(qc, groupId);
}

/**
 * ⚠⚠ The `204` from this route does NOT mean the booking was cancelled.
 *
 * `POST /api/tasks/admin/groups/{id}/cancel` cancels the days that qualify and
 * silently skips the rest, answering `204` either way — and F-07 ·3 (2026-09-21)
 * widened the per-day window from one hour to three, so "nothing qualified" is
 * now common. The mutation therefore re-reads the booking and returns what
 * actually happened; the caller reports from that, never from the success.
 *
 * Takes the day counts as they were before the call, because the difference is
 * the only thing that distinguishes "cancelled two days" from "cancelled none
 * and two were already cancelled last week".
 */
export function useCancelTaskGroup() {
  const invalidate = useInvalidateTasks();
  return useMutation<
    GroupCancelOutcome,
    unknown,
    { id: string; before: TaskGroupDayCountsDto | null | undefined }
  >({
    mutationFn: async ({ id, before }) => {
      await taskService.cancelGroup(id);
      const after = await taskService.getTaskGroup(id);
      return describeGroupCancel(before, after?.days);
    },
    onSuccess: (_outcome, { id }) => invalidate(id),
  });
}

/**
 * Put an admin in charge of a day nobody can hand in — `PUT /api/tasks/{id}/supervisor`.
 *
 * ⚠⚠ **The automatic hand-over is not a safety net.** One hour after the work day
 * ends the server gives the role to the best-rated *other* worker **who checked
 * in** — so on a day where only one person ever arrived, it does nothing at all
 * and the day stays unsubmitted. Admin intervention is the only route, which is
 * why this control exists. Do not word it as an optimisation.
 */
export function useSetTaskSupervisor(groupId?: string) {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ taskId, workerId }: { taskId: string; workerId: string }) =>
      taskService.setSupervisor(taskId, { workerId }),
    onSuccess: () => invalidate(groupId),
  });
}

/**
 * Close a day that is stuck open — `POST /api/tasks/{id}/force-close`.
 *
 * ⚠⚠ This marks everyone who never checked in as a **no-show**, which counts
 * against their rating. The admin must see that before they confirm.
 */
export function useForceCloseTask(groupId?: string) {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      taskService.forceCloseTask(taskId, { reason }),
    onSuccess: () => invalidate(groupId),
  });
}

export function useAssignWorker(groupId?: string) {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ taskId, workerId }: { taskId: string; workerId: string }) =>
      taskService.assignWorker(taskId, workerId),
    onSuccess: () => invalidate(groupId),
  });
}

export function useUnassignWorker(groupId?: string) {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ taskId, workerId }: { taskId: string; workerId: string }) =>
      taskService.unassignWorker(taskId, workerId),
    onSuccess: () => invalidate(groupId),
  });
}

export function useRateWorker(groupId?: string) {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({
      taskId,
      workerId,
      body,
    }: {
      taskId: string;
      workerId: string;
      body: SubmitTaskWorkerStarRequest;
    }) => taskService.rateWorker(taskId, workerId, body),
    onSuccess: () => invalidate(groupId),
  });
}

export function useOverrideOutcome(groupId?: string) {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({
      taskId,
      workerId,
      body,
    }: {
      taskId: string;
      workerId: string;
      body: OverrideTaskWorkerOutcomeRequest;
    }) => taskService.overrideOutcome(taskId, workerId, body),
    onSuccess: () => invalidate(groupId),
  });
}

/**
 * File a task group as an admin. The caller owns the idempotency key: it must be
 * the same string across retries of one attempt and a fresh one for a new order.
 */
export function useCreateTaskGroup() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    // The route follows the request's `kind`, which `buildOrder` set from the
    // number of distinct dates — one date is a single task (F-07 ·12).
    mutationFn: ({
      request,
      idempotencyKey,
    }: {
      request: OrderRequest;
      idempotencyKey: string;
    }) =>
      request.kind === "single"
        ? taskService.createAdminSingle(request.body, idempotencyKey)
        : taskService.createAdminGroup(request.body, idempotencyKey),
    onSuccess: (group) => invalidate(group.id),
  });
}
