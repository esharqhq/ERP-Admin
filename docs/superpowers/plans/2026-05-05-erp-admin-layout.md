# ERP Admin Panel Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 15 App Router ERP Admin panel with collapsible sidebar layout using shadcn/ui components and Lucide icons — layout only, no backend.

**Architecture:** App Router with a root layout redirecting to `/dashboard`, a shared `dashboard/layout.tsx` wrapping all dashboard pages with `SidebarProvider` + `AppSidebar` + `SidebarInset`. Each page renders static placeholder content using shadcn components.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui (default slate theme), Lucide React

---

## File Map

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root HTML shell |
| `app/page.tsx` | Redirect → `/dashboard` |
| `app/globals.css` | Tailwind base + shadcn CSS vars |
| `app/dashboard/layout.tsx` | Sidebar + header shell for all dashboard pages |
| `app/dashboard/page.tsx` | Dashboard home — KPI cards + charts placeholder |
| `app/dashboard/workers/page.tsx` | Workers list page |
| `app/dashboard/owners/page.tsx` | Owners list page |
| `app/dashboard/dispatch/page.tsx` | Dispatching page |
| `app/dashboard/map/page.tsx` | Live map page |
| `app/dashboard/tasks/page.tsx` | Tasks page |
| `app/dashboard/finance/page.tsx` | Finance page |
| `app/dashboard/documents/page.tsx` | Documents page |
| `app/dashboard/reports/page.tsx` | Reports page |
| `app/dashboard/settings/page.tsx` | Settings page |
| `app/dashboard/audit/page.tsx` | Audit log page |
| `components/layout/app-sidebar.tsx` | Collapsible sidebar with nav items |
| `components/layout/dashboard-header.tsx` | Top header with breadcrumb + trigger |
| `lib/nav-items.ts` | Centralized nav config |

---

### Task 1: Initialize Next.js 15 project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`

- [ ] **Step 1: Scaffold project**

```bash
cd D:\projekts\ERP\Admin
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --no-turbopack
```

When prompted:
- Would you like to use Turbopack? → **No**
- All other defaults → Yes

- [ ] **Step 2: Verify dev server starts**

```bash
npm run dev
```

Expected: `http://localhost:3000` opens with Next.js default page.

Stop the dev server (`Ctrl+C`).

- [ ] **Step 3: Commit**

```bash
git init
git add .
git commit -m "chore: init Next.js 15 project"
```

---

### Task 2: Install and configure shadcn/ui

**Files:**
- Create: `components.json`
- Modify: `app/globals.css`, `lib/utils.ts`

- [ ] **Step 1: Init shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted:
- Which style? → **Default**
- Which base color? → **Slate**
- CSS variables? → **Yes**

- [ ] **Step 2: Add all required components**

```bash
npx shadcn@latest add sidebar card table badge button avatar dropdown-menu breadcrumb separator sheet tabs input label select scroll-area progress tooltip
```

- [ ] **Step 3: Install Lucide React**

```bash
npm install lucide-react
```

- [ ] **Step 4: Verify `components/ui/` contains sidebar.tsx**

```bash
ls components/ui/
```

Expected: `sidebar.tsx`, `card.tsx`, `table.tsx`, `badge.tsx`, etc.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: add shadcn/ui and lucide-react"
```

---

### Task 3: Nav items config

**Files:**
- Create: `lib/nav-items.ts`

- [ ] **Step 1: Create nav config**

```typescript
// lib/nav-items.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/nav-items.ts
git commit -m "feat: add nav items config"
```

---

### Task 4: AppSidebar component

**Files:**
- Create: `components/layout/app-sidebar.tsx`

- [ ] **Step 1: Create sidebar component**

```tsx
// components/layout/app-sidebar.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { navItems } from "@/lib/nav-items"
import { ShieldCheck } from "lucide-react"

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">ERP Admin</span>
                  <span className="text-xs text-muted-foreground">Control Center</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url))}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <Avatar className="size-8 rounded-lg">
                <AvatarImage src="/avatar.png" alt="Admin" />
                <AvatarFallback className="rounded-lg">AD</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium text-sm">Super Admin</span>
                <span className="text-xs text-muted-foreground">admin@erp.com</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/app-sidebar.tsx
