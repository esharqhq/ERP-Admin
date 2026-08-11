import { cn } from "@/lib/utils"

export function InfoRow({
  icon,
  label,
  value,
  mono = false,
  hint,
}: {
  icon: React.ReactNode
  label: string
  /** Text, or a node — a badge reads as a value here as well as a string does. */
  value: React.ReactNode
  mono?: boolean
  /** One line under the value, for when the label alone is ambiguous. */
  hint?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
        {/* `flex` rather than plain inline text so a badge sits on its own
            baseline instead of stretching to the row's full width. */}
        <span
          className={cn(
            "flex flex-wrap items-center gap-1.5 text-[13px] leading-snug text-foreground break-words",
            mono && "font-mono",
          )}
        >
          {value}
        </span>
        {hint ? (
          <span className="text-[11px] leading-snug text-muted-foreground">{hint}</span>
        ) : null}
      </div>
    </div>
  )
}
