"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DateRangeControl } from "@/components/ui/date-range-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TableError, TableForbidden, TableState } from "@/components/ui/data-table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Check, X, PenLine, History, Info, AlertTriangle } from "lucide-react";
import { useAuditLog } from "@/hooks/use-audit";
import { cn } from "@/lib/utils";
import { getValidationMessage } from "@/lib/http/api-error";
import {
  auditDetails,
  normalizeAction as normalize,
  parseAuditMetadata,
  type AuditFact,
} from "@/lib/audit/metadata";
import {
  AUDIT_FILTER_ACTIONS,
  AUDIT_LABELLED_ACTIONS,
  AUDIT_ROW_CAP,
  buildAuditQuery,
  hasAuditFilter,
  isCapped,
} from "@/lib/audit/filters";
import { auditErrorKey } from "@/lib/audit/errors";
import type { DateRange } from "@/lib/ui/date-range";
import { fromDayKey } from "@/lib/ui/week";

type Tone = "positive" | "negative" | "neutral";

// Group each action into a tone that drives the row's icon + accent color, so
// the log reads at a glance: green = something granted/approved, red = something
// removed/rejected, amber (the pending tokens) = something edited. The backend sends PascalCase
// (e.g. "RolePermissionRemoved"), so match case-insensitively.
function toneOf(action: string): Tone {
  if (/approved|restored|created|added/i.test(action)) return "positive";
  if (/rejected|deactivated|removed|reset|force/i.test(action)) return "negative";
  return "neutral";
}

// The message keys are UPPER_SNAKE but the backend action strings are PascalCase.
// `normalize` (shared with `lib/audit/metadata`, so the two cannot drift) folds
// both to a letters-only lowercase form so lookups match regardless of casing.
// Built from the *labelled* list, not the offered one: the property-docs verdicts
// are no longer offered as filters, but their old rows still need a label.
const ACTION_KEY_BY_NORM: Record<string, string> = Object.fromEntries(
  AUDIT_LABELLED_ACTIONS.map((a) => [normalize(a), a]),
);

const TONE_STYLES: Record<Tone, { icon: React.ElementType; wrap: string }> = {
  positive: { icon: Check, wrap: "bg-status-active-tint text-status-active" },
  negative: { icon: X, wrap: "bg-status-cancelled-tint text-status-cancelled-deep" },
  neutral: { icon: PenLine, wrap: "bg-status-pending-tint text-status-pending-deep" },
};

// Fallback for an action the message file doesn't know yet. Handles both
// "ROLE_FOO" and PascalCase "RoleFoo" -> "role foo".
function humanizeAction(action: string) {
  return action
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();
}

