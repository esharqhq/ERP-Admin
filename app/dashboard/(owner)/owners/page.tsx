"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Building2, User, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { owners } from "@/lib/owners";

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Verified: "default",
  Pending: "secondary",
  Rejected: "destructive",
};

const riskStyle: Record<string, { ring: string; bg: string; text: string }> = {
  Low: {
    ring: "ring-emerald-500/25",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  Medium: {
    ring: "ring-amber-500/25",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
  },
  High: {
    ring: "ring-rose-500/30",
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-400",
  },
};

const columns = [
  { label: "Mulkdor" },
  { label: "Tur" },
  { label: "Mulklar", className: "text-center" },
  { label: "Holat" },
  { label: "Foal Tasklar", className: "text-center" },
  { label: "Amallar", className: "text-right" },
];

export default function OwnersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          Owners
        </h1>
        <p className="text-sm text-muted-foreground">
          Mulkdorlarni boshqaring va KYC holatini kuzating.
        </p>
      </div>

      <DataTableCard
        title="Mulkdorlar ro'yxati"
        count={owners.length}
        searchPlaceholder="Mulkdor qidirish..."
        columns={columns}
        data={owners}
        renderRow={(o) => {
          return (
            <TableRow
              key={o.id}
              className="group/row transition-colors duration-150 hover:bg-accent/40"
            >
              <TableCell className="py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9 ring-1 ring-border">
                    <AvatarFallback className="bg-muted text-[11px] font-semibold">
                      {o.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium leading-tight">
                      {o.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      ID #{o.id.toString().padStart(4, "0")}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  {o.type === "Company" ? (
                    <Building2 className="size-3.5 shrink-0" />
                  ) : (
                    <User className="size-3.5 shrink-0" />
                  )}
                  {o.type}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold tabular-nums">
                  {o.properties}
                </span>
              </TableCell>

              <TableCell>
                <Badge variant={statusVariant[o.status]}>{o.status}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold tabular-nums">
                  {o.properties}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/dashboard/owners/${o.id}`} />}
                >
                  Ko'rish
                </Button>
              </TableCell>
            </TableRow>
          );
        }}
      />
    </div>
  );
}
