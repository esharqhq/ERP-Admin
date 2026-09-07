"use client";

import type { ReactNode } from "react";
import { Ban, Calendar, Check, Clock as ClockIcon, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useAdmin } from "@/hooks/use-admins";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { useClock } from "@/hooks/use-today";
import { formatDay, formatRelativeMoment } from "@/lib/ui/relative-time";
import { initials } from "@/lib/ui/initials";
import { cn } from "@/lib/utils";
import type { BroadcastDetailDto } from "@/lib/types/broadcast.types";

// Source of truth: assets/Uyer Admin Broadcast Detail.dc.html §01 — the
// 372px right rail (Timing, Reach, Provenance).
//
// The design labels the Timing card "Timing · Europe/Berlin" — that's its
// demo admin's own zone, not a hardcoded requirement (same call already made
// for the compose form's own timing-picker.tsx). Reading the *viewer's*
// timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` would work
// but this component still renders once on the server, where the runtime's
// zone is not the browser's — printing it here would hydrate-mismatch the
// same way a bare `Date.now()` would. Every value below already renders in
// `toLocaleString`'s implicit local zone and carries the raw UTC ISO
// underneath (mirroring timing-picker.tsx's own `= <ISO>` line), so the
// header simply omits the zone name rather than risk it.

function formatLocal(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CardLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </span>
  );
}

type TimingTone = "plan" | "live" | "done" | "bad" | "off" | "past" | "stop";

const TIMING_ICON: Record<TimingTone, typeof Calendar> = {
  plan: Calendar,
  live: Send,
  done: Check,
  bad: Ban,
  off: Calendar,
  past: Calendar,
  stop: Ban,
};

const TIMING_TONE_CLASS: Record<TimingTone, { icon: string; fg: string }> = {
  plan: { icon: "bg-muted text-muted-foreground", fg: "text-foreground" },
  live: { icon: "bg-accent text-primary", fg: "text-primary" },
  done: { icon: "bg-status-active-tint text-status-active", fg: "text-foreground" },
  bad: { icon: "bg-destructive/10 text-destructive", fg: "text-destructive" },
  off: { icon: "bg-muted text-muted-foreground/60", fg: "text-muted-foreground/70" },
  past: { icon: "bg-muted text-muted-foreground", fg: "text-muted-foreground" },
  stop: { icon: "bg-muted text-muted-foreground", fg: "text-foreground" },
};

interface TimingRow {
  key: string;
  value: string;
  utc?: string;
  tone: TimingTone;
  tag?: string;
}

