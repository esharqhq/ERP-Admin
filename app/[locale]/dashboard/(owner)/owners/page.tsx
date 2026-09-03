"use client";

import { useMemo } from "react";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import type { FilterField } from "@/components/ui/filter-bar";
import { useOwners } from "@/hooks/use-owners";
import { useCities, useCountries } from "@/hooks/use-lookups";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import {
  OWNER_FILTER_KEYS,
  buildOwnerFilterQuery,
  clearCityOnCountryChange,
} from "@/lib/owners/owner-filter-query";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import { initials } from "@/lib/ui/initials";
import type { OwnerListQuery, OwnerRowDto } from "@/lib/types/owner.types";
import { useLocale, useTranslations } from "next-intl";

/**
 * Tabs filter on one axis only. `status` (coarse account lifecycle) and
 * `onboardingStatus` (exact stage) AND together server-side, so mixing them
 * across tabs would make "Review" mean different things depending on which tab
 * the admin came from. This picks the onboarding axis, which is the one an
 * admin acts on: `Review` is the queue where approve/reject are legal.
 */
const TABS = ["all", "review", "active"] as const;
type OwnerTab = (typeof TABS)[number];

const DEFAULT_TAB: OwnerTab = "all";

/**
 * **Every tab pins `ownerType: "Regular"`**, so the permanent "Walk-in / Manual
 * Orders" account never appears in this directory. It is a system account rather
 * than a customer: Edit, Delete, Message and Create-contract are all refused
 * against it (`owner_is_system`), and it is managed from its own page under the
 * Owner group instead.
 *
 * An earlier version left `ownerType` off the "all" tab on the reasoning that an
 * admin searching for "Walk-in" should find it here. It is reachable through its
 * own screen, which resolves the account by its own lookup and does not read this
 * list, so nothing depends on that.
 */
function queryFor(tab: string): Pick<OwnerListQuery, "onboardingStatus" | "ownerType"> {
  switch (tab) {
    case "review":
      return { onboardingStatus: "Review", ownerType: "Regular" };
    case "active":
      return { onboardingStatus: "Active", ownerType: "Regular" };
    default:
      return { ownerType: "Regular" };
  }
}

/** The active locale's name for a lookup row. Hoisted so `fields` has honest deps. */
function lookupLabel(c: { nameDe: string; nameEn: string }, locale: string): string {
  return locale === "de" ? c.nameDe : c.nameEn;
}

