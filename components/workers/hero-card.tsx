"use client";

import {
  IdCard,
  Mail,
  Phone,
  ScrollText,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BandStat,
  FactTile,
  IdentityBand,
  type FactTone,
} from "@/components/detail/identity-band";
import { daysUntil } from "@/lib/detail/attention";
import { describeCover, type CoverQuery } from "@/lib/detail/cover-cell";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import { WARN_DAYS } from "@/lib/onboarding/subject-row";
import type { CoverNote } from "@/lib/onboarding/subject-row";
import type { WeekSummary } from "@/hooks/use-worker-shifts";
import type {
  WorkerDetailDto,
  WorkerRatingDto,
} from "@/lib/types/worker.types";

function initialsOf(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The nearest paper deadline, and how close it is.
 *
 * ⚠ **Both rungs are red, not amber.** The DS's 30/7 ladder is shared with the
 * contract cell beside it, but the *tone* is not: when a worker's licence lapses
 * the backend's expiry ladder drops the account back to `Kyc`, which makes every
 * future shift unfillable. That is not a renewal task, so it is not amber.
 *
 * A missing expiry is not an expired one. `licenseExpiry` is optional even at
 * submit, so a `null` produces no statement at all rather than a warning about
 * a document the worker was never required to file.
 */
function describePapers(
  worker: WorkerDetailDto,
  today: number,
  copy: {
    licence: string;
    passport: string;
    none: string;
    left: (days: number) => string;
    ago: (days: number) => string;
    formatDate: (iso: string | null) => string;
  },
): {
  kind: "licence" | "passport";
  label: string;
  value: string;
  trailing?: string;
  tone: FactTone;
} {
  const candidates = [
    {
      kind: "licence" as const,
      label: copy.licence,
      iso: worker.identity?.licenseExpiry ?? null,
      days: daysUntil(worker.identity?.licenseExpiry, today),
    },
    {
      kind: "passport" as const,
      label: copy.passport,
      iso: worker.identity?.passportExpiry ?? null,
      days: daysUntil(worker.identity?.passportExpiry, today),
    },
  ].filter((c) => c.iso);

  if (candidates.length === 0)
    return {
      kind: "licence",
      label: copy.licence,
      value: copy.none,
      tone: "neutral",
    };

  const dated = candidates.filter(
    (c): c is (typeof candidates)[number] & { iso: string; days: number } =>
      c.days !== null && c.iso !== null,
  );
  // No clock yet (server snapshot). The date is still true, the countdown is not.
  if (dated.length === 0) {
    const first = candidates[0];
    return {
      kind: first.kind,
      label: first.label,
      value: copy.formatDate(first.iso),
      tone: "neutral",
    };
  }

  const worst = dated.reduce((a, b) => (a.days <= b.days ? a : b));
  const lapsed = worst.days < 0;

  return {
    kind: worst.kind,
    label: worst.label,
    value: copy.formatDate(worst.iso),
    trailing: lapsed ? copy.ago(Math.abs(worst.days)) : copy.left(worst.days),
    tone: worst.days > WARN_DAYS ? "neutral" : "critical",
  };
}

/**
 * Who this worker is, what they are cleared for, and how their week went.
 *
 * The two week numbers describe **the week currently on screen**, not a
 * lifetime — the grid's date range sits directly beneath them, which is why the
 * labels say "on time" and "hours" rather than "this week".
 *
 * The rating is the one value that appears twice on this page, and that is
 * deliberate: here it is the headline an admin scans for, and in the sidebar's
 * snapshot card it is the thing being explained — when it was calculated, out of
 * how many tasks, at what completion rate. Two readings of one number, not two
 * statements of one fact. Everything else here appears once; the stat row that
 * used to restate the status and the profession count is gone.
 */
export function WorkerHeroCard({
  worker,
  rating,
  ratingCanRead,
  week,
  weekKnown,
  contract,
  today,
}: {
  worker: WorkerDetailDto;
  rating: WorkerRatingDto | undefined;
  /**
   * `false` when `worker_rating:read_any` is missing — the query never ran.
   * `null` while the grant set is still unknown, which is not a refusal: a cold
   * start would otherwise print an em dash where a score is about to appear.
   */
  ratingCanRead: boolean | null;
  week: WeekSummary;
  /** `false` while the week is unreadable or still resolving. */
  weekKnown: boolean;
  contract: CoverQuery;
  today: number;
}) {
  const t = useTranslations("workers");
  const tOnboarding = useTranslations("onboarding");
  const tDocs = useTranslations("docsWorkspace");
  const locale = useLocale();

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const presentation = onboardingStatusPresentation(worker.onboardingStatus);
  const professions = (worker.professions ?? [])
    .map((p) => p.name ?? p.code)
    .filter(Boolean) as string[];

  const papers = describePapers(worker, today, {
    licence: t("band.licence"),
    passport: t("band.passport"),
    none: t("band.noExpiry"),
    left: (days) => tDocs("cover.daysLeft", { days }),
    ago: (days) => t("band.lapsedAgo", { days }),
    formatDate,
  });

  const cover = describeCover(contract, today, {
    unavailable: () => t("band.contractUnavailable"),
    failed: () => tOnboarding("apiErrors.unknown"),
    none: () => tDocs("noContract"),
    note: (note: CoverNote) =>
      tDocs(note.key as Parameters<typeof tDocs>[0], note.values),
    formatDate,
  });

  // Never `0.0`. An unrated worker is not a bad one — the snapshot says so with
  // `isNew`, and a number in that slot would be read as a verdict.
  const ratingValue =
    ratingCanRead === false ? (
      "—"
    ) : ratingCanRead === null || !rating ? (
      <Skeleton className="h-4 w-8" />
    ) : rating.isNew || rating.displayRating === null ? (
      <Badge tone="info">{t("rating.new")}</Badge>
    ) : (
      rating.displayRating.toFixed(1)
    );

  const meta = [
    worker.employeeType,
    worker.experience !== null && worker.experience !== undefined
      ? t("band.experience", { years: worker.experience })
      : null,
    // From the second onwards — the first is already the qualifier beside the
    // name, and repeating it here would read as two different facts.
    professions.length > 1 ? professions.slice(1).join(", ") : null,
    worker.address,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <IdentityBand
      initials={initialsOf(worker.fullName)}
      pictureUrl={worker.profilePictureUrl}
      name={worker.fullName ?? "—"}
      qualifier={professions[0] ?? undefined}
      badges={
        <>
          <Badge
            variant={presentation.variant}
            className={presentation.className}
          >
            {tOnboarding(
              `status.${presentation.labelKey}` as Parameters<
                typeof tOnboarding
              >[0],
            )}
          </Badge>
          {/* Verbatim, and only where the stage is the one it explains — the
              worker is told this sentence in their app and an admin answering
              them needs to be reading the same words. */}
          {worker.onboardingStatus === "Rejected" &&
          worker.onboardingRejectReason ? (
            <span className="text-[11px] font-medium text-destructive">
              {worker.onboardingRejectReason}
            </span>
          ) : null}
        </>
      }
      meta={meta || undefined}
      stats={
        <>
          <BandStat
            label={t("columns.rating")}
            value={ratingValue}
            icon={
              ratingCanRead === true && rating && !rating.isNew ? (
                <Star className="size-3.5 fill-status-pending text-status-pending" />
              ) : null
            }
          />
          <BandStat
            label={t("band.onTime")}
            value={
              !weekKnown || week.onTime === null
                ? "—"
                : `${Math.round(week.onTime * 100)}%`
            }
          />
          <BandStat
            label={t("band.hours")}
            value={
              weekKnown
                ? t("band.hoursValue", { hours: week.hours.toFixed(1) })
                : "—"
            }
          />
        </>
      }
      actions={
        <>
          {worker.phoneNumber ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={
                <a href={`tel:${worker.phoneNumber.replace(/\s+/g, "")}`} />
              }
            >
              <Phone className="size-4" />
              {t("contact.call")}
            </Button>
          ) : null}
          {worker.email ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={<a href={`mailto:${worker.email}`} />}
            >
              <Mail className="size-4" />
              {t("band.email")}
            </Button>
          ) : null}
        </>
      }
      tiles={
        <>
          <FactTile
            icon={<Mail className="size-3.5" />}
            label={t("band.email")}
            value={worker.email || "—"}
          />
          <FactTile
            icon={<Phone className="size-3.5" />}
            label={t("band.phone")}
            value={worker.phoneNumber || "—"}
            mono
          />
          <FactTile
            icon={
              papers.kind === "passport" ? (
                <IdCard className="size-3.5" />
              ) : (
                <ShieldCheck className="size-3.5" />
              )
            }
            label={papers.label}
            value={papers.value}
            trailing={papers.trailing}
            tone={papers.tone}
            hint={worker.identity?.passportNumber ?? undefined}
            mono
          />
          {/* Last, and the only other cell whose tone can turn: the two before
              it state facts that do not expire. */}
          <FactTile
            icon={<ScrollText className="size-3.5" />}
            label={t("band.contract")}
            value={
              cover.value === null ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                cover.value
              )
            }
            hint={cover.hint}
            trailing={cover.trailing}
            tone={cover.tone}
            progress={cover.progress}
            mono
          />
        </>
      }
    />
  );
}
