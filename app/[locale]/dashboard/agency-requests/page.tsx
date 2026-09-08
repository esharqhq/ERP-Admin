"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";

import { DataTable } from "@/components/ui/data-table/data-table";
import type { FilterField } from "@/components/ui/filter-bar";
import type { StageTab } from "@/components/ui/data-table/types";
import { useApplicationColumns } from "@/components/agency-requests/queue-columns";
import { useAgencyApplications } from "@/hooks/use-agency-applications";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { useCities, useCountries } from "@/hooks/use-lookups";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import {
  APPLICATION_FILTER_KEYS,
  buildApplicationQuery,
} from "@/lib/agencies/application-query";
import { isPermissionDenied } from "@/lib/onboarding/errors";

/**
 * The four wire statuses plus `all`, with the work queue first and default.
 *
 * ⚠ `"all"` is **not** a status of that name — `buildApplicationQuery` sends no
 * `status` param for it. A tab labelled All that posted `status=all` would answer
 * `400`.
 */
const TABS = ["Pending", "InfoRequested", "Approved", "Rejected", "all"] as const;

const DEFAULT_TAB = "Pending";

/** The active locale's name for a lookup row. Hoisted so `fields` has honest deps. */
function lookupLabel(c: { nameDe: string; nameEn: string }, locale: string): string {
  return locale === "de" ? c.nameDe : c.nameEn;
}

/**
 * The agency application review queue — F-05a §8.
 *
 * **Server mode.** `GET /api/agency-applications` searches, filters, sorts and
 * pages itself, so the shell narrows nothing: `useTableUrlState` is the single
 * source for tab, search, filters and page, and `buildApplicationQuery` turns its
 * bag into the typed query. Running the client pipeline over one server page would
 * search the 25 rows on screen and present the answer as the whole queue.
 *
 * **No sorting.** See `useApplicationColumns` — four of the eight columns are
 * computed per row in SQL and ordering on one fails at runtime rather than
 * answering a `400`, so no column carries a `sortKey`.
 *
 * **No tab counts.** Nothing can count them without four extra `pageSize=1`
 * probes, which is the same call the workers queue declined to make; a count taken
 * from `data.total` would describe the *current* tab four times over.
 *
 * The intake button (F-05a §6, an admin keying an application in from a phone
 * call) lands in phase 3B — this page ships with no `actions` rather than with a
 * disabled one.
 */
export default function AgencyRequestsPage() {
  const t = useTranslations("agencyRequests");
  const locale = useLocale();

  const state = useTableUrlState({
    filterKeys: [...APPLICATION_FILTER_KEYS],
    defaultTab: DEFAULT_TAB,
  });

  /**
   * Read through `useCurrentPermissions`, not `useHasPermission`: the latter
   * collapses "denied" and "not resolved yet" into one `false`, which on a cold
   * start holds the query closed and then flashes the forbidden state before the
   * real answer arrives.
   *
   * ⚠ A MODERATOR **does** hold `agency_application:read` (seeded — see
   * `DatabaseSeeder.cs`), so unlike the agencies list this is a queue they can
   * open. `agency_application:manage` is the review verbs' gate and belongs on the
   * detail, not here: there is no row-level action to hide.
   */
  const { permissions } = useCurrentPermissions();
  const canRead =
    permissions === null ? null : permissions.has("agency_application:read");

  const countries = useCountries();
  // Idle until a country is chosen: cities are only reachable per country.
  const cities = useCities(state.filters.countryId || undefined);

  const query = useMemo(
    () =>
      buildApplicationQuery({
        filters: state.filters,
        tab: state.tab,
        search: state.search,
        sort: state.sort,
        page: state.page,
        pageSize: state.pageSize,
      }),
    [
      state.filters,
      state.tab,
      state.search,
      state.sort,
      state.page,
      state.pageSize,
    ],
  );

  const { data, isLoading, isError, error } = useAgencyApplications(
    query,
    canRead === true,
  );

  const columns = useApplicationColumns();

  /**
   * The country picker owns two params, so it writes both at once.
   *
   * ⚠ Two `setFilter` calls would not do: each merges its patch into the query
   * captured at render, so the second discards the first and leaves the stale city
   * id in the address — which answers an **empty page rather than an error** and
   * reads as "no applications from this country".
   */
  const setFilter = (key: string, value: string) => {
    if (key !== "countryId") return state.setFilter(key, value);
    if ((state.filters.countryId ?? "") === value) return;
    state.setFilters({ countryId: value, cityId: "" });
  };

  const fields = useMemo<FilterField[]>(
    () => [
      {
        key: "countryId",
        label: t("filters.country"),
        options: (countries.data ?? [])
          .filter((c) => c.isActive)
          .map((c) => ({ value: c.id, label: lookupLabel(c, locale) })),
      },
      {
        key: "cityId",
        label: t("filters.city"),
        // Empty until a country is chosen, and a select with no options renders
        // nothing — which is the wanted behaviour, with no extra flag.
        options: (cities.data ?? [])
          .filter((c) => c.isActive)
          .map((c) => ({ value: c.id, label: lookupLabel(c, locale) })),
      },
      {
        kind: "dateRange",
        fromKey: "submittedFrom",
        toKey: "submittedTo",
        label: t("filters.submitted"),
      },
    ],
    [t, countries.data, cities.data, locale],
  );

  const tabs = useMemo<StageTab[]>(
    () =>
      TABS.map((key) => ({
        value: key,
        label: t(`tabs.${key}`),
      })),
    [t],
  );

  return (
    /*
      Grows so the card can reach the bottom of the window — `main` in the
      dashboard layout is already a full-height flex column.
    */
    <div className="flex grow flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <DataTable
        state={{ ...state, setFilter }}
        scope="agency-requests"
        columns={columns}
        source={{
          mode: "server",
          rows: data?.items ?? [],
          total: data?.total ?? 0,
          isLoading,
          isError,
          // A refusal is not a failure: the shell names the missing grant rather
          // than telling an admin to reload a queue they may simply not read.
          isForbidden: isPermissionDenied(error),
        }}
        rowKey={(a) => a.id}
        rowHref={(a) => `/dashboard/agency-requests/${a.id}`}
        rowLabel={(a) => a.legalName}
        title={t("list")}
        tabs={tabs}
        tabsLabel={t("title")}
        fields={fields}
        searchPlaceholder={t("searchPlaceholder")}
        /*
          Only the *unfiltered* emptiness is per-queue copy. The shell owns the
          other one — `TableNoMatch` draws the shared "nothing matches these
          filters" sentence with its own Clear all, keyed on `state.isFiltered`, so
          a second per-screen version here would be unreachable.
        */
        empty={{ title: t("empty.queueTitle"), body: t("empty.queueBody") }}
      />
    </div>
  );
}
