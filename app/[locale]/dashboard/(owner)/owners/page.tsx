"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Building2, Headset, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { RowLink } from "@/components/ui/row-link";
import { DataTableCard } from "@/components/ui/data-table-card";
import { FilterBar, type FilterField } from "@/components/ui/filter-bar";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useOwners } from "@/hooks/use-owners";
import { useCities, useCountries } from "@/hooks/use-lookups";
import {
  buildOwnerFilterQuery,
  clearCityOnCountryChange,
} from "@/lib/owners/owner-filter-query";
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
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [tab, setTab] = useState<OwnerTab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  /** Keyed by wire param name — see `buildOwnerFilterQuery`. */
  const [filters, setFilters] = useState<Record<string, string>>({});

  const countries = useCountries();
  // Idle until a country is chosen: cities are only reachable per country.
  const cities = useCities(filters.countryId || undefined);

  const built = useMemo(() => buildOwnerFilterQuery(filters), [filters]);

  // Filtering, searching and paging all happen server-side now, so the query is
  // the whole state of the table.
  const query = useMemo<OwnerListQuery>(
    () => ({
      ...(built.ok ? built.query : {}),
      // The tab owns `onboardingStatus` and `ownerType`, so it is spread LAST:
      // where a tab and a filter address the same param the tab wins, and a query
      // neither control explains is worse than a narrower one.
      ...queryFor(tab),
      search: search || undefined,
      page,
      pageSize,
    }),
    [built, tab, search, page, pageSize],
  );

  const { data, isLoading, isError, error } = useOwners(query);
  const owners = data?.items ?? [];

  // Any change to what is being listed invalidates the current page number —
  // staying on page 4 of a filter that now has one page shows an empty table.
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const setFilter = (key: string, value: string) => {
    setFilters((prev) =>
      key === "countryId"
        ? clearCityOnCountryChange(prev, value)
        : { ...prev, [key]: value },
    );
    setPage(1);
  };

  const cityLabel = (c: { nameDe: string; nameEn: string }) =>
    locale === "de" ? c.nameDe : c.nameEn;

  const fields: FilterField[] = [
    {
      key: "countryId",
      label: t("filters.country"),
      // It genuinely filters nothing — saying so stops it reading as broken.
      hint: t("filters.countryHint"),
      options: (countries.data ?? [])
        .filter((c) => c.isActive)
        .map((c) => ({ value: c.id, label: cityLabel(c) })),
    },
    {
      key: "companyCityId",
      label: t("filters.companyCity"),
      // §2.1: a city lives only on a company record, so this filter can reach
      // neither private individuals nor companies with a blank city.
      hint: t("filters.companyCityHint"),
      // Empty until a country is chosen, and a select with no options renders
      // nothing — which is exactly the wanted behaviour, with no extra flag.
      options: (cities.data ?? [])
        .filter((c) => c.isActive)
        .map((c) => ({ value: c.id, label: cityLabel(c) })),
    },
    {
      kind: "dateRange",
      fromKey: "registeredFrom",
      toKey: "registeredTo",
      label: t("filters.registered"),
    },
    {
      kind: "triState",
      key: "neverOrdered",
      label: t("filters.neverOrdered"),
      anyLabel: t("filters.neverOrderedAny"),
      trueLabel: t("filters.neverOrderedTrue"),
      falseLabel: t("filters.neverOrderedFalse"),
    },
    {
      kind: "dateRange",
      fromKey: "lastOrderedFrom",
      toKey: "lastOrderedTo",
      label: t("filters.lastOrdered"),
      // The combination is a 400, so the inputs go dead rather than the request
      // failing after the admin has filled them in.
      disabled: filters.neverOrdered === "true",
    },
    {
      kind: "numberRange",
      minKey: "propertyCountMin",
      maxKey: "propertyCountMax",
      label: t("filters.propertyCount"),
    },
    {
      kind: "numberRange",
      minKey: "taskCountMin",
      maxKey: "taskCountMax",
      label: t("filters.taskCount"),
    },
  ];

  const columns = [
    { label: t("columns.owner") },
    { label: t("directory.columns.phone") },
    { label: t("columns.onboarding") },
    { label: t("columns.companyCity") },
    { label: t("columns.properties"), className: "text-center" },
    { label: t("columns.tasks"), className: "text-center" },
    { label: t("columns.lastOrdered") },
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

        {/* A refused combination must explain itself: the table below is still
            showing the tab/search result, so without this it reads as "no owners
            match" rather than "these filters were not applied". */}
        {!built.ok && (
          <p className="text-xs text-destructive">{t("filters.invalidCombination")}</p>
        )}

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
            filters={
              <FilterBar
                fields={fields}
                values={filters}
                onChange={setFilter}
                onReset={() => {
                  setFilters({});
                  setPage(1);
                }}
                allLabel={tCommon("all")}
                clearLabel={tCommon("clearFilters")}
                orderErrorLabel={t("filters.rangeOrder")}
                negativeErrorLabel={t("filters.rangeNegative")}
              />
            }
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

                  {/* Blanks are rendered deliberately: these are exactly the rows a
                      company-city filter can never return, so showing them is what
                      lets a short filtered list explain itself. */}
                  <TableCell className="text-sm text-muted-foreground">
                    {o.companyCity || "—"}
                  </TableCell>

                  <TableCell>
                    <span className="flex items-center justify-center gap-1.5 text-sm tabular-nums text-muted-foreground">
                      <Building2 className="size-3.5" />
                      {o.propertyCount}
                    </span>
                  </TableCell>

                  <TableCell className="text-center text-sm tabular-nums text-muted-foreground">
                    {o.taskCount}
                  </TableCell>

                  {/* "Last order", never "last activity" — it measures ordering, and
                      this API has no login-recency data for any user type. */}
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {o.lastOrderedAt ? formatJoined(o.lastOrderedAt, locale) : "—"}
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
