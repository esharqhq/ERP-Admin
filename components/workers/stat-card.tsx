// components/workers/stat-card.tsx
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { STAT_TONES } from "@/lib/worker-utils"

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: string | number
  hint: string
  icon: React.ReactNode
  tone: keyof typeof STAT_TONES
}) {
  const t = STAT_TONES[tone]
  return (
    <Card size="sm" className="transition-shadow duration-200 hover:shadow-sm">
      <CardContent className="flex items-start gap-3">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg ring-1", t.ring, t.bg, t.text)}>
          {icon}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </span>
          <span className="font-heading text-xl font-semibold tracking-tight leading-none">{value}</span>
          <span className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</span>
        </div>
      </CardContent>
    </Card>
  )
}
