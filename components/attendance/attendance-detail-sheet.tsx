"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, Info, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AttendanceBadge } from "@/components/attendance/attendance-badge";
import { initials } from "@/lib/ui/initials";
import { EMPTY, hhmm, metres } from "@/lib/attendance/format";
import { refusalReasonKey, type AttendanceRow } from "@/lib/attendance/status";
import { checkinDoorKind } from "@/lib/attendance/checkin-door";
import { cn } from "@/lib/utils";

/**
 * The rest of the row, one click away.
 *
 * Seven columns is the table's cap, so the fields that do not earn one live here:
 * the coordinates, the check-in door, the submission time, the refusal timestamp
 * and the ids.
 * **Nothing new** — the panel invents no value the response did not send.
 *
 * ⚠ **Read-only, because the route is.** `GET` is the whole endpoint: there is no
 * correct, excuse, mark-present or re-open call behind `system:attendance:read`.
 * So the panel offers navigation only — the worker, the property, the task group —
 * and no disabled action buttons, which would promise a capability that does not
 * exist anywhere in the backend.
 */
export function AttendanceDetailSheet({
  row,
  locale,
  onClose,
}: {
  row: AttendanceRow;
  locale: string;
  onClose: () => void;
}) {
  const t = useTranslations("attendance.detail");
  const tRefusal = useTranslations("attendance.refusal");
  const tDoor = useTranslations("attendance.door");

  const reason = refusalReasonKey(row.lastRefusalReason);
  const distance = metres(row.lastRefusalDistanceMeters);
  const hasCoords = row.checkinLat != null && row.checkinLng != null;
  // F-07 ·2. `null` — never checked in, or a pre-2026-09-22 row — reads as the
  // dash, never as a guessed door. An unknown door does the same.
  const door = checkinDoorKind(row.checkinDoor);
  const scannerCoords = door === "scanned";
  const distanceLabel =
    distance != null ? tRefusal("distance", { meters: distance }) : null;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="gap-2">
          <SheetTitle>{t("title")}</SheetTitle>
          {/*
            Titled with the person **and** the task, never just the person. One row
            is one (task, worker) pair, so a worker on two tasks the same day opens
            two different panels and the heading has to tell them apart.
          */}
          <SheetDescription>
            {t("subtitle", {
              property: row.propertyName,
              task: row.taskGroupTitle || row.taskId.slice(0, 8),
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-3 px-4 pb-4">
          <span className="flex size-9 flex-none items-center justify-center rounded-full bg-shell-tint text-xs font-semibold text-status-verified">
            {initials(row.workerName)}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold">{row.workerName}</span>
            <span className="truncate font-mono text-[10.5px] text-muted-foreground">
              {row.workerId}
            </span>
          </span>
          <AttendanceBadge kind={row.kind} className="ml-auto flex-none" />
        </div>

        <Section title={t("timeline")}>
          <ol className="flex flex-col">
            {buildTimeline({
              row,
              locale,
              hasCoords,
              scannerCoords,
              distanceLabel,
              reason,
              t,
              tRefusal,
            }).map((step, i, all) => (
              <Step key={step.id} {...step} last={i === all.length - 1} />
            ))}
          </ol>
        </Section>

        {/*
          The panel's one explanatory card, and it earns its place: an admin looking
          at a refused row goes looking for the pin, and its absence is a fact about
          how check-in works rather than a gap in the data.
        */}
        {!hasCoords && (
          <div className="mx-4 mb-4 flex gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5 ring-1 ring-inset ring-border">
            <MapPin className="mt-0.5 size-3.5 flex-none text-ink-soft" />
            <span className="flex flex-col gap-0.5">
              <span className="text-[12.5px] font-semibold">{t("noCoordsTitle")}</span>
              <span className="text-[11.5px] text-muted-foreground text-pretty">
                {distanceLabel
                  ? t("noCoordsBody", { distance: distanceLabel })
                  : t("noCoordsBodyPlain")}
              </span>
            </span>
          </div>
        )}

        <Section title={t("fields")}>
          <dl className="flex flex-col gap-px">
            <Field k={t("field.taskStatus")} v={row.taskStatus} mono />
            <Field k={t("field.outcome")} v={row.outcome} mono />
            <Field k={t("field.scheduledDate")} v={row.scheduledDate} mono />
            <Field
              k={t("field.submittedAt")}
              v={hhmm(row.submittedAt, locale)}
              mono
              dim={!row.submittedAt}
            />
            <Field
              k={t("field.coordinates")}
              v={hasCoords ? `${row.checkinLat}, ${row.checkinLng}` : EMPTY}
              mono
              dim={!hasCoords}
              // ⚠ On a staff scan the pair is the scanner's phone. The value alone
              // would be read as where the worker stood, so it carries the caveat.
              note={hasCoords && scannerCoords ? tDoor("scannerCoords") : undefined}
            />
            {/* A word, not a value — so not mono. */}
            <Field
              k={t("field.checkinMethod")}
              v={door ? tDoor(door) : EMPTY}
              dim={!door}
            />
            <Field
              k={t("field.refusedCount")}
              v={String(row.refusedCheckinCount)}
              mono
              dim={!row.refused}
            />
            <Field
              k={t("field.lastRefusal")}
              v={
                row.refused
                  ? [
                      row.lastRefusalReason,
                      hhmm(row.lastRefusalAt, locale),
                      distanceLabel,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : EMPTY
              }
              mono
              dim={!row.refused}
            />
            <Field k={t("field.taskGroup")} v={row.taskGroupId} mono />
          </dl>
        </Section>

        <Section title={null}>
          <div className="flex flex-col gap-1.5">
            <NavLink
              href={`/dashboard/workers/${row.workerId}`}
              label={t("openWorker")}
              detail={row.workerName}
            />
            <NavLink
              href={`/dashboard/properties/${row.propertyId}`}
              label={t("openProperty")}
              detail={row.propertyName}
            />
            <NavLink
              href={`/dashboard/tasks/${row.taskGroupId}`}
              label={t("openTask")}
              detail={row.taskGroupTitle || row.taskId.slice(0, 8)}
            />
          </div>

          <p className="mt-3 flex gap-2 text-[11.5px] text-muted-foreground text-pretty">
            <Info className="mt-px size-3.5 flex-none" />
            {t("readOnly")}
          </p>
        </Section>
      </SheetContent>
    </Sheet>
  );
}

interface TimelineStep {
  id: string;
  time: string;
  label: string;
  sub: string;
  tone: keyof typeof STEP_TONE;
}

/**
 * The row's four or five moments: **Scheduled first as the anchor, then the
 * events in the order they can only happen in.**
 *
 * ⚠ **Not sorted by timestamp, and that was tested rather than assumed.** Sorting
 * chronologically is the obvious instinct for something labelled a timeline, and
 * it is wrong here: a worker who arrives *early* is the ordinary case, not an edge
 * one — the first real row this was checked against was scheduled for 14:00 and
 * checked in at 13:31 — so a strict sort routinely strands `Scheduled` at the
 * bottom, below the check-out, which reads far worse than the thing it fixes.
 *
 * `scheduledAt` is a **baseline**, not an event: it is what the other three times
 * are measured against, which is why it leads regardless of where it falls on the
 * clock. Each step carries its own time, so an early arrival reads as "scheduled
 * 02:00, in at 01:31" rather than as a sequence running backwards.
 *
 * The refusal-count step is deliberately adjacent to the refusal it qualifies: it
 * has no timestamp, and anywhere else it would read as an event of its own.
 */
function buildTimeline({
  row,
  locale,
  hasCoords,
  scannerCoords,
  distanceLabel,
  reason,
  t,
  tRefusal,
}: {
  row: AttendanceRow;
  locale: string;
  hasCoords: boolean;
  scannerCoords: boolean;
  distanceLabel: string | null;
  reason: ReturnType<typeof refusalReasonKey>;
  t: (key: string, values?: Record<string, string | number>) => string;
  tRefusal: (key: string, values?: Record<string, string | number>) => string;
}): TimelineStep[] {
  const entries: TimelineStep[] = [
    {
      id: "scheduled",
      time: hhmm(row.scheduledAt, locale),
      label: t("scheduled"),
      sub: t("scheduledSub", {
        task: row.taskGroupTitle || row.taskId.slice(0, 8),
        property: row.propertyName,
      }),
      tone: "plain",
    },
  ];

  if (row.refused) {
    entries.push(
      {
        id: "refusal",
        time: hhmm(row.lastRefusalAt, locale),
        label: reason
          ? t("refusedAt", { reason: tRefusal(`reason.${reason}`) })
          : t("field.lastRefusal"),
        sub: distanceLabel
          ? t("refusedAtSub", { distance: distanceLabel })
          : t("refusedAtSubNoDistance"),
        tone: "bad",
      },
      {
        id: "refusalCount",
        time: EMPTY,
        label: t("refusedMore", { count: row.refusedCheckinCount }),
        sub: `${t("refusedMoreSub")} ${tRefusal("windowNote")}`,
        tone: "bad",
      },
    );
  }

  entries.push(
    {
      id: "checkin",
      time: hhmm(row.checkinAt, locale),
      label: t("checkIn"),
      sub: hasCoords
        ? t(scannerCoords ? "checkInSubScanner" : "checkInSub", {
            lat: String(row.checkinLat),
            lng: String(row.checkinLng),
          })
        : t("checkInMissing"),
      tone: row.checkinAt ? "good" : "muted",
    },
    {
      id: "checkout",
      time: hhmm(row.checkoutAt, locale),
      label: t("checkOut"),
      sub: row.checkoutAt ? t("checkOutSub") : t("checkOutMissing"),
      tone: row.checkoutAt ? "good" : "muted",
    },
  );

  return entries;
}

function Section({ title, children }: { title: string | null; children: ReactNode }) {
  return (
    <div className="border-t border-border px-4 py-3.5">
      {title && (
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

const STEP_TONE = {
  good: { time: "text-foreground", label: "text-foreground", dot: "bg-status-active" },
  bad: {
    time: "text-status-cancelled-deep",
    label: "text-status-cancelled-deep",
    dot: "bg-status-cancelled",
  },
  muted: {
    time: "text-muted-foreground/50",
    label: "text-muted-foreground",
    dot: "bg-card ring-1 ring-inset ring-border",
  },
  plain: { time: "text-ink-soft", label: "text-foreground", dot: "bg-status-verified" },
} as const;

function Step({
  time,
  label,
  sub,
  tone = "plain",
  last,
}: {
  time: string;
  label: string;
  sub: string;
  tone?: keyof typeof STEP_TONE;
  last?: boolean;
}) {
  const c = STEP_TONE[tone];
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          // Wide enough for a 12-hour locale: `02:00 PM` is eight characters, and
          // at `w-11` (sized for a bare `HH:MM`) it wrapped onto two lines and
          // pushed its own step's dot out of line with the label beside it.
          "w-16 flex-none pt-px text-right font-mono text-[12px] whitespace-nowrap tabular-nums",
          c.time,
        )}
      >
        {time}
      </span>
      <span className="flex flex-none flex-col items-center pt-1">
        <span className={cn("size-2 flex-none rounded-full", c.dot)} />
        {/* The rail stops at the last step rather than trailing into nothing. */}
        {!last && <span className="w-px flex-1 bg-border" />}
      </span>
      <span className={cn("flex min-w-0 flex-col gap-0.5", last ? "pb-0" : "pb-3.5")}>
        <span className={cn("text-[12.5px] font-semibold", c.label)}>{label}</span>
        <span className="text-[11.5px] text-muted-foreground text-pretty">{sub}</span>
      </span>
    </li>
  );
}

function Field({
  k,
  v,
  mono,
  dim,
  note,
}: {
  k: string;
  v: string;
  mono?: boolean;
  dim?: boolean;
  /** A caveat under the value. Wraps — the value itself still truncates. */
  note?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="flex-none text-[11.5px] text-muted-foreground">{k}</dt>
      <dd
        className={cn(
          "min-w-0 truncate text-right text-[12px]",
          mono && "font-mono",
          dim ? "text-muted-foreground/60" : "text-foreground",
        )}
      >
        {note ? (
          <>
            <span className="block truncate">{v}</span>
            <span className="block font-sans text-[10.5px] whitespace-normal text-muted-foreground text-pretty">
              {note}
            </span>
          </>
        ) : (
          v
        )}
      </dd>
    </div>
  );
}

function NavLink({
  href,
  label,
  detail,
}: {
  href: string;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-2.5 py-2 ring-1 ring-inset ring-border transition-colors hover:bg-accent/50"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-[12.5px] font-semibold">{label}</span>
        <span className="truncate text-[11px] text-muted-foreground">{detail}</span>
      </span>
      <ArrowUpRight className="size-3.5 flex-none text-muted-foreground" />
    </Link>
  );
}
