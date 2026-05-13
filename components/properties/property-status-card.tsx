import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Property } from "@/lib/properties"

const statusStyle: Record<
  Property["status"],
  { ring: string; bg: string; text: string; icon: React.ReactNode; label: string; hint: string }
> = {
  Active: {
    ring: "ring-emerald-500/25",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: <CheckCircle2 className="size-4" />,
    label: "Faol",
    hint: "Mulk hozirda foydalanishda",
  },
  "Pending Approval": {
    ring: "ring-amber-500/25",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    icon: <Clock className="size-4" />,
    label: "Tasdiq kutilmoqda",
    hint: "Tekshiruv jarayonida",
  },
  Inactive: {
    ring: "ring-rose-500/30",
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-400",
    icon: <XCircle className="size-4" />,
    label: "Faol emas",
    hint: "Mulk hozirda ishlatilmayapti",
  },
}

export function PropertyStatusCard({ property }: { property: Property }) {
  const s = statusStyle[property.status]
  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">Holat</h2>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg p-3 ring-1 ring-inset",
            s.ring,
            s.bg,
          )}
        >
          <span className={cn("shrink-0", s.text)}>{s.icon}</span>
          <div className="flex flex-col gap-0.5">
            <span className={cn("text-sm font-semibold", s.text)}>{s.label}</span>
            <span className="text-[11px] text-muted-foreground">{s.hint}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
