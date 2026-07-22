"use client";

import { memo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  ClipboardList,
  Home,
  Wrench,
  UserRound,
  HelpCircle,
  AlertTriangle,
  ArrowUp,
} from "lucide-react";
import { supportService } from "@/lib/services/support.service";
import { normalizeStatus } from "@/lib/types/task.types";
import type { SupportInboxRow } from "@/lib/types/support.types";

function categoryMeta(category: string): { Icon: LucideIcon } {
  switch (normalizeStatus(category)) {
    case "payment":
      return { Icon: CreditCard };
    case "task":
      return { Icon: ClipboardList };
    case "property":
      return { Icon: Home };
    case "technical":
      return { Icon: Wrench };
    case "account":
      return { Icon: UserRound };
    default:
      return { Icon: HelpCircle };
  }
}

/** Presence-style dot on the avatar encodes ticket status at a glance. */
function statusDotClass(status: string): string {
  switch (normalizeStatus(status)) {
    case "open":
      return "bg-emerald-500";
    case "inprogress":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground/40";
  }
}

/** Compact relative time; falls back to a short date for anything ≥ 1 day. */
function relTime(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

interface Props {
  row: SupportInboxRow;
  selected: boolean;
  onSelect: (ticketId: string) => void;
}

function InboxRowBase({ row, selected, onSelect }: Props) {
  const locale = useLocale();
  const t = useTranslations("supportInbox");
  const qc = useQueryClient();

  const prefetch = () => {
    qc.prefetchQuery({
      queryKey: ["support-ticket", row.ticketId],
      queryFn: () => supportService.getTicket(row.ticketId),
    });
  };

  const { Icon } = categoryMeta(row.category);
  const priority = normalizeStatus(row.priority);
  const urgent = priority === "urgent";
  const high = priority === "high";

  return (
    <button
      onClick={() => onSelect(row.ticketId)}
      onMouseEnter={prefetch}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
        selected ? "bg-accent" : "hover:bg-accent/50"
      }`}
    >
      <span className="relative shrink-0">
        <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <span
          title={row.status}
          className={`absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-card ${statusDotClass(
            row.status,
          )}`}
        />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={`truncate text-sm ${
              row.unreadCount ? "font-semibold" : "font-medium"
            }`}
          >
            {row.subject}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {relTime(row.lastMessageAt, locale)}
          </span>
        </span>

        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {row.requesterUserType} · {row.category}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {urgent ? (
              <span title={row.priority} className="text-destructive">
                <AlertTriangle className="size-3.5" />
              </span>
            ) : high ? (
              <span title={row.priority} className="text-amber-600 dark:text-amber-400">
                <ArrowUp className="size-3.5" />
              </span>
            ) : null}
            {row.unreadCount ? (
              <span
                title={t("list.unread")}
                className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-none text-primary-foreground"
              >
                {row.unreadCount}
              </span>
            ) : null}
          </span>
        </span>
      </span>
    </button>
  );
}

export const InboxRow = memo(InboxRowBase);
