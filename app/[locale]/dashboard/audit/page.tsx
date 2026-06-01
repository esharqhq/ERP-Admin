"use client";

import { useState } from "react";
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("uz-UZ", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function shortId(id: string | null) {
  if (!id) return "—";
  return id.slice(0, 8) + "…";
}

export default function AuditPage() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useAuditLog(
    actionFilter !== "all" ? { action: actionFilter } : undefined,
  );

  const filtered = search.trim()
    ? logs.filter(
        (l) =>
          (l.actorFullName ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (l.targetEntity ?? "").toLowerCase().includes(search.toLowerCase()) ||
          l.action.toLowerCase().includes(search.toLowerCase()),
      )
    : logs;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          Audit Log
        </h1>
        <p className="text-sm text-muted-foreground">
          SUPER_ADMIN tomonidan bajarilgan barcha amallar tarixi.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Actor, entity yoki amal..."
                className="h-9 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => setActionFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-52">
                <SelectValue placeholder="Barcha amallar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha amallar</SelectItem>
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
              Hech qanday yozuv topilmadi.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Actor
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Amal
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Entity
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Target ID
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Vaqt
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id} className="hover:bg-accent/40">
                    <TableCell className="py-2.5 text-sm font-medium">
                      {log.actorFullName ?? "—"}
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
