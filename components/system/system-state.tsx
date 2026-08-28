import Link from "next/link"
import React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * "The code is the picture." Every system page opens with a dot-pattern panel
 * carrying the status code in mono at 88px — no drawn characters, no mascots.
 *
 * The five tints are the DS tint map, and they are a vocabulary, not decoration:
 *   slate — nothing is broken (404, offline, empty)
 *   amber — the account is the limit (401, 403, expiring docs)
 *   red   — our fault, data at risk (500, 502, lockout)
 *   blue  — known and temporary (503, 429, deploy)
 * 404 is the one panel on brand forest, which is why it alone prints the code
 * in white with the middle glyph in fresh green.
 */
export type SystemTint = "forest" | "amber" | "red" | "blue" | "slate"

const TINTS: Record<
  SystemTint,
  { panel: string; ring: string; code: string; label: string }
> = {
  forest: {
    panel: "dot-panel dot-panel-forest",
    ring: "ring-1 ring-foreground/10 shadow-popover",
    code: "text-white",
    label: "text-[var(--neutral-muted)]",
  },
  amber: {
    panel: "dot-panel dot-panel-amber",
    ring: "ring-1 ring-status-pending/20",
    code: "text-status-pending-deep",
    label: "text-status-pending-deep",
  },
  red: {
    panel: "dot-panel dot-panel-red",
    ring: "ring-1 ring-status-cancelled/20",
    code: "text-status-cancelled-deep",
    label: "text-status-cancelled-deep",
  },
  blue: {
    panel: "dot-panel dot-panel-blue",
    ring: "ring-1 ring-status-info/20",
    code: "text-status-info",
    label: "text-status-info",
  },
  slate: {
    panel: "dot-panel dot-panel-slate",
    ring: "ring-1 ring-foreground/10",
    code: "text-ink-soft",
    label: "text-ink-soft",
  },
}

function StatusCodePanel({
  tint,
  code,
  glyph,
  art,
}: {
  tint: SystemTint
  /** Empty when the state has no HTTP code — offline, for one. */
  code?: string
  glyph?: React.ReactNode
  /** Fills the panel instead of a code. The design uses a 62px mark offline. */
  art?: React.ReactNode
}) {
  const t = TINTS[tint]
  const digit =
    "font-mono text-[88px] leading-none font-medium tracking-[-0.05em]"
  return (
    <div
      className={cn(
        "relative flex h-44 w-80 items-center justify-center gap-0.5 rounded-2xl",
        t.panel,
        t.ring
      )}
    >
      {!code && art ? (
        <span className={cn("[&_svg]:size-[62px]", t.code)}>{art}</span>
      ) : !code ? null : tint === "forest" ? (
        // Forest is the only ground dark enough to carry fresh green as type,
        // and the DS puts fresh exactly here: one accent moment, mid-code.
        code.split("").map((ch, i) => (
          <span
            key={i}
            className={cn(
              digit,
              i === Math.floor((code.length - 1) / 2)
                ? "text-fresh"
                : "text-white"
            )}
          >
            {ch}
          </span>
        ))
      ) : (
        <span className={cn(digit, t.code)}>{code}</span>
      )}
      {glyph ? (
        <span className="absolute top-3.5 right-3.5 flex size-[34px] items-center justify-center rounded-md bg-background [&_svg]:size-[22px]">
          <span className={t.code}>{glyph}</span>
        </span>
      ) : null}
    </div>
  )
}

/**
 * The DS controls are 40/48; the system pages fix their own 46px at radius 14.
 * That is a deliberate in-between for a page whose entire content is one
 * decision, so it is stated here once rather than at each call site.
 */
export function SystemAction({
  children,
  href,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: "default" | "outline"
}) {
  const className = "h-[46px] gap-2 px-5 text-[15px] font-semibold"
  if (href) {
    return (
      <Button
        variant={variant}
        className={className}
        render={<Link href={href} />}
      >
        {children}
      </Button>
    )
  }
  return (
    <Button variant={variant} className={className} onClick={onClick}>
      {children}
    </Button>
  )
}

/**
 * One column, 560px, gap 16, centred — the same shape for all five faces so an
 * operator learns it once. The copy rules the spec sets are the caller's job:
 * the title says what happened (never "Oops!", never an apology), and `body`
 * answers the data question — was it saved, is it queued, is it lost.
 */
export function SystemState({
  tint,
  code,
  label,
  title,
  body,
  glyph,
  art,
  children,
  actions,
}: {
  tint: SystemTint
  /** Omit for a state with no HTTP code; pass `art` instead. */
  code?: string
  label: string
  title: string
  body: React.ReactNode
  glyph?: React.ReactNode
  /** Panel artwork, used when there is no code to print. */
  art?: React.ReactNode
  /** Anything between the body and the buttons — a trace row, a countdown. */
  children?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex w-full max-w-[560px] flex-col items-center gap-4 text-center">
      <StatusCodePanel tint={tint} code={code} glyph={glyph} art={art} />
      <span
        className={cn(
          "font-mono text-xs tracking-[0.12em] uppercase",
          TINTS[tint].label
        )}
      >
        {label}
      </span>
      <h1 className="font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.02em] text-foreground">
        {title}
      </h1>
      <p className="max-w-[440px] text-[15px] leading-[1.55] text-ink-soft text-pretty">
        {body}
      </p>
      {children}
      {actions ? (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2.5">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
