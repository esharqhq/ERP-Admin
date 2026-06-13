# Tasks Calendar View — Design Spec

**Date:** 2026-06-13
**Status:** Approved
**Page:** `/dashboard/tasks`

## Summary

Add a **Calendar** tab alongside the existing **List** tab on the Tasks page. The calendar shows a weekly grid: rows = task groups, columns = days of the week (Mon–Sun). Each cell displays the task scheduled for that group on that day. Users navigate between weeks via `< KW 24 >` controls.

No new API endpoints required — the existing `useAdminTaskGroups()` hook returns full `TaskGroupDto[]` including nested `tasks: TaskItemDto[]` with `workers: TaskWorkerDto[]`. All required fields (including `workerName` on `TaskWorkerDto`) already exist in `lib/types/task.types.ts` — no type changes needed.

---

## Backend Contract (verified against `germany-erp-swagger.json`)

| Used field | Source DTO | Notes |
|---|---|---|
| `scheduledDate` | `TaskItemDto` | `string (date)` — used for day matching |
| `scheduledAt` | `TaskItemDto` | `string (date-time)` — extract HH:mm for start time |
| `deadline` | `TaskItemDto` | `string (date-time, nullable)` — extract HH:mm for end time |
| `status` | `TaskItemDto` | `string (nullable)` — drives cell background color |
| `workers` | `TaskItemDto` | `TaskWorkerDto[]` — assigned-worker count (`.length`) |
| `workerName` | `TaskWorkerDto` | `string (nullable)` — first worker's display name |
| `title` | `TaskGroupDto` | Group name — shown as row label |
| `status` | `TaskGroupDto` | Group status — shown as badge in row label |

No `propertyName` is available in `TaskGroupDto`; property badge is **out of scope** (would require a separate API call).

---

## UI Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  [List]  [Calendar]                            ← tab switcher        │
├─────────────────────────────────────────────────────────────────────┤
│  <  KW 24   >   Mo 08.06 – So 14.06           ← week header         │
├──────────────────┬────────┬────────┬────────┬────────┬──────────────┤
│ Task Group       │Mo 08.06│Di 09.06│Mi 10.06│Do 11.06│ ...          │
│ (title + badge)  │        │        │        │        │              │
├──────────────────┼────────┼────────┼────────┼────────┼──────────────┤
│ Reinigung Apt    │ 08:30  │ 08:30  │   —    │ 08:30  │              │
│ [Active]         │ –15:00 │ –15:00 │        │ –15:00 │              │
│                  │  3     │  2     │        │  3     │              │
│                  │SMITH J.│JONES A.│        │SMITH J.│              │
├──────────────────┼────────┼────────┼────────┼────────┼──────────────┤
│ Housekeeping     │   —    │ 06:00  │ 06:00  │   —    │              │
│ [Pending]        │        │ –08:00 │ –08:00 │        │              │
│                  │        │  1     │  2     │        │              │
│                  │        │BROWN K.│DAVIS M.│        │              │
└──────────────────┴────────┴────────┴────────┴────────┴──────────────┘
```

**Cell content (when a task exists):**
- Line 1: time range `HH:mm – HH:mm` (from `scheduledAt` → `deadline`; if `deadline` is null, show only start time)
- Line 2: worker count `N` (number of assigned workers, `task.workers.length`).
  **Note:** the original screenshot shows a ratio like `3/3` (assigned/required), but `TaskGroupDto` carries no required-worker / worker-limit field, so only the assigned count `N` is shown. The denominator is out of scope (would require a separate `TaskGroupSummaryDto` fetch).
- Line 3: first `workerName` truncated to ~10 chars; if null → `"—"`
- Background tint by `TaskItemDto.status` (normalized via `normalizeStatus()`):
  - `active` → green tint (`bg-green-50 dark:bg-green-950/40`)
  - `pending` → yellow tint (`bg-yellow-50 dark:bg-yellow-950/40`)
  - `review` → blue tint (`bg-blue-50 dark:bg-blue-950/40`)
  - `done` → muted (`bg-muted/40`)
  - `cancelled` → red tint (`bg-destructive/5`)
  - any other / unknown → muted fallback (`bg-muted/40`)
- Left border color matches tint (2px solid)
- If a group has **more than one task on the same day**, show the first task in the cell plus a small `+N` indicator (e.g. `+1`) so the extra tasks are not silently hidden.

**Empty cell (`—`):** light grey, centered dash.

**Row label column:**
- Task group title (truncated, max 200px)
- Status badge below title — uses the **shared** `TaskStatusBadge` component (see Components), NOT an inline re-implementation.

---

## Week Navigation

- State: `currentWeekStart: Date` (always a Monday at 00:00 local)
- `< ` / `>` buttons step ±7 days
- Default: Monday of the current ISO week
- Header format: `KW {isoWeekNumber}   Mo DD.MM – So DD.MM`
- ISO week number computed with pure arithmetic (no external date library), using the ISO-8601 Thursday rule:

```ts
// ISO week number (1–53)
function getIsoWeek(d: Date): number {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // Thursday of the current ISO week determines the year
  const day = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  date.setDate(date.getDate() - day + 3); // move to Thursday
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000));
}
```

**Day-matching uses local-time `yyyy-MM-dd` strings, NOT `toISOString()`** (which is UTC and would shift the day across the midnight boundary):

```ts
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // matches TaskItemDto.scheduledDate ("yyyy-MM-dd")
}
```

**Only task groups that have at least one task within the current Mon–Sun window are shown as rows.**
Groups with no tasks this week are hidden. If no groups match: show "No tasks this week" message.

---

## Components

### `components/tasks/task-status-badge.tsx` (new — extracted, reusable)

The status→`Badge` variant logic currently lives inline as `GroupStatusBadge` inside the list page. Per the project's reuse rule, extract it into a shared component used by **both** the list tab and the calendar row labels:

```tsx
"use client";
import { Badge } from "@/components/ui/badge";
import { normalizeStatus } from "@/lib/types/task.types";

