"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { initials } from "@/lib/ui/initials";

/**
 * One deleted account, normalized so the worker and the owner screen render the
 * same table. Both list DTOs carry these five fields and nothing else this
 * screen needs.
 */
export interface DeletedAccountRow {
  id: string;
  fullName: string | null;
  email: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

function formatDay(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * The deleted-accounts table, shared by the workers and owners screens.
 *
 * ## Why it looks like the directory tables
 *
 * This is the same population an admin was reading five minutes ago on
 * `/dashboard/workers`, so it is drawn with that table's vocabulary: one
 * identity cell (avatar, name, mono email) rather than a Name column beside an
 * Email column, mono tabular dates, a count pill beside the title. An admin
 * should not have to re-learn what a row looks like because the rows happen to
 * be deleted.
 *
 * ## Why there is no status chip
 *
 * Every row here is deleted — the screen says so. A `Deleted` badge down the
 * whole column would repeat the page title once per row and crowd out the two
 * facts that actually differ between them: when, and by whom.
 */
export function DeletedAccountsTable({
  rows,
  title,
  isLoading,
  isError,
  isPending,
  error,
  onRestore,
}: {
  rows: DeletedAccountRow[];
  /** "Deleted workers" / "Deleted owners" — the list's own name. */
  title: string;
  isLoading: boolean;
  isError: boolean;
  isPending: boolean;
  error: unknown;
  onRestore: (row: DeletedAccountRow, reason: string, done: () => void) => void;
}) {
  const t = useTranslations("accounts.restore");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [target, setTarget] = useState<DeletedAccountRow | null>(null);

  return (
    <>
      <Card className="overflow-hidden">
        {/* The directory tables' own header row: the list's name, then how many
            are in it. Not "5 results found" — nothing was searched for. */}
        <div className="flex flex-wrap items-center gap-2 px-4 pt-4 sm:px-5">
          <h2 className="font-heading text-base font-semibold tracking-tight">
            {title}
          </h2>
          {!isLoading && !isError && (
            <span className="flex h-[22px] items-center rounded-full bg-muted px-2 font-mono text-xs tabular-nums text-muted-foreground">
              {rows.length}
            </span>
          )}
        </div>

        <CardContent className="p-0 pt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[240px]">{t("columns.account")}</TableHead>
                <TableHead>{t("columns.deletedAt")}</TableHead>
                <TableHead>{t("columns.deletedBy")}</TableHead>
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-sm text-destructive"
                  >
                    {tCommon("error")}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center">
                    <p className="text-sm font-medium">{t("emptyTitle")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("emptyBody")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} className="hover:bg-accent/40">
                    <TableCell className="py-3">
                      {/* The directories' identity cell, unchanged: a name alone
                          does not identify anybody here — two of these rows can
                          carry the same name, and the email is the id an admin
                          actually pastes. */}
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-8 shrink-0">
                          <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                            {initials(r.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium leading-tight">
                            {r.fullName || "—"}
                          </span>
                          <span className="truncate font-mono text-[11px] text-muted-foreground">
                            {r.email || "—"}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                      {formatDay(r.deletedAt, locale)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.deletedBy || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setTarget(r)}
                      >
                        <RotateCcw className="size-3.5" />
                        {t("submit")}
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
          onClose={() => setTarget(null)}
          name={target.fullName || target.email || "—"}
          isPending={isPending}
          error={error}
          onConfirm={(reason) =>
            onRestore(target, reason, () => setTarget(null))
          }
        />
      )}
    </>
  );
}
