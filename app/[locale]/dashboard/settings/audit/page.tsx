"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Check, X, PenLine, History } from "lucide-react";
import { useAuditLog } from "@/hooks/use-audit";
import { cn } from "@/lib/utils";
import {
  auditDetails,
  normalizeAction as normalize,
  parseAuditMetadata,
  type AuditFact,
} from "@/lib/audit/metadata";
import { fromDayKey } from "@/lib/ui/week";

const AUDIT_ACTIONS = [
  "ADMIN_CREATED", "ADMIN_MODIFIED", "ADMIN_DEACTIVATED", "ADMIN_ROLE_CHANGED",
  "KYC_APPROVED", "KYC_REJECTED", "OWNER_KYC_RESET_TO_PENDING",
  "OWNER_DEACTIVATED",
  "WORKER_APPROVED", "WORKER_REJECTED", "WORKER_DEACTIVATED",
  "WORKER_DOC_APPROVED", "WORKER_DOC_REJECTED",
  "PROPERTY_DEACTIVATED_BY_ADMIN", "PROPERTY_RESTORED",
  "PROPERTY_CREATED_BY_ADMIN", "PROPERTY_DOCS_APPROVED", "PROPERTY_DOCS_REJECTED",
  "ROLE_PERMISSION_ADDED", "ROLE_PERMISSION_REMOVED",
  "WORKER_CONTRACT_FORCE_DEACTIVATED",
  "WORKER_LEAVE_REQUEST_APPROVED", "WORKER_LEAVE_REQUEST_REJECTED",
  "WORKER_TASK_RATED",
  // F-07 ·9a/·9b and ·10 — the rows whose metadata the list reads out.
  "WORKER_TASK_ASSIGNED", "TASK_GROUP_CREATED_BY_ADMIN",
] as const;

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
const ACTION_KEY_BY_NORM: Record<string, string> = Object.fromEntries(
  AUDIT_ACTIONS.map((a) => [normalize(a), a]),
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
  const locale = useLocale();
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Fetch everything and filter on the client: action strings come back in a
  // different casing than our keys, so client-side matching is more reliable
  // than passing the raw filter to the API.
  const { data: logs = [], isLoading } = useAuditLog();

  function actorLabel(actorType: string) {
    return t.has(`actorTypes.${actorType}`) ? t(`actorTypes.${actorType}`) : actorType;
  }

  function actionLabel(action: string) {
    const key = ACTION_KEY_BY_NORM[normalize(action)];
    return key && t.has(`actions.${key}`) ? t(`actions.${key}`) : humanizeAction(action);
  }

  const byAction =
    actionFilter === "all"
      ? logs
      : logs.filter((l) => normalize(l.action) === normalize(actionFilter));

  const filtered = search.trim()
    ? byAction.filter((l) => {
        const q = search.toLowerCase();
        return (
          actorLabel(l.actorType).toLowerCase().includes(q) ||
          actionLabel(l.action).toLowerCase().includes(q) ||
          l.targetEntity.toLowerCase().includes(q) ||
          l.targetId.toLowerCase().includes(q)
        );
      })
    : byAction;

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
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t("searchPlaceholder")}
                className="h-9 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => setActionFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-56">
                <SelectValue placeholder={t("allActions")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allActions")}</SelectItem>
                {AUDIT_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {actionLabel(a).replace(/^\w/, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <History className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t("noLogs")}</p>
            </div>
          ) : (
            <>
              <div className="border-b border-border px-5 py-2.5">
                <p className="text-xs text-muted-foreground">
                  {t("count", { count: filtered.length })}
                </p>
              </div>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
