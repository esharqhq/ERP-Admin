# Property Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/dashboard/properties/[id]` detail page with hero banner, info card, owner card, and status card.

**Architecture:** New `lib/properties.ts` holds the `Property` type + mock data. Four focused components in `components/properties/` render the page sections. The page is a Server Component that awaits params and calls `getPropertyById`. The properties list page gets updated with navigation links.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn-style UI (`Card`, `Badge`, `Button`, `Separator`), base-ui `Button` with `render` prop for links, lucide-react icons.

---

### Task 1: Data layer — `lib/properties.ts`

**Files:**
- Create: `lib/properties.ts`

- [ ] **Step 1: Create the file with Property type and mock data**

```ts
export type PropertyStatus = "Active" | "Pending Approval" | "Inactive"
export type PropertyType =
  | "Villa" | "Office" | "Hotel" | "Apartment"
  | "Townhouse" | "Business Ctr." | "Retail"

export type Property = {
  id: number
  name: string
  type: PropertyType
  address: string
  status: PropertyStatus
  ownerId: number
  ownerName: string
  area: number
  rooms?: number
  floor?: number
  totalFloors?: number
  yearBuilt?: number
  description?: string
}

export const properties: Property[] = [
  {
    id: 1,
    name: "Sunrise Villa",
    type: "Villa",
    address: "Mirzo Ulug'bek, Toshkent",
    status: "Active",
    ownerId: 1,
    ownerName: "Akbar Mirzayev",
    area: 320,
    rooms: 6,
    floor: 1,
    totalFloors: 2,
    yearBuilt: 2019,
    description: "Yashil hovlili ikki qavatli villa. Barcha kommunal xizmatlar ulangan.",
  },
  {
    id: 2,
    name: "GrandBuild Tower B",
    type: "Office",
    address: "Yunusobod, Toshkent",
    status: "Active",
    ownerId: 4,
    ownerName: "GrandBuild Corp",
    area: 1200,
    floor: 12,
    totalFloors: 20,
    yearBuilt: 2021,
    description: "Zamonaviy biznes-markaz. Ochiq makon, konferentsiya zallari.",
  },
  {
    id: 3,
    name: "Sunrise Hotel",
    type: "Hotel",
    address: "Chilonzor, Toshkent",
    status: "Pending Approval",
    ownerId: 2,
    ownerName: "Sunrise LLC",
    area: 2400,
    rooms: 48,
    totalFloors: 6,
    yearBuilt: 2020,
    description: "48 xonali mehmonxona. Restoran va basseyn mavjud.",
  },
  {
    id: 4,
    name: "Feruza Apartments",
    type: "Apartment",
    address: "Sergeli, Toshkent",
    status: "Pending Approval",
    ownerId: 3,
    ownerName: "Feruza Abdullayeva",
    area: 78,
    rooms: 3,
    floor: 5,
    totalFloors: 9,
    yearBuilt: 2018,
    description: "3 xonali kvartira. KYC tekshiruvi davom etmoqda.",
  },
  {
    id: 5,
    name: "Sardor Office Suite",
    type: "Office",
    address: "Mirobod, Toshkent",
    status: "Inactive",
    ownerId: 5,
    ownerName: "Sardor Xolmatov",
    area: 95,
    floor: 3,
    totalFloors: 5,
    yearBuilt: 2017,
    description: "Kichik ofis xonasi. Hozirda faol emas.",
  },
  {
    id: 6,
    name: "GrandBuild Plaza",
    type: "Business Ctr.",
    address: "Shayxontohur, Toshkent",
    status: "Active",
    ownerId: 4,
    ownerName: "GrandBuild Corp",
    area: 3800,
    totalFloors: 12,
    yearBuilt: 2022,
    description: "Shahar markazidagi yirik biznes-markaz. 40+ kompaniya ijarada.",
  },
]

export function getPropertyById(id: number): Property | undefined {
  return properties.find((p) => p.id === id)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/properties.ts
git commit -m "feat: add Property type and mock data"
```

---

### Task 2: ActionBar component

