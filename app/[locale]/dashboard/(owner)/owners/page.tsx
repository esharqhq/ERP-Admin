"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Building2, Headset, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { RowLink } from "@/components/ui/row-link";
import { DataTableCard } from "@/components/ui/data-table-card";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useOwners } from "@/hooks/use-owners";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/paged.types";
import type { OwnerListQuery, OwnerRowDto } from "@/lib/types/owner.types";
import { useLocale, useTranslations } from "next-intl";

/**
 * Tabs filter on one axis only. `status` (coarse account lifecycle) and
 * `onboardingStatus` (exact stage) AND together server-side, so mixing them
 * across tabs would make "Review" mean different things depending on which tab
 * the admin came from. This picks the onboarding axis, which is the one an
 * admin acts on: `Review` is the queue where approve/reject are legal.
 */
const TABS = ["all", "review", "active", "walkIn"] as const;
type OwnerTab = (typeof TABS)[number];

function queryFor(tab: OwnerTab): Pick<OwnerListQuery, "onboardingStatus" | "ownerType"> {
  switch (tab) {
    case "review":
      return { onboardingStatus: "Review", ownerType: "Regular" };
    case "active":
      return { onboardingStatus: "Active", ownerType: "Regular" };
    // The walk-in account has no onboarding stage to filter on — `ownerType` is
    // the only way to reach it, and `onboardingStatus=NotApplicable` does not exist.
    case "walkIn":
      return { ownerType: "Default" };
    // Omitting `ownerType` deliberately includes the walk-in row: an admin
    // searching for "Walk-in" on the default tab must find it.
    case "all":
      return {};
  }
}

function formatJoined(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

export default function OwnersPage() {
  const t = useTranslations("owners");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();

  const [tab, setTab] = useState<OwnerTab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Filtering, searching and paging all happen server-side now, so the query is
  // the whole state of the table.
  const query = useMemo<OwnerListQuery>(
    () => ({ ...queryFor(tab), search: search || undefined, page, pageSize }),
    [tab, search, page, pageSize],
  );

  const { data, isLoading, isError, error } = useOwners(query);
  const owners = data?.items ?? [];

  // Any change to what is being listed invalidates the current page number —
  // staying on page 4 of a filter that now has one page shows an empty table.
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const columns = [
    { label: t("columns.owner") },
    { label: t("directory.columns.phone") },
    { label: t("columns.onboarding") },
    { label: t("columns.properties"), className: "text-center" },
    { label: t("directory.columns.status") },
    { label: t("account.joined") },
  ];

  const Header = (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
        {t("title")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("directory.subtitle")}</p>
    </div>
  );

  const TabBar = (
    <Tabs value={tab} onValueChange={(v) => reset(setTab)(v as OwnerTab)}>
      <TabsList variant="line" className="self-start">
        {TABS.map((key) => (
          <TabsTrigger key={key} value={key}>
            {t(`tabs.${key}` as Parameters<typeof t>[0])}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  if (isError) {
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      (error as Error)?.message ??
      t("errorConnect");
    const status = (error as { response?: { status?: number } })?.response?.status;
    return (
      <div className="flex flex-col gap-6">
        {Header}
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          <p className="font-semibold">
            {t("errorLoad")}
            {status ? ` (${status})` : ""}
          </p>
          <p className="mt-1 text-destructive/80">{msg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {Header}

      <div className="flex flex-col gap-4">
        {TabBar}

        {isLoading ? (
          <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <DataTableCard
            title={t("list")}
            count={data?.total ?? 0}
            searchPlaceholder={t("directory.search")}
            searchValue={search}
            onSearchChange={reset(setSearch)}
            columns={columns}
            data={owners}
            renderRow={(o: OwnerRowDto) => {
              const isDefault = o.ownerType === "Default";
              const p = onboardingStatusPresentation(o.onboardingStatus);
              return (
                <TableRow
                  key={o.id}
                  className="group/row relative cursor-pointer transition-colors duration-150 hover:bg-accent/40"
                >
                  <TableCell className="py-3">
                    <RowLink href={`/dashboard/owners/${o.id}`} label={o.fullName} />
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9 ring-1 ring-border">
                        <AvatarFallback className="bg-muted text-[11px] font-semibold">
                          {isDefault ? (
                            <Headset className="size-4" />
                          ) : (
                            (o.fullName || "??").slice(0, 2).toUpperCase()
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm font-medium leading-tight">
                          {o.fullName || "—"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {o.email || "—"}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {o.phoneNumber || "—"}
                  </TableCell>

                  <TableCell>
                    <Badge variant={p.variant} className={p.className}>
                      {tOnboarding(`status.${p.labelKey}` as Parameters<typeof tOnboarding>[0])}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span className="flex items-center justify-center gap-1.5 text-sm tabular-nums text-muted-foreground">
                      <Building2 className="size-3.5" />
                      {o.propertyCount}
                    </span>
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

                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {formatJoined(o.createdAt, locale)}
                  </TableCell>
                </TableRow>
              );
            }}
          />
        )}

        {!isLoading && (data?.total ?? 0) > 0 && (
          <TablePagination
            page={data?.page ?? 1}
            pageSize={data?.pageSize ?? pageSize}
            total={data?.total ?? 0}
            onPageChange={setPage}
            onPageSizeChange={reset(setPageSize)}
          />
        )}
      </div>
    </div>
  );
}
