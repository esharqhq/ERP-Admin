"use client";

import { useTranslations } from "next-intl";
import { DayStateChip } from "@/components/tasks/detail/day-state-chip";
import { Card } from "@/components/ui/card";
import { formatDayParts, formatHm } from "@/lib/tasks/detail/day-time";
import { closureLabel, dayNote, dayStaffing, type NoteTone } from "@/lib/tasks/detail/day-view";
import { closureTally } from "@/lib/tasks/order-facts";
import type { TaskGroupDto, TaskItemDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

const NOTE_TONE: Record<NoteTone, string> = {
  muted: "text-muted-foreground",
  warning: "text-status-pending-deep",
  danger: "text-status-cancelled-deep",
};

/** A booking's days; 2 columns between 768 and 1023px, one otherwise. */
export function DaysList({
  days,
  selectedId,
  onSelect,
  now,
  locale,
  group,
}: {
  days: TaskItemDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  now: number;
  locale: string;
  group: TaskGroupDto;
}) {
  const t = useTranslations("tasks.detail");
  const tally = closureTally(group.closed, group.days?.done);
  const count = (key: string) => tally?.rows.find((r) => r.key === key)?.count ?? 0;

  const noteText = (task: TaskItemDto) => {
    const n = dayNote(task, now);
    switch (n.key) {
      case "unfilled":
      case "late":
        return t(`notes.${n.key}`, { count: n.count ?? 0 });
      case "onSite":
        return n.at != null ? t("notes.onSite", { time: formatHm(n.at, locale) }) : t("notes.onSiteUnknown");
      case "closure": {
        const l = closureLabel(n.reason ?? null);
        return "raw" in l ? l.raw : t(`closure.${l.key}`);
      }
      case "none":
        return "–";
      default:
        return t(`notes.${n.key}`);
    }
  };

  return (
    <Card className="gap-1 px-2.5 pt-3.5 pb-2.5">
      <div className="flex flex-col gap-0.5 px-2 pb-2">
        <h2 className="text-[15px] font-bold">{t("days")}</h2>
        {/* `closed` does not sum to `days.done` before 2026-09-21 — the remainder is
            "no reason", never a discrepancy. */}
        {tally ? (
          <span className="text-[11px] text-muted-foreground">
            {t("tally", {
              accepted: count("ownerAccepted"),
              auto: count("autoAccepted"),
              forced: count("closedForced"),
              upheld: count("closedReplacement"),
            })}
            {tally.unexplained > 0 ? ` · ${t("tallyNoReason", { count: tally.unexplained })}` : null}
          </span>
        ) : null}
      </div>
      <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-1">
        {days.map((d) => {
          const { wd, dd } = formatDayParts(d.scheduledDate, locale);
          const selected = d.id === selectedId;
          const note = dayNote(d, now);
          const staff = dayStaffing(d);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d.id)}
              aria-pressed={selected}
              className={cn(
                "flex items-center gap-3 rounded-xl p-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "bg-status-verified-tint/60 ring-[1.5px] ring-inset ring-status-active" : "hover:bg-muted/50",
              )}
            >
              <span className="flex w-10 flex-none flex-col items-center">
                <span className="overline-label text-muted-foreground">{wd}</span>
                <span className="font-mono text-lg font-semibold tabular-nums">{dd}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <DayStateChip task={d} />
                <span className={cn("truncate text-[11px]", NOTE_TONE[note.tone])}>{noteText(d)}</span>
              </span>
              <span
                className={cn(
                  "flex-none font-mono text-xs font-semibold tabular-nums",
                  staff ? NOTE_TONE[staff.tone] : "text-muted-foreground/60",
                )}
              >
                {staff ? `${staff.filled}/${staff.required}` : "–"}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
