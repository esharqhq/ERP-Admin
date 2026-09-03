"use client"

import React from "react"
import { useTranslations } from "next-intl"

/**
 * The only part of the 503 that needs to be client-side: a ticking "~N min
 * left". The deadline is read on the server so it is a runtime setting, not a
 * value baked into the bundle at build time.
 */
export function MaintenanceCountdown({ until }: { until: string }) {
  const t = useTranslations("system.maintenance")
  const end = new Date(until).getTime()

  const subscribe = React.useCallback((onChange: () => void) => {
    const id = setInterval(onChange, 30_000)
    return () => clearInterval(id)
  }, [])

  // A clock is an external store: this reads it on every notification without a
  // setState-in-effect, and renders nothing on the server so the first paint
  // cannot disagree with hydration.
  const minutes = React.useSyncExternalStore(
    subscribe,
    () => Math.max(0, Math.round((end - Date.now()) / 60000)),
    () => null
  )

  if (Number.isNaN(end) || minutes === null) return null
  return (
    <span className="font-mono text-xs text-status-info">
      {t("minutesLeft", { minutes })}
    </span>
  )
}
