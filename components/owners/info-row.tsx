import { cn } from "@/lib/utils"

export function InfoRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
        <span className={cn("text-[13px] leading-snug text-foreground break-words", mono && "font-mono")}>
          {value}
        </span>
      </div>
    </div>
  )
}
