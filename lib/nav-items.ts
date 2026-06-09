import {
  LayoutDashboard,
  Users,
  Building2,
  Home,
  Truck,
  ClipboardList,
  FolderOpen,
  Settings,
  ShieldCheck,
  UserCog,
  TicketCheck,
  FileText,
  CalendarOff,
} from "lucide-react"
import { type LucideIcon } from "lucide-react"

export type NavItem = {
  title: string
  labelKey: string
  url: string
  icon: LucideIcon
  /** Backend [RequirePermission] code gating this section; omit for always-visible. */
  permission?: string
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
      { title: "Overview", labelKey: "nav.overview", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    id: "owner",
    label: "Owner",
    labelKey: "nav.owner",
    items: [
      { title: "Owners",     labelKey: "nav.owners",     url: "/dashboard/owners",          icon: Building2,  permission: "owner:list" },
      { title: "Properties", labelKey: "nav.properties", url: "/dashboard/properties",      icon: Home,       permission: "property:list" },
      { title: "Documents",  labelKey: "nav.documents",  url: "/dashboard/owner-documents", icon: FolderOpen, permission: "kyc:read" },
      { title: "Contracts",  labelKey: "nav.contracts",  url: "/dashboard/contracts",       icon: FileText,   permission: "owner_contract:read_any" },
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
      { title: "Documents",   labelKey: "nav.documents",   url: "/dashboard/worker-documents", icon: FolderOpen,    permission: "worker:list" },
    ],
  },
  {
    id: "support",
    label: "Support",
    labelKey: "nav.support",
    items: [
      { title: "Tickets",   labelKey: "nav.tickets",  url: "/dashboard/support",  icon: TicketCheck, permission: "support_ticket:list_any" },
      { title: "Audit Log", labelKey: "nav.auditLog", url: "/dashboard/audit",    icon: ShieldCheck, permission: "system:audit:read" },
      { title: "Admins",    labelKey: "nav.admins",   url: "/dashboard/admins",   icon: UserCog,     permission: "admin:list" },
      { title: "Settings",  labelKey: "nav.settings", url: "/dashboard/settings", icon: Settings,    permission: "system:settings:read" },
    ],
  },
]

export const navItems: NavItem[] = navGroups.flatMap((g) => g.items)
