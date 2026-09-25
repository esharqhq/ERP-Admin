"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

import { notificationTone } from "@/lib/notifications/tone";
import type { NotificationType } from "@/lib/types/notification.types";
import { cn } from "@/lib/utils";

/**
 * The urgency mark in front of a bell row's title — only on the F-07 ·8 staffing
 * rungs (`notificationTone`). Renders nothing for every other kind, so a row
 * gains it without any caller deciding which kinds are urgent.
 */
export function NotificationToneMark({
  type,
  className,
}: {
  type: NotificationType;
  className?: string;
}) {
  const t = useTranslations("layout.notifications.tone");
  const tone = notificationTone(type);
  if (!tone) return null;
  const Icon = tone === "critical" ? AlertTriangle : Clock;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center",
        tone === "critical" ? "text-status-cancelled-deep" : "text-status-pending-deep",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{t(tone)}</span>
    </span>
  );
}
