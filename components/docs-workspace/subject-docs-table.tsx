"use client";

import { useSyncExternalStore } from "react";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RowLink } from "@/components/ui/row-link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import {
  coverPresentation,
  type CoverPresentation,
  type SubjectRow,
} from "@/lib/onboarding/subject-row";
import type { ContractPhase } from "@/lib/types/onboarding.types";
import { cn } from "@/lib/utils";

const COLUMN_COUNT = 6;

/**
 * The Docs queue table — **one component, both sides**. The owner and worker
 * screens differ only in the rows they hand it and the detail route they link to,
 * which is the point: two copies of this table is how the two screens drifted into
 * different column sets, different tab meanings and one hardcoded English count.
 *
 * Reads as a compliance register rather than a generic data grid: tracked small-caps
 * headers, tabular figures so a column of dates scans as one vertical line, and a
 * single piece of colour per row — the status badge — with the cover strip beneath it
 * as the one graphic element. Everything else stays quiet on purpose.
 */
export function SubjectDocsTable({
  rows,
  hrefFor,
  isLoading,
  error,
  isFiltered,
}: {
  rows: SubjectRow[];
  hrefFor: (row: SubjectRow) => string;
  isLoading: boolean;
  error: unknown;
  /** Distinguishes "no matches for this filter" from "nobody has submitted". */
  isFiltered: boolean;
}) {
  const t = useTranslations("docsWorkspace");
  const tOnboarding = useTranslations("onboarding");

  const today = useToday();

  // Proportional widths, not pixel ones, so the row spreads evenly at any width.
  //
  // Two failure modes to avoid, and they pull in opposite directions. Leave the name
  // column as the only flexible one and it absorbs every spare pixel on a wide
  // monitor, opening a few hundred of them between a short name and its status. Pin
  // every column to pixels instead and the whole row crams into the left third with
  // a dead zone to its right. Percentages that fill the table put the slack into all
  // four data columns at once, where it reads as generous spacing rather than as a
  // gap, and the name column still cannot grow past its share.
  //
  // The avatar and chevron stay in pixels — both hold a fixed-size element, so a
  // share of the viewport would only pad them.
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-14" />
          <TableHead className={cn(HEAD, "w-[30%]")}>
            {t("columns.fullName")}
          </TableHead>
          <TableHead className={cn(HEAD, "w-[20%]")}>
            {t("columns.status")}
          </TableHead>
          <TableHead className={cn(HEAD, "w-[20%]")}>
            {t("columns.coverFrom")}
          </TableHead>
          <TableHead className={cn(HEAD, "w-[22%]")}>
            {t("columns.coverTo")}
          </TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i} className="hover:bg-transparent">
              <TableCell className="py-3">
                <Skeleton className="size-8 rounded-full" />
              </TableCell>
              <TableCell colSpan={COLUMN_COUNT - 1}>
                <Skeleton className="h-8 w-full rounded-md" />
              </TableCell>
            </TableRow>
          ))
        ) : error ? (
          /* A failed request must not read as "nobody has submitted". */
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={COLUMN_COUNT}
              className="py-12 text-center text-sm text-destructive"
            >
              {isPermissionDenied(error)
                ? tOnboarding("permissionDenied")
                : tOnboarding(
                    `apiErrors.${describeApiError(error)?.labelKey ?? "unknown"}`,
                  )}
            </TableCell>
          </TableRow>
        ) : rows.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={COLUMN_COUNT}
              className="py-12 text-center text-sm text-muted-foreground"
            >
              {isFiltered ? t("emptyFiltered") : t("empty")}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <SubjectRowCells
              key={row.id}
              row={row}
              href={hrefFor(row)}
              today={today}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}

/** Small-caps tracked register head — this table only, not a global restyle. */
const HEAD =
  "text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground";

const DAY_MS = 86_400_000;

/**
 * Start of today, in ms — `0` while the clock is unknown (server render).
 *
 * The clock is external mutable state, so it is read through
 * `useSyncExternalStore` rather than called during render. **Quantizing to the day
 * is what makes that safe:** the snapshot is compared on every render, so an
 * unquantized `Date.now()` would differ every time and spin forever. A day index is
 * stable for the whole session, and it is also the reading the cells actually want —
 * "days left" on a date-only deadline should count from the start of today, not from
 * the current minute.
 */
function useToday(): number {
  return useSyncExternalStore(
    subscribeNever,
    () => Math.floor(Date.now() / DAY_MS) * DAY_MS,
    () => 0,
  );
}

