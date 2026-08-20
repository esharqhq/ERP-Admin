// components/walk-in/walk-in-orders-list.tsx
"use client";

import { useMemo, useState } from "react";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { groupStaffing, isGroupActive } from "@/lib/tasks/staffing";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";
import type { TaskGroupDto } from "@/lib/types/task.types";

/** `"20–21 Aug"`, or a single date when the order covers one day. */
function dateRange(group: TaskGroupDto, locale: string): string {
  const days = group.tasks
    .map((t) => t.scheduledDate)
    .filter(Boolean)
    .sort();
  if (days.length === 0) return "—";
  const fmt = (key: string) => {
    const d = new Date(`${key}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? key
      : d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  };
  const first = fmt(days[0]);
  const last = fmt(days[days.length - 1]);
  return first === last ? first : `${first} – ${last}`;
}

export function WalkInOrdersList({
  groups,
  isPending,
  error,
  showPropertyName,
  onSelect,
}: {
  groups: TaskGroupDto[];
  isPending: boolean;
  error: unknown;
  /** Only true when the walk-in account has more than one property. */
  showPropertyName: boolean;
  onSelect: (groupId: string) => void;
}) {
  const t = useTranslations("walkIn.orders");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();
  const [tab, setTab] = useState("active");

  // Newest first. `createdAt` rather than a scheduled date: an order filed today
  // for next month is the one the admin just typed and expects at the top.
  const { active, history } = useMemo(() => {
    const sorted = [...groups].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    return {
      active: sorted.filter(isGroupActive),
      history: sorted.filter((g) => !isGroupActive(g)),
    };
  }, [groups]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
        <p className="text-sm text-destructive">
          {isPermissionDenied(error)
            ? tOnboarding("permissionDenied")
            : tOnboarding(
                `apiErrors.${describeApiError(error)?.labelKey ?? "unknown"}`,
              )}
        </p>
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
      <TabsList>
        <TabsTrigger value="active">{t("active")}</TabsTrigger>
        <TabsTrigger value="history">{t("history")}</TabsTrigger>
      </TabsList>

      <TabsContent value="active">
        <Rows
          groups={active}
          empty={t("emptyActive")}
          locale={locale}
          showPropertyName={showPropertyName}
          onSelect={onSelect}
        />
      </TabsContent>
      <TabsContent value="history">
        <Rows
          groups={history}
          empty={t("emptyHistory")}
          locale={locale}
          showPropertyName={showPropertyName}
          onSelect={onSelect}
        />
      </TabsContent>
    </Tabs>
  );
}

function Rows({
  groups,
  empty,
  locale,
  showPropertyName,
  onSelect,
}: {
  groups: TaskGroupDto[];
  empty: string;
  locale: string;
  showPropertyName: boolean;
  onSelect: (groupId: string) => void;
}) {
  const t = useTranslations("walkIn.orders");

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-sm text-muted-foreground">{empty}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => {
        const { filled, required } = groupStaffing(group.tasks);
        return (
          <button
            key={group.id}
            type="button"
            onClick={() => onSelect(group.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {group.title || t("untitled")}
                </span>
                <TaskStatusBadge status={group.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                <span>{t("days", { count: group.tasks.length })}</span>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{dateRange(group, locale)}</span>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{t("staffing", { filled, required })}</span>
                {showPropertyName && group.tasks[0]?.propertyName ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate">{group.tasks[0].propertyName}</span>
                  </>
                ) : null}
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );
}