function TimingCard({ detail }: { detail: BroadcastDetailDto }) {
  const t = useTranslations("broadcasts.detail.timing");
  const locale = useLocale();
  const now = useClock();

  const rows: TimingRow[] = (() => {
    switch (detail.status) {
      case "Scheduled":
        return [
          {
            key: t("scheduledFor"),
            value: detail.scheduledAtUtc ? formatLocal(detail.scheduledAtUtc, locale) : t("sendNow"),
            utc: detail.scheduledAtUtc ?? undefined,
            tone: "plan",
            tag: formatRelativeMoment(detail.scheduledAtUtc, now, locale) ?? undefined,
          },
          { key: t("started"), value: t("notStarted"), tone: "off" },
          { key: t("completed"), value: "—", tone: "off" },
        ];
      case "Sending":
        return [
          {
            key: t("scheduledFor"),
            value: detail.scheduledAtUtc ? formatLocal(detail.scheduledAtUtc, locale) : t("sendNow"),
            utc: detail.scheduledAtUtc ?? undefined,
            tone: "plan",
          },
          {
            key: t("started"),
            value: detail.startedAtUtc ? formatLocal(detail.startedAtUtc, locale) : "—",
            utc: detail.startedAtUtc ?? undefined,
            tone: "live",
            tag: formatRelativeMoment(detail.startedAtUtc, now, locale) ?? undefined,
          },
          { key: t("completed"), value: t("inProgress"), tone: "off" },
        ];
      case "Sent": {
        const durationMin =
          detail.startedAtUtc && detail.completedAtUtc
            ? Math.max(
                0,
                Math.round(
                  (new Date(detail.completedAtUtc).getTime() - new Date(detail.startedAtUtc).getTime()) / 60_000,
                ),
              )
            : null;
        return [
          {
            key: t("scheduledFor"),
            value: detail.scheduledAtUtc ? formatLocal(detail.scheduledAtUtc, locale) : t("sendNow"),
            utc: detail.scheduledAtUtc ?? undefined,
            tone: "plan",
            tag: formatRelativeMoment(detail.scheduledAtUtc, now, locale) ?? undefined,
          },
          {
            key: t("started"),
            value: detail.startedAtUtc ? formatLocal(detail.startedAtUtc, locale) : "—",
            utc: detail.startedAtUtc ?? undefined,
            tone: "done",
          },
          {
            key: t("completed"),
            value: detail.completedAtUtc ? formatLocal(detail.completedAtUtc, locale) : "—",
            utc: detail.completedAtUtc ?? undefined,
            tone: "done",
            tag: durationMin !== null ? t("durationMinutes", { count: durationMin }) : undefined,
          },
        ];
      }
      case "Cancelled":
        // ⚠ No `cancelledAtUtc`/"cancelled by" field exists on
        // `BroadcastDetailDto` — the design mock shows one ("26 Aug 11:41 ·
        // by D. Krause") this DTO cannot produce. Same gap already flagged in
        // broadcast-row.tsx's `statusSubline`; the middle row is dropped
        // rather than inventing a time, leaving the two rows this DTO can
        // actually back.
        return [
          {
            key: t("wasScheduledFor"),
            value: detail.scheduledAtUtc ? formatLocal(detail.scheduledAtUtc, locale) : "—",
            utc: detail.scheduledAtUtc ?? undefined,
            tone: "past",
            tag: formatRelativeMoment(detail.scheduledAtUtc, now, locale) ?? undefined,
          },
          { key: t("started"), value: t("never"), tone: "off" },
        ];
      case "Missed":
        return [
          {
            key: t("wasScheduledFor"),
            value: detail.scheduledAtUtc ? formatLocal(detail.scheduledAtUtc, locale) : "—",
            utc: detail.scheduledAtUtc ?? undefined,
            tone: "bad",
            tag: formatRelativeMoment(detail.scheduledAtUtc, now, locale) ?? undefined,
          },
          { key: t("dispatchWindow"), value: t("expiredAfterSixHours"), tone: "bad", tag: t("expired") },
          { key: t("started"), value: t("never"), tone: "off" },
        ];
    }
  })();

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-0">
        <CardLabel>{t("label")}</CardLabel>
        <div className="mt-2.5 flex flex-col">
          {rows.map((row, i) => {
            const Icon = TIMING_ICON[row.tone];
            const tone = TIMING_TONE_CLASS[row.tone];
            return (
              <div
                key={row.key}
                className={cn(
                  "flex items-start gap-2.5 py-2.5",
                  i < rows.length - 1 && "border-b border-border",
                )}
              >
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", tone.icon)}>
                  <Icon className="size-3.5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {row.key}
                  </span>
                  <span className={cn("text-[13.5px] font-semibold", tone.fg)}>{row.value}</span>
                  {row.utc && (
                    <span className="font-mono text-[10.5px] text-muted-foreground/70">{row.utc}</span>
                  )}
                </div>
                {row.tag && (
                  <span className="pt-3 text-[11.5px] font-semibold whitespace-nowrap text-muted-foreground">
                    {row.tag}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

const REACH_TAG_TONE: Record<BroadcastDetailDto["status"], string> = {
  Scheduled: "bg-muted text-muted-foreground",
  Sending: "bg-accent text-primary",
  Sent: "bg-status-active-tint text-status-active",
  Cancelled: "bg-muted text-muted-foreground",
  Missed: "bg-destructive/10 text-destructive",
};

function ReachCard({ detail }: { detail: BroadcastDetailDto }) {
  const t = useTranslations("broadcasts.detail.reach");
  const locale = useLocale();

  if (detail.status === "Sending") {
    return (
      <Card size="sm">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CardLabel>{t("label")}</CardLabel>
            <div className="flex-1" />
            <span className={cn("flex h-5 items-center rounded-md px-2 text-[10.5px] font-bold", REACH_TAG_TONE.Sending)}>
              {t("tagLive")}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[28px] font-bold tracking-tight text-foreground">
                {detail.recipientCount.toLocaleString(locale)}
              </span>
              <span className="text-[13px] font-semibold text-foreground/80">{t("recipients")}</span>
              <span className="size-[7px] animate-pulse rounded-full bg-status-active" />
            </div>
            <span className="text-xs text-muted-foreground">{t("recipientsSubClimbing")}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[22px] font-bold tracking-tight text-muted-foreground/60">—</span>
              <span className="text-[13px] font-semibold text-muted-foreground">{t("opened")}</span>
            </div>
            <span className="text-xs text-muted-foreground">{t("openedNotYetMeaningful")}</span>
          </div>
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">{t("pollingNote")}</p>
        </CardContent>
      </Card>
    );
  }

  if (detail.status === "Sent") {
    const hasRecipients = detail.recipientCount > 0;
    const pct = hasRecipients ? Math.round((detail.readCount / detail.recipientCount) * 100) : null;
    return (
      <Card size="sm">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CardLabel>{t("label")}</CardLabel>
            <div className="flex-1" />
            <span className={cn("flex h-5 items-center rounded-md px-2 text-[10.5px] font-bold", REACH_TAG_TONE.Sent)}>
              {t("tagFinal")}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[28px] font-bold tracking-tight text-foreground">
                {detail.recipientCount.toLocaleString(locale)}
              </span>
              <span className="text-[13px] font-semibold text-foreground/80">{t("recipients")}</span>
            </div>
            <span className="text-xs text-muted-foreground">{t("recipientsSubFixed")}</span>
          </div>
          <div className="h-px bg-border" />
          {hasRecipients ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {detail.readCount.toLocaleString(locale)}
                </span>
                <span className="text-[13px] font-semibold text-foreground/80">{t("opened")}</span>
                <div className="flex-1" />
                <span className="font-mono text-[12.5px] font-bold text-foreground">{pct}%</span>
              </div>
              <div className="h-[7px] overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-status-active" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">
                {t("openedSub", { pct: pct ?? 0, count: detail.recipientCount.toLocaleString(locale) })}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">{t("noRecipientsNote")}</span>
          )}
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">{t("snapshotNote")}</p>
        </CardContent>
      </Card>
    );
  }

  const empty =
    detail.status === "Scheduled"
      ? { head: t("emptyHeadScheduled"), body: t("emptyBodyScheduled"), tone: "bg-muted text-muted-foreground" }
      : detail.status === "Cancelled"
        ? { head: t("emptyHeadCancelled"), body: t("emptyBodyCancelled"), tone: "bg-muted text-muted-foreground" }
        : { head: t("emptyHeadMissed"), body: t("emptyBodyMissed"), tone: "bg-destructive/10 text-destructive" };

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <CardLabel>{t("label")}</CardLabel>
          <div className="flex-1" />
          <span className={cn("flex h-5 items-center rounded-md px-2 text-[10.5px] font-bold", REACH_TAG_TONE[detail.status])}>
            {t("tagNothingSent")}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", empty.tone)}>
            <ClockIcon className="size-4" />
          </span>
          <span className="text-[13.5px] font-semibold text-foreground">{empty.head}</span>
        </div>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">{empty.body}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-mono">{t("recipients")}</span>
          <span>·</span>
          <span className="font-mono">{t("opened")}</span>
          <span>{t("bothBlank")}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The UUID resolved to a name when the viewer can read the admin directory
 * (fail-open gate, same shape as `useOwners`/`useWorkers` elsewhere in this
 * phase) — and left as the truncated id, not "Unknown", the moment that
 * lookup is unavailable or denied. Matches the design's own stated fallback.
 */
function ProvenanceCard({ detail }: { detail: BroadcastDetailDto }) {
  const t = useTranslations("broadcasts.detail.provenance");
  const locale = useLocale();
  const canViewAdmin = useHasPermission("admin:list");
  const admin = useAdmin(canViewAdmin ? detail.createdByAdminId : "");

  const shortId = `${detail.createdByAdminId.slice(0, 8)}…${detail.createdByAdminId.slice(-4)}`;
  const authorName = admin.data?.fullName ?? shortId;
  const authorRole = admin.data?.role?.name;

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <CardLabel>{t("label")}</CardLabel>
        <div className="flex items-center gap-2.5">
          <Avatar size="sm">
            <AvatarFallback className="bg-muted text-[11px] font-semibold text-foreground">
              {admin.data ? initials(admin.data.fullName) : "—"}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[13px] font-semibold text-foreground">
              {authorRole ? `${authorName} · ${authorRole}` : authorName}
            </span>
            <span className="font-mono text-[10.5px] text-muted-foreground/70">
              {t("createdByAdminId")} {shortId}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border pt-2.5">
          <span className="text-[11.5px] text-muted-foreground">{t("created")}</span>
          {/* §04's field table calls `createdAt` "relative-free absolute
              time, with mono UTC" — deliberately not the relative chip the
              Timing rows use, so `formatDay` here, not `formatRelativeMoment`. */}
          <span className="text-[12.5px] font-semibold text-foreground/85">
            {formatDay(detail.createdAt, locale)}
          </span>
          <div className="flex-1" />
          <span className="font-mono text-[10.5px] text-muted-foreground/70">{detail.createdAt}</span>
        </div>
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">{t("resolveNote")}</p>
      </CardContent>
    </Card>
  );
}

export function BroadcastDetailRail({ detail }: { detail: BroadcastDetailDto }) {
  return (
    <div className="flex w-full flex-col gap-4 lg:w-[372px] lg:flex-none">
      <TimingCard detail={detail} />
      <ReachCard detail={detail} />
      <ProvenanceCard detail={detail} />
    </div>
  );
}
