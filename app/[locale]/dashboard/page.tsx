"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  Users,
  Building2,
  Home,
  ClipboardList,
  Star,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminHome } from "@/hooks/use-analytics";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { TrendChart, StatusDonut } from "@/components/dashboard/dashboard-charts";
import type { AdminHomeTotals } from "@/lib/types/analytics.types";

const KPI_META: {
  key: keyof AdminHomeTotals;
  icon: typeof Users;
  color: string;
}[] = [
  { key: "workers", icon: Users, color: "text-blue-500" },
  { key: "owners", icon: Building2, color: "text-emerald-500" },
  { key: "properties", icon: Home, color: "text-purple-500" },
  { key: "activeTasks", icon: ClipboardList, color: "text-orange-500" },
];

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const canRead = useHasPermission("system:analytics:read");
  const { data, isLoading, isError } = useAdminHome(canRead);

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

  const statusTotal =
    data?.statusBreakdown.reduce((sum, s) => sum + s.count, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Header t={t} />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_META.map(({ key, icon: Icon, color }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(`kpi.${key}`)}
              </CardTitle>
              <Icon className={`size-4 ${color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16 rounded-md" />
              ) : (
                <div className="text-3xl font-bold tracking-tight">
                  {(data?.totals[key] ?? 0).toLocaleString(locale)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend + status */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>{t("trend.title")}</CardTitle>
            <CardDescription>{t("trend.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full rounded-md" />
            ) : isError ? (
              <ChartError text={tCommon("error")} />
            ) : (
              <TrendChart
                data={data?.trend ?? []}
                locale={locale}
                labels={{
                  created: t("trend.created"),
                  completed: t("trend.completed"),
                }}
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("statusBreakdown.title")}</CardTitle>
            <CardDescription>{t("statusBreakdown.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full rounded-md" />
            ) : isError ? (
              <ChartError text={tCommon("error")} />
            ) : statusTotal === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                {t("statusBreakdown.empty")}
              </div>
            ) : (
              <StatusDonut data={data?.statusBreakdown ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top workers + revenue */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("topWorkers.title")}</CardTitle>
            <CardDescription>{t("topWorkers.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : isError ? (
              <ChartError text={tCommon("error")} />
            ) : (data?.topWorkers.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("topWorkers.empty")}
              </div>
            ) : (
              <ol className="flex flex-col gap-1">
                {data?.topWorkers.map((w, i) => (
                  <li
                    key={w.id}
                    className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/40"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">
                      {w.fullName}
                    </span>
                    {w.rating > 0 ? (
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        {w.rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t("topWorkers.new")}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("revenue.title")}</CardTitle>
            <CardDescription>{t("revenue.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-md border border-dashed text-muted-foreground">
              <Wallet className="size-6" />
              <span className="text-sm">{t("revenue.comingSoon")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Header({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
        {t("title")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
    </div>
  );
}

function ChartError({ text }: { text: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-destructive">
      {text}
    </div>
  );
}
