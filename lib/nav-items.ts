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
} from "lucide-react"
import { type LucideIcon } from "lucide-react"

export type NavItem = {
  title: string
  url: string
  icon: LucideIcon
}

export type NavGroup = {
  id: string
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    items: [
      { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    id: "owner",
    label: "Owner",
    items: [
      { title: "Owners",     url: "/dashboard/owners",          icon: Building2  },
      { title: "Properties", url: "/dashboard/properties",      icon: Home       },
      { title: "Documents",  url: "/dashboard/owner-documents", icon: FolderOpen },
      { title: "KYC Review", url: "/dashboard/kyc",             icon: ShieldCheck },
    ],
  },
  {
    id: "worker",
    label: "Worker",
    items: [
      { title: "Workers",     url: "/dashboard/workers",         icon: Users         },
      { title: "Attendance",  url: "/dashboard/attendance",      icon: Clock         },
      { title: "Tasks",       url: "/dashboard/tasks",           icon: ClipboardList },
      { title: "Dispatching", url: "/dashboard/dispatch",        icon: Truck         },
      { title: "Documents",   url: "/dashboard/worker-documents",icon: FolderOpen    },
    ],
  },
  {
    id: "support",
    label: "Support",
    items: [
      { title: "Chat",      url: "/dashboard/chat",     icon: MessageSquare },
      { title: "Audit Log", url: "/dashboard/audit",    icon: ShieldCheck   },
      { title: "Admins",    url: "/dashboard/admins",   icon: UserCog       },
      { title: "Settings",  url: "/dashboard/settings", icon: Settings      },
    ],
  },
]

export const navItems: NavItem[] = navGroups.flatMap((g) => g.items)
