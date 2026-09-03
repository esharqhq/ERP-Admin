"use client";

import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useClock } from "@/hooks/use-today";
import type { WorkerRowDto } from "@/lib/types/worker.types";
import { initials } from "@/lib/ui/initials";
import { formatRelativeAge } from "@/lib/ui/relative-time";
import { stageKey, workerStatusPresentation } from "@/lib/workers/worker-status";
import { cn } from "@/lib/utils";

/**
 * One worker, below 768px — §08's stacked row-card.
 *
 * **Both status axes stay on the card.** The account badge, the stage and
 * Booked/Free are the three things an admin scans a worker list for, so they get
 * the second line to themselves; professions, rating and dormancy share the
 * footer. That is the design's own ordering, and it is why this is a hand-drawn
 * card rather than a reflowed table: the phone shows a **different, shorter**
 * selection of the eighteen fields, chosen by the screen, not by the picker.
 *
 * ⚠ It never scrolls horizontally at any width — every line truncates instead.
 *
 * Touch targets: the whole card is the link (the shell overlays `RowLink`), and
 * at 74px+ tall it clears the 44px minimum with room to spare.
 */
export function WorkerRowCard({ worker }: { worker: WorkerRowDto }) {
  const t = useTranslations("workers");
  const tStage = useTranslations("workers.stage");
  const tAccount = useTranslations("workers.account");
  const locale = useLocale();
  const now = useClock();

  const s = workerStatusPresentation(worker);
  const unrated = worker.completedTasks === 0;

  return (
    <div className="flex min-w-0 flex-col gap-2.5 px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback
            className={cn(
              "text-xs font-semibold",
              worker.status === "Blocked"
                ? "bg-status-cancelled-tint text-status-cancelled"
                : "bg-accent text-primary",
            )}
          >
            {initials(worker.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold leading-tight">
            {worker.fullName || "—"}
          </span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {worker.email || "—"}
          </span>
        </div>
        {/* Rating sits on the header line rather than in the footer: it is the
            one number that is read at a glance, and the footer is already three
            facts long. */}
        {unrated ? (
          <Badge tone="info" className="h-5 shrink-0 rounded-md px-2 text-[11px]">
            {t("rating.new")}
          </Badge>
        ) : (
          <span className="flex shrink-0 items-center gap-1 font-mono text-[12.5px] font-semibold tabular-nums">
            <Star className="size-3 fill-current" strokeWidth={0} />
            {worker.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Both axes, plus workload. */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <Badge
          tone={
            s.tone === "solidCritical"
              ? "danger"
              : s.tone === "outlineWarning"
                ? "warning"
                : "neutral"
          }
          className="h-5 rounded-md px-2 text-[11px]"
        >
          {s.kind === "stage"
            ? tStage(s.labelKey as "kyc")
            : tAccount(s.labelKey as "blocked")}
        </Badge>
        {/*
          When the account state has taken the badge, the stage is drawn beside it
          rather than lost — §04's contradiction ("Blocked in Account, Active in
          Stage") has to survive onto the phone, where there is no column picker
          to bring the stage back.
        */}
        {s.kind === "account" && (
          <span className="text-[11px] text-muted-foreground">
            {tStage(stageKey(worker.onboardingStatus) as "kyc")}
          </span>
        )}
        <Badge
          tone={worker.booked ? "primary" : "neutral"}
          className="h-5 rounded-md px-2 text-[11px]"
        >
          {worker.booked ? t("workload.booked") : t("workload.free")}
        </Badge>
      </div>

      {/* Professions · location · dormancy, one truncating line. */}
      <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="truncate">
          {worker.skills?.length
            ? worker.skills.join(" · ")
            : t("professions.none")}
        </span>
        <span aria-hidden className="shrink-0 opacity-50">
          ·
        </span>
        <span className="shrink-0 truncate">
          {worker.city || t("location.notSet")}
        </span>
        <span aria-hidden className="shrink-0 opacity-50">
          ·
        </span>
        <span
          className={cn(
            "shrink-0 whitespace-nowrap",
            !worker.lastSeenAt && "font-medium text-status-cancelled",
          )}
        >
          {worker.lastSeenAt
            ? (formatRelativeAge(worker.lastSeenAt, now, locale) ?? "—")
            : t("lastSeen.never")}
        </span>
      </div>
    </div>
  );
}
