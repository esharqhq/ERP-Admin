"use client"

import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ChevronLeft, Home, ShieldOff } from "lucide-react"

import { SystemShell } from "@/components/system/system-shell"
import { SystemAction, SystemState } from "@/components/system/system-state"

/**
 * 403 — amber, because the page is fine and the account is the limit. Naming
 * the missing permission is the whole point: it turns "access denied" into
 * something an operator can actually relay to whoever grants roles.
 *
 * The permission comes from `?permission=billing:read` so any page that already
 * knows which grant it needs can redirect here without a new API. When it is
 * absent the copy falls back to the generic line rather than inventing a scope.
 *
 * The design's "Request access" button is NOT here. The spec files it under
 * needs-a-decision — "There is no route for it yet — either add one or make the
 * button open support" — and neither exists, so the page offers the two exits
 * that do work instead of a button that would fail.
 */
export default function Forbidden() {
  const t = useTranslations("system.forbidden")
  const permission = useSearchParams().get("permission")

  return (
    <SystemShell footerLeft={permission ? `required: ${permission}` : null}>
      <SystemState
        tint="amber"
        code="403"
        label={t("label")}
        title={t("title")}
        body={
          permission
            ? t.rich("body", {
                permission,
                // The DS puts every code, id and permission key in the mono
                // face; a scope like `billing:read` read back over a support
                // call is exactly the case that rule exists for.
                code: (chunks) => (
                  <span className="font-mono text-[14px]">{chunks}</span>
                ),
              })
            : t("bodyGeneric")
        }
        glyph={<ShieldOff />}
        actions={
          <>
            {/* "One primary action. The verb that fixes this page." The
                design's primary is "Request access", which has no route here,
                so going back is what actually resolves this — the dashboard
                becomes the ghost. */}
            <SystemAction onClick={() => history.back()}>
              <ChevronLeft />
              {t("back")}
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