export default function AuditPage() {
  const t = useTranslations("audit");
  const tCommon = useTranslations("common");
  const tTable = useTranslations("common.table");
  const locale = useLocale();
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [range, setRange] = useState<DateRange>({ from: "", to: "" });
  const [search, setSearch] = useState("");

  // The action and the date range go to the server, one query per selection:
  // it returns only the newest 200 rows, so filtering those on the client made
  // any action older than them look like it never happened. `buildAuditQuery`
  // sends the action as its C# member name (`KycApproved`) — the UPPER_SNAKE key
  // is a problem-details 400. The text search below stays client-side and only
  // searches the rows this query returned.
  const filterInput = { action: actionFilter, from: range.from, to: range.to };
  const { data: logs = [], isLoading, isError, error } = useAuditLog(
    buildAuditQuery(filterInput),
  );

  function actorLabel(actorType: string) {
    return t.has(`actorTypes.${actorType}`) ? t(`actorTypes.${actorType}`) : actorType;
  }

  function actionLabel(action: string) {
    const key = ACTION_KEY_BY_NORM[normalize(action)];
    return key && t.has(`actions.${key}`) ? t(`actions.${key}`) : humanizeAction(action);
  }

  const actionItems = [
    { value: "all", label: t("allActions") },
    ...AUDIT_FILTER_ACTIONS.map((a) => ({
      value: a,
      label: actionLabel(a).replace(/^\w/, (c) => c.toUpperCase()),
    })),
  ];

  const filterOn = hasAuditFilter(filterInput) || search.trim() !== "";

  function clearFilters() {
    setActionFilter("all");
    setRange({ from: "", to: "" });
    setSearch("");
  }

  const filtered = search.trim()
    ? logs.filter((l) => {
        const q = search.toLowerCase();
        return (
          actorLabel(l.actorType).toLowerCase().includes(q) ||
          actionLabel(l.action).toLowerCase().includes(q) ||
          l.targetEntity.toLowerCase().includes(q) ||
          l.targetId.toLowerCase().includes(q)
        );
      })
    : logs;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(locale, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function formatDayKey(key: string) {
    return fromDayKey(key).toLocaleDateString(locale, {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  // One fact under the action label. The overrides arrive as a single fact, so
  // the row never carries more than the one badge the DS allows.
  function renderFact(f: AuditFact) {
    switch (f.kind) {
      case "overrides":
        return (
          <Badge key="overrides" tone="warning">
            {t("details.overrode", {
              list: f.keys.map((k) => t(`details.override.${k}`)).join(" · "),
            })}
          </Badge>
        );
      case "date":
        return (
          <span key={f.key}>
            {t(`details.${f.key}`)}{" "}
            <span className="font-mono tabular-nums text-foreground">{formatDayKey(f.value)}</span>
          </span>
        );
      case "link":
        return (
          <Link key={f.key} href={f.href} className="text-primary hover:underline">
            {t(`details.${f.key}`)}
          </Link>
        );
    }
  }

  // A failed load is never drawn as "no activity": that is the same
  // indistinguishable-empty bug the server filters fix, one rung down.
  function renderError() {
    switch (auditErrorKey(error)) {
      case "validation":
        return (
          <TableState
            icon={<AlertTriangle className="size-4" />}
            title={tTable("errorTitle")}
            body={getValidationMessage(error) ?? tTable("errorBody")}
          />
        );
      case "forbidden":
        return <TableForbidden />;
      default:
        return <TableError />;
    }
  }

  const empty = (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <History className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        {filterOn ? t("noMatch") : t("noLogs")}
      </p>
      {filterOn && (
        <Button variant="outline" size="sm" onClick={clearFilters}>
          {tCommon("clearFilters")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchPlaceholder")}
                className="h-9 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* `items` lets the trigger print the chosen option's label rather
                than its raw UPPER_SNAKE value. */}
            <Select
              value={actionFilter}
              onValueChange={(v) => setActionFilter((v as string | null) ?? "all")}
              items={actionItems}
            >
              <SelectTrigger className="h-9 w-56">
                <SelectValue placeholder={t("allActions")} />
              </SelectTrigger>
              <SelectContent>
                {actionItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* The control paints no label of its own (its `label` only names the
                popovers), so the overline says what the pills are a range of. */}
            <div className="flex flex-col gap-1.5">
              <span className="overline-label text-muted-foreground">{t("dateRange")}</span>
              <DateRangeControl label={t("dateRange")} value={range} onChange={setRange} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col gap-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <Skeleton className="h-5 flex-1 rounded-md" />
                </div>
              ))}
            </div>
          ) : isError ? (
            renderError()
          ) : logs.length === 0 ? (
            empty
          ) : (
            <>
              {/* Drawn whenever the server sent rows, even if the search then
                  matches none of them: the cap notice is about the response, and
                  it is exactly what explains an empty search over a full page. */}
              <div className="flex flex-col gap-1 border-b border-border px-5 py-2.5">
                <p className="text-xs text-muted-foreground">
                  {t("count", { count: filtered.length })}
                </p>
                {isCapped(logs) && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Info className="size-3.5 shrink-0" />
                    {t("capped", { cap: AUDIT_ROW_CAP })}
                  </p>
                )}
              </div>
              {filtered.length === 0 ? empty : (
                <ul className="divide-y divide-border">
                  {filtered.map((log) => {
                    const tone = toneOf(log.action);
                    const { icon: Icon, wrap } = TONE_STYLES[tone];
                    const details = auditDetails(log.action, parseAuditMetadata(log.metadata));
                    return (
                      <li
                        key={log.id}
                        className="flex items-start gap-3.5 px-5 py-3.5 transition-colors hover:bg-accent/20"
                      >
                        <div className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full", wrap)}>
                          <Icon className="size-[18px]" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                            <p className="text-sm leading-snug text-foreground">
                              <span className="font-semibold">{actorLabel(log.actorType)}</span>{" "}
                              <span className="text-muted-foreground">{actionLabel(log.action)}</span>
                            </p>
                            <time className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {formatDate(log.createdAt)}
                            </time>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              {log.targetEntity}
                              {log.targetId && (
                                <>
                                  {" "}
                                  <span className="font-mono tabular-nums" title={log.targetId}>
                                    {log.targetId.slice(0, 8)}
                                  </span>
                                </>
                              )}
                            </span>
                            {details.map(renderFact)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
