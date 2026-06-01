import {
  LayoutDashboard,
  Users,
  Building2,
  Home,
  Truck,
  ClipboardList,
  Clock,
  FolderOpen,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserCog,
  TicketCheck,
} from "lucide-react"
import { type LucideIcon } from "lucide-react"

export type NavItem = {
  title: string
  labelKey: string
  url: string
  icon: LucideIcon
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
      { title: "Owners",     labelKey: "nav.owners",     url: "/dashboard/owners",          icon: Building2  },
      { title: "Properties", labelKey: "nav.properties", url: "/dashboard/properties",      icon: Home       },
      { title: "Documents",  labelKey: "nav.documents",  url: "/dashboard/owner-documents", icon: FolderOpen },
    ],
  },
  {
    id: "worker",
    label: "Worker",
    labelKey: "nav.worker",
    items: [
      { title: "Workers",     labelKey: "nav.workers",     url: "/dashboard/workers",          icon: Users         },
      { title: "Attendance",  labelKey: "nav.attendance",  url: "/dashboard/attendance",       icon: Clock         },
      { title: "Tasks",       labelKey: "nav.tasks",       url: "/dashboard/tasks",            icon: ClipboardList },
      { title: "Dispatching", labelKey: "nav.dispatching", url: "/dashboard/dispatch",         icon: Truck         },
      { title: "Documents",   labelKey: "nav.documents",   url: "/dashboard/worker-documents", icon: FolderOpen    },
    ],
  },
  {
    id: "support",
    label: "Support",
    labelKey: "nav.support",
    items: [
      { title: "Tickets",   labelKey: "nav.tickets",  url: "/dashboard/support",  icon: TicketCheck   },
      { title: "Chat",      labelKey: "nav.chat",     url: "/dashboard/chat",     icon: MessageSquare },
      { title: "Audit Log", labelKey: "nav.auditLog", url: "/dashboard/audit",    icon: ShieldCheck   },
      { title: "Admins",    labelKey: "nav.admins",   url: "/dashboard/admins",   icon: UserCog       },
      { title: "Settings",  labelKey: "nav.settings", url: "/dashboard/settings", icon: Settings      },
    ],
  },
]

export const navItems: NavItem[] = navGroups.flatMap((g) => g.items)
