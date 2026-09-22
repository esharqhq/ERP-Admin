"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeletedAccountsTable } from "@/components/accounts/deleted-accounts-table";
import { useDeletedWorkers, useRestoreWorker } from "@/hooks/use-workers";
import { useHasPermission } from "@/hooks/use-current-permissions";

/**
 * The deleted workers, and the one door back.
 *
 * ⚠ **SUPER_ADMIN only** (`worker:restore`, 80047). A MODERATOR gets an
 * empty-bodied `403` with no code in it, so the read is not even attempted
 * without the permission and the screen says so plainly — an empty table would
 * read as "nobody has been deleted", which is a different and false statement.
 *
 * ⚠ `?status=Deleted` was accepted and always answered `total: 0` until
 * 2026-09-07. If this table is ever empty on a system that has deletions, that
 * regression is the first thing to check.
 */
export default function DeletedWorkersPage() {
  const t = useTranslations("accounts.restore");

  const canRestore = useHasPermission("worker:restore");
  const { data, isLoading, isError } = useDeletedWorkers(canRestore);
  const restore = useRestoreWorker();

  const Header = (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          className="-ml-2 gap-1.5 text-muted-foreground"
          render={<Link href="/dashboard/workers" />}
        >
          <ArrowLeft className="size-4" />
          {t("backToWorkers")}
        </Button>
      </div>
      <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
        {t("workersTitle")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
    </div>
  );

  if (!canRestore) {
    return (
      <div className="flex flex-col gap-6">
        {Header}
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t("noAccess")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {Header}
      <DeletedAccountsTable
        title={t("workersTitle")}
        rows={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        isPending={restore.isPending}
        error={restore.error}
        onRestore={(row, reason, done) =>
          restore.mutate({ id: row.id, reason }, { onSuccess: done })
        }
      />
    </div>
  );
}
