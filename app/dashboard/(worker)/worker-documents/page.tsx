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
import { useWorkers } from "@/hooks/use-workers";
import type { WorkerSummaryDto } from "@/lib/types/worker.types";

type FilterTab = "all" | "approved" | "pending";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function ApprovalBadge({ isApproved, isVerified }: { isApproved: boolean; isVerified: boolean }) {
  if (isApproved) {
    return <Badge variant="default">Tasdiqlangan</Badge>;
  }
  if (isVerified) {
    return <Badge variant="secondary">Tekshirilmoqda</Badge>;
  }
  return <Badge variant="outline">Kutilmoqda</Badge>;
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
          Hujjatlar
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function WorkerDocumentsPage() {
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
    { key: "all", label: "Barchasi" },
    { key: "approved", label: "Tasdiqlangan" },
    { key: "pending", label: "Kutilmoqda" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          Ishchi Hujjatlari
        </h1>
        <p className="text-sm text-muted-foreground">
          Ishchilarning shaxsiy hujjatlari va shartnomalarini boshqaring.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Ism yoki tel bo'yicha qidirish..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Yuklanmoqda..." : `${filtered.length} ta ishchi`}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>To&apos;liq ism</TableHead>
                <TableHead>Telefon / Email</TableHead>
                <TableHead>Ro&apos;yxat sanasi</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
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
                    Ishchilar topilmadi
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
