"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import {
  BroadcastAudienceBadge,
  BroadcastStatusDropdown,
  BroadcastStatusPill,
  BroadcastTitleCell,
  recipientsSubline,
  statusSubline,
} from "@/components/broadcasts/broadcast-row";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useBroadcastList } from "@/hooks/use-broadcasts";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { cn } from "@/lib/utils";
import type { BroadcastRowDto, BroadcastStatus } from "@/lib/types/broadcast.types";

/** Where "Recreate" jumps. Not wired this phase — see the compose form (Phase 3b). */
function recreateHref(id: string): string {
  return `/dashboard/notifications/broadcasts/new?recreateFrom=${id}`;
}

function formatAbs(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The three the design's quick-count chips name — Scheduled/Sending/Missed. */
const QUICK_CHIPS: { status: BroadcastStatus; className: string; dot: string }[] = [
  { status: "Scheduled", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" },
  { status: "Sending", className: "bg-accent text-primary ring-1 ring-inset ring-primary/20", dot: "bg-primary" },
  { status: "Missed", className: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20", dot: "bg-destructive" },
];

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
  const router = useRouter();

  const state = useTableUrlState({ filterKeys: ["status"] });
  const selectedStatus = (state.filters.status || undefined) as
    | BroadcastStatus
    | undefined;

  const query = useMemo(
    () => ({
      status: selectedStatus,
      page: state.page,
      pageSize: state.pageSize,
    }),
    [selectedStatus, state.page, state.pageSize],
  );

  const { data, isLoading, isError, error } = useBroadcastList(query);

  /**
   * Per-status counts for the dropdown and the quick-count chips — five
   * `pageSize: 1` probes, one per status, reading `.total` off the envelope.
   * NOT a client-side filter of the current page: that's the "filter that
   * quietly lies" the shell's own docs warn against, since the current page
   * is at most 20 rows of whatever the active filter already narrowed to.
   * "All statuses" is the sum of the five, not a 6th probe — the enum is
   * closed and every row has exactly one status, so the sum is exact.
   * Filed as B18 upstream: a cheap aggregate would replace this.
   */
  const scheduledCount = useBroadcastList({ status: "Scheduled", page: 1, pageSize: 1 });
  const sendingCount = useBroadcastList({ status: "Sending", page: 1, pageSize: 1 });
  const sentCount = useBroadcastList({ status: "Sent", page: 1, pageSize: 1 });
  const cancelledCount = useBroadcastList({ status: "Cancelled", page: 1, pageSize: 1 });
  const missedCount = useBroadcastList({ status: "Missed", page: 1, pageSize: 1 });

  const statusCounts: Record<BroadcastStatus, number> = {
    Scheduled: scheduledCount.data?.total ?? 0,
    Sending: sendingCount.data?.total ?? 0,
    Sent: sentCount.data?.total ?? 0,
    Cancelled: cancelledCount.data?.total ?? 0,
    Missed: missedCount.data?.total ?? 0,
  };
  const statusTotal = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);

  const columns = useMemo<DataColumn<BroadcastRowDto>[]>(
    () => [
      {
        id: "title",
        label: t("columns.title"),
        locked: true,
        className: "min-w-[240px]",
        cell: (b) => (
          <BroadcastTitleCell
            row={b}
            onRecreate={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(recreateHref(b.id));
            }}
          />
        ),
      },
      {
        id: "audience",
        label: t("columns.audience"),
        className: "w-[140px]",
        cell: (b) => <BroadcastAudienceBadge row={b} />,
      },
      {
        id: "status",
        label: t("columns.status"),
        className: "w-[172px]",
        cell: (b) => (
          <div className="flex flex-col items-start gap-0.5">
            <BroadcastStatusPill status={b.status} />
            <span className="text-[10px] text-muted-foreground">
              {statusSubline(b, t, (iso) => formatAbs(iso, locale))}
            </span>
          </div>
        ),
      },
      {
        id: "scheduled",
        label: t("columns.scheduled"),
        className: "w-[130px]",
        cell: (b) => (
          <div className="flex flex-col gap-0.5">
            <span
              className={cn(
                "text-[12.5px]",
                b.status === "Scheduled" ? "font-semibold" : "text-muted-foreground",
              )}
            >
              {b.scheduledAtUtc ? relativeTime(b.scheduledAtUtc, locale) : t("row.sendNow")}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {b.scheduledAtUtc ? formatAbs(b.scheduledAtUtc, locale) : ""}
            </span>
          </div>
        ),
      },
      {
        id: "recipients",
        label: t("columns.recipients"),
        align: "right",
        className: "w-[104px]",
        cell: (b) => {
          // Decision #01: Scheduled draws "—", never the DTO's real `0` —
          // recipientCount is only meaningful once fan-out has started.
          const scheduled = b.status === "Scheduled";
          return (
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-mono text-[13px] font-semibold">
                {scheduled ? "—" : b.recipientCount.toLocaleString(locale)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {recipientsSubline(b.status, t)}
              </span>
            </div>
          );
        },
      },
      {
        id: "created",
        label: t("columns.created"),
        className: "w-[104px]",
        cell: (b) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-foreground/80">
              {relativeTime(b.createdAt, locale)}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {formatAbs(b.createdAt, locale)}
            </span>
          </div>
        ),
      },
    ],
    [t, locale, router],
  );

  return (
    <div className="flex grow flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {/* Moved here from the shell's own row 1 — the design puts "Create
            broadcast" in the page header, not inside the card, and the custom
            `toolbar` below replaces the card's row 1 entirely anyway. */}
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
        // ⚠ Left border, not an absolutely-positioned rail span — `DataTable`
        // hands the row only a className, and a border reproduces the design's
        // 3px rail without fighting the row's own RowLink overlay for z-index.
        // `status-cancelled-tint` is the closest token to the design's
        // near-white #FFFCFC ground; it reads visibly stronger, flagged.
        rowClassName={(b) =>
          b.status === "Missed"
            ? "border-l-[3px] border-l-status-cancelled-deep bg-status-cancelled-tint"
            : b.status === "Sending"
              ? "border-l-[3px] border-l-primary"
              : undefined
        }
        title={t("list")}
        // The design's own toolbar (§02) in place of the shell's three rows —
        // a status dropdown with per-option counts and dots, three quick-count
        // chips, and a static "Sorted by" label. No `fields`/`Filters` band,
        // no column picker, no density toggle: the design's toolbar shows
        // none of them, so none are drawn. `searchPlaceholder` below is still
        // required by DataTableProps but nothing renders it once `toolbar` is
        // supplied — the design's toolbar has no search box either, matching
        // the "no server-side search on this endpoint" note from Phase 2.
        toolbar={() => (
          <div className="flex flex-none flex-wrap items-center gap-2.5 border-b border-border px-4 py-3 sm:px-5">
            <span className="flex-none text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {tCommon("status")}
            </span>
            <BroadcastStatusDropdown
              value={selectedStatus}
              onChange={(v) => state.setFilter("status", v ?? "")}
              counts={statusCounts}
              total={statusTotal}
            />
            <span className="h-5 w-px flex-none bg-border" />
            {QUICK_CHIPS.map((c) => (
              <span
                key={c.status}
                className={cn(
                  "flex h-7 flex-none items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
                  c.className,
                )}
              >
                <span className={cn("size-[6px] shrink-0 rounded-full", c.dot)} />
                {t(`statusLabels.${c.status}` as Parameters<typeof t>[0])}
                <span className="font-mono font-semibold">{statusCounts[c.status]}</span>
              </span>
            ))}
            <div className="flex-1" />
            {/* Static — no column on this table has a sortKey, matching the
                same honest-inert-control choice owners/page.tsx makes for an
                unsortable column, rather than wiring a control that orders
                nothing. */}
            <span className="flex-none text-[11px] text-muted-foreground">
              {t("filters.sortedBy")}
            </span>
            <span className="flex h-8 flex-none items-center gap-1.5 rounded-md bg-muted px-2.5 text-xs text-muted-foreground">
              {t("filters.sortedByCreated")}
            </span>
          </div>
        )}
        searchPlaceholder={t("searchPlaceholder")}
        // ⚠ TableEmpty's glyph is hardcoded to Inbox (table-states.tsx, out of
        // this phase's file scope) — the design's megaphone icon is not drawn.
        empty={{
          title: t("emptyTitle"),
          body: t("emptyBody"),
          action: (
            <Can permission="notification:broadcast">
              <Button
                size="sm"
                className="mt-1 gap-2"
                nativeButton={false}
                render={<Link href="/dashboard/notifications/broadcasts/new" />}
              >
                <Plus className="size-4" />
                {t("emptyAction")}
              </Button>
            </Can>
          ),
        }}
      />
    </div>
  );
}
