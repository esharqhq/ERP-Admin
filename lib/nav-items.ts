import {
  Link2,
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
  Phone,
  Megaphone,
  Award,
} from "lucide-react"
import { type LucideIcon } from "lucide-react"

/**
 * Which badge treatment a row uses, from the "Counts mean work waiting" rule in
 * `../assets/Uyer-Admin-Sidebar.dc.html`. The kind is a property of the row —
 * a queue is a queue whatever today's number is — so it is declared here, while
 * the number itself has to arrive from the backend. There is no counts endpoint
 * yet (the spec files one under "Confirm before build" and BACKEND-ASKS.md now
 * carries the ask), so every row below renders no badge at all for now.
 *
 * - `queue`    white pill, forest text — a queue this operator owns and clears.
 * - `waiting`  red pill, white text — a person is waiting on a reply.
 * - `expiring` amber dot, no number — something lapses soon.
 * - `total`    plain mono number — a total, not an alert.
 */
export type NavBadgeKind = "queue" | "waiting" | "expiring" | "total"

export type NavItem = {
  title: string
  labelKey: string
  url: string
  icon: LucideIcon
  /** Backend [RequirePermission] code gating this section; omit for always-visible. */
  permission?: string
  /** Visible if the admin holds ANY of these codes (use instead of `permission` for grouped entry points). */
  anyOf?: string[]
  /** Badge treatment for this row; omit for a row that never carries a count. */
  badge?: NavBadgeKind
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
      { title: "Owners",     labelKey: "nav.owners",     url: "/dashboard/owners",          icon: Building2,  permission: "owner:list", badge: "total" },
      // Gated on `owner:list`, not on `task_group:create_any` (110038): 110038
      // is SUPER_ADMIN-only, and a MODERATOR should reach this page and see the
      // account and its order history. The form disables itself.
      { title: "Walk-in",    labelKey: "nav.walkIn",     url: "/dashboard/walk-in",         icon: Phone,      permission: "owner:list" },
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
      { title: "Workers",     labelKey: "nav.workers",     url: "/dashboard/workers",          icon: Users,         permission: "worker:list", badge: "total" },
      { title: "Tasks",       labelKey: "nav.tasks",       url: "/dashboard/tasks",            icon: ClipboardList, permission: "task:list_any", badge: "total" },
      { title: "Dispatching", labelKey: "nav.dispatching", url: "/dashboard/dispatch",         icon: Truck,         permission: "task:assign_worker_any", badge: "expiring" },
      { title: "Leave",       labelKey: "nav.leave",       url: "/dashboard/leave",            icon: CalendarOff,   permission: "worker_leave_request:list_any", badge: "queue" },
      { title: "Skill Requests", labelKey: "nav.skillRequests", url: "/dashboard/skill-requests", icon: Award,      permission: "worker_profession_request:read", badge: "queue" },
      { title: "Attendance",  labelKey: "nav.attendance",  url: "/dashboard/attendance",       icon: CalendarCheck, permission: "system:attendance:read" },
      { title: "Documents",   labelKey: "nav.documents",   url: "/dashboard/worker-documents", icon: FolderOpen,    permission: "worker:list", badge: "queue" },
    ],
  },
  {
    id: "agency",
    label: "Agency",
    labelKey: "nav.agency",
    // ⚠ Both screens are UNBUILT — F-05 is sub-project #3 of
    // `docs/superpowers/plans/2026-08-31-admin-work-queue-roadmap.md`, scoped in
    // `docs/audit/agency-scope-2026-09-08.md`. Until they exist, both urls serve a
    // placeholder page rather than a 404: a missing route reads as a bug, and the
    // rail's own philosophy is that an operator should see that a section exists.
    //
    // The gates below are the real ones from `index/permissions/registry.md`, so
    // they need no revisiting when the pages land — and they already flow into
    // `resolveRouteGate`, which matches by prefix and so covers the detail routes
    // (`/dashboard/agencies/{id}`) too.
    //
    // ⚠ A gate does NOT hide these rows — `app-sidebar.tsx`'s `canSeeItem` dims
    // and locks them instead, so a SUPER_ADMIN (who holds both codes) still
    // follows a live link. That is why the placeholder is the part that actually
    // closes this, and the gate only covers the roles that lack the grant.
    // MODERATOR holds `agency_application:read` and NOT `agency:read`
    // (`DatabaseSeeder.cs:1954,1960`), so for them exactly one of the two locks.
    items: [
      { title: "Requests", labelKey: "nav.agencyRequests", url: "/dashboard/agency-requests", icon: Inbox, permission: "agency_application:read", badge: "waiting" },
      { title: "Agencies", labelKey: "nav.agencies",       url: "/dashboard/agencies",         icon: Briefcase, permission: "agency:read" },
      // MODERATOR *does* hold `agency_link:read_any`, so this is the one Agency
      // row that opens live for them — and the screen behind it renders
      // completely with every write action absent.
      { title: "Links",    labelKey: "nav.agencyLinks",    url: "/dashboard/agency-links",     icon: Link2, permission: "agency_link:read_any" },
    ],
  },
  {
    id: "system",
    label: "System",
    labelKey: "nav.system",
    items: [
      { title: "Broadcasts", labelKey: "nav.broadcasts", url: "/dashboard/notifications/broadcasts", icon: Megaphone, permission: "notification:broadcast" },
      { title: "Support",  labelKey: "nav.support",  url: "/dashboard/support",  icon: TicketCheck,
        anyOf: ["conversation:list_any", "support_ticket:list_any"], badge: "waiting" },
      { title: "Settings", labelKey: "nav.settings", url: "/dashboard/settings", icon: Settings,
        anyOf: ["system:settings:read", "admin:list", "system:permission:read", "system:audit:read", "profession:create"] },
      // ⚠ Still dim + lock + `/forbidden?permission=…` on a missing grant,
      // NOT hidden outright. The design's own decision #05 says "The nav
      // item is hidden, not disabled" — but the *only* nav-gating mechanism
      // that exists in this app (`app-sidebar.tsx`'s `canSeeItem`/
      // `lockedHref`) does the opposite for every row, deliberately, and the
      // user approved that exact behaviour for this item one phase ago.
    ],
  },
]

export const navItems: NavItem[] = navGroups.flatMap((g) => g.items)

// ── Route access control ─────────────────────────────────────────────────────
// The permission gate for a given dashboard route. `null` = no gate (any
// authenticated admin may view). Consumed by BOTH the sidebar and the central
// RouteGuard (which blocks page access). Backend still enforces every
// [RequirePermission] independently — this layer is UX only.
//
// The sidebar no longer *hides* a gated row: per the nav spec it dims the row,
// marks it with a lock and points it at `/forbidden?permission=<code>`, so an
// operator can see the section exists and ask for the grant by name.

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
  { prefix: "/dashboard/skill-requests", permission: "worker_profession_request:read" },
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
