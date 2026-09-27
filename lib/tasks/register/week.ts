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

export interface CalendarWindow { from: string; to: string }

/**
 * The days the calendar may draw: the week on screen **intersected** with the
 * band's own `from`/`to`. The band's range only ever reaches the server as the
 * window (`matchesRegister` does not filter by date), so replacing it with the
 * week would draw days the band excludes while its chip still names them.
 *
 * `YYYY-MM-DD` compares lexically. A malformed bound is ignored, as
 * `resolveWindow` ignores it. `null` means the band lies wholly outside the
 * week — the calendar draws no rows, never the whole week.
 */
export function calendarWindow(values: Record<string, string>, week: Week): CalendarWindow | null {
  const start = week.dayKeys[0];
  const end = week.dayKeys[6];
  const from = values.from && DAY_KEY.test(values.from) && values.from > start ? values.from : start;
  const to = values.to && DAY_KEY.test(values.to) && values.to < end ? values.to : end;
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
 * Calendar → List, keeping the range (spec §5). A paged-to week becomes the
 * list's explicit `from`/`to`; with no `week` the list's own window (tab default
 * or the band's range) is already the one the calendar was showing.
 */
export function toListPatch(values: Record<string, string>): Record<string, string> {
  if (!values.week) return { view: "", week: "" };
  const week = weekOf(values.week, values.week);
  return { view: "", week: "", from: week.dayKeys[0], to: week.dayKeys[6] };
}
