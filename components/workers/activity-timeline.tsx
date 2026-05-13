// components/workers/activity-timeline.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { activityIcon, formatDate } from "@/lib/worker-utils"
import type { Worker } from "@/lib/workers"

export function ActivityTimeline({ worker }: { worker: Worker }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">So'nggi faollik</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Vazifalar, to'lovlar va hujjatlar tarixi</p>
      </CardHeader>
      <CardContent>
        {worker.activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Faollik tarixi yo'q</p>
        ) : (
          <ol className="relative flex flex-col gap-4 pl-6 before:absolute before:left-[11px] before:top-1 before:bottom-1 before:w-px before:bg-border">
            {worker.activity.map((a) => {
              const t = activityIcon[a.kind]
              return (
                <li key={a.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-6 top-0 flex size-6 items-center justify-center rounded-full ring-2 ring-background",
                      t.bg, t.text, t.ring,
                    )}
                  >
                    {t.icon}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{a.title}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{formatDate(a.date)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{a.description}</span>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
