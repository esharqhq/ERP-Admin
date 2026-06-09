"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, UserCheck, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Can } from "@/components/auth/can";
import { ConversationThread } from "@/components/support/conversation-thread";
import {
  useTicket,
  useAssignTicket,
  useResolveTicket,
  useCloseTicket,
} from "@/hooks/use-support";
import { useAuthStore } from "@/store/auth.store";
import { getApiErrorCode } from "@/lib/http/api-error";
import { normalizeStatus } from "@/lib/types/task.types";

function StatusBadge({ status }: { status: string }) {
  const s = normalizeStatus(status);
  const variant =
    s === "open" ? "default" : s === "inprogress" ? "secondary" : "outline";
  return <Badge variant={variant}>{status || "—"}</Badge>;
}

function fmtDateTime(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span className="text-sm break-words">{value}</span>
    </div>
  );
}

export default function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("support");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const currentAdminId = useAuthStore((s) => s.adminMe?.id);

  const { data: ticket, isLoading, isError } = useTicket(id);
  const assign = useAssignTicket();
  const resolve = useResolveTicket();
  const close = useCloseTicket();

  const actionError = [assign, resolve, close].find((m) => m.isError);
  const actionErrorMsg = actionError
    ? (() => {
        const code = getApiErrorCode(actionError.error);
        return code ? t("actions.failedWithCode", { code }) : t("actions.failed");
      })()
    : null;

  const backBar = (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      className="w-fit gap-1.5 text-muted-foreground"
      render={<Link href="/dashboard/support" />}
    >
      <ArrowLeft className="size-4" />
      {t("detail.back")}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {backBar}
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-[28rem] w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="flex flex-col gap-6">
        {backBar}
        <p className="text-sm text-destructive">{tCommon("error")}</p>
      </div>
    );
  }

  const status = normalizeStatus(ticket.status);
  const isClosed = status === "closed";
  const isResolved = status === "resolved";
  const assignedToMe =
    !!currentAdminId && ticket.assignedAdminId === currentAdminId;
  const busy = assign.isPending || resolve.isPending || close.isPending;

  return (
    <div className="flex flex-col gap-6">
      {backBar}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight leading-tight">
              {ticket.subject}
            </h1>
            <StatusBadge status={ticket.status} />
            {ticket.conversationArchived ? (
              <Badge variant="outline">{t("detail.archived")}</Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {ticket.category} · {ticket.priority} ·{" "}
            {t("detail.from", { who: ticket.requesterUserType })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isClosed ? (
            <Can permission="support_ticket:assign">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={busy || assignedToMe || !currentAdminId}
                onClick={() =>
                  currentAdminId &&
                  assign.mutate({ id, adminId: currentAdminId })
                }
              >
                {assign.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <UserCheck className="size-3.5" />
                )}
                {assignedToMe ? t("actions.assignedToMe") : t("actions.assignToMe")}
              </Button>
            </Can>
          ) : null}
          {!isClosed && !isResolved ? (
            <Can permission="support_ticket:resolve">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={busy}
                onClick={() => resolve.mutate(id)}
              >
                {resolve.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                {t("actions.resolve")}
              </Button>
            </Can>
          ) : null}
          {!isClosed ? (
            <Can permission="support_ticket:close">
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                disabled={busy}
                onClick={() => close.mutate(id)}
              >
                {close.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <XCircle className="size-3.5" />
                )}
                {t("actions.close")}
              </Button>
            </Can>
          ) : null}
        </div>
      </div>

      {actionErrorMsg ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionErrorMsg}
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("detail.infoTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <InfoRow label={t("detail.info.category")} value={ticket.category} />
          <InfoRow label={t("detail.info.priority")} value={ticket.priority} />
          <InfoRow
            label={t("detail.info.requester")}
            value={ticket.requesterUserType}
          />
          <InfoRow
            label={t("detail.info.assignedAdmin")}
            value={
              ticket.assignedAdminId
                ? assignedToMe
                  ? t("detail.you")
                  : ticket.assignedAdminId.slice(0, 8)
                : t("detail.unassigned")
            }
          />
          <InfoRow
            label={t("detail.info.created")}
            value={fmtDateTime(ticket.createdAt, locale)}
          />
          <InfoRow
            label={t("detail.info.resolved")}
            value={fmtDateTime(ticket.resolvedAt, locale)}
          />
          <InfoRow
            label={t("detail.info.closed")}
            value={fmtDateTime(ticket.closedAt, locale)}
          />
          {ticket.relatedPropertyId ? (
            <InfoRow
              label={t("detail.info.relatedProperty")}
              value={ticket.relatedPropertyId.slice(0, 8)}
            />
          ) : null}
          {ticket.relatedTaskGroupId ? (
            <InfoRow
              label={t("detail.info.relatedTaskGroup")}
              value={
                <Link
                  href={`/dashboard/tasks/${ticket.relatedTaskGroupId}`}
                  className="underline underline-offset-2"
                >
                  {ticket.relatedTaskGroupId.slice(0, 8)}
                </Link>
              }
            />
          ) : null}
        </CardContent>
      </Card>

      <ConversationThread
        conversationId={ticket.conversationId}
        disabled={isClosed || ticket.conversationArchived}
      />
    </div>
  );
}
