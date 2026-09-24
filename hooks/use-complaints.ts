"use client";

import { useMemo } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { invalidateTasks } from "@/hooks/use-tasks";
import type { ComplaintQueueRow } from "@/lib/complaints/waiting";
import { taskService } from "@/lib/services/task.service";
import type { DecideComplaintRequest, TaskItemDto } from "@/lib/types/task.types";

export const complaintKeys = {
  queue: ["complaints", "queue"] as const,
  /** Shared with the day resolver and the complaint page — one read per day. */
  task: (taskId: string) => ["task", taskId] as const,
  media: (taskId: string) => ["task-media", taskId] as const,
};

/** Every day in `Rejected`. `enabled` is false until permissions resolve. */
export function useComplaintQueue(enabled: boolean) {
  return useQuery({
    queryKey: complaintKeys.queue,
    queryFn: () => taskService.getRejectedTasks(),
    enabled,
  });
}

/**
 * `raisedAt` per queue row. The list serves `complaint: null` by contract, so
 * each day is read once more; the queue is small, and the complaint page reuses
 * the same cache entry when the row is opened.
 */
export function useComplaintQueueRows(tasks: TaskItemDto[]): ComplaintQueueRow[] {
  const reads = useQueries({
    queries: tasks.map((task) => ({
      queryKey: complaintKeys.task(task.id),
      queryFn: () => taskService.getTask(task.id),
      staleTime: 60_000,
    })),
  });
  const raised = reads.map((r) =>
    r.isPending ? undefined : r.isError ? null : (r.data?.complaint?.raisedAt ?? null),
  );
  const signature = raised.join("|");
  return useMemo(
    () => tasks.map((task, i) => ({ task, raisedAt: raised[i] })),
    // `raised` is rebuilt every render; its joined value is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, signature],
  );
}

export function useTaskRead(taskId: string) {
  return useQuery({
    queryKey: complaintKeys.task(taskId),
    queryFn: () => taskService.getTask(taskId),
  });
}

export function useTaskMedia(taskId: string, enabled: boolean) {
  return useQuery({
    queryKey: complaintKeys.media(taskId),
    queryFn: () => taskService.getTaskMedia(taskId),
    enabled,
  });
}

/**
 * Rule on a complaint. On success everything that shows this day moves: the
 * queue (it leaves), the day read (now `Done` + decided), and every task list
 * and the booking (`invalidateTasks`).
 */
export function useDecideComplaint(taskId: string, groupId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ complaintId, body }: { complaintId: string; body: DecideComplaintRequest }) =>
      taskService.decideComplaint(complaintId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: complaintKeys.queue });
      qc.invalidateQueries({ queryKey: complaintKeys.task(taskId) });
      invalidateTasks(qc, groupId);
    },
  });
}

/** For the two 409s: the world moved, so re-read rather than retry. */
export function useRefetchComplaint(taskId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: complaintKeys.task(taskId) });
    qc.invalidateQueries({ queryKey: complaintKeys.queue });
  };
}
