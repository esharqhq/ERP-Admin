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
            nativeButton={false}
            render={<Link href={`/dashboard/owners/${owner.id}`} />}
          >
            {"Profilni ko'rish"}
            <ArrowUpRight className="size-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
