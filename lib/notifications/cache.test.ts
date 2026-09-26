import { describe, expect, it } from "vitest";
import {
  dedupePages,
  removeNotification,
  upsertNotification,
} from "@/lib/notifications/cache";
import type { NotificationDto } from "@/lib/types/notification.types";

function n(id: string, over: Partial<NotificationDto> = {}): NotificationDto {
  return {
    id,
    type: "KycSubmitted",
    title: `title ${id}`,
    body: `body ${id}`,
    entityType: null,
    entityId: null,
    metadata: null,
    isRead: false,
    createdAt: "2026-09-01T00:00:00Z",
    ...over,
  };
}

const ids = (pages: NotificationDto[][]) => pages.map((p) => p.map((x) => x.id));

describe("upsertNotification", () => {
  it("starts a cache that has no pages yet", () => {
    const dto = n("a");
    expect(upsertNotification(undefined, dto)).toEqual({ pages: [[dto]], unreadDelta: 1 });
  });

  it("puts an id it has never seen at the head of page 0", () => {
    const { pages } = upsertNotification([[n("b"), n("c")], [n("d")]], n("a"));
    expect(ids(pages)).toEqual([["a", "b", "c"], ["d"]]);
  });

  it("counts a new unread row, and does not count a new row that arrives already read", () => {
    expect(upsertNotification([[n("b")]], n("a")).unreadDelta).toBe(1);
    expect(upsertNotification([[n("b")]], n("a", { isRead: true })).unreadDelta).toBe(0);
  });

  // §11.1 / §13.5 — the escalation ladder rewrites the row: same id, same createdAt.
  it("replaces a rewritten row where it stands instead of moving it to the top", () => {
    const pages = [[n("a"), n("b")], [n("c", { title: "7 days left", isRead: true })]];
    const rewritten = n("c", { title: "3 days left", body: "new", metadata: { d: "3" } });

    const out = upsertNotification(pages, rewritten);

    expect(ids(out.pages)).toEqual([["a", "b"], ["c"]]);
    expect(out.pages[1][0]).toEqual(rewritten);
  });

  it("changes the count only when the unread state changes", () => {
    const read = [[n("a", { isRead: true })]];
    const unread = [[n("a")]];
    expect(upsertNotification(read, n("a")).unreadDelta).toBe(1); // read → unread
    expect(upsertNotification(unread, n("a")).unreadDelta).toBe(0); // unread → unread
    expect(upsertNotification(unread, n("a", { isRead: true })).unreadDelta).toBe(-1);
    expect(upsertNotification(read, n("a", { isRead: true })).unreadDelta).toBe(0);
  });

  // §11.4 — the raw cache can hold a straddling duplicate; replace both copies,
  // and read the old state from the first one (the copy `dedupePages` shows).
  it("replaces every copy of the id and reads the old state from the first", () => {
    const pages = [[n("a"), n("b")], [n("b", { isRead: true }), n("c")]];
    const out = upsertNotification(pages, n("b", { title: "new" }));

    expect(out.unreadDelta).toBe(0);
    expect(out.pages[0][1].title).toBe("new");
    expect(out.pages[1][0].title).toBe("new");
  });

  it("does not mutate the pages it was given", () => {
    const pages = [[n("a", { isRead: true })]];
    upsertNotification(pages, n("a"));
    upsertNotification(pages, n("z"));
    expect(pages).toEqual([[n("a", { isRead: true })]]);
  });
});

describe("dedupePages", () => {
  it("keeps the first occurrence of an id across pages", () => {
    const first = n("b", { title: "first" });
    const out = dedupePages([[n("a"), first], [n("b", { title: "later" }), n("c")]]);
    expect(ids(out)).toEqual([["a", "b"], ["c"]]);
    expect(out[0][1]).toBe(first);
  });

  it("drops a duplicate inside one page too", () => {
    expect(ids(dedupePages([[n("a"), n("a"), n("b")]]))).toEqual([["a", "b"]]);
  });

  it("keeps a page that dedupe empties, so pages still line up with pageParams", () => {
    expect(ids(dedupePages([[n("a")], [n("a")]]))).toEqual([["a"], []]);
  });

  it("leaves pages without duplicates as they were", () => {
    expect(ids(dedupePages([[n("a")], [n("b")]]))).toEqual([["a"], ["b"]]);
  });
});

describe("removeNotification", () => {
  it("removes an unread row and gives back −1", () => {
    const row = n("b");
    const out = removeNotification([[n("a"), row], [n("c")]], "b");
    expect(ids(out.pages)).toEqual([["a"], ["c"]]);
    expect(out.removed).toBe(row);
    expect(out.unreadDelta).toBe(-1);
  });

  it("removes a read row without touching the count", () => {
    const out = removeNotification([[n("a", { isRead: true })]], "a");
    expect(ids(out.pages)).toEqual([[]]);
    expect(out.unreadDelta).toBe(0);
  });

  it("does nothing for an id it does not hold", () => {
    const pages = [[n("a")]];
    expect(removeNotification(pages, "zz")).toEqual({ pages, removed: null, unreadDelta: 0 });
  });

  it("handles a cache that has no pages yet", () => {
    expect(removeNotification(undefined, "a")).toEqual({
      pages: [],
      removed: null,
      unreadDelta: 0,
    });
  });

  // §11.4 — a straddling copy left behind would pop the deleted row back.
  it("removes every copy of the id but counts it once", () => {
    const out = removeNotification([[n("a")], [n("a"), n("b")]], "a");
    expect(ids(out.pages)).toEqual([[], ["b"]]);
    expect(out.unreadDelta).toBe(-1);
  });
});
