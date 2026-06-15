# Tasks Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Calendar tab alongside the existing List tab on `/dashboard/tasks` that shows a weekly grid of task groups vs. days, navigable by ISO week.

**Architecture:** Extract a shared `TaskStatusBadge` component reused by both list and calendar; add a pure-arithmetic `useWeekNavigation` hook; build a `TasksCalendar` display component; wire view-mode state into the existing Tasks page. No new API endpoints — `useAdminTaskGroups()` already returns all needed data.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS v4, shadcn v4 (`Badge`, `Button`, `Skeleton`), next-intl v4, `@tanstack/react-query` v5.

**Spec:** `docs/superpowers/specs/2026-06-13-tasks-calendar-view-design.md`

**No unit-test harness.** Verification for every task = `npx tsc --noEmit` (must exit 0) + `npx eslint <changed files>` (must exit 0).

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Create | `components/tasks/task-status-badge.tsx` | Shared status→Badge mapping (list + calendar) |
| Create | `hooks/use-week-navigation.ts` | ISO week state + prev/next/labels |
| Create | `components/tasks/tasks-calendar.tsx` | Weekly grid display component |
| Modify | `app/[locale]/dashboard/tasks/page.tsx` | Add view-mode state + tab switcher, use shared badge |
| Modify | `messages/en.json` | 4 new `tasks.calendar.*` / `tasks.list.label` keys |
| Modify | `messages/de.json` | Same 4 keys in German |

---

## Task 1: Extract TaskStatusBadge component

**Context:** `app/[locale]/dashboard/tasks/page.tsx` contains an inline `GroupStatusBadge` function (lines ~28-39) that maps group status to Badge variant. The spec requires extracting this into a shared component so both the list page and the calendar use the same implementation. The component is identical to what the spec calls `TaskStatusBadge`.

**Files:**
- Create: `components/tasks/task-status-badge.tsx`
- Modify: `app/[locale]/dashboard/tasks/page.tsx`

- [ ] **Step 1: Create `components/tasks/task-status-badge.tsx`**

```tsx
"use client";
import { Badge } from "@/components/ui/badge";
import { normalizeStatus } from "@/lib/types/task.types";

export function TaskStatusBadge({ status }: { status: string }) {
  const s = normalizeStatus(status);
  const variant =
    s === "active"
      ? "default"
      : s === "done"
        ? "secondary"
        : s === "cancelled"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{status || "—"}</Badge>;
}
```

- [ ] **Step 2: Update `app/[locale]/dashboard/tasks/page.tsx`**

Read the file first to confirm exact content. Make these changes:

**2a. Add import** — after the existing `normalizeStatus` import block, add:
```tsx
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
```

**2b. Remove the inline `GroupStatusBadge` function** — delete the entire function:
```tsx
function GroupStatusBadge({ status }: { status: string }) {
  const s = normalizeStatus(status);
  const variant =
    s === "active"
      ? "default"
      : s === "done"
        ? "secondary"
        : s === "cancelled"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{status || "—"}</Badge>;
}
```

**2c. Replace usage** — in the `<TableRow>` inside `filtered.map`, replace:
```tsx
<GroupStatusBadge status={group.status} />
```
with:
```tsx
<TaskStatusBadge status={group.status} />
```

