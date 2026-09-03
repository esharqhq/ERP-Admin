"use client";

import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The identity band, shared by Owner detail and Worker detail.
 *
 * One card, two decks: who this is on top, and the four facts an admin reads off
 * the screen without opening anything underneath. Both detail screens run the
 * same skeleton on purpose — an owner and a worker are different subjects, but
 * "which account am I looking at" is the same question and should not be
 * answered by two differently shaped cards.
 *
 * It replaces a hero that repeated its own facts in a stat row beneath it. Every
 * value here appears once on the page; a count belongs in the header of the card
 * that lists the things it counts.
 */
export function IdentityBand({
  initials,
  icon,
  pictureUrl,
  name,
  qualifier,
  subtitle,
  badges,
  meta,
  aside,
  stats,
  actions,
  tiles,
}: {
  initials: string;
  /**
   * Replaces the initials in the avatar. A **place** gets a mark rather than a
   * monogram — the properties design draws a building icon, and two letters of
   * "Sonnenhof Wohnpark" say nothing an address does not.
   */
  icon?: ReactNode;
  pictureUrl?: string | null;
  name: string;
  /** Sits beside the name — a profession, a company form. */
  qualifier?: ReactNode;
  /**
   * Its **own line** under the name, above the badges — an address, which the
   * properties design puts there. `meta` shares the badge row instead, so a value
   * long enough to wrap belongs here and a short aside belongs there.
   */
  subtitle?: ReactNode;
  /** Status chips under the name. */
  badges?: ReactNode;
  /** One quiet line of secondary facts under the badges. */
  meta?: ReactNode;
  /**
   * A right-hand block that is neither a number nor a button — the properties
   * design's "Team with access". Rendered **before** `stats`, which is the order
   * that design draws, and separated from it by the same divider.
   */
  aside?: ReactNode;
  /** Right-hand numbers — rating, on-time, hours. Use `BandStat`. */
  stats?: ReactNode;
  /** Right-hand buttons — Call, Email. */
  actions?: ReactNode;
  /** The fact row. Use `FactTile`. */
  tiles?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar className="size-14 shrink-0 rounded-lg">
              {pictureUrl ? <AvatarImage src={pictureUrl} alt="" /> : null}
              <AvatarFallback className="rounded-lg bg-primary text-lg font-semibold text-primary-foreground">
                {icon ?? initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h1 className="truncate font-heading text-xl font-bold leading-tight tracking-tight sm:text-[22px]">
                  {name}
                </h1>
                {qualifier ? (
                  <span className="shrink-0 text-[13px] font-semibold text-accent-foreground">
                    {qualifier}
                  </span>
                ) : null}
              </div>
              {subtitle ? (
                <div className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
                  {subtitle}
                </div>
              ) : null}
              {badges || meta ? (
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
                  {badges}
                  {meta ? (
                    <span className="min-w-0 text-[11px] text-muted-foreground">
                      {meta}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {aside || stats || actions ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              {aside ? <div className="min-w-0">{aside}</div> : null}
              {aside && (stats || actions) ? <Divider /> : null}
              {stats ? (
                <div className="flex items-center gap-4">{stats}</div>
              ) : null}
              {stats && actions ? <Divider /> : null}
              {actions ? (
                <div className="flex items-center gap-2">{actions}</div>
              ) : null}
            </div>
          ) : null}
        </div>

        {tiles ? (
          /* Two across before `xl`: a tile holds a date range or an address at
             13px, and four columns inside a 1280px window minus the sidebar and
             the page padding leaves each about 157px — narrow enough to wrap a
             period mid-range. */
          <div className="grid gap-2.5 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-4">
            {tiles}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Hairline between two right-hand blocks. Hidden on a wrap, where it would sit
 *  across the row rather than between two columns. */
function Divider() {
  return <span aria-hidden className="hidden h-9 w-px bg-border sm:block" />;
}

/** One right-hand number. Kept narrow — three of these is the ceiling. */
export function BandStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-1.5 text-base font-semibold leading-none tabular-nums">
        {icon}
        {value}
      </span>
    </div>
  );
}

/**
 * Tones for a fact that can go wrong. `neutral` is every fact that cannot — an
 * email address has no expiry, so it never earns a colour.
 *
 * Text sits on a tint here, so the labels take the DS's *deep* status tones. The
 * chip tones are mixed for fills and land near 3:1 as 10px type; the deepened
 * pair `globals.css` ships for exactly that problem clears AA.
 */
const TILE_TONE = {
  neutral: {
    shell: "bg-muted/50 ring-border",
    icon: "bg-card text-muted-foreground ring-border",
    label: "text-muted-foreground",
    track: "bg-border",
    fill: "bg-primary",
    rest: "bg-muted-foreground/40",
  },
  warning: {
    shell: "bg-status-pending-tint/60 ring-status-pending/30",
    icon: "bg-card text-status-pending-deep ring-status-pending/25",
    label: "text-status-pending-deep",
    track: "bg-status-pending/20",
    fill: "bg-primary",
    rest: "bg-status-pending",
  },
  critical: {
    shell: "bg-status-cancelled-tint/60 ring-status-cancelled/30",
    icon: "bg-card text-status-cancelled-deep ring-status-cancelled/25",
    label: "text-status-cancelled-deep",
    track: "bg-status-cancelled/20",
    fill: "bg-primary",
    rest: "bg-status-cancelled",
  },
} as const;

export type FactTone = keyof typeof TILE_TONE;

/**
 * One cell of the fact row.
 *
 * `value` is a node rather than a string so a cell still resolving can hold a
 * skeleton instead of a dash — a dash is a statement, and "not loaded yet" is
 * not one. `hint` carries the tone in words; the value itself stays plain, so a
 * red cell is never red because of what the value *is* rather than because of
 * what is happening to it.
 */
export function FactTile({
  icon,
  label,
  value,
  hint,
  trailing,
  tone = "neutral",
  progress,
  mono = false,
  wrap = false,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Right-hand corner — a countdown, or a provenance tag. */
  trailing?: ReactNode;
  tone?: FactTone;
  /** 0..1. Draws the elapsed share of a period under the value. */
  progress?: number | null;
  mono?: boolean;
  /**
   * Lets the value run to two lines instead of truncating.
   *
   * For a value whose **tail carries information** — entry instructions are the
   * text a worker is actually sent with, and "Side gate Fidicinstraße · code
   * 4417#" loses the code to an ellipsis. Off by default: a tile row stays even
   * only while every value is one line, so this is for the one field that earns
   * the exception rather than for all of them.
   */
  wrap?: boolean;
}) {
  const t = TILE_TONE[tone];
  const pct =
    typeof progress === "number" && Number.isFinite(progress)
      ? Math.min(100, Math.max(0, progress * 100))
      : null;

  return (
    <div
      className={cn(
        // `items-start` once a value may wrap: centring a two-line value pushes
        // the icon off the label it belongs to.
        "flex min-w-0 gap-2.5 rounded-lg px-3 py-2.5 ring-1 ring-inset",
        wrap ? "items-start" : "items-center",
        t.shell,
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
          t.icon,
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-[10px] font-semibold uppercase tracking-[0.07em]",
              t.label,
            )}
          >
            {label}
          </span>
          {trailing ? (
            <span className={cn("shrink-0 text-[10px] font-semibold", t.label)}>
              {trailing}
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            "text-[13px] font-medium leading-snug text-foreground",
            wrap ? "line-clamp-2" : "truncate",
            mono && "tabular-nums",
          )}
        >
          {value}
        </span>
        {hint ? (
          <span className={cn("truncate text-[11px] leading-snug", t.label)}>
            {hint}
          </span>
        ) : null}
        {pct !== null ? (
          <span
            aria-hidden
            className={cn(
              "mt-1 flex h-1 overflow-hidden rounded-full",
              t.track,
            )}
          >
            <span className={t.fill} style={{ width: `${pct}%` }} />
            <span className={cn("flex-1", t.rest)} />
          </span>
        ) : null}
      </span>
    </div>
  );
}
