# Tasks Calendar View — Design Spec

**Date:** 2026-06-13
**Status:** Approved
**Page:** `/dashboard/tasks`

## Summary

Add a **Calendar** tab alongside the existing **List** tab on the Tasks page. The calendar shows a weekly grid: rows = task groups, columns = days of the week (Mon–Sun). Each cell displays the task scheduled for that group on that day. Users navigate between weeks via `< KW 24 >` controls.

No new API endpoints required — the existing `useAdminTaskGroups()` hook returns full `TaskGroupDto[]` including nested `tasks: TaskItemDto[]` with `workers: TaskWorkerDto[]`.

> **Note for implementer:** The existing `lib/types/task.types.ts` may be missing `workerName: string | null` on `TaskWorkerDto`. Verify and add it if absent before using it in the component.

---

## Backend Contract (verified against `germany-erp-swagger.json`)

| Used field | Source DTO | Notes |
|---|---|---|
| `scheduledDate` | `TaskItemDto` | `string (date)` — used for day matching |
| `scheduledAt` | `TaskItemDto` | `string (date-time)` — extract HH:mm for start time |
| `deadline` | `TaskItemDto` | `string (date-time, nullable)` — extract HH:mm for end time |
| `status` | `TaskItemDto` | `string (nullable)` — drives cell background color |
| `workers` | `TaskItemDto` | `TaskWorkerDto[]` — count for ratio display |
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
- Line 2: worker count `N` (number of assigned workers)
- Line 3: first `workerName` truncated to ~10 chars; if null → `"—"`
- Background tint by `TaskItemDto.status`:
  - `Active` → green tint (`bg-green-50 dark:bg-green-950/40`)
  - `Pending` → yellow tint (`bg-yellow-50 dark:bg-yellow-950/40`)
  - `Done` → muted (`bg-muted/40`)
  - `Cancelled` → red tint (`bg-destructive/5`)
- Left border color matches tint (2px solid)

**Empty cell (`—`):** light grey, centered dash.

**Row label column:**
- Task group title (truncated, max 200px)
- Status badge below title (inline `<Badge>` with same color logic as the list tab)

---

## Week Navigation

- State: `currentWeekStart: Date` (always a Monday at 00:00 local)
- `< ` / `>` buttons step ±7 days
- Default: Monday of the current ISO week
- Header format: `KW {isoWeekNumber}   Mo DD.MM – So DD.MM`
- ISO week number computed with pure arithmetic (no external date library)

**Only task groups that have at least one task within the current Mon–Sun window are shown as rows.**
Groups with no tasks this week are hidden. If no groups match: show "No tasks this week" message.

---

## Components

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
- Derives `visibleGroups`: groups that have ≥1 task with `scheduledDate` within Mon–Sun
- Renders week header + grid table
- `getCellTask(group, day): TaskItemDto | undefined` — find task by matching `scheduledDate` to day
- Loading: skeleton rows
- Empty: "No tasks this week" message

### `app/[locale]/dashboard/(worker)/tasks/page.tsx` (modify)

- Add view-mode state: `"list" | "calendar"`
- Render two tab buttons (`List` / `Calendar`) above the existing filter bar
- In `"list"` mode: existing table (unchanged)
- In `"calendar"` mode: `<TasksCalendar groups={...} isLoading={...} />`
- Both modes share the same `useAdminTaskGroups()` call — no duplicate fetch

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
- Multiple tasks on same day for one group → show the first one (edge case, unlikely)
- `useAdminTaskGroups()` error → calendar shows error state (same as list tab)

---

## Out of Scope

- No property badge (requires separate API)
- No drag-and-drop scheduling
- No "add task" from calendar cell
- No filtering by status or worker in calendar mode
- No per-task click-through (detail navigation remains on the list tab)