**Files:**
- Create: `components/properties/action-bar.tsx`

- [ ] **Step 1: Create the file**

```tsx
import Link from "next/link"
import { ArrowLeft, Pencil, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ActionBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/dashboard/properties" />}
        className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Properties ro'yxatiga qaytish
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="size-4" />
          Tahrirlash
        </Button>
        <Button variant="ghost" size="icon-sm">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Qo'shimcha</span>
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/properties/action-bar.tsx
git commit -m "feat: add properties ActionBar component"
```

---

### Task 3: PropertyHero component

**Files:**
- Create: `components/properties/property-hero.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { Building2, Home, Hotel, Briefcase, Store } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Property } from "@/lib/properties"

const typeIcon: Record<string, React.ReactNode> = {
  Villa:           <Home className="size-5" />,
  Apartment:       <Building2 className="size-5" />,
  Hotel:           <Hotel className="size-5" />,
  Office:          <Briefcase className="size-5" />,
  Townhouse:       <Home className="size-5" />,
  "Business Ctr.": <Store className="size-5" />,
  Retail:          <Store className="size-5" />,
}

const statusVariant: Record<Property["status"], "default" | "secondary" | "destructive"> = {
  Active:             "default",
  "Pending Approval": "secondary",
  Inactive:           "destructive",
}

export function PropertyHero({ property }: { property: Property }) {
  return (
    <Card className="overflow-hidden">
      <div
        aria-hidden
        className="h-24 w-full bg-gradient-to-r from-primary/12 via-primary/6 to-accent/10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(16,54,125,0.18) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 -mt-8 pb-6">
        <div className="flex items-end gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-4 ring-background text-primary shadow-sm">
            {typeIcon[property.type] ?? <Building2 className="size-5" />}
          </div>
          <div className="flex flex-col gap-1.5 pb-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight leading-tight sm:text-[28px]">
              {property.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {typeIcon[property.type]}
                {property.type}
              </span>
              <Badge variant={statusVariant[property.status]}>
                {property.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/properties/property-hero.tsx
git commit -m "feat: add PropertyHero component"
```

---

### Task 4: PropertyInfo component

**Files:**
- Create: `components/properties/property-info.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { MapPin, Maximize2, BedDouble, Layers, CalendarDays, AlignLeft } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { InfoRow } from "@/components/owners/info-row"
import type { Property } from "@/lib/properties"

export function PropertyInfo({ property }: { property: Property }) {
  const floorLabel =
    property.floor != null && property.totalFloors != null
      ? `${property.floor} / ${property.totalFloors}`
      : property.totalFloors != null
      ? `Jami ${property.totalFloors} qavat`
      : property.floor != null
      ? `${property.floor}-qavat`
      : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          Umumiy ma'lumot
        </h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        <InfoRow
          icon={<MapPin className="size-3.5" />}
          label="Manzil"
          value={property.address}
        />
        <InfoRow
          icon={<Maximize2 className="size-3.5" />}
          label="Maydon"
          value={`${property.area} m²`}
        />
        {property.rooms != null && (
          <InfoRow
            icon={<BedDouble className="size-3.5" />}
            label="Xonalar"
            value={`${property.rooms} ta`}
          />
        )}
        {floorLabel && (
          <InfoRow
            icon={<Layers className="size-3.5" />}
            label="Qavat"
            value={floorLabel}
          />
        )}
        {property.yearBuilt != null && (
          <InfoRow
            icon={<CalendarDays className="size-3.5" />}
            label="Qurilgan yil"
            value={String(property.yearBuilt)}
          />
        )}
        {property.description && (
          <>
            <Separator />
            <InfoRow
              icon={<AlignLeft className="size-3.5" />}
              label="Tavsif"
              value={property.description}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/properties/property-info.tsx
git commit -m "feat: add PropertyInfo component"
```

---

### Task 5: PropertyOwnerCard component

**Files:**
- Create: `components/properties/property-owner-card.tsx`

- [ ] **Step 1: Create the file**

