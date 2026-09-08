"use client";

import { CalendarX, Hourglass, MailWarning } from "lucide-react";
import { useTranslations } from "next-intl";

import { SummaryStrip as Strip, SummaryTile } from "@/components/ui/summary-strip";
import type { AgencySummary } from "@/lib/agencies/summary";

/**
 * Three questions a list of partner names cannot answer: who never set a
 * password, who cannot sign in because the paper contract has not arrived, and
 * whose partnership has lapsed.
 *
 * ⚠ **A row can light two tiles.** `invitationPending` and `awaitingContract` are
 * independent, and a partner approved yesterday is both — which is exactly why
 * `isVerified` is not folded into the `standing` column.
 *
 * Each tile writes a filter into the URL rather than switching the screen into a
 * mode, so a click is a shareable link the filter chips can clear.
 * `SummaryTile` already renders a zero count as neutral and non-actionable, so a
 * clean screen needs no special casing here.
 */
export function AgencySummaryStrip({
  summary,
  isLoading,
  active,
  onToggle,
}: {
  summary: AgencySummary;
  isLoading?: boolean;
  /** Which narrowing keys are currently on. */
  active: Record<string, string>;
  onToggle: (key: string, value: string) => void;
}) {
  const t = useTranslations("agencies.summary");

  return (
    <Strip
      label={t("label")}
      value={t("value", { count: summary.total })}
      isLoading={isLoading}
    >
      <SummaryTile
        icon={<MailWarning className="size-4" />}
        title={t("invitationTitle")}
        detail={t("invitationDetail", { count: summary.invitationPending })}
        action={t("action")}
        tone="warning"
        count={summary.invitationPending}
        on={active.invitation === "pending"}
        onClick={() => onToggle("invitation", "pending")}
      />
      <SummaryTile
        icon={<Hourglass className="size-4" />}
        title={t("awaitingTitle")}
        detail={t("awaitingDetail", { count: summary.awaitingContract })}
        action={t("action")}
        tone="warning"
        count={summary.awaitingContract}
        on={active.standing === "AwaitingContract"}
        onClick={() => onToggle("standing", "AwaitingContract")}
      />
      <SummaryTile
        icon={<CalendarX className="size-4" />}
        title={t("expiredTitle")}
        detail={t("expiredDetail", { count: summary.expired })}
        action={t("action")}
        tone="critical"
        count={summary.expired}
        on={active.standing === "Expired"}
        onClick={() => onToggle("standing", "Expired")}
      />
    </Strip>
  );
}
