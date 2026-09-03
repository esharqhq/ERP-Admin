import Image from "next/image"
import React from "react"

/**
 * The shell every system page wears — sign-in aside, this is the "one shell,
 * five faces" from the admin system-pages spec. Bar 54px, the console canvas
 * behind, one centred column, footer 44px.
 *
 * The bar deliberately carries NO navigation. The spec is explicit about why:
 * "a broken page must not offer links that also break." The design shows
 * "System status" and "Support" on the right, but neither has a confirmed
 * destination in this app — the spec itself files the status host under "needs
 * a decision", and the only /support route is the operator's own inbound
 * inbox, which is inside the dashboard a 500 may have just failed to render.
 * So `nav` is opt-in and renders nothing by default: better an honest wordmark
 * than a link that dead-ends on the page whose job is to explain a dead end.
 */
export function SystemShell({
  children,
  nav,
  footerLeft,
  footerRight,
}: {
  children: React.ReactNode
  nav?: React.ReactNode
  /** Mono 11px, left. Route, code — whatever the response actually gave us. */
  footerLeft?: React.ReactNode
  /** Mono 11px, right. Timestamp. */
  footerRight?: React.ReactNode
}) {
  const hasFooter = Boolean(footerLeft || footerRight)
  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <header className="flex h-[54px] shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <span className="flex items-center gap-2.5">
          <Image
            src="/uyer-mark.png"
            alt="Uyer"
            width={26}
            height={26}
            priority
            className="size-[26px] object-contain"
          />
          <span className="font-heading text-[13px] font-bold tracking-[0.16em] text-foreground">
            UYER
          </span>
        </span>
        {nav ? (
          <span className="flex items-center gap-[18px] text-[13px] text-ink-soft">
            {nav}
          </span>
        ) : null}
      </header>

      <main className="flex flex-1 items-center justify-center p-8">
        {children}
      </main>

      {/* The spec's rule: "if there is no trace id, the footer is empty." An
          absent footer is the correct rendering of absent data, not a gap. */}
      {hasFooter ? (
        <footer className="flex h-11 shrink-0 items-center justify-between border-t border-border bg-background px-6 font-mono text-[11px] text-[var(--neutral-muted)]">
          <span>{footerLeft}</span>
          <span>{footerRight}</span>
        </footer>
      ) : null}
    </div>
  )
}
