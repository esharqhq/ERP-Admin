"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Clock, CalendarClock, Users, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HoursPeriodChart } from "@/components/analytics/hours-period-chart";
import { useAdminWorkerHours } from "@/hooks/use-analytics";
import { useWorkers } from "@/hooks/use-workers";
import { useProperties } from "@/hooks/use-properties";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { getApiErrorCode } from "@/lib/http/api-error";
import { formatMinutes } from "@/lib/format-hours";
import type {
  HoursGranularity,
  WorkerHoursQuery,
} from "@/lib/types/analytics.types";

const ALL = "all";

export default function WorkerHoursPage() {
  const t = useTranslations("workerHours");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const canRead = useHasPermission("system:analytics:read");

  const [granularity, setGranularity] = useState<HoursGranularity>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [workerId, setWorkerId] = useState(ALL);
  const [propertyId, setPropertyId] = useState(ALL);

  // Client guard for the one query the backend 400s on (from > to) — keeps us
  // off `invalid_query` entirely; `getApiErrorCode` stays as the fallback.
  const invalidRange = from !== "" && to !== "" && from > to;

  const query: WorkerHoursQuery = useMemo(
    () => ({
      granularity,
      from: from || undefined,
      to: to || undefined,
      workerId: workerId === ALL ? undefined : workerId,
      propertyId: propertyId === ALL ? undefined : propertyId,
    }),
    [granularity, from, to, workerId, propertyId],
  );

  const {
    data,
    isLoading,
    isError,
    error,
  } = useAdminWorkerHours(query, canRead && !invalidRange);

  // Filter pickers: gate each fetch on its OWN list permission (the page gate is
  // `system:analytics:read` — a different perm), so a custom-override admin
  // without `worker:list`/`property:list` doesn't 403 on the pickers.
  const canListWorkers = useHasPermission("worker:list");
  const canListProperties = useHasPermission("property:list");
  const { data: workers = [] } = useWorkers(undefined, canRead && canListWorkers);
  const { data: properties = [] } = useProperties(canRead && canListProperties);

  const propertyNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of properties) m.set(p.id, p.name ?? p.id.slice(0, 8));
    return m;
  }, [properties]);

  // Base-UI <SelectValue> renders the selected item's LABEL only when the
  // matching `items` ({label,value}[]) is passed to <Select>; without it the
  // collapsed trigger shows the raw value (untranslated granularity / raw UUIDs).
  // Same fix as the create-property picker (commit 8c5b38d).
  const granularityItems = useMemo(
    () => [
      { value: "month", label: t("granularity.month") },
      { value: "week", label: t("granularity.week") },
    ],
    [t],
  );
  const workerItems = useMemo(
    () => [
      { value: ALL, label: t("filters.allWorkers") },
      ...workers.map((w) => ({ value: w.id, label: w.fullName ?? w.id.slice(0, 8) })),
    ],
    [workers, t],
  );
  const propertyItems = useMemo(
    () => [
      { value: ALL, label: t("filters.allProperties") },
      ...properties.map((p) => ({ value: p.id, label: p.name ?? p.id.slice(0, 8) })),
    ],
    [properties, t],
  );

  if (!canRead) {
    return (
      <div className="flex flex-col gap-6">
        <Header t={t} />
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t("noAccess")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const errCode = getApiErrorCode(error);

  const statCards = [
    {
      key: "total",
      value: data ? formatMinutes(data.totalMinutes) : "—",
      icon: Clock,
      color: "text-indigo-500",
    },
    {
      key: "shifts",
      value: data ? String(data.shiftsCounted) : "—",
      icon: CalendarClock,
      color: "text-emerald-500",
    },
    {
      key: "workers",
      value: data ? String(data.workerCount) : "—",
      icon: Users,
      color: "text-blue-500",
    },
  ] as const;

  const hasPeriodData = (data?.byPeriod.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <Header t={t} />

      {/* "Time on site, not billable" caveat — see handoff (shared checkout). */}
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>{t("timeOnSiteNote")}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">
            {t("filters.granularity")}
          </span>
          <Select
            value={granularity}
            onValueChange={(v) => setGranularity((v as HoursGranularity) ?? "month")}
            items={granularityItems}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {granularityItems.map((it) => (
                <SelectItem key={it.value} value={it.value}>
                  {it.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">
            {t("filters.from")}
          </span>
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="w-44"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">
            {t("filters.to")}
          </span>
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="w-44"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">
            {t("filters.worker")}
          </span>
          <Select
            value={workerId}
            onValueChange={(v) => setWorkerId(v ?? ALL)}
            items={workerItems}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {workerItems.map((it) => (
                <SelectItem key={it.value} value={it.value}>
                  {it.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">
            {t("filters.property")}
          </span>
          <Select
            value={propertyId}
            onValueChange={(v) => setPropertyId(v ?? ALL)}
            items={propertyItems}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {propertyItems.map((it) => (
                <SelectItem key={it.value} value={it.value}>
                  {it.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      {invalidRange && (
        <p className="text-sm text-destructive">{t("errors.invalidRange")}</p>
      )}

      {/* Headline stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map(({ key, value, icon: Icon, color }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(`stats.${key}`)}
              </CardTitle>
              <Icon className={`size-4 ${color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20 rounded-md" />
              ) : (
                <div className="text-3xl font-bold tracking-tight">{value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-period chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("byPeriod.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[260px] w-full rounded-md" />
          ) : isError ? (
            <p className="py-16 text-center text-sm text-destructive">
              {errCode === "invalid_query"
                ? t("errors.invalidRange")
                : tCommon("error")}
            </p>
          ) : hasPeriodData ? (
            <HoursPeriodChart
              data={data!.byPeriod}
              locale={locale}
              seriesLabel={t("byPeriod.seriesLabel")}
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* By worker + by property */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("byWorker.title")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("byWorker.worker")}</TableHead>
                  <TableHead className="text-right">{t("byWorker.shifts")}</TableHead>
                  <TableHead className="text-right">{t("byWorker.hours")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonRows cols={3} />
                ) : data && data.byWorker.length > 0 ? (
                  data.byWorker.map((w) => (
                    <TableRow key={w.workerId} className="hover:bg-accent/40">
                      <TableCell className="py-3 font-medium">
                        <Link
                          href={`/dashboard/workers/${w.workerId}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {w.workerName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {w.shiftsCounted}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMinutes(w.totalMinutes)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <EmptyRow cols={3} label={t("empty")} />
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("byProperty.title")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("byProperty.property")}</TableHead>
                  <TableHead className="text-right">{t("byProperty.hours")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonRows cols={2} />
                ) : data && data.byProperty.length > 0 ? (
                  data.byProperty.map((p) => (
                    <TableRow key={p.propertyId} className="hover:bg-accent/40">
                      <TableCell className="py-3 font-medium">
                        <Link
                          href={`/dashboard/properties/${p.propertyId}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {p.propertyName || propertyNames.get(p.propertyId) || p.propertyId.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMinutes(p.totalMinutes)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <EmptyRow cols={2} label={t("empty")} />
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={cols}>
            <Skeleton className="h-7 w-full rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={cols}
        className="py-10 text-center text-sm text-muted-foreground"
      >
        {label}
      </TableCell>
    </TableRow>
  );
}

function Header({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {t("title")}
        </h1>
        <Badge variant="outline" className="font-normal">
          {t("timeOnSiteBadge")}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
    </div>
  );
}
