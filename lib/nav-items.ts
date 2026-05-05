import {
  LayoutDashboard,
  Users,
  Building2,
  Truck,
  Map,
  ClipboardList,
  Wallet,
  FolderOpen,
  BarChart3,
  Settings,
  ShieldCheck,
} from "lucide-react"
import { type LucideIcon } from "lucide-react"

export type NavItem = {
  title: string
  url: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { title: "Dashboard",   url: "/dashboard",           icon: LayoutDashboard },
  { title: "Workers",     url: "/dashboard/workers",   icon: Users           },
  { title: "Owners",      url: "/dashboard/owners",    icon: Building2       },
  { title: "Dispatching", url: "/dashboard/dispatch",  icon: Truck           },
  { title: "Live Map",    url: "/dashboard/map",       icon: Map             },
  { title: "Tasks",       url: "/dashboard/tasks",     icon: ClipboardList   },
  { title: "Finance",     url: "/dashboard/finance",   icon: Wallet          },
  { title: "Documents",   url: "/dashboard/documents", icon: FolderOpen      },
  { title: "Reports",     url: "/dashboard/reports",   icon: BarChart3       },
  { title: "Settings",    url: "/dashboard/settings",  icon: Settings        },
  { title: "Audit Log",   url: "/dashboard/audit",     icon: ShieldCheck     },
]
