"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Clock,
  UserPlus,
  UserMinus,
  Eye,
  AlertTriangle,
  Search,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Can } from "@/components/auth/can";
import { AssignWorkerDialog } from "@/components/tasks/assign-worker-dialog";
import { ConfirmDialog } from "@/components/tasks/confirm-dialog";
import { useAdminTasks, useAssignWorker, useUnassignWorker } from "@/hooks/use-tasks";
import { useProperties } from "@/hooks/use-properties";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";
import {
  normalizeStatus,
  type TaskItemDto,
  type TaskWorkerDto,
} from "@/lib/types/task.types";

/**
 * The cap on `/api/tasks/admin` is **conditional** since F-02a·1 (2026-08-10):
 * 500 with no date window, 500 with `scheduledFrom` alone, 500 with
 * `scheduledTo` alone — and 5,000 only on a **fully-closed** window. This page
 * calls `useAdminTasks()`, which sends no window at all, so 500 is the live
 * bound. Do not raise this constant without also sending both bounds; a
 * half-open range still filters correctly but stays capped at 500.
 *
 * ⚠ Truncation is silent — no `total`, no `hasMore`, no header. Receiving
 * exactly this many rows means "at least this many", never "this many", which is
 * what the notice below exists to say.
 */
const ADMIN_TASKS_CAP = 500;

// A worker whose outcome is one of these no longer occupies a slot — the task is
// effectively short that body even though the row still exists.
const VACATED_OUTCOMES = new Set(["removed", "cancelled", "noshow"]);

// Only PENDING / ACTIVE tasks can still take a worker. REVIEW (work submitted) and the
// terminal DONE / CANCELLED states are not dispatch targets.
const OPEN_STATUSES = new Set(["pending", "active"]);

// v2 admin-assign refusals. The gate codes (403 WITH a body, about the WORKER's
// contract cover — an empty 403 body is a permission problem instead) and
// `worker_contract_ends_before_task` are covered by the shared onboarding
// catalog (see `assignError` below); `worker_not_approved` no longer exists.
// These four are the only codes THIS PAGE still owns copy for — checked by
// membership, never by interpolating an arbitrary code into `errors.*`.
const LEGACY_ASSIGN_ERRORS = new Set([
  "worker_below_rating_floor",
  "worker_profession_not_eligible",
  "worker_limit_reached",
  "worker_has_overlapping_assignment",
]);

type DispatchFilter = "needsWorkers" | "open" | "all";
const DISPATCH_FILTERS: DispatchFilter[] = ["needsWorkers", "open", "all"];

type ModalState =
  | { type: "assign"; taskId: string }
  | { type: "unassign"; taskId: string; tw: TaskWorkerDto }
  | null;

function activeWorkers(task: TaskItemDto): TaskWorkerDto[] {
  return (task.workers ?? []).filter(
    (w) => !VACATED_OUTCOMES.has(normalizeStatus(w.outcome)),
  );
}

function isOpen(task: TaskItemDto): boolean {
  return OPEN_STATUSES.has(normalizeStatus(task.status));
}

function needsWorkers(task: TaskItemDto): boolean {
  return isOpen(task) && activeWorkers(task).length === 0;
}

function fmtDate(dateStr: string, locale: string): string {
  // scheduledDate is "yyyy-MM-dd"; render in the active locale.
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(locale, { dateStyle: "medium" });
}