git commit -m "feat: add AppSidebar with collapsible icon mode"
```

---

### Task 5: DashboardHeader component

**Files:**
- Create: `components/layout/dashboard-header.tsx`

- [ ] **Step 1: Create header component**

```tsx
// components/layout/dashboard-header.tsx
"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { navItems } from "@/lib/nav-items"

export function DashboardHeader() {
  const pathname = usePathname()

  const current = navItems.find(
    (item) =>
      pathname === item.url ||
      (item.url !== "/dashboard" && pathname.startsWith(item.url))
  ) ?? navItems[0]

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink href="/dashboard">ERP Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>{current.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/dashboard-header.tsx
git commit -m "feat: add DashboardHeader with breadcrumb"
```

---

### Task 6: Root layout and redirect

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Update root layout**

```tsx
// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ERP Admin",
  description: "ERP Admin Control Center",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Root page redirects to dashboard**

```tsx
// app/page.tsx
import { redirect } from "next/navigation"

export default function RootPage() {
  redirect("/dashboard")
}
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx app/page.tsx
git commit -m "feat: root layout and redirect to dashboard"
```

---

### Task 7: Dashboard shell layout

**Files:**
- Create: `app/dashboard/layout.tsx`

- [ ] **Step 1: Create dashboard layout**

```tsx
// app/dashboard/layout.tsx
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

- [ ] **Step 2: Verify layout renders**

```bash
npm run dev
```

Open `http://localhost:3000` — should see sidebar + header shell. Check that sidebar collapses to icons when clicking the trigger button.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat: dashboard shell layout with sidebar provider"
```

---

### Task 8: Dashboard home page

**Files:**
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard home page**

```tsx
// app/dashboard/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Building2, ClipboardList, Wallet, Clock, ShieldCheck } from "lucide-react"

const kpiCards = [
  { title: "Total Workers",         value: "248",   change: "+12 this month", icon: Users,        color: "text-blue-500"   },
  { title: "Total Owners",          value: "134",   change: "+5 this month",  icon: Building2,    color: "text-green-500"  },
  { title: "Active Tasks",          value: "57",    change: "12 high priority",icon: ClipboardList,color: "text-orange-500" },
  { title: "Today's Revenue",       value: "$8,420",change: "+18% vs yesterday",icon: Wallet,      color: "text-emerald-500"},
  { title: "Pending Verifications", value: "23",    change: "Needs review",   icon: Clock,        color: "text-yellow-500" },
  { title: "Properties",            value: "312",   change: "8 pending approval",icon: ShieldCheck, color: "text-purple-500" },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Admin. Here's what's happening.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`size-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts placeholder row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Task & Revenue Trend</CardTitle>
            <CardDescription>Weekly overview — last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] flex items-center justify-center rounded-md border border-dashed">
              <span className="text-sm text-muted-foreground">Line chart — Recharts / ApexCharts</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Task Status</CardTitle>
            <CardDescription>Done / In Progress / Rejected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] flex items-center justify-center rounded-md border border-dashed">
              <span className="text-sm text-muted-foreground">Donut chart</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live map + worker performance */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live Worker Map</CardTitle>
            <CardDescription>Active workers right now</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center rounded-md border border-dashed">
              <span className="text-sm text-muted-foreground">Google Maps / Mapbox embed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Worker Performance</CardTitle>
            <CardDescription>Top 5 workers this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center rounded-md border border-dashed">
              <span className="text-sm text-muted-foreground">Bar chart</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify page renders**

Open `http://localhost:3000/dashboard` — KPI cards should be visible in a responsive grid.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: dashboard home page with KPI cards and chart placeholders"
```

---

### Task 9: Workers page

**Files:**
- Create: `app/dashboard/workers/page.tsx`

- [ ] **Step 1: Create workers page**

```tsx
// app/dashboard/workers/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { UserPlus, Search, Filter } from "lucide-react"

const workers = [
  { id: 1, name: "Jasur Toshmatov",   role: "Senior",       status: "Verified",  tasks: 12, rating: 4.8 },
  { id: 2, name: "Dilnoza Yusupova",  role: "Professional", status: "Verified",  tasks: 8,  rating: 4.5 },
  { id: 3, name: "Bobur Karimov",     role: "Junior",       status: "Pending",   tasks: 3,  rating: 3.9 },
  { id: 4, name: "Malika Saidova",    role: "Professional", status: "Verified",  tasks: 10, rating: 4.7 },
  { id: 5, name: "Otabek Nazarov",    role: "Senior",       status: "Expired",   tasks: 0,  rating: 4.2 },
  { id: 6, name: "Zulfiya Rakhimova", role: "Junior",       status: "Rejected",  tasks: 0,  rating: 3.1 },
]

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Verified:     "default",
  Pending:      "secondary",
  Expired:      "outline",
  Rejected:     "destructive",
}

const roleColors: Record<string, string> = {
  Senior:       "text-blue-500",
  Professional: "text-green-500",
  Junior:       "text-orange-500",
}

export default function WorkersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workers</h1>
          <p className="text-muted-foreground">Manage and monitor all workers.</p>
        </div>
        <Button>
          <UserPlus className="mr-2 size-4" />
          Add Worker
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Search workers..." className="pl-8" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Active Tasks</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback>{w.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{w.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${roleColors[w.role]}`}>{w.role}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[w.status]}>{w.status}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{w.tasks}</TableCell>
                  <TableCell className="text-center">{w.rating} ⭐</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/workers/page.tsx
git commit -m "feat: workers page with table layout"
```

---

### Task 10: Owners page

**Files:**
- Create: `app/dashboard/owners/page.tsx`

- [ ] **Step 1: Create owners page**

```tsx
// app/dashboard/owners/page.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Plus, Search } from "lucide-react"

const owners = [
  { id: 1, name: "Akbar Mirzayev",     type: "Individual", properties: 3, risk: "Low",    status: "Verified"  },
  { id: 2, name: "Sunrise LLC",        type: "Company",    properties: 12, risk: "Medium", status: "Verified"  },
  { id: 3, name: "Feruza Abdullayeva", type: "Individual", properties: 1, risk: "Low",    status: "Pending"   },
  { id: 4, name: "GrandBuild Corp",    type: "Company",    properties: 24, risk: "High",   status: "Verified"  },
  { id: 5, name: "Sardor Xolmatov",    type: "Individual", properties: 2, risk: "Low",    status: "Rejected"  },
]

const riskVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Low:    "default",
  Medium: "secondary",
  High:   "destructive",
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Verified: "default",
  Pending:  "secondary",
  Rejected: "destructive",
}

export default function OwnersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Owners</h1>
          <p className="text-muted-foreground">Property owners and KYC management.</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Owner
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search owners..." className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Properties</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback>{o.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{o.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.type}</TableCell>
                  <TableCell className="text-center">{o.properties}</TableCell>
                  <TableCell>
                    <Badge variant={riskVariant[o.risk]}>{o.risk}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[o.status]}>{o.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/owners/page.tsx
git commit -m "feat: owners page with KYC table"
```

---

### Task 11: Dispatching page

**Files:**
- Create: `app/dashboard/dispatch/page.tsx`

- [ ] **Step 1: Create dispatching page**

```tsx
// app/dashboard/dispatch/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Plus, MapPin, Clock } from "lucide-react"

const pendingTasks = [
  { id: "T-001", title: "HVAC Repair",      property: "Villa Sunrise, #12",  priority: "High",   time: "2h"  },
  { id: "T-002", title: "Plumbing Fix",      property: "Amir Business Center", priority: "Medium", time: "4h"  },
  { id: "T-003", title: "Electrical Check",  property: "Hotel Grand, floor 3", priority: "Low",    time: "1h"  },
  { id: "T-004", title: "Window Replacement",property: "Office Block B",       priority: "High",   time: "3h"  },
]

const availableWorkers = [
  { id: 1, name: "Jasur T.",   role: "Senior",       status: "Available" },
  { id: 2, name: "Malika S.",  role: "Professional", status: "Available" },
  { id: 3, name: "Bobur K.",   role: "Junior",       status: "On Task"   },
  { id: 4, name: "Zulfiya R.", role: "Junior",       status: "Available" },
]

const priorityVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  High:   "destructive",
  Medium: "secondary",
  Low:    "outline",
}

