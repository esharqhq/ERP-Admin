import type { CSSProperties } from "react";
import type { DerivedTaskStatus } from "@/lib/tasks/derived-status";
import { TASK_STATUS_VISUAL } from "@/lib/tasks/status-visual";
import { cn } from "@/lib/utils";

export interface TaskStatusPillProps {
  status: DerivedTaskStatus;
  size?: "sm" | "md";
  className?: string;
}

export function TaskStatusPill({ status, size = "sm", className }: TaskStatusPillProps) {
  const v = TASK_STATUS_VISUAL[status];
  const padded = v.bg !== "transparent";

  const style: CSSProperties = {
    height: size === "md" ? 24 : 20,
    padding: padded ? "0 8px" : 0,
    borderRadius: 6,
    background: v.bg,
    color: v.fg,
    boxShadow: v.ring ?? undefined,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap",
        className,
      )}
      style={style}
    >
      <span
        className="inline-block shrink-0 rounded-full"
        style={{ width: 6, height: 6, background: v.dot }}
      />
      {status}
    </span>
  );
}
