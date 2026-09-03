"use client";

import { AlertTriangle, Check, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  AttentionFlag,
  AttentionSummary,
  AttentionUnknown,
} from "@/lib/detail/attention";

/**
 * Text on a tint, so the *deep* status tones rather than the chip tones.
 * `--status-pending` at 12px on its own tint lands near 3:1; the deepened tone
 * the DS ships for exactly this problem clears AA. Icons take the same colour —
 * they are read as part of the sentence, not as decoration.
 */
const TONE: Record<
  AttentionFlag["tone"],
  { chip: string; text: string; sub: string }
> = {
  critical: {
    chip: "bg-status-cancelled-tint ring-status-cancelled/25",
    text: "text-status-cancelled-deep",
    sub: "text-status-cancelled-deep/75",
  },
  warning: {
    chip: "bg-status-pending-tint ring-status-pending/25",
    text: "text-status-pending-deep",
    sub: "text-status-pending-deep/75",
  },
};

function FlagChip({ flag }: { flag: AttentionFlag }) {
  const tone = TONE[flag.tone];

  const body = (
    <>
      <AlertTriangle className={cn("size-4 shrink-0", tone.text)} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate text-xs font-semibold leading-tight",
            tone.text,
          )}
        >
          {flag.title}
        </span>
        <span className={cn("truncate text-[11px] leading-tight", tone.sub)}>
          {flag.detail}
        </span>
      </span>
      {flag.action ? (
        <span className={cn("shrink-0 text-[11px] font-semibold", tone.text)}>
          {flag.action.label}
        </span>
      ) : null}
    </>
  );

  const shell = cn(
    "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 ring-1 ring-inset",
    tone.chip,
  );

  // A chip whose verb has somewhere to go is the link; one without stays inert
  // rather than becoming a link to the page it is already on.
  //
  // A `#`-href points at a card further down *this* screen — the worker's
  // document verdicts are decided here, so sending the admin to another route to
  // do it would be a lie. That is a plain anchor: `Link` would prefix it with
  // the locale segment and navigate instead of scrolling.
  if (!flag.action) return <div className={shell}>{body}</div>;

  const interactive = cn(shell, "transition-opacity hover:opacity-80");

  return flag.action.href.startsWith("#") ? (
    <a href={flag.action.href} className={interactive}>
      {body}
    </a>
  ) : (
    <Link href={flag.action.href} className={interactive}>
      {body}
    </Link>
  );
}

function UnknownChip({ unknown }: { unknown: AttentionUnknown }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2 ring-1 ring-inset ring-border">
      <Info className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-semibold leading-tight text-foreground/70">
          {unknown.title}
        </span>
        <span className="truncate text-[11px] leading-tight text-muted-foreground">
          {unknown.detail}
        </span>
      </span>
    </div>
  );
}

/**
 * What is waiting on this account, above everything else on the page.
 *
 * The strip is **always rendered** once its sources have settled — including
 * when there is nothing to report, where it collapses to a single green line.
 * Removing it on a quiet account would make "no strip" and "not loaded yet"
 * look identical, and would move the rest of the page every time an account
 * turned out to be clean.
 *
 * The headline counts *known* sources. A refused source becomes a grey slot and
 * turns the count into "1 of 2 known" — it never silently drops out and leaves
 * a smaller, cleaner-looking number behind.
 */
export function AttentionStrip({
  summary,
  isLoading = false,
  className,
}: {
  summary: AttentionSummary;
  /** Holds the strip's height while the sources resolve. */
  isLoading?: boolean;
  className?: string;
}) {
  const t = useTranslations("detail.attention");

  if (isLoading) {
    return <Skeleton className={cn("h-[68px] w-full rounded-xl", className)} />;
  }

  if (summary.allClear) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-card px-4 py-3 shadow-card ring-1 ring-foreground/10",
          className,
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-status-verified-tint text-status-verified">
          <Check className="size-3.5" strokeWidth={2.5} />
        </span>
        <span className="text-[13px] font-semibold text-status-verified">
          {t("clearTitle")}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("clearDetail")}
        </span>
      </div>
    );
  }

  const headline = summary.blocking
    ? t("blocking")
    : summary.unknowns.length > 0
      ? t("partial", { known: summary.known, total: summary.total })
      : t("count", { count: summary.flags.length });

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl bg-card px-4 py-3 shadow-card ring-1 ring-foreground/10 lg:flex-row lg:items-center lg:gap-4",
        className,
      )}
    >
      <div className="flex shrink-0 flex-col lg:border-r lg:border-border lg:pr-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          {t("label")}
        </span>
        <span
          className={cn(
            "text-[15px] font-semibold tabular-nums",
            summary.blocking ? "text-status-cancelled-deep" : "text-foreground",
          )}
        >
          {headline}
        </span>
      </div>

      {/* Wraps rather than scrolls: a fourth slot on a narrow window belongs on
          a second line, not off the edge where nobody scrolls to find it. */}
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
        {summary.flags.map((flag) => (
          <div key={flag.id} className="flex min-w-[15rem] flex-1">
            <FlagChip flag={flag} />
          </div>
        ))}
        {summary.unknowns.map((unknown) => (
          <div key={unknown.id} className="flex min-w-[15rem] flex-1">
            <UnknownChip unknown={unknown} />
          </div>
        ))}
      </div>
    </div>
  );
}
