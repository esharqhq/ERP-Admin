"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/ui/data-table/data-table";
import type { FilterField } from "@/components/ui/filter-bar";
import type { StageTab } from "@/components/ui/data-table/types";
import { useLinkColumns } from "@/components/agency-links/link-columns";
import { LinkRowActions } from "@/components/agency-links/link-row-actions";
import { useAgencyLinks } from "@/hooks/use-agency-links";
import { useActiveAgencies } from "@/hooks/use-agencies";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { buildLinkQuery, LINK_FILTER_KEYS } from "@/lib/agencies/link-query";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import type { AgencyLinkRowDto } from "@/lib/types/agency.types";

/**
 * ⚠ `Disputed` first and default — *"`?status=Disputed` IS the dispute queue"*
 * (F-05c §5.1). This screen exists for that work, the same way the requests
 * queue opens on `Pending`.
 *
 * ⚠ `Rejected` is a tab and its rows stay visible: with no dates on a link they
 * are the only answer to *"which agency was this worker's before"*.
 */
const TABS = ["Disputed", "Proposed", "Confirmed", "Rejected", "all"] as const;

const DEFAULT_TAB = "Disputed";

/**
 * The Agency links screen — F-05c §5.1.
 *
 * **Server mode.** The endpoint searches, filters, sorts and pages itself, so
 * the shell narrows nothing and `buildLinkQuery` is the only place the screen's
 * controls become a request.
 *
 * ⚠ **This is the app's first real `sortBy` consumer.** Three columns sort and
 * their ids are their wire names; see `useLinkColumns` for why that matters.
 *
 * ⚠ **No `rowHref`.** There is no link detail route — no `GET` by link id
 * exists. The row's *"Open the worker"* action is the navigation, and it goes to
 * the worker whose card carries `disputeNote`.
 *
 * ⚠ **MODERATOR holds the read grant and no write grant**
 * (`DatabaseSeeder.cs:1954`), so this must render **completely** for a role that
 * can press nothing: `linkActions` returns all-false and the action cell is
 * simply empty, with no disabled buttons implying the grant is temporary.
 */
export default function AgencyLinksPage() {
  // No `useLocale` here: only the columns format dates, and `useLinkColumns`
  // reads the locale itself.
  const t = useTranslations("agencyLinks");

  const state = useTableUrlState({
    filterKeys: [...LINK_FILTER_KEYS],
    defaultTab: DEFAULT_TAB,
    // Newest first, which is also what makes the bell's destination useful: the
    // row that fired it is at the top.
    defaultSort: { key: "createdAt", dir: "desc" },
  });

  /**
   * Read through `useCurrentPermissions`, not `useHasPermission`: the latter
   * collapses "denied" and "not resolved yet" into one `false`, which on a cold
   * start holds the query closed and then flashes the forbidden state before the
   * real answer arrives.
   */
  const { permissions } = useCurrentPermissions();
  const canRead =
    permissions === null ? null : permissions.has("agency_link:read_any");
  const canManage =
    permissions !== null && permissions.has("agency_link:manage_any");

  const query = useMemo(
    () =>
      buildLinkQuery({
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

  const { data, isLoading, isError, error } = useAgencyLinks(
    query,
    canRead === true,
  );

  // No `enabled` gate: `GET /api/agencies/active` carries no permission.
  const agencies = useActiveAgencies();

  /** Memoised so the column array is stable across renders. */
  const actions = useCallback(
    (link: AgencyLinkRowDto) => <LinkRowActions link={link} canManage={canManage} />,
    [canManage],
  );

  const columns = useLinkColumns(actions);

  const fields = useMemo<FilterField[]>(
    () => [
      {
        key: "agencyId",
        label: t("filters.agency"),
        // ⚠ Only in-force partners are in this list, so a link to a lapsed or
        // deleted agency cannot be filtered for by name — and those are exactly
        // the rows an admin may need to reject. Saying so stops it reading as
        // broken.
        hint: t("filters.agencyHint"),
        options: (agencies.data ?? []).map((a) => ({
          value: a.id,
          label: a.city ? `${a.legalName} · ${a.city}` : a.legalName,
        })),
      },
    ],
    [t, agencies.data],
  );

  const tabs = useMemo<StageTab[]>(
    () =>
      TABS.map((key) => ({
        value: key,
        label: t(`tabs.${key}`),
        // No counts: it would cost four `pageSize=1` probes and still only
        // describe the server's view of one tab.
      })),
    [t],
  );

  /**
   * Per-tab copy for the *unfiltered* emptiness only — the shell owns the other
   * one (`TableNoMatch`, from the shared `common.table` namespace).
   *
   * ⚠ An empty `Disputed` tab is **good news**, and must read as such rather
   * than as an empty shelf.
   */
  const empty =
    state.tab === "Disputed"
      ? { title: t("empty.disputedTitle"), body: t("empty.disputedBody") }
      : state.tab === "Proposed"
        ? { title: t("empty.proposedTitle"), body: t("empty.proposedBody") }
        : { title: t("empty.genericTitle"), body: t("empty.genericBody") };

  return (
    <div className="flex grow flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <DataTable
        state={state}
        scope="agency-links"
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
        rowKey={(l) => l.id}
        rowLabel={(l) => `${l.workerFullName} · ${l.agencyLegalName}`}
        title={t("list")}
        tabs={tabs}
        tabsLabel={t("title")}
        fields={fields}
        searchPlaceholder={t("searchPlaceholder")}
        empty={empty}
      />
    </div>
  );
}
