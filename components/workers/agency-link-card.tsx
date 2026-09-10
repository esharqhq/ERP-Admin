"use client";

import type { ReactNode } from "react";
import { Building2, CircleSlash, MessageSquareWarning } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardState } from "@/components/detail/card-state";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/ui/relative-time";
import { agencyLinkTurn } from "@/lib/workers/agency-link";
import type {
  AgencyLinkStatus,
  WorkerAgencyLinkDto,
} from "@/lib/types/agency.types";

/**
 * Which chip a status wears. ⚠ **`default` is load-bearing** — `AgencyLinkStatus`
 * is deliberately widened, and a value this build has not met must render as a
 * neutral chip carrying its own raw name rather than fall through to nothing.
 */
function toneFor(status: AgencyLinkStatus) {
  switch (status) {
    case "Confirmed":
      return "primary" as const;
    case "Proposed":
      return "warning" as const;
    case "Disputed":
      return "danger" as const;
    case "Rejected":
      return "neutral" as const;
    default:
      return "neutral" as const;
  }
}

/** One labelled line of prose. Absent fields are omitted, never drawn empty. */
function Note({
  label,
  text,
  emphasis,
  icon,
}: {
  label: string;
  text: string;
  emphasis?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em]",
          emphasis ? "text-status-cancelled" : "text-muted-foreground",
        )}
      >
        {icon}
        {label}
      </span>
      <p
        className={cn(
          "text-[13px] leading-snug",
          emphasis ? "text-foreground" : "text-foreground/80",
        )}
      >
        {text}
      </p>
    </div>
  );
}

/**
 * The worker↔agency link on worker detail (F-05c §5.4) — **read only**.
 *
 * Three things make this card different from the agency column on the workers
 * table, and all three come from the same fact: this admin is the person who
 * *resolves* links, not someone reading a badge.
 *
 * 1. **It shows unconfirmed links.** `Proposed` and `Disputed` render as
 *    distinctly as the settled badge, because those are the rows with work on
 *    them. The table splits confirmed from pending into two mutually exclusive
 *    fields; this response does not, and must not be made to.
 * 2. **It carries `disputeNote`.** ⚠ This is the **only** surface in the panel
 *    that does — the links table row omits it, and there is no per-link detail
 *    endpoint, so the dispute queue routes here to read an objection at all.
 *    That makes it the card's most prominent line, not a footnote.
 * 3. **Its empty state is not "Independent."** ⚠ `null` covers three states the
 *    backend cannot tell apart (never asked · asked and said no · rejected and
 *    back to nothing) and there is deliberately no "I came independently" answer
 *    to record — so the absence is stated as *nothing recorded*, never as a claim
 *    about the worker. The workers table does print an "Independent" reading,
 *    mirroring the `?agencySource=Independent` filter; that inconsistency is
 *    known and is **not** copied here.
 *
 * No permission gate and no `canRead` prop, unlike the Documents and Rating cards
 * beside it: `agencyLink` rides the worker detail response this page already
 * fetches, and there is no separate grant that can turn it into a 403.
 *
 * The write verbs arrive through `actions` rather than being imported here, so
 * this file still knows nothing about mutations or permissions: it renders a
 * link, and what may be done to one is the page's business.
 *
 * ⚠ **The overrule lives on this card and nowhere else**, and point 2 above is
 * why: ruling against a worker's objection without reading it is the one thing
 * the guide forbids outright, and this is the only surface the objection
 * reaches. The links queue offers *"Open the worker"* and lands here.
 */
export function AgencyLinkCard({
  link,
  actions,
}: {
  /**
   * ⚠ **No `isLoading` prop, deliberately.** This card cannot be in a loading
   * state: the worker detail page renders its own full-page skeleton until the
   * detail read resolves, and `agencyLink` arrives inside that same response —
   * there is no second request to wait on. A prop whose only caller could pass
   * nothing but `false` is the dead-parameter shape this repo has been bitten by
   * before, so it is absent rather than unused.
   */
  link: WorkerAgencyLinkDto | null | undefined;
  /**
   * The verbs, injected rather than imported.
   *
   * ⚠ **Additive and optional**, so a caller that passes nothing gets exactly
   * the read-only card phase 1 shipped. Present in **both** branches: the empty
   * state needs the attach button as much as a live link needs its verbs.
   */
  actions?: ReactNode;
}) {
  const t = useTranslations("workers.agencyLink");
  const locale = useLocale();
  const turn = agencyLinkTurn(link);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        {link ? (
          <Badge tone={toneFor(link.status)} className="shrink-0">
            {t.has(`status.${link.status}`)
              ? t(`status.${link.status}`)
              : link.status}
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent>
        {!link ? (
          <div className="flex flex-col">
            <CardState
              icon={<CircleSlash className="size-5" />}
              title={t("empty.title")}
              hint={t("empty.hint")}
              note="200 · agencyLink: null"
            />
            {/*
              ⚠ `empty:hidden`, and it is load-bearing. `actions` is a React
              *element*, so it is always truthy — this ternary cannot see that
              `AgencyLinkActions` returns `null` for a role without
              `agency_link:manage_any`. Without it a MODERATOR gets a stray
              horizontal rule and padding under every worker's card. Same fix as
              the review-actions section on the agency-request detail.
            */}
            {actions ? (
              <div className="mt-4 border-t border-border pt-3 empty:hidden">
                {actions}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-heading text-lg font-semibold leading-none tracking-tight">
                {link.agencyLegalName}
              </span>
            </div>

            {/* Whose desk this is on. Absent when settled — a line saying
                "nobody is waiting" is noise on the common case. */}
            {turn !== "settled" ? (
              <p
                className={cn(
                  "rounded-lg px-3 py-2 text-[13px] leading-snug",
                  turn === "admin"
                    ? "bg-status-pending-tint text-status-pending-deep"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {turn === "admin" ? t("turn.admin") : t("turn.worker")}
              </p>
            ) : null}

            {link.reason ? (
              <Note
                label={
                  link.setByUserType === "ADMIN"
                    ? t("reason.byAdmin")
                    : t("reason.byWorker")
                }
                text={link.reason}
              />
            ) : null}

            {/* The reason this card exists — see the doc comment above. */}
            {link.disputeNote ? (
              <Note
                label={t("disputeNote")}
                text={link.disputeNote}
                emphasis
                icon={<MessageSquareWarning className="size-3.5" />}
              />
            ) : null}

            {link.resolutionReason ? (
              <Note label={t("resolution")} text={link.resolutionReason} />
            ) : null}

            <dl className="flex flex-col gap-1 border-t border-border pt-3 text-[12px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">{t("createdAt")}</dt>
                <dd className="font-mono">{formatDay(link.createdAt, locale)}</dd>
              </div>
              {/* ⚠ Rendered only when set. `resolvedAt` is null in three cases,
                  one of which is a link the WORKER confirmed — their agreement is
                  not an admin resolution and stamps nothing. Printing an em dash
                  against "Resolved" would read as missing data on a link that is
                  correctly, fully confirmed. */}
              {link.resolvedAt ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">{t("resolvedAt")}</dt>
                  <dd className="font-mono">
                    {formatDay(link.resolvedAt, locale)}
                  </dd>
                </div>
              ) : null}
            </dl>

            {/* ⚠ `empty:hidden` — see the note in the branch above. */}
            {actions ? (
              <div className="border-t border-border pt-3 empty:hidden">
                {actions}
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
