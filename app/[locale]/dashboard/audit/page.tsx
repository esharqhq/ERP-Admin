"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useAuditLog } from "@/hooks/use-audit";

const AUDIT_ACTIONS = [
  "ADMIN_CREATED", "ADMIN_MODIFIED", "ADMIN_DEACTIVATED", "ADMIN_ROLE_CHANGED",
  "KYC_APPROVED", "KYC_REJECTED", "OWNER_KYC_RESET_TO_PENDING",
  "OWNER_DEACTIVATED",
  "WORKER_APPROVED", "WORKER_REJECTED", "WORKER_DEACTIVATED",
  "WORKER_DOC_APPROVED", "WORKER_DOC_REJECTED",
  "PROPERTY_DEACTIVATED_BY_ADMIN", "PROPERTY_RESTORED",
  "ROLE_PERMISSION_ADDED", "ROLE_PERMISSION_REMOVED",
  "WORKER_CONTRACT_FORCE_DEACTIVATED",
] as const;

function getActionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("APPROVED") || action.includes("RESTORED") || action.includes("CREATED")) return "default";
  if (action.includes("REJECTED") || action.includes("DEACTIVATED") || action.includes("DELETED")) return "destructive";
  if (action.includes("MODIFIED") || action.includes("CHANGED") || action.includes("ADDED") || action.includes("REMOVED")) return "secondary";
  return "outline";
}

function formatAction(action: string) {
  return action.replace(/_/g, " ");
}

function shortId(id: string | null) {
  if (!id) return "—";
  return id.slice(0, 8) + "…";
}

export default function AuditPage() {
  const t = useTranslations("audit");
  const locale = useLocale();
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useAuditLog(
    actionFilter !== "all" ? { action: actionFilter } : undefined,
  );

  const filtered = search.trim()
    ? logs.filter(
        (l) =>
          l.actorType.toLowerCase().includes(search.toLowerCase()) ||
          l.actorId.toLowerCase().includes(search.toLowerCase()) ||
          l.targetEntity.toLowerCase().includes(search.toLowerCase()) ||
          l.action.toLowerCase().includes(search.toLowerCase()),
      )
    : logs;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(locale, {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t("searchPlaceholder")}
                className="h-9 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => setActionFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-52">
                <SelectValue placeholder={t("allActions")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allActions")}</SelectItem>
                {AUDIT_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {formatAction(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {t("noLogs")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("columns.actor")}
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("columns.action")}
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("columns.entity")}
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("columns.targetId")}
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("columns.time")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id} className="hover:bg-accent/40">
                    <TableCell className="py-2.5 text-sm font-medium">
                      <div className="flex flex-col leading-tight">
                        <span>{log.actorType}</span>
                        <span className="font-mono text-[11px] font-normal text-muted-foreground">
                          {shortId(log.actorId)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant={getActionVariant(log.action)} className="text-[11px]">
                        {formatAction(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-muted-foreground">
                      {log.targetEntity ?? "—"}
                    </TableCell>
                    <TableCell className="py-2.5 font-mono text-xs text-muted-foreground">
                      {shortId(log.targetId)}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