**2d. Remove unused `Badge` import** — the page no longer uses `Badge` directly (it's used via `TaskStatusBadge`). Remove `Badge` from the import line:
```tsx
import { Badge } from "@/components/ui/badge";
```
becomes: _(delete this line entirely — Badge is no longer imported directly in the page)_

- [ ] **Step 3: Verify types + lint**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors.

Run: `npx eslint components/tasks/task-status-badge.tsx app/[locale]/dashboard/tasks/page.tsx`
Expected: exits 0, no errors (or only pre-existing warnings).

- [ ] **Step 4: Commit**

```bash
git add components/tasks/task-status-badge.tsx "app/[locale]/dashboard/tasks/page.tsx"
git commit -m "refactor(tasks): extract TaskStatusBadge shared component"
```

---

## Task 2: Create useWeekNavigation hook

**Context:** New hook in `hooks/` — no existing file to modify. Must use pure Date arithmetic (no external date library). The ISO week number follows the ISO-8601 Thursday rule as documented in the spec. `weekStart` is always Monday 00:00 local time. Day labels are German abbreviations (`Mo Di Mi Do Fr Sa So`) because the header format matches the German ERP screenshot; the `dateRangeLabel` also uses `Mo … – So …` format.

**Files:**
- Create: `hooks/use-week-navigation.ts`

- [ ] **Step 1: Create `hooks/use-week-navigation.ts`**

```ts
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
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors.

Run: `npx eslint hooks/use-week-navigation.ts`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add hooks/use-week-navigation.ts
git commit -m "feat(tasks): add useWeekNavigation hook"
```

---

## Task 3: Add i18n translations

**Context:** Four new keys must be added to `messages/en.json` and `messages/de.json`. The existing `tasks.list` object already exists; add `label` inside it. Add a new `tasks.calendar` object with three keys. Files are large JSON — read them first and use a surgical edit.

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/de.json`

- [ ] **Step 1: Add keys to `messages/en.json`**

Read the file and locate the `"tasks"` → `"list"` object. It currently looks like:
```json
"list": {
  "empty": "No task groups found",
  "tabs": { ... },
  "columns": { ... }
}
```

Change it to add `"label"` as the first key:
```json
"list": {
  "label": "List",
  "empty": "No task groups found",
  "tabs": { ... },
  "columns": { ... }
}
```

Then add a `"calendar"` object as a new sibling of `"list"` inside `"tasks"`:
```json
"calendar": {
  "label": "Calendar",
  "noTasksThisWeek": "No tasks this week",
  "workers": "workers"
}
```

Place `"calendar"` directly after the closing `}` of the `"list"` object.

- [ ] **Step 2: Add keys to `messages/de.json`**

Same surgical edit in the German file:

Inside `"list"`, add `"label"` as first key:
```json
"label": "Liste",
```

Add new `"calendar"` sibling object:
```json
"calendar": {
  "label": "Kalender",
  "noTasksThisWeek": "Keine Aufgaben diese Woche",
  "workers": "Mitarbeiter"
}
```

- [ ] **Step 3: Verify JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('en OK')"`
Expected: prints `en OK`.

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/de.json','utf8')); console.log('de OK')"`
Expected: prints `de OK`.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/de.json
git commit -m "feat(tasks): add calendar i18n keys (EN + DE)"
```

---

## Task 4: Create TasksCalendar component

**Context:** New component that consumes `TaskGroupDto[]` and `isLoading`. It renders a weekly grid using `useWeekNavigation` internally. Key logic: `getCellTasks` filters tasks by `scheduledDate === toLocalDateKey(day)` (local-time date string, NOT UTC). Background tint + left border driven by `normalizeStatus(task.status)`. If multiple tasks on same day for one group: show first + `+N` badge. Reference spec section "UI Structure" and "Cell content" for exact rendering rules.

**Files:**
- Create: `components/tasks/tasks-calendar.tsx`

- [ ] **Step 1: Create `components/tasks/tasks-calendar.tsx`**

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWeekNavigation } from "@/hooks/use-week-navigation";
import { normalizeStatus, type TaskGroupDto, type TaskItemDto } from "@/lib/types/task.types";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";

interface TasksCalendarProps {
  groups: TaskGroupDto[];
  isLoading: boolean;
}

// Local-time yyyy-MM-dd key — matches TaskItemDto.scheduledDate format
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Extract HH:mm from ISO date-time string
function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const timePart = dateStr.includes("T") ? dateStr.split("T")[1] : dateStr;
  return timePart.slice(0, 5);
}

function getCellTasks(group: TaskGroupDto, day: Date): TaskItemDto[] {
  const key = toLocalDateKey(day);
  return (group.tasks ?? []).filter((t) => t.scheduledDate === key);
}

function statusTintClasses(status: string): string {
  const s = normalizeStatus(status);
  if (s === "active")    return "bg-green-50 dark:bg-green-950/40 border-l-2 border-l-green-400";
  if (s === "pending")   return "bg-yellow-50 dark:bg-yellow-950/40 border-l-2 border-l-yellow-400";
  if (s === "review")    return "bg-blue-50 dark:bg-blue-950/40 border-l-2 border-l-blue-400";
  if (s === "done")      return "bg-muted/40 border-l-2 border-l-muted-foreground/30";
  if (s === "cancelled") return "bg-destructive/5 border-l-2 border-l-destructive/40";
  return "bg-muted/40 border-l-2 border-l-muted-foreground/30";
}

const DAY_ABBR = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function TasksCalendar({ groups, isLoading }: TasksCalendarProps) {
  const t = useTranslations("tasks");
  const nav = useWeekNavigation();

  const visibleGroups = groups.filter((g) =>
    nav.days.some((day) => getCellTasks(g, day).length > 0)
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={nav.prev} aria-label="Previous week">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="font-semibold text-sm min-w-[56px] text-center">{nav.label}</span>
        <Button variant="outline" size="icon" onClick={nav.next} aria-label="Next week">
          <ChevronRight className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground">{nav.dateRangeLabel}</span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[800px] text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[200px] min-w-[160px] border-b border-border">
                {t("list.columns.title")}
              </th>
              {nav.days.map((day, i) => (
                <th
                  key={i}
                  className="px-2 py-2 font-medium text-muted-foreground text-center min-w-[110px] border-b border-border"
                >
                  {DAY_ABBR[i]} {pad2(day.getDate())}.{pad2(day.getMonth() + 1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-3">
                    <Skeleton className="h-10 w-full rounded-md" />
                  </td>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-2 py-3">
                      <Skeleton className="h-10 w-full rounded-md" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visibleGroups.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {t("calendar.noTasksThisWeek")}
                </td>
              </tr>
            ) : (
              visibleGroups.map((group) => (
                <tr key={group.id} className="border-t border-border hover:bg-accent/20 transition-colors">
                  {/* Row label */}
                  <td className="px-3 py-3 align-top">
                    <div className="flex flex-col gap-1.5">
                      <span
                        className="font-medium truncate max-w-[180px] block"
                        title={group.title ?? undefined}
                      >
                        {group.title ?? "—"}
                      </span>
                      <TaskStatusBadge status={group.status} />
                    </div>
                  </td>

                  {/* Day cells */}
                  {nav.days.map((day, i) => {
                    const cellTasks = getCellTasks(group, day);
                    if (cellTasks.length === 0) {
                      return (
                        <td
                          key={i}
                          className="px-2 py-3 text-center text-muted-foreground/40 align-middle"
                        >
                          —
                        </td>
                      );
                    }
                    const task = cellTasks[0];
                    const extra = cellTasks.length - 1;
                    const startTime = formatTime(task.scheduledAt);
                    const endTime = task.deadline ? formatTime(task.deadline) : null;
                    const workerCount = (task.workers ?? []).length;
                    const firstWorkerName = task.workers?.[0]?.workerName ?? null;
                    const workerLabel = firstWorkerName
                      ? firstWorkerName.slice(0, 10)
                      : "—";

                    return (
                      <td
                        key={i}
                        className={`px-2 py-2 align-top ${statusTintClasses(task.status)}`}
                      >
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-medium tabular-nums">
                            {startTime}
                            {endTime ? ` – ${endTime}` : ""}
                          </span>
                          <span className="text-muted-foreground">
                            {workerCount} {t("calendar.workers")}
                          </span>
                          <span className="text-muted-foreground truncate max-w-[90px]">
                            {workerLabel}
                          </span>
                          {extra > 0 && (
                            <Badge
                              variant="outline"
                              className="w-fit text-[10px] px-1 py-0 h-4"
                            >
                              +{extra}
                            </Badge>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types + lint**

Run: `npx tsc --noEmit`
Expected: exits 0.

Run: `npx eslint components/tasks/tasks-calendar.tsx`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add components/tasks/tasks-calendar.tsx
git commit -m "feat(tasks): add TasksCalendar weekly grid component"
```

