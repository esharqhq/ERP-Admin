import { describe, expect, it } from "vitest";
import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import { upsertNotificationInCache } from "@/hooks/use-notifications";
import type { NotificationDto } from "@/lib/types/notification.types";

/**
 * The SignalR handler's cache write, against a real `QueryClient` — no render,
 * no jsdom. Same shape as `hooks/use-tasks.test.ts`.
 *
 * The bug this replaced prepended every `ReceiveNotification` and added 1 to the
 * badge unconditionally, so a rewritten escalation (§11.1) showed twice and
 * over-counted.
 */
const LIST = ["notifications"];
const COUNT = ["notifications", "unread-count"];

function n(id: string, over: Partial<NotificationDto> = {}): NotificationDto {
  return {
    id,
    type: "OnboardingExpiryAdminAlert",
    title: `title ${id}`,
    body: "",
    entityType: null,
    entityId: null,
    metadata: null,
    isRead: false,
    createdAt: "2026-09-01T00:00:00Z",
    ...over,
  };
}

function seed(qc: QueryClient, pages: NotificationDto[][], count?: number) {
  qc.setQueryData<InfiniteData<NotificationDto[]>>(LIST, {
    pages,
    pageParams: pages.map((_, i) => (i === 0 ? undefined : `cursor-${i}`)),
  });
  if (count !== undefined) qc.setQueryData(COUNT, count);
}

describe("upsertNotificationInCache", () => {
  it("replaces a re-fired row in place and leaves the badge alone while it stays unread", () => {
    const qc = new QueryClient();
    seed(qc, [[n("a"), n("b")]], 2);

    upsertNotificationInCache(qc, n("b", { title: "3 days left" }));

    const data = qc.getQueryData<InfiniteData<NotificationDto[]>>(LIST)!;
    expect(data.pages[0].map((x) => x.id)).toEqual(["a", "b"]);
    expect(data.pages[0][1].title).toBe("3 days left");
    expect(qc.getQueryData(COUNT)).toBe(2);
  });

  it("counts a read row that comes back unread", () => {
    const qc = new QueryClient();
    seed(qc, [[n("a", { isRead: true })]], 0);

    upsertNotificationInCache(qc, n("a"));

    expect(qc.getQueryData(COUNT)).toBe(1);
  });

  it("prepends a new row, counts it, and keeps pageParams in step on a cold cache", () => {
    const qc = new QueryClient();

    upsertNotificationInCache(qc, n("a"));

    const data = qc.getQueryData<InfiniteData<NotificationDto[]>>(LIST)!;
    expect(data.pages).toEqual([[n("a")]]);
    expect(data.pageParams).toEqual([undefined]);
    expect(qc.getQueryData(COUNT)).toBe(1);
  });

  it("never takes the badge below zero", () => {
    const qc = new QueryClient();
    seed(qc, [[n("a")]], 0);

    upsertNotificationInCache(qc, n("a", { isRead: true }));

    expect(qc.getQueryData(COUNT)).toBe(0);
  });
});
