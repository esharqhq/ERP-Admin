"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";
import { DataTable } from "@/components/ui/data-table/data-table";
import type { FilterField } from "@/components/ui/filter-bar";
import { AgencyActions } from "@/components/agencies/agency-actions";
import { AgencyCreateDialog } from "@/components/agencies/agency-create-dialog";
import { AgencySummaryStrip } from "@/components/agencies/agency-summary-strip";
import { useAgencyColumns } from "@/components/agencies/agency-columns";
import { useAgencies, useCreateAgency } from "@/hooks/use-agencies";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { agencyErrorKey } from "@/lib/agencies/errors";
import { agencySummary } from "@/lib/agencies/summary";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { looseIncludes } from "@/lib/ui/table-rows";
import type { AgencyDto, CreateAgencyRequest } from "@/lib/types/agency.types";

const FILTER_KEYS = ["standing", "country", "invitation"] as const;

/**
 * The partner list — F-05·0 §5/§7 and F-05a §8.
 *
 * **Client mode**, because `GET /api/agencies` takes no query parameters at all
 * and answers with one unpaged array: the shell owns search, filter, sort and
 * paging over rows already in the browser.
 *
 * ⚠ **Client-side sort here is not the server-sort feature `BACKEND-REVISIONS.md`
 * reserves for its own spec.** Every row is already local, so a sort orders the
 * whole table rather than one page of it — the properties precedent, not the
 * owners one.
 *
 * ⚠ **Rows are deliberately not links.** There is no detail route yet; when one
 * lands it takes `rowHref`, and a row whose click meaning changes between
 * releases is worse than a row that never had one. The dropdown is the affordance.
 */
export default function AgenciesPage() {
  const t = useTranslations("agencies");
  const tErrors = useTranslations("agencies.errors");

  const state = useTableUrlState({
    filterKeys: [...FILTER_KEYS],
    defaultSort: { key: "agency", dir: "asc" },
  });

  /**
   * Read through `useCurrentPermissions`, not `useHasPermission`: the latter
   * collapses "denied" and "not resolved yet" into one `false`, and on a cold
   * start that would hold the query closed and then flash the forbidden state
   * before the real answer arrived.
   */
  const { permissions } = useCurrentPermissions();
  const canRead = permissions === null ? null : permissions.has("agency:read");

  const {
    data: agencies = [],
    isLoading,
    isError,
    error,
  } = useAgencies(canRead === true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const create = useCreateAgency();

  const summary = useMemo(() => agencySummary(agencies), [agencies]);

  const renderActions = useCallback(
    (agency: AgencyDto) => <AgencyActions agency={agency} />,
    [],
  );
  const columns = useAgencyColumns(renderActions);

  /**
   * Options derived from the rows present, the properties rule: an option then
   * always matches at least one row.
   *
   * ⚠ `standing` filters on the **wire value**, never a localized label, so a
   * selected filter survives a language switch — and a fifth standing appears in
   * this list without a code change.
   */
  const fields = useMemo<FilterField[]>(() => {
    const standings = [...new Set(agencies.map((a) => a.standing))].sort();
    const countries = [...new Set(agencies.map((a) => a.country))].sort();
    return [
      {
        key: "standing",
        label: t("filters.standing"),
        options: standings.map((s) => ({
          value: s,
          label: t.has(`standing.${s}`) ? t(`standing.${s}`) : s,
        })),
      },
      {
        key: "country",
        label: t("filters.country"),
        options: countries.map((c) => ({ value: c, label: c })),
      },
      {
        key: "invitation",
        label: t("filters.invitation"),
        options: [
          { value: "pending", label: t("invitation.pending") },
          { value: "used", label: t("invitation.used") },
        ],
      },
    ];
  }, [agencies, t]);

  const createButton = (
    <Can permission="agency:create">
      <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
        <Plus className="size-4" />
        {t("create.new")}
      </Button>
    </Can>
  );

  return (
    <div className="flex grow flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {/* ⚠ No export button — there is no export route for this endpoint. */}
        {createButton}
      </div>

      <AgencySummaryStrip
        summary={summary}
        isLoading={isLoading}
        active={state.filters}
        // A tile toggles its own key off when it is already on, so the strip can
        // clear what it set without reaching for the Clear button.
        onToggle={(key, value) =>
          state.setFilter(key, state.filters[key] === value ? "" : value)
        }
      />

      <DataTable
        state={state}
        scope="agencies"
        columns={columns}
        source={{
          mode: "client",
          rows: agencies,
          isLoading,
          isError,
          isForbidden: isPermissionDenied(error),
          /*
            ⚠ `looseIncludes`, not a hand-rolled `toLowerCase().includes()`.
            It folds diacritics and expands `ß` to `ss`
            (`lib/ui/table-rows.ts:91`), which matters on exactly this screen:
            German is the console's second language, the rows are German and
            Austrian company names and cities, and an operator types `Muller`
            for `Müller` and `strasse` for `Straße`. The shell already hands
            `needle` in lower-cased and trimmed (`table-rows.ts:49`).
          */
          matches: (a, needle) =>
            looseIncludes(a.legalName, needle) ||
            looseIncludes(a.registrationNumber, needle) ||
            looseIncludes(a.contactPersonName, needle) ||
            looseIncludes(a.contactEmail, needle) ||
            looseIncludes(a.loginEmail, needle) ||
            looseIncludes(a.city, needle),
          filter: (a, values) =>
            (!values.standing || a.standing === values.standing) &&
            (!values.country || a.country === values.country) &&
            (!values.invitation ||
              (values.invitation === "pending" ? !a.isVerified : a.isVerified)),
        }}
        rowKey={(a) => a.id}
        rowLabel={(a) => a.legalName}
        title={t("list")}
        fields={fields}
        searchPlaceholder={t("searchPlaceholder")}
        empty={{
          title: t("emptyTitle"),
          body: t("emptyBody"),
          action: createButton,
        }}
      />

      {createOpen && (
        <AgencyCreateDialog
          open
          onClose={() => {
            setCreateError(null);
            setCreateOpen(false);
          }}
          pending={create.isPending}
          error={createError}
          onSubmit={(body: CreateAgencyRequest) => {
            setCreateError(null);
            create.mutate(body, {
              onSuccess: () => setCreateOpen(false),
              onError: (err) => {
                const { key, detail } = agencyErrorKey(err);
                setCreateError(key === "generic" && detail ? detail : tErrors(key));
              },
            });
          }}
        />
      )}
    </div>
  );
}
