"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check, CheckCheck,
  Clock,
  Crosshair,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DayKey } from "@/lib/ui/week";
import type { AvailabilityDay } from "@/lib/workers/availability";
import type { ChipKind, MatrixChip, OpenTaskCandidate } from "@/lib/workers/matrix";
import { cn } from "@/lib/utils";
import { AssignDayPopover } from "./assign-day-popover";

/** next-intl's own bound translator, so the helpers below cannot widen its values. */
type T = ReturnType<typeof useTranslations<"workers.matrix">>;

/**
 * One worker, one day.
 *
 * A chip carries three things — the window, the property, and **one** state mark.
 * Everything else belongs in the popover. Two chips, then `+n`: a third overruns
 * the column and truncates mid-word, which reads as a bug rather than as a list.
 */

const MAX_CHIPS = 2;

/**
 * Tone per state — tokens, never the design's raw hexes, so the grid inverts in
 * dark mode instead of turning into a wall of near-white tiles.
 *
 * `scheduled` is deliberately the **quiet** one. It is the majority state on a
 * healthy week, and a covered week has to read as calm; colour is spent on the
 * three things an admin acts on.
 */
const TONE: Record<ChipKind, string> = {
  present: "bg-status-active-tint text-status-active ring-status-active/25",
  done: "bg-status-active-tint/50 text-status-active/80 ring-status-active/15",
  scheduled: "bg-muted text-foreground/80 ring-border",
  refused: "bg-status-cancelled-tint text-status-cancelled ring-status-cancelled/30",
  short: "bg-status-pending-tint text-status-pending-deep ring-status-pending/35",
  cancelled: "bg-transparent text-muted-foreground/70 ring-border",
};

const ICON: Record<ChipKind, typeof Check> = {
  present: Check,
  done: CheckCheck,
  scheduled: Clock,
  refused: Crosshair,
  short: AlertTriangle,
  cancelled: X,
};

export function MatrixCell({
  chips,
  availability,
  isToday,
  isWeekend,
  failed,
  assignable,
  candidates,
  workerId,
  workerName,
  date,
  onAssign,
  onOpenChip,
}: {
  chips: MatrixChip[];
  /** Only present while the row is expanded — the layer, never the ground. */
  availability?: AvailabilityDay;
  isToday: boolean;
  isWeekend: boolean;
  /** This column's read failed; the cell says nothing rather than "nothing". */
  failed: boolean;
  /**
   * A free day is an affordance, but only when it actually is one: the worker
   * can be booked (stage Active, account Active) **and** this day holds at
   * least one task still short a worker. Neither is knowable inside the cell,
   * so the row passes the verdict down rather than the cell re-deriving it.
   */
  assignable: boolean;
  /** This day's open-task candidates — only meaningful when `assignable`. */
  candidates: OpenTaskCandidate[];
  workerId: string;
  workerName: string | null;
  date: DayKey;
  onAssign: (chip: MatrixChip) => void;
  onOpenChip: (chip: MatrixChip) => void;
}) {
  const t = useTranslations("workers.matrix");
  // Owned here, not lifted: the popover is anchored to this cell's own
  // trigger, so this cell is the one thing that knows when it should close.
  const [assignOpen, setAssignOpen] = useState(false);

  const shown = chips.slice(0, MAX_CHIPS);
  const more = chips.length - shown.length;
  const closed = availability?.state === "closed";
  const empty = chips.length === 0 && !closed;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-1 border-r border-border/60 p-1.5",
        empty ? "justify-center" : "justify-start",
        failed
          ? "bg-muted/40"
          : closed
            ? "bg-muted/60"
            : isToday
              ? "bg-status-active-tint/20"
              : isWeekend
                ? "bg-muted/20"
                : "bg-card",
      )}
    >
      {/* The availability ground, drawn only when the layer is on. */}
      {closed && (
        <span className="flex items-center gap-1 text-[9.5px] text-muted-foreground/70">
          <Minus className="size-2.5" strokeWidth={2.6} />
          {t("closed")}
        </span>
      )}

      {failed ? (
        // Not a dash: a dash means "nothing booked", and this column does not know.
        <span className="self-center text-[10px] text-muted-foreground/60">
          {t("dayFailedShort")}
        </span>
      ) : empty && assignable ? (
        // The design's own thesis: an empty cell on a bookable worker is where
        // work gets put, not a blank. Only drawn when the day actually has
        // something to offer — the row already checked.
        //
        // The popover is anchored to *this* trigger, not rendered from the
        // page: an admin never loses which cell they're assigning into,
        // which a screen-centred modal cannot promise.
        <Popover open={assignOpen} onOpenChange={setAssignOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex min-h-8 flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-[10px] font-semibold text-status-active ring-1 ring-inset ring-status-active/35 outline-none transition-colors hover:bg-status-active-tint/40 focus-visible:ring-2 focus-visible:ring-ring"
              />
            }
          >
            <Plus className="size-3" strokeWidth={2.6} />
            <span className="text-[9px] uppercase tracking-[0.04em]">{t("assign")}</span>
          </PopoverTrigger>
          <PopoverContent align="start" side="bottom" sideOffset={4} className="w-72 p-0">
            <AssignDayPopover
              workerId={workerId}
              workerName={workerName}
              date={date}
              candidates={candidates}
              onAssigned={() => setAssignOpen(false)}
            />
          </PopoverContent>
        </Popover>
      ) : empty ? (
        // One muted dash, centred. Not an error, not availability — simply nothing.
        <span className="self-center font-mono text-sm text-border">–</span>
      ) : null}

      {shown.map((chip) => (
        <Chip
          key={chip.taskId}
          chip={chip}
          onAssign={() => onAssign(chip)}
          onOpen={() => onOpenChip(chip)}
        />
      ))}

      {more > 0 && (
        <span className="text-[10px] font-semibold text-primary">
          {t("moreChips", { count: more })}
        </span>
      )}
    </div>
  );
}

