import { getTranslations } from "next-intl/server"
import { RefreshCw, Wrench } from "lucide-react"

import { SystemShell } from "@/components/system/system-shell"
import { SystemState } from "@/components/system/system-state"
import { ReloadAction } from "@/components/system/reload-action"
import { MaintenanceCountdown } from "./maintenance-countdown"

/**
 * 503 — blue, the DS tint for "known and temporary". Reached by rewrite from
 * `proxy.ts` while `MAINTENANCE_MODE=1`, ahead of the auth check, so an operator
 * who is not signed in sees maintenance rather than a login form that cannot
 * succeed. The rewrite answers a real 503, so uptime monitors do not record the
 * outage as a healthy 200.
 *
 * The design's window and countdown come from `MAINTENANCE_UNTIL` (ISO). The
 * spec flags those numbers as "placeholders — confirm the real thresholds so the
 * countdown is not a design invention", so unset they are absent rather than
 * decorative.
 *
 * "Notify me when it is back" is not here: it needs a subscription endpoint that
 * does not exist, and the page explaining an outage is the worst place for a
 * button that silently does nothing. Reloading is the action that works.
 */
export default async function Maintenance() {
  const t = await getTranslations("system.maintenance")
  const until = process.env.MAINTENANCE_UNTIL

  return (
    <SystemShell>
      <SystemState
        tint="blue"
        code="503"
        label={t("label")}
        title={t("title")}
        body={t("body")}
        glyph={<Wrench />}
        actions={
          <ReloadAction>
            <RefreshCw />
            {t("retry")}
          </ReloadAction>
        }
      >
        {until ? <MaintenanceCountdown until={until} /> : null}
      </SystemState>
    </SystemShell>
  )
}
