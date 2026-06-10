"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Check, X, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Can } from "@/components/auth/can";
import { LeaveDecisionDialog } from "@/components/leave/leave-decision-dialog";
import { useLeaveRequests, useApproveLeave, useRejectLeave } from "@/hooks/use-leave";
import { useWorkers } from "@/hooks/use-workers";
import { getApiErrorCode } from "@/lib/http/api-error";
import { normalizeStatus } from "@/lib/types/task.types";
import {
  LEAVE_STATUS_FILTERS,
  type LeaveStatusFilter,
  type WorkerLeaveRequestDto,
} from "@/lib/types/leave.types";

const KNOWN_ERRORS = new Set([
  "leave_request_not_pending",
  "task_already_started",
  "worker_already_checked_in",
  "no_active_enrolment",
  "leave_request_not_found",
]);

const TAB_KEY: Record<LeaveStatusFilter, string> = {
  all: "all",
  Pending: "pending",
  Approved: "approved",
  Rejected: "rejected",
  Cancelled: "cancelled",
};

type ModalState =
  | { type: "approve"; row: WorkerLeaveRequestDto; workerName: string }
  | { type: "reject"; row: WorkerLeaveRequestDto; workerName: string }
  | null;

function StatusBadge({ status }: { status: string }) {
  const s = normalizeStatus(status);
  const variant =
    s === "approved"
      ? "default"
      : s === "pending"
        ? "secondary"
        : s === "rejected"
          ? "destructive"
          : "outline"; // cancelled
  return <Badge variant={variant}>{status || "—"}</Badge>;
}

function fmtDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale, { dateStyle: "medium" });
}

export default function LeavePage() {
  const t = useTranslations("leave");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [tab, setTab] = useState<LeaveStatusFilter>("Pending");
  const [modal, setModal] = useState<ModalState>(null);

  const {
    data: requests = [],
    isLoading,
    isError,
  } = useLeaveRequests(tab === "all" ? undefined : tab);
  const { data: workers = [] } = useWorkers();

  const workerName = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of workers) if (w.fullName) map.set(w.id, w.fullName);
    return (id: string) => map.get(id) ?? id.slice(0, 8);
  }, [workers]);

  const approve = useApproveLeave();
  const reject = useRejectLeave();
  const activeMut = modal?.type === "approve" ? approve : reject;

  const close = () => {
    setModal(null);
    approve.reset();
    reject.reset();
  };

  const decideError =
    modal && activeMut.isError
      ? (() => {
          const code = getApiErrorCode(activeMut.error);
          return code && KNOWN_ERRORS.has(code)
            ? t(`errors.${code}`)
            : t("errors.generic");
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

      <div className="flex rounded-lg border border-border bg-muted/50 p-0.5 self-start">
        {LEAVE_STATUS_FILTERS.map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`tabs.${TAB_KEY[key]}`)}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? tCommon("loading")
              : tCommon("resultsFound", { count: requests.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.worker")}</TableHead>
                <TableHead>{t("columns.target")}</TableHead>
                <TableHead>{t("columns.reason")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.created")}</TableHead>
                <TableHead className="text-right">{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-destructive"
                  >
                    {tCommon("error")}
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => {
                  const name = workerName(r.workerId);
                  const isPending = normalizeStatus(r.status) === "pending";
                  return (
                    <TableRow key={r.id} className="hover:bg-accent/40">
                      <TableCell className="py-3 font-medium">{name}</TableCell>
                      <TableCell className="text-sm">
                        <Link
                          href={`/dashboard/tasks/${r.taskGroupId}`}
                          className="text-muted-foreground underline-offset-2 hover:underline"
                        >
                          {r.targetType}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground" title={r.reason}>
                        {r.reason}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmtDate(r.createdAt, locale)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title={t("viewTicket")}
                            nativeButton={false}
                            className="text-muted-foreground"
                            render={
                              <Link href={`/dashboard/support/${r.supportTicketId}`} />
                            }
                          >
                            <Ticket className="size-4" />
                          </Button>
                          {isPending ? (
                            <>
                              <Can permission="worker_leave_request:approve">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title={t("decide.approve")}
                                  className="text-emerald-600 dark:text-emerald-400"
                                  onClick={() =>
                                    setModal({ type: "approve", row: r, workerName: name })
                                  }
                                >
                                  <Check className="size-4" />
                                </Button>
                              </Can>
                              <Can permission="worker_leave_request:reject">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title={t("decide.reject")}
                                  className="text-destructive"
                                  onClick={() =>
                                    setModal({ type: "reject", row: r, workerName: name })
                                  }
                                >
                                  <X className="size-4" />
                                </Button>
                              </Can>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {modal && (
        <LeaveDecisionDialog
          open
          mode={modal.type}
          workerName={modal.workerName}
          onClose={close}
          isPending={activeMut.isPending}
          error={decideError}
          onConfirm={(note) =>
            activeMut.mutate({ id: modal.row.id, note }, { onSuccess: close })
          }
        />
      )}
    </div>
  );
}
