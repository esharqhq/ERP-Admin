import { Mail, Phone, Building2, User, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { statusVariant, riskTone } from "@/lib/owner-utils"
import type { Owner } from "@/lib/owners"

export function HeroCard({ owner }: { owner: Owner }) {
  const risk = riskTone[owner.risk]
  const initials = owner.name.slice(0, 2).toUpperCase()

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
      <CardContent className="-mt-12 flex flex-col gap-5 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <Avatar className="size-24 ring-4 ring-background shadow-sm">
              <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1.5 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-bold tracking-tight leading-tight sm:text-[28px]">
                  {owner.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {owner.type === "Company" ? <Building2 className="size-3" /> : <User className="size-3" />}
                  {owner.type}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant[owner.status]}>{owner.status}</Badge>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                    risk.bg, risk.text, risk.ring,
                  )}
                >
                  {risk.icon}
                  {risk.label}
                </span>
                {owner.satisfaction > 0 && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground">
                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                    <span className="tabular-nums text-foreground">{owner.satisfaction.toFixed(1)}</span>
                    <span>reyting</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" render={<a href={`mailto:${owner.email}`} />}>
              <Mail className="size-4" />
              Email
            </Button>
            <Button size="sm" className="gap-1.5" render={<a href={`tel:${owner.phone.replace(/\s+/g, "")}`} />}>
              <Phone className="size-4" />
              {`Qo'ng'iroq`}
            </Button>
          </div>
        </div>

        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{owner.bio}</p>

        {owner.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {owner.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-md border border-dashed border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
