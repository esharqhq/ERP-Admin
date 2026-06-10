"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskService } from "@/lib/services/task.service";
import type {
  SubmitTaskWorkerStarRequest,
  OverrideTaskWorkerOutcomeRequest,
} from "@/lib/types/task.types";

export function useAdminTaskGroups(ownerUserId?: string) {
  return useQuery({
    queryKey: ["admin-task-groups", ownerUserId ?? null],
    queryFn: () => taskService.getAdminTaskGroups(ownerUserId),
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

function useInvalidateTasks() {
  const qc = useQueryClient();
  return (groupId?: string) => {
    qc.invalidateQueries({ queryKey: ["admin-task-groups"] });
    qc.invalidateQueries({ queryKey: ["admin-tasks"] });
    if (groupId) qc.invalidateQueries({ queryKey: ["task-group", groupId] });
  };
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
