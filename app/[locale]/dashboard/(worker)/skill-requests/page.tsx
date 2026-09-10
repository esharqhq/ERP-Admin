"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";

import { DataTable } from "@/components/ui/data-table/data-table";
import type { FilterField } from "@/components/ui/filter-bar";
import type { StageTab } from "@/components/ui/data-table/types";
import { useSkillRequestColumns } from "@/components/skill-requests/queue-columns";
import { SkillRequestsToolbar } from "@/components/skill-requests/queue-toolbar";
import { useSkillRequests } from "@/hooks/use-skill-requests";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { useProfessions } from "@/hooks/use-professions";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import {
  SKILL_REQUEST_FILTER_KEYS,
  buildSkillRequestQuery,
} from "@/lib/skill-requests/request-query";
import {
  DEFAULT_SKILL_REQUEST_TAB,
  SKILL_REQUEST_TABS,
} from "@/lib/types/skill-request.types";
import { professionLabel } from "@/lib/types/profession.types";
import { isPermissionDenied } from "@/lib/onboarding/errors";

/**
 * The skill-request decision queue — F-06a §7.
 *
 * **Server mode.** The endpoint filters and pages itself, so the shell narrows
 * nothing: `useTableUrlState` is the single source for tab, filters and page, and
 * `buildSkillRequestQuery` turns its bag into the typed query. Running the client
 * pipeline over one server page would filter the 25 rows on screen and present the
 * answer as the whole queue.
 *
 * **Four tabs, and no All.** `open` sends no `status` param, which is the only way
 * to express `Pending` + `InfoRequested` — the endpoint's `status` is a single enum.
 * An All tab is not possible; see `buildSkillRequestQuery`.
 *
 * **No sorting** — the endpoint takes no `sort` parameter, so no column carries a
 * `sortKey`. **No search** — it takes no `search` either, which is why this screen
 * passes its own `toolbar`; see `SkillRequestsToolbar`.
 *
 * **No tab counts.** Each would be its own `pageSize=1` probe, and a count taken
 * from `data.total` would describe the current tab four times over — the same
 * decision the agency queue made.
 *
 * **An answered question returns here on its own.** `respond` moves a request back
 * to `Pending`, so "needs an admin" and the default tab are the same set: no
 * "responded" tab and no special sort.
 */
export default function SkillRequestsPage() {
  const t = useTranslations("skillRequests");
  const locale = useLocale();

  const state = useTableUrlState({
    filterKeys: [...SKILL_REQUEST_FILTER_KEYS],
    defaultTab: DEFAULT_SKILL_REQUEST_TAB,
  });

  /**
   * Read through `useCurrentPermissions`, not `useHasPermission`: the latter
   * collapses "denied" and "not resolved yet" into one `false`, which on a cold
   * start holds the query closed and then flashes the forbidden state before the
   * real answer arrives.
   *
   * A MODERATOR **does** hold this read — only the four verbs are closed to them,
   * and those live on the detail. There is no row-level action to hide here.
   */
  const { permissions } = useCurrentPermissions();
  const canRead =
    permissions === null ? null : permissions.has("worker_profession_request:read");

  /**
   * ⚠ **The inactive-inclusive list.** A deactivated skill still resolves and still
   * sits on historical requests — `profession-fnd1-retrofit.md` §4: existing
   * assignments are never cleaned up. An active-only dropdown would leave an admin
   * unable to filter the Rejected or Revoked tab for a skill that has since been
   * deactivated. An admin holds `profession:update`, so `includeInactive` is
   * honoured for them; it is silently ignored for everyone else.
   */
  const { data: professions = [] } = useProfessions(true);

  const query = useMemo(
    () =>
      buildSkillRequestQuery({
        filters: state.filters,
        tab: state.tab,
        page: state.page,
        pageSize: state.pageSize,
      }),
    [state.filters, state.tab, state.page, state.pageSize],
  );

  const { data, isLoading, isError, error } = useSkillRequests(
    query,
    canRead === true,
  );

  const columns = useSkillRequestColumns();

  const tabs = useMemo<StageTab[]>(
    () => SKILL_REQUEST_TABS.map((value) => ({ value, label: t(`tabs.${value}`) })),
    [t],
  );

  const fields = useMemo<FilterField[]>(
    () => [
      {
        key: "professionId",
        label: t("filters.skill"),
        options: professions.map((p) => ({
          value: p.id,
          // Inactive rows are kept but marked: an admin filtering for one should
          // understand why it yields only decided rows.
          label: p.isActive
            ? professionLabel(p, locale)
            : `${professionLabel(p, locale)} (${t("filters.inactive")})`,
        })),
      },
    ],
    [professions, locale, t],
  );

  return (
    /*
      Grows so the card can reach the bottom of the window — `main` in the dashboard
      layout is already a full-height flex column.
    */
    <div className="flex grow flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <DataTable
        state={state}
        scope="skill-requests"
        columns={columns}
        source={{
          mode: "server",
          // `items` is `T[] | null` on this envelope.
          rows: data?.items ?? [],
          total: data?.total ?? 0,
          isLoading: canRead === null || isLoading,
          isError,
          // A refusal is not a failure: the shell names the missing grant rather
          // than telling an admin to reload a queue they may simply not read.
          isForbidden: canRead === false || isPermissionDenied(error),
        }}
        rowKey={(r) => r.id}
        rowHref={(r) => `/dashboard/skill-requests/${r.id}`}
        rowLabel={(r) => r.workerFullName}
        title={t("list")}
        fields={fields}
        /*
          ⚠ **`tabs` is deliberately NOT passed.** `toolbar` replaces rows 1-3 of the
          default toolbar and row 2 *is* the stage-tab strip
          (`data-table.tsx:458-467`), so a caller passing both gets no tabs at all —
          the prop is silently dropped. The strip is drawn inside our own toolbar
          instead, off the same `state`, so it and the query cannot disagree.
        */
        toolbar={({ state: s, total, filtersTrigger, columnPicker, density }) => (
          <SkillRequestsToolbar
            heading={t("list")}
            total={total}
            tabs={tabs}
            tabsLabel={t("title")}
            state={s}
            filtersTrigger={filtersTrigger}
            columnPicker={columnPicker}
            density={density}
          />
        )}
        // Required by the type and unreachable once `toolbar` replaces the shell's
        // rows — this endpoint has nothing to search. Kept as the accessible name
        // the default toolbar would have used.
        searchPlaceholder={t("searchPlaceholder")}
        /*
          Only the *unfiltered* emptiness is per-queue copy. The shell owns the
          other one — `TableNoMatch` draws the shared "nothing matches these
          filters" sentence with its own Clear all, keyed on `state.isFiltered`.
        */
        empty={{ title: t("empty.queueTitle"), body: t("empty.queueBody") }}
      />
    </div>
  );
}
