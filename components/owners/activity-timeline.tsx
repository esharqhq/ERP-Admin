import { Clock, PlayCircle, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AdminTaskGroupSummaryDto } from "@/lib/types/task.types";

interface ActivityTimelineProps {
  taskGroups: AdminTaskGroupSummaryDto[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusIcon({ status }: { status: string }) {
  if (status === "Active") return <PlayCircle className="size-4 text-blue-500" />;
  if (status === "Done") return <CheckCircle2 className="size-4 text-emerald-500" />;
  if (status === "Cancelled") return <XCircle className="size-4 text-red-500" />;
  return <Clock className="size-4 text-amber-500" />;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "Done") return "default";
  if (status === "Cancelled") return "destructive";
  return "secondary";
}

export function ActivityTimeline({ taskGroups }: ActivityTimelineProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">{"So'nggi faollik"}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {"Shartnomalar, to'lovlar va eslatmalar tarixi"}
        </p>
      </CardHeader>

      {taskGroups.length === 0 ? (
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
          <Clock className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Faoliyat tarixi mavjud emas</p>
        </CardContent>
      ) : (
        <CardContent className="flex flex-col gap-2.5">
          {taskGroups.map((group) => (
            <div
              key={group.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-2.5"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <StatusIcon status={group.status} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium leading-tight">
                  {group.title ?? "Nomsiz booking"}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {group.propertyName}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {formatDate(group.firstDate)}
                </span>
                <Badge variant={statusVariant(group.status)} className="text-[10px]">
                  {group.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
