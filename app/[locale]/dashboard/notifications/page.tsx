"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotificationList,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from "@/hooks/use-notifications";
import { notificationRoute } from "@/lib/notifications/route";

type Filter = "all" | "unread";

function relativeTime(createdAt: string): string {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const t = useTranslations("layout.notifications");
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: infiniteData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotificationList();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const allNotifications = infiniteData?.pages.flat() ?? [];
  const notifications =
    filter === "unread" ? allNotifications.filter((n) => !n.isRead) : allNotifications;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            {t("title")}
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("newCount", { count: unreadCount })}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="mr-2 size-4" />
            {t("markAllRead")}
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("all")}
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            filter === "unread"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("unread")}
          {unreadCount > 0 && (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification list */}
      <div className="flex flex-col divide-y rounded-lg border">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3.5">
              <Skeleton className="mt-1.5 size-2.5 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-1/4" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Bell className="size-8 opacity-40" />
            <p className="text-sm">
              {filter === "unread" ? t("noUnread") : t("empty")}
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const route = notificationRoute(n.entityType, n.entityId);
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!n.isRead) markRead.mutate(n.id);
                  if (route) router.push(route);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    if (!n.isRead) markRead.mutate(n.id);
                    if (route) router.push(route);
                  }
                }}
                className={`flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-accent/50 ${
                  !n.isRead ? "bg-primary/5" : ""
                } ${route ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                    !n.isRead ? "bg-primary" : "bg-transparent border border-border"
                  }`}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={`text-sm leading-snug ${!n.isRead ? "font-semibold" : "font-medium"}`}>
                    {n.title}
                  </span>
                  <span className="text-sm text-muted-foreground">{n.body}</span>
                  <span className="mt-0.5 text-xs text-muted-foreground/70">
                    {relativeTime(n.createdAt)}
                  </span>
                </div>
                {!n.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead.mutate(n.id);
                    }}
                    className="shrink-0 rounded p-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Mark as read"
                  >
                    <CheckCheck className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}

        {/* Load more */}
        {hasNextPage && (
          <div className="flex justify-center px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? t("loading") : t("loadMore")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