function formatDay(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * The owner directory, on the shared table shell.
 *
 * **Server mode, and that is the whole reason this file reads the way it does.**
 * `GET /api/admin/owners` searches, filters and pages itself, so the shell narrows
 * nothing: `useTableUrlState` is the single source for tab, search, filters and
 * page, and `buildOwnerFilterQuery` turns its filter bag into the query. Running
 * the client pipeline here would search the 25 rows on screen and present the
 * answer as the whole table.
 *
 * **Eight columns registered, seven visible.** The design system caps a table at
 * seven (§08 · Table, Behaviour: *"Anything more belongs in the detail view or
 * behind a column picker"*), so `joined` ships off and the picker holds it. It is
 * the least actionable of the eight — an account's age decides nothing an admin
 * does from this list.
 *
 * **No sorting.** `DataColumn.sortKey` is what makes a column sortable in server
 * mode, and nothing in this app has ever sent `sortBy`/`dir` — the whitelist needs
 * a default branch for an unknown key before anything relies on it. Omitting the
 * keys leaves the headers inert rather than offering a sort that would silently
 * order one page. Tracked as its own piece of work, not as part of this migration.
 */
export default function OwnersPage() {
  const t = useTranslations("owners");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();

  const state = useTableUrlState({
    filterKeys: [...OWNER_FILTER_KEYS],
    defaultTab: DEFAULT_TAB,
  });

  const countries = useCountries();
  // Idle until a country is chosen: cities are only reachable per country.
  const cities = useCities(state.filters.countryId || undefined);

  const built = useMemo(
    () => buildOwnerFilterQuery(state.filters),
    [state.filters],
  );

  const query = useMemo<OwnerListQuery>(
    () => ({
      ...(built.ok ? built.query : {}),
      // The tab owns `onboardingStatus` and `ownerType`, so it is spread LAST:
      // where a tab and a filter address the same param the tab wins, and a query
      // neither control explains is worse than a narrower one.
      ...queryFor(state.tab),
      search: state.search || undefined,
      page: state.page,
      pageSize: state.pageSize,
    }),
    [built, state.tab, state.search, state.page, state.pageSize],
  );

  const { data, isLoading, isError, error } = useOwners(query);

  /**
   * The country picker owns two params, so it writes both at once. Two
   * `setFilter` calls would not do: each merges into the query captured at
   * render, so the second would discard the first and leave the stale city id in
   * the address — which returns an **empty page rather than an error**, and reads
   * as "this country has no owners".
   */
  const setFilter = (key: string, value: string) => {
    if (key !== "countryId") return state.setFilter(key, value);
    state.setFilters(clearCityOnCountryChange(state.filters, value));
  };

  const fields = useMemo<FilterField[]>(
    () => [
      {
        key: "countryId",
        label: t("filters.country"),
        // It genuinely filters nothing — saying so stops it reading as broken.
        hint: t("filters.countryHint"),
        options: (countries.data ?? [])
          .filter((c) => c.isActive)
          .map((c) => ({ value: c.id, label: lookupLabel(c, locale) })),
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
          .map((c) => ({ value: c.id, label: lookupLabel(c, locale) })),
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
        disabled: state.filters.neverOrdered === "true",
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
    ],
    [t, countries.data, cities.data, locale, state.filters.neverOrdered],
  );

  /**
   * Column order is identity first, then how to reach them, then where they are,
   * then how much of them there is, and last what they have been doing.
   *
   * `owner` and `onboarding` are **locked**: between them they are the row's
   * identity, and a row that can be reduced to counts alone is not a row anybody
   * can act on. The picker still lists them, greyed with a lock.
   *
   * Numbers, dates and the phone are mono and the two counts are right-aligned,
   * per §08 · Table: digits stack into a column the eye can compare down.
   */
  const columns = useMemo<DataColumn<OwnerRowDto>[]>(
    () => [
      {
        id: "owner",
        label: t("columns.owner"),
        locked: true,
        className: "min-w-[220px]",
        cell: (o) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-8 shrink-0">
              {/*
                A quiet green ground with forest initials, the same treatment the
                documents queue uses: `--accent` is `--forest-100` (#E1EFE8), the
                value the design names, and it inverts correctly in dark mode
                where the default cool grey does not. No ring — the design gives
                the avatar no outline, and beside a forest tint the border read as
                a second circle.
              */}
              <AvatarFallback className="bg-accent text-xs font-semibold text-primary">
                {initials(o.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium leading-tight">
                {o.fullName || "—"}
              </span>
              {/* The second line is the mono context line §08 draws under the
                  identifier — an email is the id an admin actually pastes. */}
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {o.email || "—"}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "phone",
        label: t("directory.columns.phone"),
        cell: (o) => (
          <span className="font-mono text-sm text-muted-foreground">
            {o.phoneNumber || "—"}
          </span>
        ),
      },
      {
        id: "onboarding",
        label: t("columns.onboarding"),
        locked: true,
        cell: (o) => {
          const p = onboardingStatusPresentation(o.onboardingStatus);
          return (
            <Badge variant={p.variant} className={p.className}>
              {tOnboarding(
                `status.${p.labelKey}` as Parameters<typeof tOnboarding>[0],
              )}
            </Badge>
          );
        },
      },
      {
        id: "companyCity",
        label: t("columns.companyCity"),
        // Blanks are rendered deliberately: these are exactly the rows a
        // company-city filter can never return, so showing them is what lets a
        // short filtered list explain itself.
        cell: (o) => (
          <span className="text-sm text-muted-foreground">{o.companyCity || "—"}</span>
        ),
      },
      {
        id: "properties",
        label: t("columns.properties"),
        align: "right",
        cell: (o) => (
          <span className="flex items-center justify-end gap-1.5 font-mono text-sm text-muted-foreground">
            <Building2 className="size-3.5" />
            {o.propertyCount}
          </span>
        ),
      },
      {
        id: "tasks",
        label: t("columns.tasks"),
        align: "right",
        cell: (o) => (
          <span className="font-mono text-sm text-muted-foreground">{o.taskCount}</span>
        ),
      },
      {
        id: "lastOrdered",
        // "Last order", never "last activity" — it measures ordering, and this
        // API has no login-recency data for any user type.
        label: t("columns.lastOrdered"),
        cell: (o) => (
          <span className="font-mono text-sm text-muted-foreground">
            {o.lastOrderedAt ? formatDay(o.lastOrderedAt, locale) : "—"}
          </span>
        ),
      },
      {
        id: "joined",
        label: t("account.joined"),
        // Off by default: seven columns is the system's cap and this is the one
        // an admin never acts on from a list.
        defaultVisible: false,
        cell: (o) => (
          <span className="font-mono text-sm text-muted-foreground">
            {formatDay(o.createdAt, locale)}
          </span>
        ),
      },
    ],
    [t, tOnboarding, locale],
  );

  const tabs = useMemo(
    () =>
      TABS.map((key) => ({
        value: key,
        label: t(`tabs.${key}` as Parameters<typeof t>[0]),
        // No counts: this endpoint pages, so a count would need one probe request
        // per tab and would still only ever be the server's, not the page's.
      })),
    [t],
  );

  return (
    /*
      Grows so the card can reach the bottom of the window — `main` in the
      dashboard layout is already a full-height flex column and this is the link
      between it and the card.
    */
    <div className="flex grow flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("directory.subtitle")}</p>
      </div>

      {/* A refused combination must explain itself: the table below is still
          showing the tab/search result, so without this it reads as "no owners
          match" rather than "these filters were not applied". */}
      {!built.ok && (
        <p className="text-xs text-destructive">{t("filters.invalidCombination")}</p>
      )}

      <DataTable
        state={{ ...state, setFilter }}
        scope="owners"
        columns={columns}
        source={{
          mode: "server",
          rows: data?.items ?? [],
          total: data?.total ?? 0,
          isLoading,
          isError,
          // A refusal is not a failure: the shell names the missing grant instead
          // of telling an admin to reload a page they may simply not read.
          isForbidden: isPermissionDenied(error),
        }}
        rowKey={(o) => o.id}
        rowHref={(o) => `/dashboard/owners/${o.id}`}
        rowLabel={(o) => o.fullName || o.id}
        title={t("list")}
        // No subtitle: the page header above already carries that sentence, and
        // the count pill beside the title is what the row actually adds.
        tabs={tabs}
        tabsLabel={t("tabsLabel")}
        fields={fields}
        searchPlaceholder={t("directory.search")}
        empty={{ title: t("emptyTitle"), body: t("emptyBody") }}
      />
    </div>
  );
}
