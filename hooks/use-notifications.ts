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
import {
  dedupePages,
  removeNotification,
  upsertNotification,
} from "@/lib/notifications/cache";
import { isAlreadyGone } from "@/lib/notifications/notification-errors";
import type { NotificationDto } from "@/lib/types/notification.types";

const LIST_KEY = ["notifications"];
const COUNT_KEY = ["notifications", "unread-count"];

type NotificationPages = InfiniteData<NotificationDto[]>;

/** Moves the badge by a signed delta, never below 0. A 0 delta writes nothing. */
function bumpUnreadCount(qc: QueryClient, delta: number) {
  if (delta === 0) return;
  qc.setQueryData<number>(COUNT_KEY, (old = 0) => Math.max(0, old + delta));
}

// ── Cache helpers (called from outside React — e.g. SignalR provider) ────────

/**
 * The `ReceiveNotification` write (`notification-bell.md` §10, §11.1): upsert by
 * `id` — a re-fired escalation replaces its row in place — and move the badge
 * only when the unread state changed. The rules are in `upsertNotification`.
 */
export function upsertNotificationInCache(qc: QueryClient, dto: NotificationDto) {
  let delta = 0;
  qc.setQueryData<NotificationPages>(LIST_KEY, (old) => {
    const { pages, unreadDelta } = upsertNotification(old?.pages, dto);
    delta = unreadDelta;
    return old ? { ...old, pages } : { pages, pageParams: [undefined] };
  });
  bumpUnreadCount(qc, delta);
}

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * §11.4 dedupe happens here, on read, so the cache itself stays exactly what the
 * server paged — `getNextPageParam` must keep seeing each page's real last row.
 * Module scope, so the selector's identity is stable across renders.
 */
const selectDeduped = (data: NotificationPages): NotificationPages => ({
  ...data,
  pages: dedupePages(data.pages),
});

/**
 * Refetches on window focus by React Query's default (nothing in
 * `providers/query-provider.tsx` turns it off), but only once 30 s stale. ⚠ Not
 * `"always"` like the count: an infinite query's refetch replays **every** loaded
 * page, and this one is mounted on every dashboard screen via the header bell.
 */
export function useNotificationList() {
  return useInfiniteQuery({
    queryKey: LIST_KEY,
    queryFn: ({ pageParam }) =>
      notificationService.list(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.length < 20 ? undefined : lastPage[lastPage.length - 1].createdAt,
    select: selectDeduped,
    staleTime: 30_000,
  });
}

/**
 * ⚠ `refetchOnWindowFocus: "always"`, not the default `true`: the default only
 * refetches a *stale* query, so a tab refocused inside the 60 s `staleTime`
 * skipped the refresh. §10 (the socket is best-effort), §11.2 (read state never
 * syncs across devices) and §13.1 all say re-read the count on **every**
 * foreground. `staleTime` still dedupes mounts.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: COUNT_KEY,
    queryFn: notificationService.getUnreadCount,
    staleTime: 60_000,
    refetchOnWindowFocus: "always",
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onMutate: (id) => {
      qc.setQueryData<NotificationPages>(LIST_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((n) => (n.id === id ? { ...n, isRead: true } : n))
          ),
        };
      });
      qc.setQueryData<number>(
        COUNT_KEY,
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
      qc.setQueryData<NotificationPages>(LIST_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => page.map((n) => ({ ...n, isRead: true }))),
        };
      });
      qc.setQueryData<number>(COUNT_KEY, 0);
    },
  });
}

/**
 * `DELETE /api/notifications/{id}` (§11.5) — optimistic: the row leaves the list
 * at once, and an unread row takes the badge down by one. Only that one: the
 * delete itself drops it from the server's count, so do not mark it read first.
 *
 * - A 404 (missing or foreign id — indistinguishable, §11.6) resolves as success:
 *   the row is gone either way, so it stays removed and the caller's `onError`
 *   (the toast) never fires.
 * - Any other failure restores the list and the badge from the snapshot.
 * - The count is re-read from the server when it settles; the list only after a
 *   real failure — on success that refetch would replay every loaded page for
 *   one row.
 */
export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await notificationService.deleteNotification(id);
      } catch (err) {
        if (isAlreadyGone(err)) return;
        throw err;
      }
    },
    onMutate: async (id) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: LIST_KEY, exact: true }),
        qc.cancelQueries({ queryKey: COUNT_KEY, exact: true }),
      ]);
      const previousList = qc.getQueryData<NotificationPages>(LIST_KEY);
      const previousCount = qc.getQueryData<number>(COUNT_KEY);

      const { pages, removed, unreadDelta } = removeNotification(previousList?.pages, id);
      if (previousList && removed) qc.setQueryData<NotificationPages>(LIST_KEY, { ...previousList, pages });
      bumpUnreadCount(qc, unreadDelta);

      return { previousList, previousCount };
    },
    onError: (_err, _id, context) => {
      if (!context) return;
      qc.setQueryData(LIST_KEY, context.previousList);
      qc.setQueryData(COUNT_KEY, context.previousCount);
      // ⚠ The snapshot predates any other delete still in flight, so restoring it
      // can resurrect that row too. Only on a real failure: re-read the list.
      qc.invalidateQueries({ queryKey: LIST_KEY, exact: true });
    },
    onSettled: (_data, error) => {
      qc.invalidateQueries({ queryKey: COUNT_KEY, exact: true });
      // ⚠ Re-read the list after a delete too. Paging decides "is there more?"
      // from a full last page (`getNextPageParam`), and removing one row from
      // it leaves 19 — so without this "Load more" vanishes while older rows
      // remain on the server. A delete is a rare, deliberate act; one refetch
      // of the loaded pages is the cheap way to keep the cursor honest.
      if (!error) qc.invalidateQueries({ queryKey: LIST_KEY, exact: true });
    },
  });
}
