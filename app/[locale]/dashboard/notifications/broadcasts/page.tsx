"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Can } from "@/components/auth/can";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useBroadcastList } from "@/hooks/use-broadcasts";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import type { BroadcastRowDto, BroadcastStatus } from "@/lib/types/broadcast.types";

/**
 * Tab keys double as the URL's `?tab=` value. "all" is a sentinel; the other
 * five are the exact `BroadcastStatus` wire values, which is what lets
 * `queryFor` and the label lookup below both stay a plain switch/key-into-`t`
 * with no cast on the query side and no new i18n keys — `statusLabels.*`
 * already exists from the column pill (Phase 2) and is reused verbatim.
 * Order matches the ask: All, then the chronological status flow.
 */
const TABS = ["all", "Scheduled", "Sending", "Sent", "Cancelled", "Missed"] as const;
type BroadcastTab = (typeof TABS)[number];
const DEFAULT_TAB: BroadcastTab = "all";

/**
 * Same shape as `owners/page.tsx` and `workers/page.tsx`'s `queryFor`: a
 * switch with a `default` that degrades to "no filter" rather than casting a
 * possibly-stale `?tab=` straight through. A hand-edited or dead link should
 * show everything, not 400 or silently narrow to nothing.
 */
function queryFor(tab: string): BroadcastStatus | undefined {
  switch (tab) {
    case "Scheduled":
      return "Scheduled";
    case "Sending":
      return "Sending";
    case "Sent":
      return "Sent";
    case "Cancelled":
      return "Cancelled";
    case "Missed":
      return "Missed";
    default:
      return undefined;
  }
}

/**
 * §"STATUS PILL COLORS": neutral/blue → info, warning/amber → warning,
 * success/green → success, muted/gray → neutral, danger/red → danger. All off
 * the shared `--status-*` scale via `Badge`'s `tone` prop — no hardcoded hex,
 * no new component.
 */
const STATUS_TONE: Record<
  BroadcastStatus,
  "info" | "warning" | "success" | "neutral" | "danger"
> = {
  Scheduled: "info",
  Sending: "warning",
  Sent: "success",
  Cancelled: "neutral",
  Missed: "danger",
};

/**
 * Locale-aware, no hardcoded English. `scheduledAtUtc` can be in the future
 * (a still-`Scheduled` broadcast), which `Intl.RelativeTimeFormat` renders
 * correctly ("in 10 minutes") from a negative delta — the same call handles
 * both directions.
 */
function relativeTime(iso: string, locale: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffMin = Math.round(diffMs / 60_000);
  if (Math.abs(diffMin) < 1) return rtf.format(0, "minute");
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(-diffHr, "hour");
  return rtf.format(-Math.round(diffHr / 24), "day");
}

/**
 * The broadcast history, on the shared table shell — `GET /api/broadcasts`,
 * offset `PagedResult<BroadcastRowDto>` (FND-3 envelope), so this is server
 * mode: the shell narrows nothing and `query` below is the only thing that
 * decides what a page contains.
 *
 * ⚠ **No server-side search exists on this endpoint** (confirmed against
 * `index/controllers/broadcasts.md` — the query params are `status`, `page`,
 * `pageSize` only, unlike the FND-3 owner/worker tables' `?search=`). The
 * shell always renders the search box (row 3 is unconditional), so it is
 * present but inert here — typing narrows nothing, same honest-inert
 * precedent `owners/page.tsx` uses for a column with no `sortKey`. Worth a
 * backend ask if this becomes a real gap in practice.
 */
export default function BroadcastsPage() {
  const t = useTranslations("broadcasts");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const state = useTableUrlState({ defaultTab: DEFAULT_TAB });

  const query = useMemo(
    () => ({
      status: queryFor(state.tab),
      page: state.page,
      pageSize: state.pageSize,
    }),
    [state.tab, state.page, state.pageSize],
  );

  const { data, isLoading, isError, error } = useBroadcastList(query);

  const tabs = useMemo(
    () =>
      TABS.map((key) => ({
        value: key,
        label:
          key === "all"
            ? tCommon("all")
            : t(`statusLabels.${key}` as Parameters<typeof t>[0]),
      })),
    [t, tCommon],
  );

  const columns = useMemo<DataColumn<BroadcastRowDto>[]>(
    () => [
      {
        id: "title",
        label: t("columns.title"),
        locked: true,
        className: "min-w-[220px]",
        cell: (b) => (
          <span className="truncate text-sm font-medium">
            {b.titleDe || b.titleEn || "—"}
          </span>
        ),
      },
      {
        id: "audience",
        label: t("columns.audience"),
        cell: (b) => (
          <Badge variant="outline">{t(`audienceLabels.${b.audience}`)}</Badge>
        ),
      },
      {
        id: "status",
        label: t("columns.status"),
        cell: (b) => (
          <Badge tone={STATUS_TONE[b.status]}>{t(`statusLabels.${b.status}`)}</Badge>
        ),
      },
      {
        id: "scheduled",
        label: t("columns.scheduled"),
        cell: (b) => (
          <span className="font-mono text-sm text-muted-foreground">
            {b.scheduledAtUtc ? relativeTime(b.scheduledAtUtc, locale) : "—"}
          </span>
        ),
      },
      {
        id: "recipients",
        label: t("columns.recipients"),
        align: "right",
        cell: (b) => (
          <span className="font-mono text-sm text-muted-foreground">
            {b.recipientCount}
          </span>
        ),
      },
      {
        id: "created",
        label: t("columns.created"),
        cell: (b) => (
          <span className="font-mono text-sm text-muted-foreground">
            {relativeTime(b.createdAt, locale)}
          </span>
        ),
      },
    ],
    [t, locale],
  );

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
        scope="broadcasts"
        columns={columns}
        source={{
          mode: "server",
          rows: data?.items ?? [],
          total: data?.total ?? 0,
          isLoading,
          isError,
          isForbidden: isPermissionDenied(error),
        }}
        rowKey={(b) => b.id}
        rowHref={(b) => `/dashboard/notifications/broadcasts/${b.id}`}
        rowLabel={(b) => b.titleDe || b.titleEn || b.id}
        title={t("list")}
        actions={
          <Can permission="notification:broadcast">
            <Button
              size="sm"
              className="gap-2"
              nativeButton={false}
              render={<Link href="/dashboard/notifications/broadcasts/new" />}
            >
              <Plus className="size-4" />
              {t("createBroadcast")}
            </Button>
          </Can>
        }
        tabs={tabs}
        tabsLabel={tCommon("status")}
        searchPlaceholder={t("searchPlaceholder")}
        empty={{ title: t("emptyTitle"), body: t("emptyBody") }}
      />
    </div>
  );
}
