"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, MapPin, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/tasks/confirm-dialog";
import { useDeletedProperties, useRestoreProperty } from "@/hooks/use-properties";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { getApiErrorCode } from "@/lib/http/api-error";
import { categoryName } from "@/lib/properties/table-rows";
import type { PropertyDto } from "@/lib/types/property.types";

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

export default function DeletedPropertiesPage() {
  const t = useTranslations("properties");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const canRestore = useHasPermission("property:restore");
  const { data: properties = [], isLoading, isError } = useDeletedProperties(canRestore);
  const restore = useRestoreProperty();
  const [target, setTarget] = useState<PropertyDto | null>(null);

  const restoreError =
    target && restore.isError
      ? (() => {
          const code = getApiErrorCode(restore.error);
          return code === "property_not_found"
            ? t("deleted.errors.property_not_found")
            : t("deleted.errors.generic");
        })()
      : null;

  const close = () => {
    setTarget(null);
    restore.reset();
  };

  const Header = (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          className="gap-1.5 text-muted-foreground"
          render={<Link href="/dashboard/properties" />}
        >
          <ArrowLeft className="size-4" />
          {t("deleted.backToList")}
        </Button>
      </div>
      <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
        {t("deleted.title")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("deleted.subtitle")}</p>
    </div>
  );

  if (!canRestore) {
    return (
      <div className="flex flex-col gap-6">
        {Header}
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t("deleted.noAccess")}
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
              : tCommon("resultsFound", { count: properties.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.address")}</TableHead>
                <TableHead>{t("columns.category")}</TableHead>
                <TableHead>{t("columns.createdAt")}</TableHead>
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
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
              ) : properties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    {t("deleted.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                properties.map((p) => (
                  <TableRow key={p.id} className="hover:bg-accent/40">
                    <TableCell className="py-3 font-medium">{p.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" />
                        {p.address}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {categoryName(p.category, locale)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(p.createdAt, locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setTarget(p)}
                      >
                        <RotateCcw className="size-3.5" />
                        {t("deleted.restore")}
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
        <ConfirmDialog
          open
          onClose={close}
          onConfirm={() =>
            restore.mutate(target.id, { onSuccess: close })
          }
          isPending={restore.isPending}
          title={t("deleted.confirmTitle")}
          description={t("deleted.confirmDesc", { name: target.name ?? "—" })}
          confirmLabel={t("deleted.restore")}
          error={restoreError}
        />
      )}
    </div>
  );
}
