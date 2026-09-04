"use client";

import { useLocale, useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  contractPhasePresentation,
  onboardingStatusPresentation,
} from "@/lib/onboarding/status";
import {
  WAITING_ALARM_DAYS,
  type DocVerdict,
} from "@/lib/onboarding/queue-detail";
import type { SubjectRow } from "@/lib/onboarding/subject-row";
import { WARN_DAYS } from "@/lib/onboarding/subject-row";
import { daysUntil } from "@/lib/detail/attention";
import { initials } from "@/lib/ui/initials";
import { cn } from "@/lib/utils";

/**
 * The cells both documents queues draw.
 *
 * Shared because the two screens differ in their *column set*, not in how a
 * subject or a stage looks — and two copies of these is precisely how the old
 * screens drifted into different column widths and one hardcoded English count.
 */

/**
 * Avatar, name, and a second line under it.
 *
 * The `side` line is what each queue puts there: the owner's email, the worker's
 * phone and professions. `avatarUrl` is null on every row until the list DTOs
 * carry a picture (ask #7) — the image renders the day they do, with no other
 * change here.
 */
export function SubjectCell({
  row,
  side,
}: {
  row: SubjectRow;
  side?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-8 shrink-0">
        {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt="" /> : null}
        {/*
          A quiet green ground with forest initials, not the cool grey the
          fallback defaults to. `--accent` is `--forest-100` (#E1EFE8), which is
          the value the design names, and it inverts correctly in dark mode where
          the default grey would not. Distinct from the row's own hover, which is
          `--muted`.
        */}
        <AvatarFallback className="bg-accent text-xs font-semibold text-primary">
          {initials(row.fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-0.5">
        {/* Truncated rather than allowed to widen the row; `title` keeps the
            whole value reachable on a long legal name or company mailbox. */}
        <span
          className="truncate text-sm font-semibold leading-tight"
          title={row.fullName ?? undefined}
        >
          {row.fullName ?? fallbackName(row.id)}
        </span>
        <span
          className="truncate text-xs leading-tight text-muted-foreground"
          title={side ?? undefined}
        >
          {side || "—"}
        </span>
      </div>
    </div>
  );
}

/** The onboarding stage. The wire value is mapped, never printed raw. */
export function StageCell({ row }: { row: SubjectRow }) {
  const t = useTranslations("onboarding");
  const status = onboardingStatusPresentation(row.onboardingStatus);
  return (
    <Badge variant={status.variant} className={status.className}>
      {t(`status.${status.labelKey}`)}
    </Badge>
  );
}

/**
 * The newest contract's phase, or an em dash before one exists.
 *
 * Owner queue only. Never the hourly mirror flag — that can still say "covered"
 * for up to an hour after cover has actually ended, and this column is read as
 * the answer to *"may they order work"*.
 */
export function ContractPhaseCell({ row }: { row: SubjectRow }) {
  const t = useTranslations("onboarding");
  if (!row.cover) return <Dash />;
  const phase = contractPhasePresentation(row.cover.phase);
  return (
    <span className="text-sm text-muted-foreground">
      {t(`phase.${phase.labelKey}`)}
    </span>
  );
}

/** A date, or an em dash when there is none — never the word "never". */
export function DateCell({ iso }: { iso: string | null }) {
  const locale = useLocale();
  if (!iso) return <Dash />;
  return <span className="text-sm tabular-nums">{formatDate(iso, locale)}</span>;
}

export function CountCell({ value }: { value: number | null }) {
  if (value == null) return <Dash />;
  return <span className="text-sm tabular-nums">{value}</span>;
}

/**
 * Undecided is a **grey** dot, not amber. Amber is the Stage pill's colour for
 * "under review" and it is already in the row; repeating it per file would make
 * three pending documents shout as loudly as the one rejected one beside them,
 * which is the opposite of what the dots are for.
 */
const DOT: Record<DocVerdict, string> = {
  approved: "bg-status-active",
  pending: "bg-muted-foreground/25",
  rejected: "bg-status-cancelled",
};

/**
 * How many files, and how they were decided — the count, then one dot per file
 * in its verdict colour.
 *
 * *"A red dot in the row is the fastest read of 'this one has a problem'."* The
 * dots come from a per-row detail read, so before it lands the count stands alone
 * rather than showing a row of grey dots, which would say every file is
 * undecided.
 */
export function FilesCell({
  count,
  verdicts,
}: {
  count: number | null;
  verdicts: DocVerdict[] | undefined;
}) {
  if (count == null) return <Dash />;
  return (
    <span className="flex items-center gap-2">
      <span className="text-sm tabular-nums">{count}</span>
      {verdicts && verdicts.length > 0 && (
        <span className="flex items-center gap-1">
          {verdicts.map((verdict, i) => (
            <span
              key={i}
              className={cn("size-[7px] shrink-0 rounded-full", DOT[verdict])}
            />
          ))}
        </span>
      )}
    </span>
  );
}

/**
 * How long this submission has been waiting, in whole days.
 *
 * Red past the alarm rung. An em dash on any stage that is not waiting — and on a
 * row whose detail has not arrived, because "0 d" would be a claim rather than a
 * blank.
 */
export function WaitingCell({ days }: { days: number | null }) {
  const t = useTranslations("docsWorkspace.queue");
  if (days == null) return <Dash />;
  return (
    <span
      className={cn(
        "text-sm tabular-nums",
        days >= WAITING_ALARM_DAYS && "font-medium text-destructive",
      )}
    >
      {t("waitingDays", { days })}
    </span>
  );
}

/**
 * The worker's own service licence expiry — worker queue only.
 *
 * One red state, not two: the design draws a single rung at 30 days (comp line
 * 527), unlike `WaitingCell`'s amber-then-red ladder. A lapsed licence drops the
 * account back to KYC and makes every future shift unfillable, which is why it is
 * worth catching before it happens rather than only once it has.
 *
 * `today` drives the threshold, not `Date.now()` — matches `daysUntil`'s own
 * day-snapped math (`lib/detail/attention.ts`), so this column and the detail
 * screen's facts rail can never disagree about whether a licence has "30 days
 * left" a few hours apart.
 */
export function LicenceExpiryCell({
  iso,
  today,
}: {
  iso: string | null;
  today: number;
}) {
  const locale = useLocale();
  if (!iso) return <Dash />;
  const days = daysUntil(iso, today);
  return (
    <span
      className={cn(
        "text-sm tabular-nums",
        days !== null && days <= WARN_DAYS && "font-medium text-status-cancelled",
      )}
    >
      {formatDate(iso, locale)}
    </span>
  );
}

/**
 * Up to two profession chips, then a count — worker queue only.
 *
 * ⚠ `register-merge` (2026-08-19) shrank the seeded profession table to
 * `GENERAL` alone, so a single chip on every row is correct, not broken.
 */
export function ProfessionsCell({ professions }: { professions: string[] | null }) {
  const list = professions ?? [];
  if (list.length === 0) return <Dash />;
  // Two, then a count. Three chips overrun the column and truncate mid-word,
  // which reads as a bug rather than as a list — same rule the directory's own
  // professions column follows (components/workers/worker-columns.tsx).
  const shown = list.slice(0, 2);
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {shown.map((p) => (
        <span
          key={p}
          className="flex h-[21px] flex-none items-center rounded-md bg-muted px-2 text-[11.5px]"
        >
          <span className="truncate">{p}</span>
        </span>
      ))}
      {list.length > shown.length && (
        <span className="flex-none font-mono text-[11px] text-muted-foreground">
          +{list.length - shown.length}
        </span>
      )}
    </div>
  );
}

/**
 * One line of the reason, with the whole text on hover.
 *
 * Only ever meaningful on the Rejected tab, which is why the column ships off by
 * default rather than sitting empty in every other queue.
 */
export function ReasonCell({ reason }: { reason: string | null }) {
  if (!reason) return <Dash />;
  return (
    <span
      className="block max-w-[22rem] truncate text-sm text-muted-foreground"
      title={reason}
    >
      {reason}
    </span>
  );
}

function Dash() {
  return (
    <span aria-hidden className="text-sm text-muted-foreground/60">
      —
    </span>
  );
}

/**
 * Day, abbreviated month, year — `28 Feb 2026`, `28. Feb. 2026` in German.
 *
 * Not all-numeric on purpose. `toLocaleDateString("en")` renders `02/28/2026`, and
 * a month-first date in a German-market product is genuinely ambiguous rather than
 * merely unfamiliar: an operator cannot tell `02/28` from `28/02` without knowing
 * which locale rendered it. A named month cannot be misread in either, and
 * `tabular-nums` still holds the digits in one vertical line down the column.
 */
export function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


/**
 * What the name column shows when the row has no name.
 *
 * The first eight characters of the id, monospaced by the caller's column. A row
 * with a blank identity cell cannot be told apart from its neighbours or reported
 * to anyone; eight characters of a GUID is ugly and is at least a handle.
 */
export function fallbackName(id: string): string {
  return id.slice(0, 8);
}

/** Shared class for a cell whose column should not wrap. */
export const NOWRAP = cn("whitespace-nowrap");
