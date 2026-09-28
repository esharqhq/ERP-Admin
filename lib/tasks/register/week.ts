import { compareSchedule } from "@/lib/tasks/register/sort";
import type { RegisterRow } from "@/lib/tasks/register/rows";
import { weekOf, type Week } from "@/lib/ui/week";

export type CardTone = "running" | "scheduled" | "open" | "unstaffed" | "overdue" | "review" | "closed";

/** Design 02's card tint, by derived status. */
export function cardTone(row: RegisterRow): CardTone {
  switch (row.status) {
    case "Running": return "running";
    case "Scheduled": return "scheduled";
    case "Unstaffed": return "unstaffed";
    case "Overdue": return "overdue";
    case "Review":
    case "Disputed": return "review";
    case "Done":
    case "Cancelled": return "closed";
    default: return "open";
  }
}

export interface CalendarDay { key: string; isToday: boolean; rows: RegisterRow[]; count: number; short: number }

/** Design 02: a day column states how many tasks and how many bodies are missing. */
export function buildCalendarDays(rows: RegisterRow[], week: Week, todayKey: string): CalendarDay[] {
  return week.dayKeys.map((key) => {
    const day = rows.filter((row) => row.dayKey === key).sort(compareSchedule);
    return {
      key,
      isToday: key === todayKey,
      rows: day,
      count: day.length,
      short: day.reduce((n, row) => n + (row.assignable ? row.staffing.gap : 0), 0),
    };
  });
}

export type RegisterView = "list" | "calendar";

/** `?view=calendar`; anything else — absent, hand-edited — is the list. */
export function registerView(values: Record<string, string>): RegisterView {
  return values.view === "calendar" ? "calendar" : "list";
}

/**
 * The week the calendar draws (spec §5: the week pager drives the date range).
 * The pager's `week` first; else the week holding the band's first day (or its
 * last, when only that is set), so a range picked in the List opens on its own
 * week; else this week.
 *
 * The two never disagree for long: paging clears the band range (`weekPatch`)
 * and a band date write clears the week (`calendarBandPatch`).
 */
export function calendarWeek(values: Record<string, string>, todayKey: string): Week {
  return weekOf(values.week || values.from || values.to || null, todayKey);
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** A span of day keys, both ends inclusive — the same shape as `DaySpan` in filters.ts. */
export interface CalendarWindow { from: string; to: string }

/**
 * The days the calendar may draw: the week on screen **intersected** with what
 * would bound the List's window, so both drawings show the same set.
 *
 * - The band's own `from`/`to`, when it names any. The band's range only ever
 *   reaches the server as the window (`matchesRegister` does not filter by
 *   date), so replacing it with the week would draw days the band excludes
 *   while its chip still names them.
 * - Else the tab's own `span` (`tabSpan`): "Next 7 days" from a Wednesday is
 *   Wed–Sun on this week and Mon–Tue on the next, never the past Mon–Tue of
 *   this week. `null` (This week) = the pager's week is the range.
 *
 * `YYYY-MM-DD` compares lexically. A malformed bound is ignored, as
 * `resolveWindow` ignores it. `null` means nothing bounded lies in this week —
 * the calendar draws no rows, never the whole week.
 */
export function calendarWindow(
  values: Record<string, string>,
  week: Week,
  span: CalendarWindow | null = null,
): CalendarWindow | null {
  const start = week.dayKeys[0];
  const end = week.dayKeys[6];
  const bandFrom = values.from && DAY_KEY.test(values.from) ? values.from : null;
  const bandTo = values.to && DAY_KEY.test(values.to) ? values.to : null;
  const hasBand = Boolean(bandFrom || bandTo);
  const lo = hasBand ? bandFrom : span?.from ?? null;
  const hi = hasBand ? bandTo : span?.to ?? null;
  const from = lo && lo > start ? lo : start;
  const to = hi && hi < end ? hi : end;
  return from <= to ? { from, to } : null;
}

export function inCalendarWindow(dayKey: string, window: CalendarWindow | null): boolean {
  return window !== null && dayKey >= window.from && dayKey <= window.to;
}

/** One URL write for ‹ · This week · ›. */
export function weekPatch(startKey: string): Record<string, string> {
  return { week: startKey, from: "", to: "" };
}

/** A band write in calendar mode: a date change hands the range back to the band. */
export function calendarBandPatch(patch: Record<string, string>): Record<string, string> {
  return "from" in patch || "to" in patch ? { ...patch, week: "" } : patch;
}

/**
 * Calendar → List, keeping the range (spec §5: "List keeps that range").
 *
 * A **paged-to** week hands the list the days the calendar drew there (`window`,
 * the week intersected by `calendarWindow`), so the list comes back with the
 * same set — the bare week would widen a "Next 7 days" page to all seven days.
 *
 * Nothing is written when no week was paged to, when `?week` is malformed (it
 * was never a week the calendar drew — `weekOf` fell back to today's), or when
 * the paged-to week drew nothing: the list returns to its own window (the tab's
 * or the band's), of which the calendar was showing this week's slice. Writing
 * dates there would add a Dates chip nobody set and switch the tile off.
 */
export function toListPatch(
  values: Record<string, string>,
  window: CalendarWindow | null,
): Record<string, string> {
  if (!values.week || !DAY_KEY.test(values.week) || !window) return { view: "", week: "" };
  return { view: "", week: "", from: window.from, to: window.to };
}
