"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Eye, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useConversations } from "@/hooks/use-support";
import { useAuthStore } from "@/store/auth.store";
import {
  SUPPORT_STATUS_FILTERS,
  type SupportStatusFilter,
} from "@/lib/types/support.types";
import { normalizeStatus } from "@/lib/types/task.types";

const TAB_KEY: Record<SupportStatusFilter, string> = {
  all: "all",
  Open: "open",
  InProgress: "inProgress",
  Resolved: "resolved",
  Closed: "closed",
};

function StatusBadge({ status }: { status: string }) {
  const s = normalizeStatus(status);
  const variant =
    s === "open" ? "default" : s === "inprogress" ? "secondary" : "outline";
  return <Badge variant={variant}>{status || "—"}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = normalizeStatus(priority);
  const variant =
    p === "urgent" ? "destructive" : p === "high" ? "secondary" : "outline";
  return <Badge variant={variant}>{priority || "—"}</Badge>;
}

/** "OWNER_USER" → "Owner", "WORKER" → "Worker"; falls back to the raw code. */
function prettyUserType(code: string): string {
  if (!code) return "—";
  const head = code.split("_")[0];
  return head.charAt(0) + head.slice(1).toLowerCase();
}

function fmtDateTime(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

export default function ConversationsPage() {
  const t = useTranslations("conversations");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const myId = useAuthStore((s) => s.adminMe?.id);

  const [tab, setTab] = useState<SupportStatusFilter>("all");
  const [mineOnly, setMineOnly] = useState(false);

  const {
    data: conversations = [],
    isLoading,
    isError,
  } = useConversations(
    tab === "all" ? undefined : tab,
    mineOnly ? myId : undefined,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
          {SUPPORT_STATUS_FILTERS.map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`tabs.${TAB_KEY[key]}`)}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={mineOnly}
            disabled={!myId}
            onChange={(e) => setMineOnly(e.target.checked)}
            className="size-4 rounded border-border accent-primary"
          />
          {t("assignedToMe")}
        </label>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? tCommon("loading")
              : t("count", { count: conversations.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.requester")}</TableHead>
                <TableHead>{t("columns.priority")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.lastActivity")}</TableHead>
                <TableHead>{t("columns.created")}</TableHead>
                <TableHead className="text-right">{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">
                    {tCommon("error")}
                  </TableCell>
                </TableRow>
              ) : conversations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                conversations.map((c) => (
                  <TableRow key={c.id} className="hover:bg-accent/40">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <MessageSquare className="size-3.5" />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {prettyUserType(c.requesterUserType)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.requesterUserId.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={c.ticketPriority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.ticketStatus} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.lastMessageAt
                        ? fmtDateTime(c.lastMessageAt, locale)
                        : t("noMessages")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDateTime(c.createdAt, locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        nativeButton={false}
                        className="gap-1.5 text-muted-foreground"
                        render={<Link href={`/dashboard/support/${c.ticketId}`} />}
                      >
                        <Eye className="size-3.5" />
                        {tCommon("view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
