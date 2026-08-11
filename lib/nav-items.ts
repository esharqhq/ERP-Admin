import {
  LayoutDashboard,
  Users,
  Building2,
  Home,
  Truck,
  ClipboardList,
  FolderOpen,
  Settings,
  TicketCheck,
  CalendarOff,
  CalendarCheck,
  Briefcase,
  Inbox,
} from "lucide-react"
import { type LucideIcon } from "lucide-react"

export type NavItem = {
  title: string
  labelKey: string
  url: string
  icon: LucideIcon
  /** Backend [RequirePermission] code gating this section; omit for always-visible. */
  permission?: string
  /** Visible if the admin holds ANY of these codes (use instead of `permission` for grouped entry points). */
  anyOf?: string[]
}

export type NavGroup = {
  id: string
  label: string
  labelKey: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    labelKey: "nav.dashboard",
    items: [
      { title: "Overview",       labelKey: "nav.overview",       url: "/dashboard",               icon: LayoutDashboard },
    ],
  },
  {
    id: "owner",
    label: "Owner",
    labelKey: "nav.owner",
    items: [
      { title: "Owners",     labelKey: "nav.owners",     url: "/dashboard/owners",          icon: Building2,  permission: "owner:list" },
      { title: "Properties", labelKey: "nav.properties", url: "/dashboard/properties",      icon: Home,       permission: "property:list" },
      // Same label and same icon as the worker group's entry: one workspace, two
      // subjects. Contract authoring lives *inside* this screen, which is why the
      // owner group no longer carries a separate Contracts entry.
      { title: "Documents",  labelKey: "nav.documents",  url: "/dashboard/owner-documents", icon: FolderOpen, permission: "kyc:read" },
    ],
  },
  {
    id: "worker",
    label: "Worker",
    labelKey: "nav.worker",
    items: [
      { title: "Workers",     labelKey: "nav.workers",     url: "/dashboard/workers",          icon: Users,         permission: "worker:list" },
      { title: "Tasks",       labelKey: "nav.tasks",       url: "/dashboard/tasks",            icon: ClipboardList, permission: "task:list_any" },
      { title: "Dispatching", labelKey: "nav.dispatching", url: "/dashboard/dispatch",         icon: Truck,         permission: "task:assign_worker_any" },
      { title: "Leave",       labelKey: "nav.leave",       url: "/dashboard/leave",            icon: CalendarOff,   permission: "worker_leave_request:list_any" },
      { title: "Attendance",  labelKey: "nav.attendance",  url: "/dashboard/attendance",       icon: CalendarCheck, permission: "system:attendance:read" },
      { title: "Documents",   labelKey: "nav.documents",   url: "/dashboard/worker-documents", icon: FolderOpen,    permission: "worker:list" },
    ],
  },
  {
    id: "agency",
    label: "Agency",
    labelKey: "nav.agency",
    items: [
      { title: "Requests", labelKey: "nav.agencyRequests", url: "/dashboard/agency-requests", icon: Inbox },
      { title: "Agencies", labelKey: "nav.agencies",       url: "/dashboard/agencies",         icon: Briefcase },
    ],
  },
  {
    id: "support",
    label: "Support",
    labelKey: "nav.support",
    items: [
      { title: "Support",  labelKey: "nav.support",  url: "/dashboard/support",  icon: TicketCheck,
        anyOf: ["conversation:list_any", "support_ticket:list_any"] },
      { title: "Settings", labelKey: "nav.settings", url: "/dashboard/settings", icon: Settings,
        anyOf: ["system:settings:read", "admin:list", "system:permission:read", "system:audit:read", "profession:create"] },
    ],
  },
]

export const navItems: NavItem[] = navGroups.flatMap((g) => g.items)

// ── Route access control ─────────────────────────────────────────────────────
// The permission gate for a given dashboard route. `null` = no gate (any
// authenticated admin may view). Consumed by BOTH the sidebar (which hides nav
// items) and the central RouteGuard (which blocks page access). Backend still
// enforces every [RequirePermission] independently — this layer is UX only.

export type RouteGate = { permission?: string; anyOf?: string[] }

/**
 * Extra gates for pages that are NOT top-level nav items (mostly settings
 * sub-pages). These use LONGER prefixes than the nav entries, so they win the
 * longest-prefix match below and get their own specific permission instead of
 * inheriting the broader `/dashboard/settings` anyOf gate.
 */
const EXTRA_ROUTE_GATES: { prefix: string; permission?: string; anyOf?: string[] }[] = [
  { prefix: "/dashboard/settings/admins",      permission: "admin:list" },
  { prefix: "/dashboard/settings/admins/presets", permission: "system:permission:read" },
  { prefix: "/dashboard/settings/audit",       permission: "system:audit:read" },
  { prefix: "/dashboard/settings/professions", permission: "profession:create" },
  { prefix: "/dashboard/settings/property-categories", permission: "property_category:update" },
]

/** Routes always visible to any authenticated admin (no permission needed). */
const OPEN_PREFIXES = ["/dashboard/profile"]

/**
 * Resolve the permission gate for a path (locale already stripped, e.g.
 * "/dashboard/owners/123"). Matches the longest configured prefix so detail
 * pages inherit their section's gate (`/dashboard/owners/123` → `owner:list`).
 * Returns `null` for open/ungated routes (e.g. the "/dashboard" overview).
 */
export function resolveRouteGate(path: string): RouteGate | null {
  if (OPEN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return null

  const entries = [
    ...EXTRA_ROUTE_GATES,
    ...navItems
      .filter((i) => i.permission || i.anyOf)
      .map((i) => ({ prefix: i.url, permission: i.permission, anyOf: i.anyOf })),
  ].sort((a, b) => b.prefix.length - a.prefix.length)

  for (const e of entries) {
    if (path === e.prefix || path.startsWith(`${e.prefix}/`)) {
      return { permission: e.permission, anyOf: e.anyOf }
    }
  }
  return null
}
