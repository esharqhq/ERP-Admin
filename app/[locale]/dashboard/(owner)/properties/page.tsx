"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";
import { useProperties } from "@/hooks/use-properties";
import { useTranslations } from "next-intl";
import type { PropertyDto } from "@/lib/types/property.types";

const docsStatusConfig: Record<
  string,
  { labelKey: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  Pending:  { labelKey: "docsStatus.pending", variant: "secondary" },
  Approved: { labelKey: "docsStatus.approved", variant: "default" },
  Rejected: { labelKey: "docsStatus.rejected", variant: "destructive" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PropertiesPage() {
  const t = useTranslations("properties");
  const { data: properties = [], isLoading, isError, error } = useProperties();

  const columns = [
    { label: "#", className: "w-10 text-center" },
    { label: t("columns.name") },
    { label: t("columns.address") },
    { label: t("columns.type") },
    { label: t("columns.docsStatus") },
    { label: t("columns.createdAt") },
    { label: t("columns.actions"), className: "text-right" },
  ];

  function getDocsStatusConfig(status: string | null) {
    if (!status) return { label: t("docsStatus.unknown"), variant: "outline" as const };
    const config = docsStatusConfig[status];
    if (!config) return { label: status, variant: "outline" as const };
    return { label: t(config.labelKey as Parameters<typeof t>[0]), variant: config.variant };
  }

  if (isLoading) {
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
        <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      (error as Error)?.message ??
      t("errorConnect");
    const status = (error as { response?: { status?: number } })?.response?.status;
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            {t("title")}
          </h1>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          <p className="font-semibold">
            {t("errorLoad")}{status ? ` (${status})` : ""}
          </p>
          <p className="mt-1 text-destructive/80">{msg}</p>
        </div>
      </div>
    );
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

      <DataTableCard
        title={t("list")}
        count={properties.length}
        searchPlaceholder={t("searchPlaceholder")}
        columns={columns}
        data={properties}
        renderRow={(p: PropertyDto, index: number) => {
          const docs = getDocsStatusConfig(p.docsStatus);
          return (
            <TableRow
              key={p.id}
              className="group/row transition-colors duration-150 hover:bg-accent/40"
            >
              <TableCell className="py-3 text-center text-[13px] tabular-nums text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="py-3 font-medium">{p.name ?? "—"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  {p.address ?? "—"}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.type ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={docs.variant}>{docs.label}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(p.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/dashboard/properties/${p.id}`} />}
                >
                  {t("actions.more")}
                </Button>
              </TableCell>
            </TableRow>
          );
        }}
      />
    </div>
  );
}
