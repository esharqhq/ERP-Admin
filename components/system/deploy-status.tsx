"use client"

import { useTranslations } from "next-intl"

import { useHealth } from "@/hooks/use-health"

/**
 * The mono strip at the foot of the sign-in brand panel: version · region ·
 * health.
 *
 * The design shows a green dot and "All systems normal" hardcoded. That reads
 * backwards — the spec's own reason for the indicator is "so a failing console
 * is visible before the operator even types", and a fixed green dot says NORMAL
 * loudest during exactly the outage it exists to reveal. So the dot is driven by
 * a real request, and it renders ONLY when there is something real to ask:
 * a health URL. Unset, the strip is version (and region) alone.
 *
 * Region and health URL arrive as PROPS read by the server page from
 * `DEPLOY_REGION` / `HEALTH_URL`, not as `NEXT_PUBLIC_*`. Those are inlined at
 * build time, so a `NEXT_PUBLIC` version could not be changed by whoever runs
 * the container — only by whoever rebuilt it.
 *
 * A plain reachability ping was considered and rejected for the same reason: an
 * API answering 500 on every route is still reachable, so the dot would go green
 * through a total outage. The check therefore requires a health endpoint that
 * reports status, which is filed in BACKEND-ASKS.md.
 *
 * The probe itself lives in `useHealth` — the dashboard topbar's status pill
 * needs the same one, and the reasoning above is what the two share.
 */

export function DeployStatus({
  version,
  region,
  healthUrl,
}: {
  version: string
  region?: string
  healthUrl?: string
}) {
  const t = useTranslations("login")
  const health = useHealth(healthUrl)

  return (
    <div className="flex items-center gap-2.5 font-mono text-[11px] text-white/50">
      <span>v{version}</span>
      {region ? (
        <>
          <span>·</span>
          <span>{region}</span>
        </>
      ) : null}
      {healthUrl && health !== "checking" ? (
        <span
          className={
            health === "ok"
              ? "ml-auto flex items-center gap-1.5 text-fresh"
              : "ml-auto flex items-center gap-1.5 text-status-pending"
          }
        >
          <span
            className={
              health === "ok"
                ? "size-[7px] rounded-full bg-fresh"
                : "size-[7px] rounded-full bg-status-pending"
            }
          />
          {health === "ok" ? t("allSystemsNormal") : t("systemsDegraded")}
        </span>
      ) : null}
    </div>
  )
}