```tsx
import Link from "next/link"
import { User, Building2, ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { owners } from "@/lib/owners"
import type { Property } from "@/lib/properties"

export function PropertyOwnerCard({ property }: { property: Property }) {
  const owner = owners.find((o) => o.id === property.ownerId)

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">Mulkdor</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {owner?.type === "Company"
              ? <Building2 className="size-4" />
              : <User className="size-4" />}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium leading-tight">{property.ownerName}</span>
            {owner && (
              <span className="text-[11px] text-muted-foreground">{owner.type}</span>
            )}
          </div>
        </div>
        {owner && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            render={<Link href={`/dashboard/owners/${owner.id}`} />}
          >
            Profilni ko'rish
            <ArrowUpRight className="size-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/properties/property-owner-card.tsx
git commit -m "feat: add PropertyOwnerCard component"
```

---

### Task 6: PropertyStatusCard component

**Files:**
- Create: `components/properties/property-status-card.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Property } from "@/lib/properties"

const statusStyle: Record<
  Property["status"],
  { ring: string; bg: string; text: string; icon: React.ReactNode; label: string; hint: string }
> = {
  Active: {
    ring: "ring-emerald-500/25",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: <CheckCircle2 className="size-4" />,
    label: "Faol",
    hint: "Mulk hozirda foydalanishda",
  },
  "Pending Approval": {
    ring: "ring-amber-500/25",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    icon: <Clock className="size-4" />,
    label: "Tasdiq kutilmoqda",
    hint: "Tekshiruv jarayonida",
  },
  Inactive: {
    ring: "ring-rose-500/30",
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-400",
    icon: <XCircle className="size-4" />,
    label: "Faol emas",
    hint: "Mulk hozirda ishlatilmayapti",
  },
}

export function PropertyStatusCard({ property }: { property: Property }) {
  const s = statusStyle[property.status]
  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">Holat</h2>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg p-3 ring-1 ring-inset",
            s.ring,
            s.bg,
          )}
        >
          <span className={cn("shrink-0", s.text)}>{s.icon}</span>
          <div className="flex flex-col gap-0.5">
            <span className={cn("text-sm font-semibold", s.text)}>{s.label}</span>
            <span className="text-[11px] text-muted-foreground">{s.hint}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/properties/property-status-card.tsx
git commit -m "feat: add PropertyStatusCard component"
```

---

### Task 7: Property detail page

**Files:**
- Create: `app/dashboard/(owner)/properties/[id]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { notFound } from "next/navigation"
import { getPropertyById } from "@/lib/properties"
import { ActionBar } from "@/components/properties/action-bar"
import { PropertyHero } from "@/components/properties/property-hero"
import { PropertyInfo } from "@/components/properties/property-info"
import { PropertyOwnerCard } from "@/components/properties/property-owner-card"
import { PropertyStatusCard } from "@/components/properties/property-status-card"

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const property = getPropertyById(Number(id))
  if (!property) notFound()

  return (
    <div className="flex flex-col gap-6">
      <ActionBar />
      <PropertyHero property={property} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PropertyInfo property={property} />
        </div>
        <div className="flex flex-col gap-6">
          <PropertyOwnerCard property={property} />
          <PropertyStatusCard property={property} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/(owner)/properties/[id]/page.tsx
git commit -m "feat: add property detail page"
```

---

### Task 8: Wire up list page navigation

**Files:**
- Modify: `app/dashboard/(owner)/properties/page.tsx`

- [ ] **Step 1: Replace static data + add Link to View button**

Replace the entire file content with:

```tsx
import Link from "next/link"
import { MapPin } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Search } from "lucide-react"
import { properties } from "@/lib/properties"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Active:             "default",
  "Pending Approval": "secondary",
  Inactive:           "destructive",
}

export default function PropertiesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">
            Registered villas, hotels, offices, and business centers.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search properties..." className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.type}</TableCell>
                  <TableCell className="text-sm">{p.ownerName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {p.address}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/dashboard/properties/${p.id}`} />}
                    >
                      View
                    </Button>
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
git add app/dashboard/(owner)/properties/page.tsx
git commit -m "feat: wire properties list to detail page"
```
