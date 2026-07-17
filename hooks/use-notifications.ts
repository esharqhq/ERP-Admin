"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { notificationService } from "@/lib/services/notification.service";
import type { NotificationDto } from "@/lib/types/notification.types";

// ── Cache helpers (called from outside React — e.g. SignalR provider) ────────

export function prependNotificationToCache(qc: QueryClient, dto: NotificationDto) {
  qc.setQueryData<InfiniteData<NotificationDto[]>>(["notifications"], (old) => {
    if (!old) return { pages: [[dto]], pageParams: [undefined] };
    return { ...old, pages: [[dto, ...old.pages[0]], ...old.pages.slice(1)] };
  });
  qc.setQueryData<number>(["notifications", "unread-count"], (old = 0) => old + 1);
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useNotificationList() {
  return useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) =>
      notificationService.list(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.length < 20 ? undefined : lastPage[lastPage.length - 1].createdAt,
    staleTime: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationService.getUnreadCount,
    staleTime: 60_000,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onMutate: (id) => {
      qc.setQueryData<InfiniteData<NotificationDto[]>>(["notifications"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((n) => (n.id === id ? { ...n, isRead: true } : n))
          ),
        };
      });
      qc.setQueryData<number>(
        ["notifications", "unread-count"],
        (old = 0) => Math.max(0, old - 1),
      );
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationService.markAllRead,
    onMutate: () => {
      qc.setQueryData<InfiniteData<NotificationDto[]>>(["notifications"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => page.map((n) => ({ ...n, isRead: true }))),
        };
      });
      qc.setQueryData<number>(["notifications", "unread-count"], 0);
    },
  });
}
