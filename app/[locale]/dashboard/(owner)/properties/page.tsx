"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";
import { useProperties } from "@/hooks/use-properties";
import type { PropertyDto } from "@/lib/types/property.types";

const docsStatusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  Pending:  { label: "Kutilmoqda", variant: "secondary" },
  Approved: { label: "Tasdiqlangan", variant: "default" },
  Rejected: { label: "Rad etilgan", variant: "destructive" },
};

function getDocsStatusConfig(status: string | null) {
  if (!status) return { label: "Noma'lum", variant: "outline" as const };
  return docsStatusConfig[status] ?? { label: status, variant: "outline" as const };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const columns = [
  { label: "#", className: "w-10 text-center" },
  { label: "Nomi" },
  { label: "Manzil" },
  { label: "Turi" },
  { label: "Docs holati" },
  { label: "Yaratilgan" },
  { label: "Amallar", className: "text-right" },
];

export default function PropertiesPage() {
  const { data: properties = [], isLoading, isError, error } = useProperties();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            Properties
          </h1>
          <p className="text-sm text-muted-foreground">
            {"Ro'yxatdagi villa, mehmonxona, ofis va biznes-markazlar."}
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
      "Server bilan bog'lanishda xatolik";
    const status = (error as { response?: { status?: number } })?.response?.status;
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            Properties
          </h1>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          <p className="font-semibold">
            Ma&apos;lumotlarni yuklashda xatolik{status ? ` (${status})` : ""}
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
          Properties
        </h1>
        <p className="text-sm text-muted-foreground">
          {"Ro'yxatdagi villa, mehmonxona, ofis va biznes-markazlar."}
        </p>
      </div>

      <DataTableCard
        title="Mulklar ro'yxati"
        count={properties.length}
        searchPlaceholder="Mulk qidirish..."
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
                  {"Ko'rish"}
                </Button>
              </TableCell>
            </TableRow>
          );
        }}
      />
    </div>
  );
}
