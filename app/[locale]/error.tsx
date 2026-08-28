"use client"

import { useTranslations } from "next-intl"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import React from "react"

import { SystemShell } from "@/components/system/system-shell"
import { SystemAction, SystemState } from "@/components/system/system-state"

/**
 * 500 — red, because this is the one class of failure that is ours and may have
 * put data at risk.
 *
 * The spec shows a copyable trace id here and calls it out as needing a
 * decision: "The footer and the copy button assume the API returns a
 * correlation id on 5xx. If it does not, both come off the page." This app's
 * HTTP client surfaces no correlation id, and there is no error-reporting SDK
 * installed, so two things are deliberately absent rather than faked — the
 * trace row, and any claim that engineering was notified. `digest` is the only
 * real identifier Next gives us, so that is what the footer prints.
 *
 * The body still answers the operator's actual question first ("nothing was
 * saved") before offering the retry.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("system.serverError")

  return (
    <SystemShell footerLeft={error.digest ? `digest: ${error.digest}` : null}>
      <SystemState
        tint="red"
        code="500"
        label={t("label")}
        title={t("title")}
        body={t("body")}
        glyph={<AlertTriangle />}
        actions={
          <>
            <SystemAction onClick={reset}>
              <RefreshCw />
              {t("retry")}
            </SystemAction>
            <SystemAction variant="outline" href="/dashboard">
              <Home />
              {t("dashboard")}
            </SystemAction>
          </>
        }
      />
    </SystemShell>
  )
}
