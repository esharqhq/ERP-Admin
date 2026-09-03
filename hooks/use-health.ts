"use client"

import * as React from "react"

export type Health = "checking" | "ok" | "down"

/**
 * One probe of the deployment's health endpoint.
 *
 * Extracted from `components/system/deploy-status.tsx` when the dashboard
 * topbar grew a status pill of its own: the reasoning behind the probe is the
 * part worth sharing, not just the fetch. Both call sites render NOTHING while
 * `healthUrl` is unset, because the designs print "All systems normal" as a
 * fixed string and a fixed green dot says NORMAL loudest during exactly the
 * outage the indicator exists to reveal.
 *
 * A plain reachability ping is not enough either — an API answering 500 on
 * every route is still reachable — so this wants a real health endpoint that
 * reports status. That ask is filed in BACKEND-ASKS.md; `HEALTH_URL` is a
 * server env deliberately kept out of `NEXT_PUBLIC_*`, which is inlined at
 * build time and so could not be changed by whoever runs the container.
 *
 * Single-shot with a 5s deadline. Not a poll: a request every few seconds from
 * every open console would cost more than it tells anyone.
 */
export function useHealth(healthUrl?: string): Health {
  const [health, setHealth] = React.useState<Health>("checking")

  React.useEffect(() => {
    if (!healthUrl) return
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 5000)
    fetch(healthUrl, { signal: ac.signal, cache: "no-store" })
      .then((r) => setHealth(r.ok ? "ok" : "down"))
      .catch(() => setHealth("down"))
      .finally(() => clearTimeout(timer))
    return () => {
      clearTimeout(timer)
      ac.abort()
    }
  }, [healthUrl])

  return health
}
