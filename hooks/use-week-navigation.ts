"use client";
import { useState } from "react";

export interface WeekNavigation {
  weekStart: Date;       // Monday 00:00 local
  weekEnd: Date;         // Sunday 00:00 local (start of Sunday)
  days: Date[];          // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  weekNumber: number;    // ISO 8601 week number 1–53
  label: string;         // "KW 24"
  dateRangeLabel: string;// "Mo 08.06 – So 14.06"
  prev: () => void;
  next: () => void;
}

// ISO 8601 week number — Thursday rule
function getIsoWeek(d: Date): number {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  date.setDate(date.getDate() - day + 3); // move to Thursday
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000));
}

function getMondayOfCurrentWeek(): Date {
  const today = new Date();
  const day = (today.getDay() + 6) % 7; // Mon=0
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - day);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateRangeLabel(start: Date, end: Date): string {
  const fmt = (d: Date) => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
  return `Mo ${fmt(start)} – So ${fmt(end)}`;
}

export function useWeekNavigation(): WeekNavigation {
  const [weekStart, setWeekStart] = useState<Date>(getMondayOfCurrentWeek);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];
  const weekNumber = getIsoWeek(weekStart);

  return {
    weekStart,
    weekEnd,
    days,
    weekNumber,
    label: `KW ${weekNumber}`,
    dateRangeLabel: formatDateRangeLabel(weekStart, weekEnd),
    prev: () => setWeekStart((d) => addDays(d, -7)),
    next: () => setWeekStart((d) => addDays(d, 7)),
  };
}
