import type { NotificationDto } from "@/lib/types/notification.types";

/**
 * Pure page arithmetic for the bell's infinite-list cache (`["notifications"]`,
 * one `NotificationDto[]` per page, newest first). The hooks in
 * `hooks/use-notifications.ts` wrap these around `setQueryData`; nothing here
 * knows about React Query.
 *
 * Every `unreadDelta` is signed and unclamped — clamping the badge at 0 is the
 * cache-write site's job, so these stay honest about what changed.
 *
 * ⚠ The raw cache may hold the same id twice (§11.4, below). Both writers act on
 * **every** copy and read the old state from the **first** one — the copy
 * `dedupePages` keeps on screen — so a straddling duplicate can neither pop a
 * deleted row back nor be counted twice.
 */

function firstById(pages: NotificationDto[][], id: string): NotificationDto | null {
  for (const page of pages) {
    const hit = page.find((n) => n.id === id);
    if (hit) return hit;
  }
  return null;
}

const unread = (n: NotificationDto | null) => (n && !n.isRead ? 1 : 0);

/**
 * `notification-bell.md` §11.1 / §13.5: an escalation **rewrites** its row — same
 * `id`, new `title`/`body`/`metadata`, `isRead` back to `false`, `createdAt`
 * unchanged — and SignalR re-fires it with the same id. So:
 * - a known id is **replaced where it stands**. It does not move to the top: the
 *   list is ordered by `createdAt`, and that did not change;
 * - an unseen id is a new row, i.e. the newest, and goes to the head of page 0;
 * - the badge moves only when the unread state does (new unread +1, read→unread
 *   +1, unread→read −1, anything else 0).
 *
 * ⚠ "Unseen" means unseen *in the loaded pages*. A rewritten row that sits deeper
 * than anything paged in yet cannot be told apart from a new one, so it lands at
 * the top and counts +1 — possibly once too many if it was already unread on the
 * server. The top copy is then the one `dedupePages` keeps when paging reaches
 * the original. The provider's reconnect/focus refetch is the authority.
 */
export function upsertNotification(
  pages: NotificationDto[][] | undefined,
  dto: NotificationDto,
): { pages: NotificationDto[][]; unreadDelta: number } {
  if (!pages || pages.length === 0) {
    return { pages: [[dto]], unreadDelta: unread(dto) };
  }

  const existing = firstById(pages, dto.id);
  if (!existing) {
    return {
      pages: [[dto, ...pages[0]], ...pages.slice(1)],
      unreadDelta: unread(dto),
    };
  }

  return {
    pages: pages.map((page) => page.map((n) => (n.id === dto.id ? dto : n))),
    unreadDelta: unread(dto) - unread(existing),
  };
}

/**
 * §11.4: the cursor is `createdAt < before` with no tiebreaker, so merged pages
 * can repeat a row. Keeps the first occurrence of each id.
 *
 * A page that dedupe empties stays as `[]` — React Query needs `pages` and
 * `pageParams` to keep the same length.
 */
export function dedupePages(pages: NotificationDto[][]): NotificationDto[][] {
  const seen = new Set<string>();
  return pages.map((page) =>
    page.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    }),
  );
}

/**
 * §11.5: `DELETE /api/notifications/{id}` takes the row out of the list **and**
 * out of the unread count. So removing an unread row is −1 on its own — the
 * caller must not also mark it read, or the badge drops twice.
 *
 * `removed` is the first copy (null when the id is not held); every copy goes.
 * Emptied pages stay as `[]`, as in `dedupePages`.
 */
export function removeNotification(
  pages: NotificationDto[][] | undefined,
  id: string,
): { pages: NotificationDto[][]; removed: NotificationDto | null; unreadDelta: number } {
  if (!pages) return { pages: [], removed: null, unreadDelta: 0 };

  const removed = firstById(pages, id);
  if (!removed) return { pages, removed: null, unreadDelta: 0 };

  return {
    pages: pages.map((page) => page.filter((n) => n.id !== id)),
    removed,
    unreadDelta: removed.isRead ? 0 : -1,
  };
}
