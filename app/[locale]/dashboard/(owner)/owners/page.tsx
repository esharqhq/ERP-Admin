"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOwnerList } from "@/hooks/use-owners";
import type { KycProfileSummaryDto } from "@/lib/types/kyc.types";
import { useTranslations } from "next-intl";

export default function OwnersPage() {
  const t = useTranslations("owners");
  const tStatus = useTranslations("status");
  const tCommon = useTranslations("common");

  const kycStatusConfig: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    "1": { label: tStatus("pending"), variant: "secondary" },
    "2": { label: tStatus("approved"), variant: "default" },
    "3": { label: tStatus("rejected"), variant: "destructive" },
  };

  function getStatusConfig(kycStatus: string | null) {
    if (!kycStatus) return { label: tCommon("unknown"), variant: "outline" as const };
    return kycStatusConfig[kycStatus] ?? { label: kycStatus, variant: "outline" as const };
  }

  const columns = [
    { label: t("columns.owner") },
    { label: tCommon("email") },
    { label: t("columns.kycStatus") },
    { label: t("columns.documents"), className: "text-center" },
    { label: t("columns.actions"), className: "text-right" },
  ];

  const { data: owners = [], isLoading, isError, error } = useOwnerList();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    const msg = (error as { response?: { status?: number; data?: { message?: string } } })
      ?.response?.data?.message
      ?? (error as Error)?.message
      ?? t("errorConnect");
    const status = (error as { response?: { status?: number } })?.response?.status;
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">{t("title")}</h1>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          <p className="font-semibold">{t("errorLoad")}{status ? ` (${status})` : ""}</p>
          <p className="mt-1 text-destructive/80">{msg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <DataTableCard
        title={t("list")}
        count={owners.length}
        searchPlaceholder={t("searchPlaceholder")}
        columns={columns}
        data={owners}
        renderRow={(o: KycProfileSummaryDto) => {
          const status = getStatusConfig(o.kycStatus);
          return (
            <TableRow
              key={o.ownerProfileId}
              className="group/row transition-colors duration-150 hover:bg-accent/40"
            >
              <TableCell className="py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9 ring-1 ring-border">
                    <AvatarFallback className="bg-muted text-[11px] font-semibold">
                      {(o.ownerName ?? "??").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium leading-tight">
                    {o.ownerName ?? "—"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">{o.ownerEmail ?? "—"}</span>
              </TableCell>
              <TableCell>
                <Badge variant={status.variant}>{status.label}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold tabular-nums">
                  {o.documentCount}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/dashboard/owners/${o.ownerProfileId}`} />}
                >
                  {tCommon("view")}
                </Button>
              </TableCell>
            </TableRow>
          );
        }}
      />
    </div>
  );
}
