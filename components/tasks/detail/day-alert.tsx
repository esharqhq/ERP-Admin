"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { dayAlert, type AlertTone, type DayAlert } from "@/lib/tasks/detail/day-alert";
import { formatHm } from "@/lib/tasks/detail/day-time";
import type { TaskComplaintDto, TaskItemDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

const TONE: Record<AlertTone, { box: string; tile: string; title: string }> = {
  critical: {
    box: "bg-status-cancelled-tint/50 ring-status-cancelled/25",
    tile: "bg-status-cancelled-tint text-status-cancelled-deep",
    title: "text-status-cancelled-deep",
  },
  warning: {
    box: "bg-status-pending-tint/60 ring-status-pending/25",
    tile: "bg-status-pending-tint text-status-pending-deep",
    title: "text-status-pending-deep",
  },
  positive: {
    box: "bg-status-verified-tint/50 ring-status-verified/20",
    tile: "bg-status-verified-tint text-status-verified",
    title: "text-status-verified",
  },
  neutral: { box: "bg-muted/60 ring-border", tile: "bg-muted text-muted-foreground", title: "text-foreground" },
};

const ICON = { critical: AlertTriangle, warning: AlertTriangle, positive: CheckCircle2, neutral: Info } as const;

/** The day's one alert (spec §4.3) — words and formats what `dayAlert` decided. */
export function DayAlertBox({
  task,
  complaint,
  now,
  locale,
}: {
  task: TaskItemDto;
  complaint: TaskComplaintDto | null;
  now: number;
  locale: string;
}) {
  const t = useTranslations("tasks.detail.alerts");
  const alert = dayAlert(task, complaint, now);
  if (!alert) return null;

  const hm = (ms: number | null) => (ms === null ? "–" : formatHm(ms, locale));
  const dt = (ms: number | null) =>
    ms === null ? "–" : new Date(ms).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });

  const words = (a: DayAlert): { title: string; text: string | null } => {
    switch (a.kind) {
      case "complaint":
        return {
          title: t("complaint.title"),
          text: t("complaint.text", { reason: a.reason, photos: a.photos, raised: dt(a.raisedAt) }),
        };
      case "complaintUnloaded":
        return { title: t("complaintUnloaded.title"), text: t("complaintUnloaded.text") };
      case "late":
        return {
          title: t("late.title"),
          text: t("late.text", { names: a.names.join(", "), count: a.names.length, minutes: a.minutes }),
        };
      case "startPassed":
        return { title: t("startPassed.title"), text: t("startPassed.text", { time: hm(a.cancelsAt) }) };
      case "waitingOwner":
        return {
          title: t("waitingOwner.title"),
          text: t("waitingOwner.text", { handed: hm(a.handedAt), auto: hm(a.autoAt) }),
        };
      case "upheld": {
        const decided =
          a.decidedAt === null
            ? ""
            : a.note
              ? `${t("upheld.decided", { date: dt(a.decidedAt), note: a.note })} `
              : `${t("upheld.decidedNoNote", { date: dt(a.decidedAt) })} `;
        return { title: t("upheld.title"), text: `${decided}${t("upheld.text")}` };
      }
      case "forced":
        return { title: t("forced.title"), text: t("forced.text") };
      case "autoAccepted":
        return { title: t("autoAccepted.title"), text: t("autoAccepted.text") };
      case "legacyClosed":
        return { title: t("legacyClosed.title"), text: t("legacyClosed.text") };
      case "unknownReason":
        return { title: a.reason, text: null };
      case "noWorkers":
        return {
          title: t("noWorkers.title"),
          text: t("noWorkers.text", { required: a.required, start: hm(a.startsAt) }),
        };
      case "understaffed":
        return {
          title: t("understaffed.title"),
          text: t("understaffed.text", { open: a.open, required: a.required, start: hm(a.startsAt) }),
        };
      case "ready":
        return { title: t("ready.title"), text: t("ready.text", { required: a.required }) };
      case "cancelled":
        return { title: t("cancelled.title"), text: t("cancelled.text") };
    }
  };

  const { title, text } = words(alert);
  const tone = TONE[alert.tone];
  const Icon = alert.kind === "cancelled" ? XCircle : ICON[alert.tone];

  return (
    <div className={cn("flex items-start gap-3 rounded-xl p-3 ring-1 ring-inset", tone.box)}>
      <span className={cn("flex size-9 flex-none items-center justify-center rounded-[10px]", tone.tile)}>
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("text-[13px] font-semibold", tone.title)}>{title}</span>
        {text ? <span className="text-[13px] leading-snug text-pretty text-foreground/80">{text}</span> : null}
      </span>
    </div>
  );
}