export function TaskStatusBadge({ status }: { status: string }) {
  const s = normalizeStatus(status);
  const variant =
    s === "active" ? "default"
    : s === "done" ? "secondary"
    : s === "cancelled" ? "destructive"
    : "outline";
  return <Badge variant={variant}>{status || "—"}</Badge>;
}
```

The list page's local `GroupStatusBadge` is **removed** and replaced with this import (behavior identical).

### `hooks/use-week-navigation.ts` (new — reusable)

```ts
export interface WeekNavigation {
  weekStart: Date;       // Monday 00:00
  weekEnd: Date;         // Sunday 23:59:59
  days: Date[];          // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  weekNumber: number;    // ISO week number
  label: string;         // "KW 24"
  dateRangeLabel: string;// "Mo 08.06 – So 14.06"
  prev: () => void;
  next: () => void;
}
export function useWeekNavigation(): WeekNavigation
```

No external dependency — pure Date arithmetic.

### `components/tasks/tasks-calendar.tsx` (new)

Props:
```ts
interface TasksCalendarProps {
  groups: TaskGroupDto[];
  isLoading: boolean;
}
```

- Calls `useWeekNavigation()`
- Derives `visibleGroups`: groups that have ≥1 task whose `scheduledDate` falls within the current Mon–Sun window (compared via `toLocalDateKey` on each day)
- Renders week header + grid table, wrapped in an **`overflow-x-auto`** container (1 label column + 7 day columns overflow on narrow screens)
- `getCellTasks(group, day): TaskItemDto[]` — all tasks in the group whose `scheduledDate === toLocalDateKey(day)`; the cell renders the first and a `+N` badge if `length > 1`
- Loading: skeleton rows
- Empty: "No tasks this week" message

### `app/[locale]/dashboard/tasks/page.tsx` (modify)

- Add view-mode state: `"list" | "calendar"`
- Render two tab buttons (`List` / `Calendar`) at the top, as a separate segmented control above everything else
- In `"list"` mode: existing status-filter pills + search bar + table (unchanged)
- In `"calendar"` mode: **hide** the status-filter pills and the search input (they don't apply to the calendar — spec has no calendar filtering), and render `<TasksCalendar groups={groups} isLoading={isLoading} />`
- Both modes share the same `useAdminTaskGroups()` call — no duplicate fetch
- Replace the inline `GroupStatusBadge` with the shared `<TaskStatusBadge>` (see above)

---

## Translations

Four new keys added under `tasks.calendar` in `messages/en.json` and `messages/de.json`:

| Key | EN | DE |
|---|---|---|
| `tasks.calendar.label` | `"Calendar"` | `"Kalender"` |
| `tasks.list.label` | `"List"` | `"Liste"` |
| `tasks.calendar.noTasksThisWeek` | `"No tasks this week"` | `"Keine Aufgaben diese Woche"` |
| `tasks.calendar.workers` | `"workers"` | `"Mitarbeiter"` |

---

## Error / Edge Handling

- `deadline` null → show only start time (e.g., "08:30")
- `scheduledAt` null → show `"—"` for time
- `workerName` null → show `"—"` for worker name
- `workers` empty array → show `"0"` for count
- Multiple tasks on same day for one group → render the first task plus a `+N` indicator (see UI Structure)
- `useAdminTaskGroups()` error → calendar shows error state (same as list tab)

---

## Out of Scope

- No property badge (requires separate API)
- No drag-and-drop scheduling
- No "add task" from calendar cell
- No filtering by status or worker in calendar mode
- No per-task click-through (detail navigation remains on the list tab)
