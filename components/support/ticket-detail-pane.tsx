"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDot,
  Ban,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Tag,
  Flag,
  User,
  CalendarPlus,
  Home,
  ClipboardList,
  Archive,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

function statusMeta(status: string): { variant: BadgeVariant; Icon: LucideIcon } {
  switch (normalizeStatus(status)) {
    case "open":
      return { variant: "default", Icon: CircleDot };
    case "inprogress":
      return { variant: "secondary", Icon: Loader2 };
    case "resolved":
      return { variant: "outline", Icon: CheckCircle2 };
    case "closed":
      return { variant: "outline", Icon: Ban };
    default:
      return { variant: "outline", Icon: CircleDot };
  }
}

function priorityMeta(
  priority: string,
): { variant: BadgeVariant; Icon: LucideIcon } {
  switch (normalizeStatus(priority)) {
    case "urgent":
      return { variant: "destructive", Icon: AlertTriangle };
    case "high":
      return { variant: "secondary", Icon: ArrowUp };
    case "low":
      return { variant: "outline", Icon: ArrowDown };
    default:
      return { variant: "outline", Icon: Minus };
  }
}

function StatusBadge({ status }: { status: string }) {
  const { variant, Icon } = statusMeta(status);
  return (
    <Badge variant={variant}>
      <Icon />
      {status || "—"}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const { variant, Icon } = priorityMeta(priority);
  return (
    <Badge variant={variant}>
      <Icon />
      {priority || "—"}
    </Badge>
  );
}

function fmtDateTime(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
        <span className="text-sm break-words">{value}</span>
      </div>
    </div>
  );
}

export function TicketDetailPane({ ticketId }: { ticketId: string }) {
  const t = useTranslations("support");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const currentAdminId = useAuthStore((s) => s.adminMe?.id);

  const { data: ticket, isLoading, isError } = useTicket(ticketId);
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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-[28rem] w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="p-4">
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
  const requesterInitial = (ticket.requesterUserType || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar>
            <AvatarFallback>{requesterInitial}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-heading text-2xl font-bold leading-tight tracking-tight break-words">
              {ticket.subject}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <Badge variant="outline">
                <Tag />
                {ticket.category}
              </Badge>
              {ticket.conversationArchived ? (
                <Badge variant="outline">
                  <Archive />
                  {t("detail.archived")}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("detail.from", { who: ticket.requesterUserType })}
            </p>
          </div>
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
                  assign.mutate({ id: ticketId, adminId: currentAdminId })
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
                onClick={() => resolve.mutate(ticketId)}
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
                onClick={() => close.mutate(ticketId)}
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
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow
              icon={Tag}
              label={t("detail.info.category")}
              value={ticket.category}
            />
            <InfoRow
              icon={Flag}
              label={t("detail.info.priority")}
              value={ticket.priority}
            />
            <InfoRow
              icon={User}
              label={t("detail.info.requester")}
              value={ticket.requesterUserType}
            />
            <InfoRow
              icon={UserCheck}
              label={t("detail.info.assignedAdmin")}
              value={
                ticket.assignedAdminId
                  ? assignedToMe
                    ? t("detail.you")
                    : ticket.assignedAdminId.slice(0, 8)
                  : t("detail.unassigned")
              }
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow
              icon={CalendarPlus}
              label={t("detail.info.created")}
              value={fmtDateTime(ticket.createdAt, locale)}
            />
            <InfoRow
              icon={CheckCircle2}
              label={t("detail.info.resolved")}
              value={fmtDateTime(ticket.resolvedAt, locale)}
            />
            <InfoRow
              icon={XCircle}
              label={t("detail.info.closed")}
              value={fmtDateTime(ticket.closedAt, locale)}
            />
          </div>

          {ticket.relatedPropertyId || ticket.relatedTaskGroupId ? (
            <>
              <Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {ticket.relatedPropertyId ? (
                  <InfoRow
                    icon={Home}
                    label={t("detail.info.relatedProperty")}
                    value={ticket.relatedPropertyId.slice(0, 8)}
                  />
                ) : null}
                {ticket.relatedTaskGroupId ? (
                  <InfoRow
                    icon={ClipboardList}
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
              </div>
            </>
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