function Chip({
  chip,
  onAssign,
  onOpen,
}: {
  chip: MatrixChip;
  onAssign: () => void;
  onOpen: () => void;
}) {
  const t = useTranslations("workers.matrix");
  const Icon = ICON[chip.kind];
  const cancelled = chip.kind === "cancelled";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex min-w-0 flex-col gap-0.5 rounded-md p-1 text-left ring-1 ring-inset transition-[filter]",
        "outline-none hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring",
        TONE[chip.kind],
      )}
    >
      <span className="flex min-w-0 items-center justify-between gap-1">
        <span
          className={cn(
            "min-w-0 truncate font-mono text-[9.5px] font-semibold",
            // Kept visible for the week so a hole in coverage has a reason
            // attached, but struck through so it cannot be read as cover.
            cancelled && "line-through",
          )}
        >
          {chip.to ? `${chip.from}–${chip.to}` : chip.from}
        </span>
        <span className="flex flex-none items-center gap-0.5">
          <Icon className="size-2.5" strokeWidth={2.4} />
          {/* The one number this state is about. */}
          <span className="font-mono text-[9px] font-bold">{tag(chip, t)}</span>
        </span>
      </span>

      <span className="flex min-w-0 items-center gap-1">
        <span className="min-w-0 flex-1 truncate rounded-[4px] bg-background/70 px-1 text-[9px] font-semibold">
          {chip.propertyName || "—"}
        </span>
        {chip.taskTitle && (
          <span className="min-w-0 flex-1 truncate rounded-[4px] bg-background/40 px-1 text-[9px]">
            {chip.taskTitle}
          </span>
        )}
      </span>

      {/*
        The one write path the Matrix keeps from the Calendar. Its refusal set
        (rating floor, profession, worker limit, overlap, contract ends first) is
        named in the assign sheet, not here — a cell is too small to explain five
        reasons and an admin needs to pick a worker before any of them apply.
      */}
      {chip.kind === "short" && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onAssign();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onAssign();
            }
          }}
          className="w-fit rounded-[4px] bg-background/70 px-1 text-[9px] font-bold underline-offset-2 hover:underline"
        >
          {t("assign")}
        </span>
      )}

      {chip.kind === "refused" && (
        <span className="truncate text-[9px] font-semibold">
          {refusalNote(chip, t)}
        </span>
      )}
    </button>
  );
}

/** The state's own number, or nothing when the state has none. */
function tag(chip: MatrixChip, t: T): string {
  if (chip.kind === "present") return t("in");
  if (chip.kind === "done") return chip.hours ? t("hoursShort", { hours: chip.hours }) : "";
  // ⚠ A refusal only carries metres when the reason was OutsideGeofence.
  if (chip.kind === "refused" && chip.refusedDistanceMeters !== null) {
    return t("metres", { metres: Math.round(chip.refusedDistanceMeters) });
  }
  if (chip.staffing) return `${chip.staffing.assigned}/${chip.staffing.required}`;
  return "";
}

/**
 * Why the check-in was refused.
 *
 * The three reasons are the server's own TitleCase values. An unrecognised one
 * degrades to the generic sentence rather than rendering next-intl's missing-key
 * path — the reason list is the backend's to extend.
 */
function refusalNote(chip: MatrixChip, t: T): string {
  const known = ["OutsideGeofence", "GpsRequired", "GeofenceTargetMissing"];
  return chip.refusedReason && known.includes(chip.refusedReason)
    ? t(`refusal.${chip.refusedReason}` as "refusal.GpsRequired")
    : t("refusal.unknown");
}
