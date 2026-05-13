// components/workers/assignments-card.tsx
import { MapPin, CalendarDays } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { assignmentStatusStyle, formatDate } from "@/lib/worker-utils"
import type { Worker } from "@/lib/workers"

export function AssignmentsCard({ worker }: { worker: Worker }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-base font-semibold tracking-tight">Topshiriqlar</h2>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {worker.assignments.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Faol va rejalangan vazifalar</p>
      </CardHeader>
      <CardContent>
        {worker.assignments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <CalendarDays className="size-4 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Hozirda topshiriq yo'q</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {worker.assignments.map((a) => {
              const s = assignmentStatusStyle[a.status]
              return (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-all duration-150 hover:border-foreground/15 hover:bg-accent/30 hover:shadow-sm"
                >
                  <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", s.dot)} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-tight">{a.title}</span>
                      <span className={cn("inline-flex shrink-0 items-center gap-1 text-[11px] font-medium", s.text)}>
                        {s.icon}
                        {s.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3 shrink-0" />
                        {a.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3 shrink-0" />
                        {formatDate(a.date)}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