---

## Task 5: Wire Tasks page — add Calendar tab

**Context:** The existing `app/[locale]/dashboard/tasks/page.tsx` currently shows only the list view with status-filter pills and search bar. We need to add a `"list" | "calendar"` view-mode switcher above the existing controls. In calendar mode the filter pills and search bar are hidden; the `<TasksCalendar>` component is rendered instead of the Card/Table. Both modes share the same `useAdminTaskGroups()` call. The inline `GroupStatusBadge` was already removed in Task 1.

**Files:**
- Modify: `app/[locale]/dashboard/tasks/page.tsx`

- [ ] **Step 1: Add import for TasksCalendar**

Add this import near the top with the other component imports:
```tsx
import { TasksCalendar } from "@/components/tasks/tasks-calendar";
```

- [ ] **Step 2: Add view-mode state**

Inside `TasksPage()`, after the existing `const [search, setSearch] = useState("")`, add:
```tsx
const [view, setView] = useState<"list" | "calendar">("list");
```

- [ ] **Step 3: Add the view-switcher segmented control**

Replace the existing outer `<div className="flex flex-col gap-6">` body. The page currently renders (in order):
1. Heading block (`<div className="flex flex-col gap-1">…</div>`)
2. Filter row (`<div className="flex flex-wrap items-center gap-3">…</div>`)
3. Card with table

