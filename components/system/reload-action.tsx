"use client"

import React from "react"

import { SystemAction } from "@/components/system/system-state"

/**
 * `SystemAction` takes an `onClick`, which a server component cannot pass. The
 * 503 page is server-rendered so it can read `MAINTENANCE_UNTIL` at runtime, so
 * its one action needs this three-line client boundary rather than turning the
 * whole page into a client component.
 */
export function ReloadAction({ children }: { children: React.ReactNode }) {
  return (
    <SystemAction onClick={() => location.reload()}>{children}</SystemAction>
  )
}
