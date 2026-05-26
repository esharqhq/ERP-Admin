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
          {"Umumiy ma'lumot"}
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