/** The clock does not change within a session's render lifetime. */
function subscribeNever() {
  return () => {};
}

function SubjectRowCells({
  row,
  href,
  today,
}: {
  row: SubjectRow;
  href: string;
  today: number;
}) {
  const t = useTranslations("docsWorkspace");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();
  const status = onboardingStatusPresentation(row.onboardingStatus);
  // No clock yet (server render) → dates only, no strip and no annotation.
  const cover =
    row.cover && today > 0 ? coverPresentation(row.cover, today) : null;

  return (
    <TableRow className="relative cursor-pointer hover:bg-accent/40">
      <TableCell className="py-2.5">
        <RowLink href={href} label={row.fullName ?? undefined} />
        {/* Monochrome on purpose: the status badge owns the only colour in the row.
            `avatarUrl` is null on every row until the list DTOs carry a picture —
            when they do, the image renders here and nothing else changes. */}
        <Avatar>
          {row.avatarUrl ? (
            <AvatarImage src={row.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback className="text-xs font-medium">
            {initials(row.fullName)}
          </AvatarFallback>
        </Avatar>
      </TableCell>

      <TableCell className="py-2.5">
        {/* The column is bounded now, so a long legal name or a long company
            mailbox truncates rather than widening the row — `title` keeps the
            full value reachable. */}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className="truncate font-medium leading-none"
            title={row.fullName ?? undefined}
          >
            {row.fullName ?? "—"}
          </span>
          <span
            className="truncate text-xs leading-none text-muted-foreground"
            title={row.email ?? undefined}
          >
            {row.email ?? "—"}
          </span>
        </div>
      </TableCell>

      <TableCell className="py-2.5">
        <Badge variant={status.variant} className={status.className}>
          {tOnboarding(`status.${status.labelKey}`)}
        </Badge>
      </TableCell>

      <TableCell className="py-2.5 text-sm tabular-nums">
        {row.cover ? formatDate(row.cover.from, locale) : "—"}
      </TableCell>

      <TableCell className="py-2.5">
        {row.cover && cover ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm leading-none tabular-nums">
              {formatDate(row.cover.to, locale)}
            </span>
            <span className={cn("text-[11px] leading-none", TEXT_TONE[cover.tone])}>
              {/* Only rows that need attention are annotated — annotating every row
                  would make the annotation invisible. The reading is always
                  available to a screen reader, annotated or not. */}
              <span className={cover.annotate ? undefined : "sr-only"}>
                {coverNote(row.cover.phase, cover, t)}
              </span>
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{t("noContract")}</span>
        )}
      </TableCell>

      <TableCell className="py-2.5 text-right">
        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
      </TableCell>
    </TableRow>
  );
}

const TEXT_TONE: Record<CoverPresentation["tone"], string> = {
  muted: "text-muted-foreground",
  warning: "text-amber-700 dark:text-amber-400",
  critical: "text-destructive",
};

function coverNote(
  phase: ContractPhase,
  cover: CoverPresentation,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  // `Terminated` is a period cut short, never an expiry — rendering it as "expired"
  // would misreport a force-terminate or a document lapse as a natural end.
  if (phase === "Terminated") return t("cover.endedEarly");
  if (phase === "Expired" || phase === "Lapsed") return t("cover.expired");
  if (cover.pending) return t("cover.awaitingSignature");
  // Said before "days left": a period that has not begun does not cover today, and
  // that is the fact an operator must not misread off two innocent-looking dates.
  if (cover.daysUntilStart > 0)
    return t("cover.startsIn", { days: cover.daysUntilStart });
  if (cover.daysLeft < 0) return t("cover.expired");
  if (cover.daysLeft === 0) return t("cover.endsToday");
  return t("cover.daysLeft", { days: cover.daysLeft });
}

/**
 * Day, abbreviated month, year — `28 Feb 2026`, `28. Feb. 2026` in German.
 *
 * Not all-numeric on purpose. `toLocaleDateString("en")` renders `02/28/2026`, and
 * a month-first date in a German-market product is not merely unfamiliar, it is
 * genuinely ambiguous: an operator reading a contract boundary cannot tell
 * `02/28` from `28/02` without knowing which locale rendered it. A named month
 * cannot be misread in either locale, and `tabular-nums` still holds the digits in
 * one vertical line down the column.
 */
function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** First letter of the first and last word — "Anna Maria Schmidt" → "AS". */
function initials(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}