Insert a **new** segmented control div between the heading block and the filter row:

```tsx
{/* View switcher */}
<div className="flex rounded-lg border border-border bg-muted/50 p-0.5 self-start">
  {(["list", "calendar"] as const).map((v) => (
    <button
      key={v}
      onClick={() => setView(v)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        view === v
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {v === "list" ? t("list.label") : t("calendar.label")}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Conditionally render list controls and calendar**

Wrap the existing filter-row `<div>` and the `<Card>` in `{view === "list" && (...)}`.
After that closing, add the calendar branch:

```tsx
{view === "calendar" && (
  <TasksCalendar groups={groups} isLoading={isLoading} />
)}
```

The full updated JSX body (inside the outer `<div className="flex flex-col gap-6">`) should look like:

```tsx
{/* Page heading */}
<div className="flex flex-col gap-1">
  <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
    {t("title")}
  </h1>
  <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
</div>

{/* View switcher */}
<div className="flex rounded-lg border border-border bg-muted/50 p-0.5 self-start">
  {(["list", "calendar"] as const).map((v) => (
    <button
      key={v}
      onClick={() => setView(v)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        view === v
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {v === "list" ? t("list.label") : t("calendar.label")}
    </button>
  ))}
</div>

{view === "list" && (
  <>
    {/* Status filter + search */}
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
        {TASK_GROUP_STATUS_FILTERS.map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`list.tabs.${key}`)}
          </button>
        ))}
      </div>
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>

    {/* Task groups table */}
    <Card>
      <CardHeader className="pb-3">
        <p className="text-xs text-muted-foreground">
          {isLoading
            ? tCommon("loading")
            : tCommon("resultsFound", { count: filtered.length })}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("list.columns.title")}</TableHead>
              <TableHead>{t("list.columns.status")}</TableHead>
              <TableHead>{t("list.columns.dates")}</TableHead>
              <TableHead className="text-center">{t("list.columns.tasks")}</TableHead>
              <TableHead className="text-center">{t("list.columns.workers")}</TableHead>
              <TableHead className="text-right">{t("list.columns.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">
                  {tCommon("error")}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  {t("list.empty")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((group) => (
                <TableRow key={group.id} className="hover:bg-accent/40">
                  <TableCell className="py-3 font-medium">{group.title ?? "—"}</TableCell>
                  <TableCell>
                    <TaskStatusBadge status={group.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dateRange(group)}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {(group.tasks ?? []).length}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {distinctWorkers(group)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      nativeButton={false}
                      className="gap-1.5 text-muted-foreground"
                      render={<Link href={`/dashboard/tasks/${group.id}`} />}
                    >
                      <Eye className="size-3.5" />
                      {tCommon("view")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </>
)}

{view === "calendar" && (
  <TasksCalendar groups={groups} isLoading={isLoading} />
)}
```

- [ ] **Step 5: Verify types + lint**

Run: `npx tsc --noEmit`
Expected: exits 0.

Run: `npx eslint "app/[locale]/dashboard/tasks/page.tsx"`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/dashboard/tasks/page.tsx"
git commit -m "feat(tasks): add calendar tab with weekly group grid"
```
