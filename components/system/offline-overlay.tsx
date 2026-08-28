"use client"

import React from "react"
import { useTranslations } from "next-intl"
import { RefreshCw, WifiOff } from "lucide-react"

import { SystemShell } from "@/components/system/system-shell"
import { SystemAction, SystemState } from "@/components/system/system-state"

/**
 * Offline is a state, not a route — the operator does not navigate to it, the
 * network takes them there. So it mounts once in the locale layout and covers
 * the console whenever the browser reports no connection.
 *
 * `useSyncExternalStore` rather than useState+useEffect: the browser's
 * connectivity IS an external store, `getServerSnapshot` returns online so the
 * server never renders the overlay, and there is no setState-in-effect and no
 * hydration mismatch.
 *
 * The design's "Queued actions 3" and "Last synced 4 min ago" rows are NOT here,
 * and that is a functional gap rather than a design decision: this console has no
 * offline mutation queue, so a count would promise a behaviour that does not
 * exist — an operator who read "3 queued" would believe work was saved. The copy
 * says what is actually true instead. Filed in BACKEND-ASKS.md.
 */
function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

export function OfflineOverlay() {
  const t = useTranslations("system.offline")
  const online = React.useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  )

  if (online) return null

  return (
    <div className="fixed inset-0 z-[100]" role="alert" aria-live="assertive">
      <SystemShell>
        <SystemState
          tint="slate"
          label={t("label")}
          title={t("title")}
          body={t("body")}
          art={<WifiOff strokeWidth={1.6} />}
          actions={
            <SystemAction onClick={() => location.reload()}>
              <RefreshCw />
              {t("retry")}
            </SystemAction>
          }
        />
      </SystemShell>
    </div>
  )
}
