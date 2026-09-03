"use client"

import "./globals.css"

/**
 * `global-error.tsx` replaces the root layout, so nothing from `[locale]/layout`
 * survives here — no next-intl provider, no font variables. That is why this
 * page cannot use `useTranslations` and is intentionally English-only: it fires
 * when the layout itself failed, and a translation lookup is one more thing
 * that can fail at exactly the wrong moment.
 *
 * It also means the styling is written against the tokens directly rather than
 * against the shell components, which assume the locale layout's font classes.
 * One token genuinely does not survive: `--font-geist-*` is set by the
 * `[locale]` layout's `<html>` classes, so `font-mono` here falls back to
 * `ui-monospace`. That is accepted rather than fixed — re-declaring the font on
 * the page that renders because the layout crashed adds a failure mode to the
 * last thing standing, and the only mono text here is the code and the digest.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-canvas p-8 text-center">
          <div className="dot-panel dot-panel-red flex h-44 w-80 items-center justify-center rounded-2xl ring-1 ring-status-cancelled/20">
            <span className="font-mono text-[88px] leading-none font-medium tracking-[-0.05em] text-status-cancelled-deep">
              500
            </span>
          </div>
          <span className="font-mono text-xs tracking-[0.12em] text-status-cancelled-deep uppercase">
            Server error
          </span>
          <h1 className="text-[28px] leading-[1.15] font-bold tracking-[-0.02em]">
            Something broke on our side
          </h1>
          <p className="max-w-[440px] text-[15px] leading-[1.55] text-ink-soft">
            The console failed to start. Nothing was saved, so retrying is safe.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-1 h-[46px] rounded-lg bg-primary px-5 text-[15px] font-semibold text-primary-foreground"
          >
            Try again
          </button>
          {error.digest ? (
            <span className="font-mono text-[11px] text-[var(--neutral-muted)]">
              digest: {error.digest}
            </span>
          ) : null}
        </div>
      </body>
    </html>
  )
}
