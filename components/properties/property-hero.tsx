import { Building2, Home, Hotel, Briefcase, Store } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
