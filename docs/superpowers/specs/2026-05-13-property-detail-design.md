# Property Detail Page — Design Spec
Date: 2026-05-13

## Overview
A detail page for a single property, navigated from the `/dashboard/properties` table ("View" button). Shows basic property info, owner reference, and status.

## Route
`/dashboard/properties/[id]` → `app/dashboard/(owner)/properties/[id]/page.tsx`

## Data Model
New file `lib/properties.ts` with a standalone `Property` type:
```ts
type Property = {
  id: number
  name: string
  type: "Villa" | "Office" | "Hotel" | "Apartment" | "Townhouse" | "Business Ctr." | "Retail"
  address: string
  status: "Active" | "Pending Approval" | "Inactive"
  ownerId: number
  ownerName: string
  area: number         // m²
  rooms?: number
  floor?: number
  totalFloors?: number
  yearBuilt?: number
  description?: string
}
```
Mock data covers the 6 existing properties from the list page.

## Layout
```
[ ActionBar — back to /dashboard/properties, edit/more ]

[ Hero Banner — gradient bg, property name large,      ]
[               type chip, status badge top-right       ]

[ Left col (lg:col-span-2)  ] [ Right col (lg:col-span-1) ]
[ PropertyInfo card:        ] [ OwnerCard:                 ]
[   type, area, rooms,      ] [   name, link → /owners/id  ]
[   floor/totalFloors,      ] [                             ]
[   yearBuilt, address,     ] [ StatusCard:                 ]
[   description             ] [   colored indicator + label ]
```

## Components
- `components/properties/property-hero.tsx` — gradient banner with name, type chip, status badge
- `components/properties/property-info.tsx` — info grid card (icon + label + value rows)
- `components/properties/property-owner-card.tsx` — owner name, type, link to owner detail
- `components/properties/property-status-card.tsx` — status with color ring/bg

## Changes to Existing Files
- `app/dashboard/(owner)/properties/page.tsx` — "View" button gets `href=/dashboard/properties/{id}`
- `lib/properties.ts` — new file with type + mock data

## Reuse
- `components/owners/info-row.tsx` — reused inside PropertyInfo for label/value rows
- `lib/owner-utils.tsx` — `propStatusVariant` reused for status colors
- `lib/owner-utils.tsx` — `STAT_TONES` / tone pattern reused for status card

## Out of Scope
- Map, gallery/images, financial data, maintenance history (future)
- Filtering/search on list page
