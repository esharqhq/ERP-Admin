"use client"

import { usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { ChevronLeft, Home } from "lucide-react"

import { SystemShell } from "@/components/system/system-shell"
import { SystemAction, SystemState } from "@/components/system/system-state"

/**
 * 404 — the only state page on brand forest, and per the spec the only one with
 * no glyph chip: the code alone carries it.
 *
 * Two actions and nothing else. The spec is explicit — "No search, no
 * suggestions" — because a console 404 is almost always a merged or archived
 * record, and a search box invites the operator to hunt for something that no
 * longer exists.
 */
export default function NotFound() {
  const t = useTranslations("system.notFound")
  const locale = useLocale()
  // The footer prints the route the operator asked for, not the internal one —
  // the `/en` prefix is routing plumbing and only makes the path harder to read
  // back over a support call. Same strip the sidebar does for active-nav.
  const pathname = usePathname().replace(`/${locale}`, "") || "/"

  return (
    <SystemShell
      footerLeft={pathname ? `path: ${pathname}` : null}
      footerRight={
        // Rendered inline rather than set from an effect: the server stamps
        // when the request failed, the client re-stamps a moment later, and
        // `suppressHydrationWarning` is exactly React's escape hatch for text
        // that is legitimately time-dependent. Deferring it to a mount effect
        // instead would cost a cascading render for a footer line.
        <span suppressHydrationWarning>
          {new Date().toLocaleString(locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      }
    >
      <SystemState
        tint="forest"
        code="404"
        label={t("label")}
        title={t("title")}
        body={t("body")}
        actions={
          <>
            <SystemAction href="/dashboard">
              <Home />
              {t("dashboard")}
            </SystemAction>
            <SystemAction variant="outline" onClick={() => history.back()}>
              <ChevronLeft />
              {t("back")}
            </SystemAction>
          </>
        }
      />
    </SystemShell>
  )
}
