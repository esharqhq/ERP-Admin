import Link from "next/link"
import { Home, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { propStatusVariant } from "@/lib/owner-utils"
import type { Owner } from "@/lib/owners"

export function PropertyList({ owner }: { owner: Owner }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">Mulklari</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {`${owner.propertiesList.length} ta mulk ro'yxatda`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/properties" />}
          className="text-primary"
        >
          Barchasi
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {owner.propertiesList.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/30">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary ring-1 ring-primary/15">
                <Home className="size-4" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{p.name}</span>
                <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  {p.address}
                </span>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:inline">{p.type}</span>
              <Badge variant={propStatusVariant[p.status]}>{p.status}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
