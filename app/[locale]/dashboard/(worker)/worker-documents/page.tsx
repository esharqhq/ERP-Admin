"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Search, FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWorkers } from "@/hooks/use-workers";
import type { WorkerSummaryDto } from "@/lib/types/worker.types";

type FilterTab = "all" | "approved" | "pending";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function ApprovalBadge({ isApproved, isVerified }: { isApproved: boolean; isVerified: boolean }) {
  if (isApproved) {
    return <Badge variant="default">Approved</Badge>;
  }
  if (isVerified) {
    return <Badge variant="secondary">Under Review</Badge>;
  }
  return <Badge variant="outline">Pending</Badge>;
}

function WorkerRow({ worker }: { worker: WorkerSummaryDto }) {
  return (
    <TableRow className="hover:bg-accent/40">
      <TableCell className="py-3 font-medium">
        {worker.fullName ?? "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {worker.phoneNumber ?? worker.email ?? "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(worker.createdAt)}
      </TableCell>
      <TableCell>
        <ApprovalBadge isApproved={worker.isApproved} isVerified={worker.isVerified} />
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          className="gap-1.5 text-muted-foreground"
          render={<Link href={`/dashboard/workers/${worker.id}`} />}
        >
          <FolderOpen className="size-3.5" />
          Documents
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function WorkerDocumentsPage() {
  const t = useTranslations("workers");
  const tStatus = useTranslations("status");
  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const approvedParam =
    tab === "approved" ? true : tab === "pending" ? false : undefined;

  const { data: workers = [], isLoading } = useWorkers(approvedParam);

  const filtered = workers.filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (w.fullName ?? "").toLowerCase().includes(q) ||
      (w.email ?? "").toLowerCase().includes(q) ||
      (w.phoneNumber ?? "").toLowerCase().includes(q)
    );
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: t("tabs.all") },
    { key: "approved", label: tStatus("approved") },
    { key: "pending", label: tStatus("pending") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {t("documents")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("documentsSubtitle")}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === tb.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tb.label}
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
            {isLoading ? "Loading..." : `${filtered.length} workers`}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.fullName")}</TableHead>
                <TableHead>{t("columns.phone")}</TableHead>
                <TableHead>{t("columns.registeredAt")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {t("docNotFound")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((worker) => (
                  <WorkerRow key={worker.id} worker={worker} />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
