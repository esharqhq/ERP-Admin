"use client";

import { memo } from "react";
import { useLocale } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { supportService } from "@/lib/services/support.service";
import { normalizeStatus } from "@/lib/types/task.types";
import type { SupportInboxRow } from "@/lib/types/support.types";

function statusVariant(status: string) {
  const s = normalizeStatus(status);
  return s === "open" ? "default" : s === "inprogress" ? "secondary" : "outline";
}
function priorityVariant(priority: string) {
  const p = normalizeStatus(priority);
  return p === "urgent" ? "destructive" : p === "high" ? "secondary" : "outline";
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
  return d.toLocaleDateString(locale, { dateStyle: "short" });
}

interface Props {
  row: SupportInboxRow;
  selected: boolean;
  onSelect: (ticketId: string) => void;
}

function InboxRowBase({ row, selected, onSelect }: Props) {
  const locale = useLocale();
  const qc = useQueryClient();

  const prefetch = () => {
    qc.prefetchQuery({
      queryKey: ["support-ticket", row.ticketId],
      queryFn: () => supportService.getTicket(row.ticketId),
    });
  };

  return (
    <button
      onClick={() => onSelect(row.ticketId)}
      onMouseEnter={prefetch}
      className={`flex w-full flex-col gap-1.5 border-b border-border px-3 py-2.5 text-left transition-colors ${
        selected ? "bg-accent" : "hover:bg-accent/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{row.subject}</span>
        {row.unreadCount ? (
          <span className="size-2 shrink-0 rounded-full bg-primary" />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
        <Badge variant={priorityVariant(row.priority)}>{row.priority}</Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{row.requesterUserType}</span>
        <span className="shrink-0">{relTime(row.lastMessageAt, locale)}</span>
      </div>
    </button>
  );
}

export const InboxRow = memo(InboxRowBase);
