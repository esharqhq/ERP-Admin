"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RestoreAccountDialog } from "@/components/accounts/restore-account-dialog";
import { useDeletedOwners, useRestoreOwner } from "@/hooks/use-owners";
import { useHasPermission } from "@/hooks/use-current-permissions";
import type { OwnerRowDto } from "@/lib/types/owner.types";

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * The deleted owners, and the one door back.
 *
 * ⚠ **SUPER_ADMIN only** (`owner:restore`, 30006). A MODERATOR gets an
 * empty-bodied `403` with no code in it, so the read is not even attempted
 * without the permission and the screen says so plainly — an empty table would
 * read as "nobody has been deleted", which is a different and false statement.
 *
 * ⚠ `?status=Deleted` was accepted and always answered `total: 0` until
 * 2026-09-07. If this table is ever empty on a system that has deletions, that
 * regression is the first thing to check.
 */
export default function DeletedOwnersPage() {
  const t = useTranslations("owners");
  const tRestore = useTranslations("accounts.restore");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const canRestore = useHasPermission("owner:restore");
  const { data, isLoading, isError } = useDeletedOwners(canRestore);
  const restore = useRestoreOwner();
  const [target, setTarget] = useState<OwnerRowDto | null>(null);

  const owners = data?.items ?? [];
  const close = () => {
    restore.reset();
    setTarget(null);
  };

  const Header = (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          className="gap-1.5 text-muted-foreground"
          render={<Link href="/dashboard/owners" />}
        >
          <ArrowLeft className="size-4" />
          {tRestore("backToOwners")}
        </Button>
      </div>
      <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
        {tRestore("ownersTitle")}
      </h1>
      <p className="text-sm text-muted-foreground">{tRestore("subtitle")}</p>
    </div>
  );

  if (!canRestore) {
    return (
      <div className="flex flex-col gap-6">
        {Header}
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {tRestore("noAccess")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {Header}

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? tCommon("loading")
              : tCommon("resultsFound", { count: owners.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.email")}</TableHead>
                <TableHead>{tRestore("columns.deletedAt")}</TableHead>
                <TableHead>{tRestore("columns.deletedBy")}</TableHead>
                <TableHead className="text-right">{tRestore("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-destructive">
                    {tCommon("error")}
                  </TableCell>
                </TableRow>
              ) : owners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    {tRestore("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                owners.map((o) => (
                  <TableRow key={o.id} className="hover:bg-accent/40">
                    <TableCell className="py-3 font-medium">{o.fullName || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {o.email || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(o.deletedAt, locale)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {o.deletedBy ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          restore.reset();
                          setTarget(o);
                        }}
                      >
                        <RotateCcw className="size-3.5" />
                        {tRestore("submit")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {target && (
        <RestoreAccountDialog
          open
          onClose={close}
          name={target.fullName || target.email || "—"}
          isPending={restore.isPending}
          error={restore.error}
          onConfirm={(reason) =>
            restore.mutate({ id: target.id, reason }, { onSuccess: close })
          }
        />
      )}
    </div>
  );
}
