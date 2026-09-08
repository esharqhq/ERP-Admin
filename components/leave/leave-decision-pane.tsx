"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Layers,
  Loader2,
  Ticket,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Can } from "@/components/auth/can";
import { LeaveScopeList } from "@/components/leave/leave-scope-list";
import { LeaveGates } from "@/components/leave/leave-gates";
import { computeLeaveScope } from "@/lib/leave/scope";
import { useApproveLeave, useRejectLeave } from "@/hooks/use-leave";
import { useTaskGroup } from "@/hooks/use-tasks";
import { useClock } from "@/hooks/use-today";
import { formatRelativeAge } from "@/lib/ui/relative-time";
import { initials } from "@/lib/ui/initials";
import { getApiErrorCode } from "@/lib/http/api-error";
import { normalizeStatus } from "@/lib/types/task.types";
import type { WorkerLeaveRequestDto } from "@/lib/types/leave.types";

/** Every code the two decision endpoints answer with; all six are worded. */
const KNOWN_ERRORS = new Set([
  "leave_request_not_pending",
  "task_already_started",
  "worker_already_checked_in",
  "no_active_enrolment",
  "leave_request_not_found",
]);

interface Props {
  request: WorkerLeaveRequestDto;
  onBack: () => void;
  onDecided: () => void;
}

function StatusPill({ status }: { status: string }) {
  const s = normalizeStatus(status);
  const tone =
    s === "approved"
      ? "bg-primary/10 text-primary"
      : s === "pending"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : s === "rejected"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground";
  return (
    <span
      className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${tone}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {status || "—"}
    </span>
  );
}

/**
 * The whole request, and the two buttons at the bottom of the thing they act on.
 *
 * The modal this replaces described the consequence in one parenthesised
 * sentence — "removes {name} from the affected task(s)" — where the plural was
 * doing all the work and the admin could not see which tasks. The panel spends
 * its room on exactly that: which dates approval vacates, which become no-shows,
 * and — for a single-date target — whether the server would refuse at all.
 */
export function LeaveDecisionPane({ request, onBack, onDecided }: Props) {
  const t = useTranslations("leave");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const now = useClock();

  // A note typed against one request must never travel to the next one, and a
  // failure must not outlive the row it belonged to. The parent keys this
  // component on `request.id`, so both reset by remounting — no effect needed.
  const [note, setNote] = useState("");
  const approve = useApproveLeave();
  const reject = useRejectLeave();

  // The dates the decision touches — one group, by id, cached per id and shared
  // with /dashboard/tasks/[id].
  const groupQuery = useTaskGroup(request.taskGroupId);
  const scope = computeLeaveScope(request, groupQuery.data, now);

  const isGroup = request.targetType === "TaskGroup";
  const isPending = normalizeStatus(request.status) === "pending";
  const busy = approve.isPending || reject.isPending;
  // Only a Task target can be settled here; a group's one gate is unreadable.
  const blocked = scope.gatesPrecheckable && scope.blockers.length > 0;
  const workerName = request.workerName ?? request.workerId.slice(0, 8);
  const asked = formatRelativeAge(request.createdAt, now, locale);
  const decidedAge = formatRelativeAge(request.decidedAt, now, locale);

  const failed = approve.isError ? approve.error : reject.isError ? reject.error : null;
  const errorText = failed
    ? (() => {
        const code = getApiErrorCode(failed);
        return code && KNOWN_ERRORS.has(code)
          ? t(`errors.${code}`)
          : t("errors.generic");
      })()
    : null;

  const decide = (mutation: typeof approve) =>
    mutation.mutate(
      { id: request.id, note: note.trim() || null },
      { onSuccess: onDecided },
    );

  return (
    <div className="flex h-full flex-col bg-background">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-start gap-3 border-b border-border px-4 py-3.5 md:px-5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          className="md:hidden"
          title={tCommon("back")}
        >
          <ArrowLeft className="size-4" />
        </Button>

        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] font-bold text-muted-foreground"
        >
          {initials(workerName)}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold tracking-tight">{workerName}</h2>
            <StatusPill status={request.status} />
            <span
              className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${
                isGroup
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isGroup ? (
                <Layers className="size-3" />
              ) : (
                <CalendarDays className="size-3" />
              )}
              {isGroup ? t("target.groupLong") : t("target.taskLong")}
            </span>
          </div>
          {/* Name, stage and target only. Profession, rating and city used to sit
              here, and cost the whole worker directory to render: profession is
              one seeded value for every worker today, rating is usually unrated,
              and the property each affected date belongs to — the fact that
              actually bears on the decision — is in the scope list below. The
              Worker file button is one click for the rest. */}
          <p className="truncate text-xs text-muted-foreground">
            {asked ? t("row.asked", { age: asked }) : null}
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 px-4 py-4 md:px-5">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/dashboard/support/${request.supportTicketId}`} />}
            >
              <Ticket className="size-3.5" />
              {t("viewTicket")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/dashboard/workers/${request.workerId}`} />}
            >
              <User className="size-3.5" />
              {t("pane.workerFile")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/dashboard/tasks/${request.taskGroupId}`} />}
            >
              <Layers className="size-3.5" />
              {t("pane.openBooking")}
            </Button>
          </div>

          <section className="flex flex-col gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("pane.reasonHeading")}
            </h3>
            <blockquote className="border-l-2 border-border pl-3 text-sm leading-relaxed text-foreground">
              {request.reason}
            </blockquote>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("pane.consequenceHeading")}
            </h3>
            <p className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
              {isGroup ? t("pane.consequenceGroup") : t("pane.consequenceTask")}
            </p>
          </section>

          {isPending && (
            <LeaveScopeList
              scope={scope}
              isLoading={groupQuery.isLoading}
              isError={groupQuery.isError}
              hedged={isGroup}
            />
          )}

          {!isPending && (
            <section className="flex flex-col gap-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("pane.decisionHeading")}
              </h3>
              {request.decisionNote ? (
                <blockquote className="border-l-2 border-border pl-3 text-sm leading-relaxed">
                  {request.decisionNote}
                </blockquote>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("pane.noDecisionNote")}
                </p>
              )}
              {decidedAge && (
                <p className="text-xs text-muted-foreground">
                  {t("pane.decidedAge", { age: decidedAge })}
                </p>
              )}
            </section>
          )}
        </div>
      </ScrollArea>

      {/* ── Footer: the decision ── */}
      {isPending && (
        <div className="flex shrink-0 flex-col gap-2.5 border-t border-border bg-muted/20 px-4 py-3.5 md:px-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("pane.noteLabel")}
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              disabled={busy}
              placeholder={t("decide.notePlaceholder")}
              className="resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            />
          </label>

          <LeaveGates
            scope={scope}
            isLoading={groupQuery.isLoading}
            isGroup={isGroup}
          />

          {errorText && (
            <p role="alert" className="text-sm text-destructive">
              {errorText}
            </p>
          )}

          {/* The two codes are separate (110047 / 110048) and a custom role can
              hold one without the other, so each button is gated on its own. */}
          <div className="flex flex-wrap gap-2">
            <Can permission="worker_leave_request:approve">
              <Button onClick={() => decide(approve)} disabled={busy || blocked}>
                {approve.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {t("pane.approveAction")}
              </Button>
            </Can>
            <Can permission="worker_leave_request:reject">
              <Button
                variant="destructive"
                onClick={() => decide(reject)}
                disabled={busy}
              >
                {reject.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <X className="size-4" />
                )}
                {t("decide.reject")}
              </Button>
            </Can>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("pane.footerWarning")}
          </p>
        </div>
      )}
    </div>
  );
}
