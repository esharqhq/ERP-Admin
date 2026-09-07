import { computeStaffingLayout } from "@/lib/tasks/pip-layout";
import { cn } from "@/lib/utils";

export interface StaffingPipMeterProps {
  filled: number;
  required: number;
  urgent: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StaffingPipMeter({
  filled,
  required,
  urgent,
  size = "sm",
  className,
}: StaffingPipMeterProps) {
  const layout = computeStaffingLayout(filled, required, urgent);
  const pipWidth = size === "md" ? 10 : 8;
  const pipHeight = size === "md" ? 18 : 16;

  switch (layout.mode) {
    case "dash":
      return (
        <span className={cn("font-mono text-xs", className)} style={{ color: "#B6C2CC" }}>
          —
        </span>
      );
    case "fraction-only":
      return (
        <span
          className={cn("font-mono text-xs font-bold", className)}
          style={{ color: layout.fg }}
        >
          {layout.text}
        </span>
      );
    case "pips":
      return (
        <span className={cn("inline-flex items-center gap-[3px]", className)}>
          {layout.pips.map((pip, i) => (
            <span
              key={i}
              style={{
                width: pipWidth,
                height: pipHeight,
                borderRadius: 3,
                background: pip.bg,
                boxShadow: pip.ring ?? undefined,
              }}
            />
          ))}
        </span>
      );
  }
}
