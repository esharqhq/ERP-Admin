"use client";

import { useTranslations } from "next-intl";
import { DayRail } from "@/components/tasks/detail/day-rail";
import { DAY_TONE_CLASS } from "@/components/tasks/detail/day-state-chip";
import { Card } from "@/components/ui/card";
import {
  datesFact,
  legendCounts,
  windowFact,
  windowSubKey,
  workersFact,
  type Place,
} from "@/lib/tasks/detail/booking-facts";
import { formatDateTime, formatDayLong, formatHm } from "@/lib/tasks/detail/day-time";
import { TOOLS_MESSAGE, kindKey, toolsAnswerKey } from "@/lib/tasks/order-facts";
import type { TaskStateKey } from "@/lib/tasks/status-vocab";
import type { TaskGroupDto, TaskItemDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

const LEGEND: TaskStateKey[] = ["done", "checkedIn", "inReview", "rejected", "pending", "cancelled"];

/** Kind, title, owner · place, progress, rail + legend (booking only), facts, notes. */
export function DetailHeaderCard({
  group,
  days,
  selectedId,
  onSelect,
  single,
  ownerName,
  place,
  locale,
}: {
  group: TaskGroupDto;
  days: TaskItemDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  single: boolean;
  ownerName: string | null;
  place: Place;
  locale: string;
}) {
  const t = useTranslations("tasks.detail");
  const tOrder = useTranslations("orderFields");

  // An unknown kind prints verbatim; an absent one follows the day count.
  const kind = kindKey(group.kind);
  const kindText =
    kind === "single"
      ? t("kindSingle")
      : kind === "booking"
        ? t("kindBooking", { count: days.length })
        : group.kind
          ? group.kind
          : single
            ? t("kindSingle")
            : t("kindBooking", { count: days.length });
  const placeText = place.kind === "walkIn" ? t("walkIn") : place.kind === "text" ? place.text : null;
  const line = [ownerName, placeText].filter(Boolean).join(" · ") || "–";

  const counts = legendCounts(days);
  const win = windowFact(days);
  const winSub = windowSubKey(win, single);
  const workers = workersFact(days);
  const dates = datesFact(days);
  const tools = toolsAnswerKey(group.ownerProvidesTools);
  const hm = (ms: number) => formatHm(ms, locale);

  const facts: { label: string; value: string; sub?: string; muted?: boolean }[] = [
    {
      label: t("facts.window"),
      value:
        win.kind === "same"
          ? win.end === null
            ? t("facts.windowFrom", { start: hm(win.start) })
            : `${hm(win.start)} – ${hm(win.end)}`
          : win.kind === "varies"
            ? t("facts.windowVaries")
            : "–",
      sub: winSub ? t(`facts.${winSub}`) : undefined,
    },
    {
      label: t("facts.workers"),
      value: workers ? (workers.min === workers.max ? String(workers.min) : `${workers.min}–${workers.max}`) : "–",
      sub: t("facts.required"),
    },
    {
      label: t("facts.ratingFloor"),
      value: group.ratingFloor > 0 ? `${group.ratingFloor.toFixed(1)} ★` : t("facts.ratingAny"),
      sub: t("facts.ratingSub"),
    },
    { label: t("facts.newWorkers"), value: group.allowNewWorkers ? t("facts.allowed") : t("facts.notAllowed") },
    {
      label: t("facts.tools"),
      // ⚠ null is "Not specified" in grey, never "No".
      value: tOrder(TOOLS_MESSAGE[tools]),
      sub: tools === "unspecified" ? undefined : t("facts.toolsSub"),
      muted: tools === "unspecified",
    },
    {
      label: single ? t("facts.date") : t("facts.dates"),
      value: dates
        ? dates.first === dates.last
          ? formatDayLong(dates.first, locale)
          : `${formatDayLong(dates.first, locale)} – ${formatDayLong(dates.last, locale)}`
        : "–",
      sub: dates ? (single ? t("facts.oneDay") : t("facts.dayCount", { count: dates.count })) : undefined,
    },
  ];

  const instructions = group.instructions?.trim();
  const addOn = group.addOnNote?.trim();

  return (
    <Card className="gap-5 px-5 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="overline-label inline-flex h-[22px] items-center rounded-md bg-muted px-2 text-foreground/80">
              {kindText}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("created", { date: formatDateTime(group.createdAt, locale) })}
            </span>
          </div>
          <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight md:text-[26px]">
            {group.title || "–"}
          </h1>
          <span className="text-sm text-muted-foreground">{line}</span>
        </div>
        <div className="flex flex-none flex-col gap-1 sm:items-end">
          <span className="overline-label text-muted-foreground">{t("progress")}</span>
          <span className="font-mono text-2xl font-semibold tabular-nums">
            {group.days?.done ?? 0}{" "}
            <span className="text-base text-muted-foreground">
              {single ? t("progressSingle") : t("progressBooking", { total: group.days?.total ?? days.length })}
            </span>
          </span>
        </div>
      </div>

      {!single ? (
        <div className="flex flex-col gap-2.5">
          <DayRail days={days} selectedId={selectedId} onSelect={onSelect} locale={locale} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {LEGEND.map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span aria-hidden className={cn("size-2 rounded-full", DAY_TONE_CLASS[s].dot)} />
                {t(`states.${s}`)}
                <span className="font-mono font-semibold tabular-nums text-foreground">{counts[s]}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 border-t pt-4 md:grid-cols-3 lg:grid-cols-6">
        {facts.map((f) => (
          <div key={f.label} className="flex min-w-0 flex-col gap-1">
            <dt className="overline-label text-muted-foreground">{f.label}</dt>
            <dd className={cn("text-sm font-semibold", f.muted && "text-muted-foreground")}>{f.value}</dd>
            {f.sub ? <dd className="text-[11px] text-muted-foreground">{f.sub}</dd> : null}
          </div>
        ))}
      </dl>

      {instructions || addOn ? (
        <div className={cn("grid gap-3", instructions && addOn && "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]")}>
          {instructions ? (
            <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-3 ring-1 ring-inset ring-border">
              <span className="overline-label text-muted-foreground">{t("instructions")}</span>
              <span className="text-[13px] leading-relaxed text-pretty whitespace-pre-wrap">{instructions}</span>
            </div>
          ) : null}
          {addOn ? (
            <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-3 ring-1 ring-inset ring-border">
              <span className="overline-label text-muted-foreground">{t("addOn")}</span>
              <span className="text-[13px] leading-relaxed whitespace-pre-wrap">{addOn}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