function StatusBadge({ status }: { status: string }) {
  const s = normalizeStatus(status);
  const variant =
    s === "active"
      ? "default"
      : s === "done"
        ? "secondary"
        : s === "cancelled"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{status || "—"}</Badge>;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

interface TaskRowProps {
  task: TaskItemDto;
  propertyName: string;
  locale: string;
  onAssign: (taskId: string) => void;
  onUnassign: (taskId: string, tw: TaskWorkerDto) => void;
}

function DispatchTaskCard({
  task,
  propertyName,
  locale,
  onAssign,
  onUnassign,
}: TaskRowProps) {
  const t = useTranslations("dispatch");
  const active = activeWorkers(task);
  const understaffed = needsWorkers(task);
  const time = (task.scheduledAt ?? "").slice(11, 16);

  return (
    <Card className={understaffed ? "border-amber-500/50" : undefined}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{propertyName}</span>
            <StatusBadge status={task.status} />
            {understaffed ? (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/50 text-amber-600 dark:text-amber-400"
              >
                <AlertTriangle className="size-3" />
                {t("needsWorker")}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {fmtDate(task.scheduledDate, locale)}
              {time ? ` · ${time}` : ""}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {t("assignedCount", { count: active.length })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Can permission="task:assign_worker_any">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onAssign(task.id)}
            >
              <UserPlus className="size-3.5" />
              {t("assign")}
            </Button>
          </Can>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            className="gap-1.5 text-muted-foreground"
            render={<Link href={`/dashboard/tasks/${task.groupId}`} />}
          >
            <Eye className="size-3.5" />
            {t("viewGroup")}
          </Button>
        </div>
      </CardHeader>
      {active.length > 0 ? (
        <CardContent className="flex flex-wrap gap-2 pt-0">
          {active.map((tw) => (
            <div
              key={tw.id}
              className="flex items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pl-3 pr-1 text-sm"
            >
              <span className="font-medium">
                {tw.workerName ?? tw.workerId.slice(0, 8)}
              </span>
              <Can permission="task:unassign_worker_any">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6 text-destructive"
                  title={t("unassign")}
                  onClick={() => onUnassign(task.id, tw)}
                >
                  <UserMinus className="size-3.5" />
                </Button>
              </Can>
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}

export default function DispatchPage() {
  const t = useTranslations("dispatch");
  const tCommon = useTranslations("common");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();
  const [filter, setFilter] = useState<DispatchFilter>("needsWorkers");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);

  const { data: tasks = [], isLoading, isError } = useAdminTasks();
  const { data: properties = [] } = useProperties();

  const propertyName = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of properties) {
      if (p.name) map.set(p.id, p.name);
    }
    return (id: string) => map.get(id) ?? id.slice(0, 8);
  }, [properties]);

  const assignWorker = useAssignWorker();
  const unassignWorker = useUnassignWorker();

  const counts = useMemo(
    () => ({
      needsWorkers: tasks.filter(needsWorkers).length,
      open: tasks.filter(isOpen).length,
      total: tasks.length,
    }),
    [tasks],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks
      .filter((task) => {
        if (filter === "needsWorkers" && !needsWorkers(task)) return false;
        if (filter === "open" && !isOpen(task)) return false;
        if (!q) return true;
        return (
          propertyName(task.propertyId).toLowerCase().includes(q) ||
          task.scheduledDate.includes(q) ||
          task.id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [tasks, filter, search, propertyName]);

  const close = () => {
    setModal(null);
    assignWorker.reset();
  };

  const assignError =
    modal?.type === "assign" && assignWorker.isError
      ? (() => {
          if (isPermissionDenied(assignWorker.error)) {
            return tOnboarding("permissionDenied");
          }
          const info = describeApiError(assignWorker.error);
          if (info && info.labelKey !== "unknown") {
            // A code the shared onboarding catalog covers (the gate codes plus
            // worker_contract_ends_before_task). Never interpolate a raw code into
            // a page-local key below — an uncataloged code (e.g. worker_not_found)
            // would otherwise render next-intl's missing-key path string.
            return tOnboarding(`apiErrors.${info.labelKey}`);
          }
          if (info && LEGACY_ASSIGN_ERRORS.has(info.code)) {
            return t(`errors.${info.code}`);
          }
          return t("errors.generic");
        })()
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t("stats.needsWorkers")} value={counts.needsWorkers} />
        <StatCard label={t("stats.open")} value={counts.open} />
        <StatCard label={t("stats.total")} value={counts.total} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
          {DISPATCH_FILTERS.map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`tabs.${key}`)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!isLoading && !isError && tasks.length >= ADMIN_TASKS_CAP ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="size-3.5" />
          {t("capNotice", { count: ADMIN_TASKS_CAP })}
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <p className="py-10 text-center text-sm text-destructive">
          {tCommon("error")}
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            {tCommon("resultsFound", { count: filtered.length })}
          </p>
          {filtered.map((task) => (
            <DispatchTaskCard
              key={task.id}
              task={task}
              propertyName={propertyName(task.propertyId)}
              locale={locale}
              onAssign={(taskId) => {
                assignWorker.reset();
                setModal({ type: "assign", taskId });
              }}
              onUnassign={(taskId, tw) =>
                setModal({ type: "unassign", taskId, tw })
              }
            />
          ))}
        </div>
      )}

      {modal?.type === "assign" && (
        <AssignWorkerDialog
          open
          onClose={close}
          isPending={assignWorker.isPending}
          error={assignError}
          onAssign={(workerId) =>
            assignWorker.mutate(
              { taskId: modal.taskId, workerId },
              { onSuccess: close },
            )
          }
        />
      )}

      {modal?.type === "unassign" && (
        <ConfirmDialog
          open
          onClose={close}
          isPending={unassignWorker.isPending}
          title={t("unassignTitle")}
          description={t("unassignConfirm", {
            name: modal.tw.workerName ?? modal.tw.workerId.slice(0, 8),
          })}
          confirmLabel={t("unassign")}
          destructive
          onConfirm={() =>
            unassignWorker.mutate(
              { taskId: modal.taskId, workerId: modal.tw.workerId },
              { onSuccess: close },
            )
          }
        />
      )}
    </div>
  );
}
