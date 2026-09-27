import {
  resolveWindow, tabMatches, tabSpan, type RegisterWindow,
} from "@/lib/tasks/register/filters";
import type { RegisterRow } from "@/lib/tasks/register/rows";
import { compareSchedule } from "@/lib/tasks/register/sort";
import {
  calendarWeek, calendarWindow, inCalendarWindow, registerView, type CalendarWindow,
} from "@/lib/tasks/register/week";
import type { Week } from "@/lib/ui/week";

/**
 * The register page's composition, kept pure so it has tests: which window the
 * server is asked for, which week the calendar is on, and which of the loaded
 * days each drawing may show.
 */
export interface RegisterRange {
  /** What `useTaskRegister` fetches. */
  window: RegisterWindow;
  /** The week the calendar draws — `null` in the list. */
  week: Week | null;
  /**
   * The calendar's drawable days (`calendarWindow`: the week ∩ the band's
   * dates, else ∩ the tab's span). `null` in the list, and in the calendar when
   * nothing bounded lies in this week — it then draws no rows.
   */
  days: CalendarWindow | null;
}

/**
 * List: the tab's window, or the band's dates (`resolveWindow`).
 *
 * Calendar (spec §5): the week pager **drives the date range**, so a
 * seven-column grid is never fed a one-day window — but only through the same
 * bounds the List honours (`calendarWindow`), so both drawings hold one set.
 * An empty intersection still needs a valid request; it asks for the bare week
 * and `registerTabRows` drops every row.
 *
 * `null` until the clock is known — never a placeholder window.
 */
export function registerRange(
  tab: string,
  values: Record<string, string>,
  todayKey: string,
): RegisterRange | null {
  if (!todayKey) return null;
  if (registerView(values) !== "calendar") {
    return { window: resolveWindow(tab, values, todayKey), week: null, days: null };
  }
  const week = calendarWeek(values, todayKey);
  const days = calendarWindow(values, week, tabSpan(tab, todayKey));
  const span = days ?? { from: week.dayKeys[0], to: week.dayKeys[6] };
  return { window: resolveWindow(tab, { ...values, ...span }, todayKey), week, days };
}

/**
 * The loaded days the current tab keeps — and, in the calendar, only those it
 * draws. The band and search narrow further (`matchesRegister`, `matchesSearch`).
 */
export function registerTabRows(
  rows: RegisterRow[],
  range: RegisterRange | null,
  tab: string,
  todayKey: string,
): RegisterRow[] {
  if (!range) return [];
  return rows.filter(
    (r) => tabMatches(tab, r, todayKey) && (!range.week || inCalendarWindow(r.dayKey, range.days)),
  );
}

/**
 * What `N` opens Assign on (design 01 "Fast"), from the rows on screen: the
 * soonest day that starts today with nobody on it and can still take a worker;
 * else the soonest assignable day that has not started yet — a past or running
 * day is not "next". `null` when there is none. Only `assignable` rows: `N`
 * never opens a sheet the row's own Assign button would not.
 */
export function nextAssignRow(rows: RegisterRow[], nowMs: number = Date.now()): RegisterRow | null {
  const sorted = [...rows].sort(compareSchedule);
  return sorted.find((r) => r.unstaffedToday && r.assignable)
    // NaN (an unreadable start) fails `>=`, so it is never "not started yet".
    ?? sorted.find((r) => r.assignable && r.startMs >= nowMs)
    ?? null;
}
