// components/workers/hero-card.tsx
import { Star, Phone, Mail } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { statusVariant, roleColors } from "@/lib/worker-utils"
import type { Worker } from "@/lib/workers"

export function HeroCard({ worker }: { worker: Worker }) {
  const initials = worker.name.slice(0, 2).toUpperCase()

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
                  {worker.name}
                </h1>
                <span className={cn("text-sm font-semibold", roleColors[worker.role])}>
                  {worker.role}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant[worker.status]}>{worker.status}</Badge>
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground">
                  <Star className="size-3.5 fill-amber-500 text-amber-500" />
                  <span className="tabular-nums text-foreground">{worker.rating.toFixed(1)}</span>
                  <span>reyting</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              className="gap-1.5"
              render={<a href={`mailto:${worker.email}`} />}
            >
              <Mail className="size-4" />
              Email
            </Button>
            <Button
              size="sm"
              nativeButton={false}
              className="gap-1.5"
              render={<a href={`tel:${worker.phone.replace(/\s+/g, "")}`} />}
            >
              <Phone className="size-4" />
              Qo'ng'iroq
            </Button>
          </div>
        </div>

        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{worker.bio}</p>

        {worker.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {worker.tags.map((t) => (
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
