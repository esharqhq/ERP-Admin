"use client";

import { useState } from "react";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { RowLink } from "@/components/ui/row-link";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOwnerDirectory } from "@/hooks/use-owners";
import type { OwnerSummaryDto } from "@/lib/types/owner.types";
import { useLocale, useTranslations } from "next-intl";

function formatJoined(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function OwnersPage() {
  const t = useTranslations("owners");
  const locale = useLocale();
  const [search, setSearch] = useState("");

  const { data: owners = [], isLoading, isError, error } = useOwnerDirectory(search || undefined);

  const columns = [
    { label: t("columns.owner") },
    { label: t("account.email") },
    { label: t("directory.columns.phone") },
    { label: t("directory.columns.status") },
    { label: t("account.joined") },
  ];

  const filtered = owners;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("directory.subtitle")}</p>
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
        <p className="text-sm text-muted-foreground">{t("directory.subtitle")}</p>
      </div>

      <DataTableCard
        title={t("list")}
        count={filtered.length}
        searchPlaceholder={t("directory.search")}
        searchValue={search}
        onSearchChange={setSearch}
        columns={columns}
        data={filtered}
        renderRow={(o: OwnerSummaryDto) => (
          <TableRow
            key={o.id}
            className="group/row relative cursor-pointer transition-colors duration-150 hover:bg-accent/40"
          >
            <TableCell className="py-3">
              <RowLink href={`/dashboard/owners/${o.id}`} label={o.fullName || undefined} />
              <div className="flex items-center gap-3">
                <Avatar className="size-9 ring-1 ring-border">
                  <AvatarFallback className="bg-muted text-[11px] font-semibold">
                    {(o.fullName || "??").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium leading-tight">{o.fullName || "—"}</span>
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">{o.email || "—"}</span>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground tabular-nums">{o.phoneNumber || "—"}</span>
            </TableCell>
            <TableCell>
              {o.isVerified ? (
                <Badge variant="default" className="gap-1">
                  <BadgeCheck className="size-3.5" />
                  {t("account.verified")}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <ShieldAlert className="size-3.5" />
                  {t("account.unverified")}
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatJoined(o.createdAt, locale)}
              </span>
            </TableCell>
          </TableRow>
        )}
      />
    </div>
  );
}
