"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table/data-table";
import { useComplaintColumns } from "@/components/complaints/complaint-columns";
import { useComplaintQueue, useComplaintQueueRows } from "@/hooks/use-complaints";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { sortQueue } from "@/lib/complaints/waiting";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { looseIncludes } from "@/lib/ui/table-rows";

/**
 * The complaint queue (F-07 ·5) — every day in `Rejected`. Client mode: the
 * endpoint returns one unpaged array.
 *
 * ⚠ No sidebar count. `navBadgeCounts` is deliberately empty until one aggregate
 * endpoint exists; the open count lives in this header instead.
 * ⚠ No history tab: a decided day is `Done`, and `ClosedForced` is also what
 * force-close writes, so decided complaints cannot be listed apart.
 */
export default function ComplaintsPage() {
  const t = useTranslations("complaints");
  const state = useTableUrlState();
  const [now] = useState(() => new Date());

  const { permissions } = useCurrentPermissions();
  const canRead = permissions === null ? null : permissions.has("task:list_any");

  const queue = useComplaintQueue(canRead === true);
  const tasks = useMemo(() => queue.data ?? [], [queue.data]);
  const rows = useComplaintQueueRows(tasks);
  const sorted = useMemo(() => sortQueue(rows), [rows]);
  const columns = useComplaintColumns(now);

  return (
    <div className="flex grow flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
          {/* Only once loaded — "No open complaints" must not flash while the list is in flight. */}
          {queue.data ? (
            <> · <span className="font-mono tabular-nums">{t("openCount", { count: tasks.length })}</span></>
          ) : null}
        </p>
      </div>

      <DataTable
        state={state}
        scope="complaints"
        title={t("title")}
        columns={columns}
        source={{
          mode: "client",
          rows: sorted,
          isLoading: queue.isLoading || canRead === null,
          isError: queue.isError,
          isForbidden: canRead === false || isPermissionDenied(queue.error),
          matches: (r, needle) => looseIncludes(r.task.propertyName ?? "", needle),
        }}
        rowKey={(r) => r.task.id}
        rowHref={(r) => `/dashboard/complaints/${r.task.id}`}
        rowLabel={(r) => r.task.propertyName ?? r.task.id}
        searchPlaceholder={t("searchPlaceholder")}
        empty={{ title: t("empty.title"), body: t("empty.body") }}
      />
    </div>
  );
}
