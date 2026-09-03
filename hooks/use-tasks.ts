"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { taskService } from "@/lib/services/task.service";
import type {
  SubmitTaskWorkerStarRequest,
  OverrideTaskWorkerOutcomeRequest,
  CreateTaskGroupRequest,
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

export function useCancelTaskGroup() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => taskService.cancelGroup(id),
    onSuccess: (_d, id) => invalidate(id),
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
    mutationFn: ({
      body,
      idempotencyKey,
    }: {
      body: CreateTaskGroupRequest;
      idempotencyKey: string;
    }) => taskService.createAdminGroup(body, idempotencyKey),
    onSuccess: (group) => invalidate(group.id),
  });
}
