"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Search, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useTickets } from "@/hooks/use-support";
import {
  SUPPORT_STATUS_FILTERS,
  type SupportStatusFilter,
} from "@/lib/types/support.types";
import { normalizeStatus } from "@/lib/types/task.types";

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

function fmtDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale, { dateStyle: "medium" });
}

const TAB_KEY: Record<SupportStatusFilter, string> = {
  all: "all",
  Open: "open",
  InProgress: "inProgress",
  Resolved: "resolved",
  Closed: "closed",
};

export default function SupportPage() {
  const t = useTranslations("support");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [tab, setTab] = useState<SupportStatusFilter>("all");
  const [search, setSearch] = useState("");

  const {
    data: tickets = [],
    isLoading,
    isError,
  } = useTickets(tab === "all" ? undefined : tab);

  const filtered = tickets.filter((tk) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      tk.subject.toLowerCase().includes(q) ||
      tk.category.toLowerCase().includes(q)
    );
  });

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
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? tCommon("loading")
              : t("ticketCount", { count: filtered.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.subject")}</TableHead>
                <TableHead>{t("columns.category")}</TableHead>
                <TableHead>{t("columns.submittedBy")}</TableHead>
                <TableHead>{t("columns.priority")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.date")}</TableHead>
                <TableHead className="text-right">
                  {tCommon("actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm text-destructive"
                  >
                    {tCommon("error")}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {t("noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((tk) => (
                  <TableRow key={tk.id} className="hover:bg-accent/40">
                    <TableCell className="py-3 font-medium">
                      {tk.subject}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tk.category}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tk.requesterUserType}
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={tk.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={tk.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(tk.createdAt, locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        nativeButton={false}
                        className="gap-1.5 text-muted-foreground"
                        render={<Link href={`/dashboard/support/${tk.id}`} />}
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
