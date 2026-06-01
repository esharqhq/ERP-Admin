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
import { useKycList } from "@/hooks/use-kyc";
import type { KycProfileSummaryDto, KycStatus } from "@/lib/types/kyc.types";

type FilterTab = "all" | "approved" | "pending" | "rejected";

const tabStatusMap: Record<FilterTab, KycStatus | undefined> = {
  all: undefined,
  pending: 1,
  approved: 2,
  rejected: 3,
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function KycBadge({ isApproved, status }: { isApproved: boolean; status: string | null }) {
  if (isApproved || status === "Approved") {
    return <Badge variant="default">Approved</Badge>;
  }
  if (status === "Rejected") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  return <Badge variant="outline">Pending</Badge>;
}

function OwnerRow({ kyc }: { kyc: KycProfileSummaryDto }) {
  return (
    <TableRow className="hover:bg-accent/40">
      <TableCell className="py-3 font-medium">
        {kyc.ownerName ?? "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {kyc.ownerEmail ?? "—"}
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">
        {kyc.documentCount}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(kyc.kycReviewedAt)}
      </TableCell>
      <TableCell>
        <KycBadge isApproved={kyc.isApproved} status={kyc.kycStatus} />
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          className="gap-1.5 text-muted-foreground"
          render={<Link href={`/dashboard/kyc`} />}
        >
          <FolderOpen className="size-3.5" />
          Documents
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function OwnerDocumentsPage() {
  const t = useTranslations("owners");
  const tStatus = useTranslations("status");
  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const { data: kycList = [], isLoading } = useKycList(tabStatusMap[tab]);

  const filtered = kycList.filter((k) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (k.ownerName ?? "").toLowerCase().includes(q) ||
      (k.ownerEmail ?? "").toLowerCase().includes(q)
    );
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "approved", label: tStatus("approved") },
    { key: "pending", label: tStatus("pending") },
    { key: "rejected", label: tStatus("rejected") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          Owner Documents
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage owner personal documents and KYC status.
        </p>
      </div>

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
            placeholder="Search by name or email..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Loading..." : `${filtered.length} owners`}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>{t("columns.email")}</TableHead>
                <TableHead className="text-center">{t("kyc.documents")}</TableHead>
                <TableHead>{t("contact.reviewedAt")}</TableHead>
                <TableHead>{t("columns.kycStatus")}</TableHead>
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
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
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {t("kyc.documentsEmpty")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((kyc) => (
                  <OwnerRow key={kyc.ownerProfileId} kyc={kyc} />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
