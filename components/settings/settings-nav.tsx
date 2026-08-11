"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Settings, UserCog, ShieldCheck, Briefcase, Tag } from "lucide-react"
import { useCurrentPermissions } from "@/hooks/use-current-permissions"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type SettingsNavItem = {
  href: string
  labelKey: string
  icon: React.ElementType
  permission: string
  exact: boolean
}

const NAV_ITEMS: SettingsNavItem[] = [
  { href: "/dashboard/settings",        labelKey: "general",  icon: Settings,    permission: "system:settings:read",   exact: true  },
  { href: "/dashboard/settings/admins", labelKey: "admins",   icon: UserCog,     permission: "admin:list",             exact: false },
  { href: "/dashboard/settings/professions", labelKey: "professions", icon: Briefcase,  permission: "profession:create",      exact: false },
  // Gated on :update rather than :create — update is what the deactivate toggle
  // needs, and it is also what makes the inactive rows visible at all.
  { href: "/dashboard/settings/property-categories", labelKey: "propertyCategories", icon: Tag, permission: "property_category:update", exact: false },
  { href: "/dashboard/settings/audit",       labelKey: "auditLog",    icon: ShieldCheck, permission: "system:audit:read",      exact: false },
]

export function SettingsNav() {
  const rawPathname = usePathname()
  const locale = useLocale()
  const pathname = rawPathname.replace(`/${locale}`, "") || "/"
  const { permissions } = useCurrentPermissions()
  const t = useTranslations("nav")

  // Fail CLOSED on cold start (null) so a limited admin never flashes settings
  // tabs they can't open; a refresh hydrates the set from cache, so null is
  // rare and rendered as a short skeleton below.
  const canSee = (perm: string) => permissions?.has(perm) ?? false

  if (permissions === null) {
    return (
      <nav className="flex flex-row flex-nowrap gap-1 md:flex-col md:gap-0.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
      </nav>
    )
  }

  return (
    <nav className="flex flex-row flex-nowrap gap-1 overflow-x-auto md:flex-col md:gap-0.5 md:overflow-x-visible">
      {NAV_ITEMS.filter((item) => canSee(item.permission)).map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex h-9 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
              "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              "[&_svg]:size-[18px] [&_svg]:opacity-75",
              isActive && "bg-primary/10 text-primary font-semibold [&_svg]:opacity-100",
              isActive && "md:before:absolute md:before:left-0 md:before:top-1/2 md:before:-translate-y-1/2 md:before:h-5 md:before:w-[3px] md:before:rounded-r-full md:before:bg-primary",
            )}
          >
            <item.icon />
            <span>{t(item.labelKey)}</span>
          </Link>
        )
      })}
    </nav>
  )
}