export default function DispatchPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dispatching</h1>
          <p className="text-muted-foreground">Assign tasks to available workers.</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          New Task
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
            <CardDescription>Drag or assign to a worker</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-3">
              <div className="flex flex-col gap-3">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border p-3 space-y-2 hover:bg-muted/50 cursor-grab transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{task.title}</span>
                      <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" /> {task.property}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {task.time}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="secondary" className="h-7 text-xs flex-1">
                        Assign
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Available Workers */}
        <Card>
          <CardHeader>
            <CardTitle>Available Workers</CardTitle>
            <CardDescription>Current availability status</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-3">
              <div className="flex flex-col gap-3">
                {availableWorkers.map((worker) => (
                  <div key={worker.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback>{worker.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{worker.name}</p>
                        <p className="text-xs text-muted-foreground">{worker.role}</p>
                      </div>
                    </div>
                    <Badge variant={worker.status === "Available" ? "default" : "secondary"}>
                      {worker.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/dispatch/page.tsx
git commit -m "feat: dispatching page layout"
```

---

### Task 12: Live Map page

**Files:**
- Create: `app/dashboard/map/page.tsx`

- [ ] **Step 1: Create map page**

```tsx
// app/dashboard/map/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin, Navigation } from "lucide-react"

const activeWorkers = [
  { id: 1, name: "Jasur T.",   location: "Yunusobod, Tashkent",  task: "HVAC Repair",    status: "On Task"   },
  { id: 2, name: "Malika S.",  location: "Mirzo Ulugbek, TSH",   task: "Transit",         status: "Moving"    },
  { id: 3, name: "Otabek N.",  location: "Chilanzar, Tashkent",  task: "Electrical",      status: "On Task"   },
  { id: 4, name: "Zulfiya R.", location: "Sergeli, Tashkent",    task: "—",               status: "Available" },
]

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  "On Task":   "default",
  "Moving":    "secondary",
  "Available": "outline",
}

export default function MapPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Map</h1>
        <p className="text-muted-foreground">Real-time worker locations and status.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Map area */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="h-[520px] rounded-lg flex flex-col items-center justify-center gap-3 bg-muted/30 border border-dashed">
              <Navigation className="size-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Google Maps / Mapbox integration</p>
              <p className="text-xs text-muted-foreground">Worker pins update via Supabase Realtime</p>
            </div>
          </CardContent>
        </Card>

        {/* Worker list */}
        <Card>
          <CardHeader>
            <CardTitle>Active Workers ({activeWorkers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[460px]">
              <div className="flex flex-col">
                {activeWorkers.map((w, i) => (
                  <div key={w.id}>
                    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                      <Avatar className="size-9 mt-0.5">
                        <AvatarFallback>{w.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{w.name}</p>
                          <Badge variant={statusVariant[w.status]} className="text-xs">{w.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="size-3 shrink-0" /> {w.location}
                        </p>
                        {w.task !== "—" && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">Task: {w.task}</p>
                        )}
                      </div>
                    </div>
                    {i < activeWorkers.length - 1 && <div className="mx-4 border-b" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/map/page.tsx
git commit -m "feat: live map page layout"
```

---

### Task 13: Tasks page

**Files:**
- Create: `app/dashboard/tasks/page.tsx`

- [ ] **Step 1: Create tasks page**

```tsx
// app/dashboard/tasks/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Search, Clock, MapPin } from "lucide-react"

type TaskStatus = "To Do" | "In Progress" | "Review" | "Done" | "Rejected"

const columns: { status: TaskStatus; color: string }[] = [
  { status: "To Do",      color: "text-slate-500"  },
  { status: "In Progress",color: "text-blue-500"   },
  { status: "Review",     color: "text-yellow-500" },
  { status: "Done",       color: "text-green-500"  },
  { status: "Rejected",   color: "text-red-500"    },
]

const tasks: { id: string; title: string; status: TaskStatus; priority: "High" | "Medium" | "Low"; property: string; deadline: string }[] = [
  { id: "T-001", title: "HVAC Repair",       status: "In Progress", priority: "High",   property: "Villa Sunrise",    deadline: "Today 14:00"  },
  { id: "T-002", title: "Deep Cleaning",     status: "To Do",       priority: "Medium", property: "Hotel Grand 3F",   deadline: "Tomorrow"     },
  { id: "T-003", title: "Security Audit",    status: "Review",      priority: "High",   property: "Amir Biz Center",  deadline: "May 7"        },
  { id: "T-004", title: "Plumbing Fix",      status: "Done",        priority: "Low",    property: "Office Block B",   deadline: "Completed"    },
  { id: "T-005", title: "Window Replace",    status: "Rejected",    priority: "Medium", property: "Villa Sunrise",    deadline: "—"            },
  { id: "T-006", title: "Electrical Check",  status: "To Do",       priority: "High",   property: "Residence North",  deadline: "May 6"        },
  { id: "T-007", title: "Paint Interior",    status: "In Progress", priority: "Low",    property: "Office Block A",   deadline: "May 8"        },
]

const priorityVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  High:   "destructive",
  Medium: "secondary",
  Low:    "outline",
}

export default function TasksPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage and track all service tasks.</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          New Task
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input placeholder="Search tasks..." className="pl-8" />
      </div>

      {/* Kanban board */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status)
          return (
            <div key={col.status} className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className={`text-sm font-semibold ${col.color}`}>{col.status}</h3>
                <Badge variant="outline" className="text-xs">{colTasks.length}</Badge>
              </div>
              <ScrollArea className="h-[480px]">
                <div className="flex flex-col gap-2 pr-1">
                  {colTasks.map((task) => (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-xs font-medium leading-snug">{task.title}</p>
                          <Badge variant={priorityVariant[task.priority]} className="text-[10px] shrink-0">
                            {task.priority}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3" /> {task.property}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" /> {task.deadline}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/tasks/page.tsx
git commit -m "feat: tasks kanban board layout"
```

---

### Task 14: Finance page

**Files:**
- Create: `app/dashboard/finance/page.tsx`

- [ ] **Step 1: Create finance page**

```tsx
// app/dashboard/finance/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Download, TrendingUp, TrendingDown, Wallet, ArrowUpRight } from "lucide-react"

const stats = [
  { title: "Total Revenue",  value: "$124,500", change: "+12.5%",  up: true,  icon: Wallet     },
  { title: "This Month",     value: "$18,240",  change: "+8.3%",   up: true,  icon: TrendingUp  },
  { title: "Pending Payout", value: "$4,320",   change: "12 workers", up: null, icon: ArrowUpRight},
  { title: "Expenses",       value: "$6,810",   change: "-3.2%",   up: false, icon: TrendingDown},
]

const transactions = [
  { id: "TXN-001", owner: "Sunrise LLC",        amount: "$1,200", type: "Payment",  status: "Completed", date: "May 5, 2026"  },
  { id: "TXN-002", owner: "Akbar Mirzayev",     amount: "$450",   type: "Payment",  status: "Completed", date: "May 4, 2026"  },
  { id: "TXN-003", owner: "GrandBuild Corp",    amount: "$3,800", type: "Invoice",  status: "Pending",   date: "May 4, 2026"  },
  { id: "TXN-004", owner: "Worker Payout",      amount: "$2,100", type: "Payout",   status: "Completed", date: "May 3, 2026"  },
  { id: "TXN-005", owner: "Feruza Abdullayeva", amount: "$600",   type: "Payment",  status: "Failed",    date: "May 3, 2026"  },
]

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Completed: "default",
  Pending:   "secondary",
  Failed:    "destructive",
}

export default function FinancePage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
          <p className="text-muted-foreground">Payments, invoices, and payouts.</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 size-4" />
          Export
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
              <s.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className={`text-xs mt-1 ${s.up === true ? "text-green-500" : s.up === false ? "text-red-500" : "text-muted-foreground"}`}>
                {s.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>All payment and payout activity</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.id}</TableCell>
                  <TableCell className="font-medium">{t.owner}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{t.type}</TableCell>
                  <TableCell className="font-semibold">{t.amount}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[t.status]}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{t.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/finance/page.tsx
git commit -m "feat: finance page with stats and transactions table"
```

---

### Task 15: Documents page

**Files:**
- Create: `app/dashboard/documents/page.tsx`

- [ ] **Step 1: Create documents page**

```tsx
// app/dashboard/documents/page.tsx
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Search, FileText, FileImage, File, Download } from "lucide-react"

const documents = [
  { id: 1, name: "Jasur_Toshmatov_ID.pdf",      type: "ID Card",    owner: "Jasur T.",   status: "Verified",  date: "Apr 10, 2026", icon: FileText  },
  { id: 2, name: "Sunrise_LLC_Contract.pdf",     type: "Contract",   owner: "Sunrise LLC",status: "Signed",    date: "Mar 22, 2026", icon: FileText  },
  { id: 3, name: "Villa_Sunrise_Photos.zip",     type: "Property",   owner: "Akbar M.",   status: "Pending",   date: "May 1, 2026",  icon: FileImage },
  { id: 4, name: "GrandBuild_License.pdf",       type: "License",    owner: "GrandBuild", status: "Verified",  date: "Feb 14, 2026", icon: FileText  },
  { id: 5, name: "Malika_Saidova_KYC.pdf",       type: "KYC",        owner: "Malika S.",  status: "Expired",   date: "Jan 5, 2026",  icon: File      },
  { id: 6, name: "Office_B_Inspection.pdf",      type: "Report",     owner: "Admin",      status: "Verified",  date: "Apr 30, 2026", icon: FileText  },
]

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Verified: "default",
  Signed:   "default",
  Pending:  "secondary",
  Expired:  "destructive",
}

export default function DocumentsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">KYC files, contracts, and reports.</p>
        </div>
        <Button>
          <Upload className="mr-2 size-4" />
          Upload
        </Button>
      </div>

      <Tabs defaultValue="all">
        <div className="flex items-center gap-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="kyc">KYC</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search documents..." className="pl-8" />
          </div>
        </div>

        <TabsContent value="all" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <doc.icon className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.owner} · {doc.date}</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant={statusVariant[doc.status]} className="text-xs">{doc.status}</Badge>
                      <Button variant="ghost" size="icon" className="size-6">
                        <Download className="size-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="kyc"><p className="text-muted-foreground text-sm mt-4">KYC documents filtered view.</p></TabsContent>
        <TabsContent value="contracts"><p className="text-muted-foreground text-sm mt-4">Contracts filtered view.</p></TabsContent>
        <TabsContent value="reports"><p className="text-muted-foreground text-sm mt-4">Reports filtered view.</p></TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/documents/page.tsx
git commit -m "feat: documents page with card grid and tabs"
```

---

### Task 16: Reports page

**Files:**
- Create: `app/dashboard/reports/page.tsx`

- [ ] **Step 1: Create reports page**

```tsx
// app/dashboard/reports/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, BarChart3, TrendingUp, Users, Wallet } from "lucide-react"

const reportCards = [
  { title: "Worker Performance", description: "KPI scores and task completion rates", icon: Users,    color: "text-blue-500"  },
  { title: "Revenue Report",     description: "Monthly and weekly income breakdown",  icon: Wallet,   color: "text-green-500" },
  { title: "Task Analytics",     description: "Completion, rejection, SLA stats",     icon: BarChart3,color: "text-orange-500"},
  { title: "Growth Trend",       description: "Owner and worker acquisition trend",   icon: TrendingUp,color: "text-purple-500"},
]

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Analytics, insights, and PDF exports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="this-month">
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 size-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Quick report cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reportCards.map((r) => (
          <Card key={r.title} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <r.icon className={`size-5 ${r.color} mb-1`} />
              <CardTitle className="text-sm">{r.title}</CardTitle>
              <CardDescription className="text-xs">{r.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" size="sm" className="w-full text-xs">
                View Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart area */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Task Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] flex items-center justify-center rounded-md border border-dashed">
                  <span className="text-sm text-muted-foreground">Bar chart — monthly tasks</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] flex items-center justify-center rounded-md border border-dashed">
                  <span className="text-sm text-muted-foreground">Line chart — revenue</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workers"><p className="text-muted-foreground text-sm mt-4">Worker-specific analytics.</p></TabsContent>
        <TabsContent value="finance"><p className="text-muted-foreground text-sm mt-4">Finance-specific analytics.</p></TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/reports/page.tsx
git commit -m "feat: reports page with analytics layout"
```

---

### Task 17: Settings page

**Files:**
- Create: `app/dashboard/settings/page.tsx`

- [ ] **Step 1: Create settings page**

```tsx
// app/dashboard/settings/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle } from "lucide-react"

const integrations = [
  { name: "Google Maps",     purpose: "Live map & geofence",     connected: true  },
  { name: "Cloudinary",      purpose: "Photo & video storage",   connected: true  },
  { name: "Firebase",        purpose: "Push notifications",      connected: false },
  { name: "Stripe",          purpose: "Payment processing",      connected: true  },
  { name: "Supabase",        purpose: "Realtime database",       connected: true  },
  { name: "OneSignal",       purpose: "Push notifications",      connected: false },
]

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">System configuration and integrations.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Update your organization details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input defaultValue="ERP Control Center" />
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input defaultValue="support@erp.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input defaultValue="+998 71 200 00 00" />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input defaultValue="Asia/Tashkent (UTC+5)" />
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Third-party Integrations</CardTitle>
              <CardDescription>Manage external service connections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {integrations.map((int, i) => (
                <div key={int.name}>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{int.name}</p>
                      <p className="text-xs text-muted-foreground">{int.purpose}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {int.connected ? (
                        <span className="flex items-center gap-1 text-xs text-green-500">
                          <CheckCircle2 className="size-3.5" /> Connected
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <XCircle className="size-3.5" /> Not connected
                        </span>
                      )}
                      <Button variant={int.connected ? "outline" : "default"} size="sm">
                        {int.connected ? "Configure" : "Connect"}
                      </Button>
                    </div>
                  </div>
                  {i < integrations.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications"><p className="text-muted-foreground text-sm mt-4">Notification preferences.</p></TabsContent>
        <TabsContent value="security"><p className="text-muted-foreground text-sm mt-4">2FA, sessions, and permissions.</p></TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/settings/page.tsx
git commit -m "feat: settings page with tabs layout"
```

---

### Task 18: Audit Log page

**Files:**
- Create: `app/dashboard/audit/page.tsx`

- [ ] **Step 1: Create audit log page**

```tsx
// app/dashboard/audit/page.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Search } from "lucide-react"

const logs = [
  { id: "LOG-001", user: "Super Admin",  action: "User Created",      target: "Jasur Toshmatov",    ip: "192.168.1.1", time: "2026-05-05 09:14", type: "Create"  },
  { id: "LOG-002", user: "Admin",        action: "Status Changed",    target: "TXN-003 → Completed",ip: "10.0.0.4",   time: "2026-05-05 09:02", type: "Update"  },
  { id: "LOG-003", user: "Super Admin",  action: "User Deleted",      target: "Sardor Xolmatov",    ip: "192.168.1.1", time: "2026-05-04 17:45", type: "Delete"  },
  { id: "LOG-004", user: "Admin",        action: "Document Verified", target: "GrandBuild_License", ip: "10.0.0.4",   time: "2026-05-04 14:30", type: "Update"  },
  { id: "LOG-005", user: "Finance",      action: "Payout Processed",  target: "Worker Payout $2.1k",ip: "10.0.0.7",   time: "2026-05-03 11:20", type: "Payment" },
  { id: "LOG-006", user: "Dispatcher",   action: "Task Assigned",     target: "T-004 → Jasur T.",   ip: "10.0.0.9",   time: "2026-05-03 10:05", type: "Create"  },
]

const typeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Create:  "default",
  Update:  "secondary",
  Delete:  "destructive",
  Payment: "outline",
}

export default function AuditPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">Full history of system actions and changes.</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Search logs..." className="pl-8" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.id}</TableCell>
                  <TableCell className="font-medium text-sm">{log.user}</TableCell>
                  <TableCell className="text-sm">{log.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{log.target}</TableCell>
                  <TableCell>
                    <Badge variant={typeVariant[log.type]} className="text-xs">{log.type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.ip}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/audit/page.tsx
git commit -m "feat: audit log page with filterable table"
```

---

### Task 19: Final verification

- [ ] **Step 1: Run dev server and check all routes**

```bash
npm run dev
```

Visit each route and verify it renders without errors:
- `http://localhost:3000` → redirects to `/dashboard`
- `http://localhost:3000/dashboard` → KPI cards visible
- `http://localhost:3000/dashboard/workers` → table visible
- `http://localhost:3000/dashboard/owners` → table visible
- `http://localhost:3000/dashboard/dispatch` → two-column layout visible
- `http://localhost:3000/dashboard/map` → map placeholder + worker list visible
- `http://localhost:3000/dashboard/tasks` → kanban columns visible
- `http://localhost:3000/dashboard/finance` → stats + table visible
- `http://localhost:3000/dashboard/documents` → card grid visible
- `http://localhost:3000/dashboard/reports` → chart placeholders visible
- `http://localhost:3000/dashboard/settings` → tabs form visible
- `http://localhost:3000/dashboard/audit` → log table visible

- [ ] **Step 2: Verify sidebar behavior**

- Sidebar should show full labels by default
- Click the trigger (hamburger) → sidebar collapses to icons only
- Hover icons in collapsed state → tooltips appear with page names
- Active page link should be highlighted

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete ERP admin panel layout"
```
