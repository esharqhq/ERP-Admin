# Admin Tasks Register Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the booking table on `/dashboard/tasks` with the v2 register — one row per day of work, a
date-spined filter band, saved views, a strip of counts, and a week calendar over the same filtered set.

**Architecture:** Rows come from the day window `GET /api/tasks/admin?scheduledFrom&scheduledTo`, joined in the
browser to the cached booking list for title/professions/kind/owner. All behaviour lives in pure, tested
functions under `lib/tasks/register/`; the page composes the existing `DataTable` (client mode, URL state,
column picker, filter band, notice states, mobile cards) and a new week calendar. No new route.

**Tech Stack:** Next.js 16 App Router, React Query v5, next-intl (en + de), Base UI primitives in
`components/ui`, vitest (node env, `lib/**` + `hooks/**` only).

**Spec:** `docs/superpowers/specs/2026-09-27-admin-tasks-register-design.md` (read it first; this plan argues
from it).

## Global Constraints

- One row = one `TaskItemDto` (a day). A group that cannot be found still yields a row (title `null` → `–`).
- Only the date window goes to the server. Everything else narrows the loaded rows client-side.
- `scheduledTo` is inclusive against a timestamp: send the **last millisecond** of the last local day; build
  bounds from local date parts (`new Date(y, m-1, d, …)`), never `new Date("YYYY-MM-DD")`.
- The window's React Query key is `["admin-tasks-range", fromIso, toIso]` — the family `invalidateTasks`
  already clears (`hooks/use-tasks.ts`), so Assign refreshes the register.
- Status comes from `deriveTaskStatus(task, now)` (`lib/tasks/derived-status.ts`); staffing from
  `rowStaffing(task)` (`lib/tasks/dispatch-row.ts`); openness from `isOpen(task)` (`lib/tasks/staffing.ts`).
  Never recount staffing by hand.
- UI only from `components/ui/` + DS patterns (`AGENTS.md` "Dizayn"): colours are tokens only (no hex, no
  `text-amber-*`), status as tinted chips, numbers/times/ids in `font-mono tabular-nums`, one badge per row,
  empty cell `–`, skeletons at real row height, no horizontal scroll below 768 px.
- en + de messages stay key-for-key identical; German uses "Mitarbeiter", formal "Sie".
- Commit per task, staging **by path** (another session may share the worktree — never `git add -A`/`-u`).
- ⚠ Deviation agreed in the plan review, not the spec: keyboard in this phase is `/` (focus search) and `N`
  (open Assign on the next unstaffed row). `J`/`K`/`Enter`/`A` row navigation moves to the Detail phase, because
  `DataTable` does not expose its on-screen row order.

## Review Focus

1. **A window that returns exactly 5,000 rows** — the list is silently truncated; expect a visible "narrow the
   dates" notice (Task 2 `isCapped`, Task 5 notice).
2. **A day whose group is not in the cached group list** (group created after the list was fetched, or deleted)
   — expect a row with title `–` and no crash in any filter or column (Task 1 test, Task 2 test).
3. **Timezone at day boundaries** — a day at 23:30 local must sit on its local date in "Today", in the calendar
   column and in the window; expect local-date keys, not UTC slices (Task 1/2/6 tests use local dates).
4. **An unknown status word from the server** (a new state added upstream) — `deriveTaskStatus` falls to
   "Open"; expect no crash and the status filter to still work (Task 2 test).
5. **Over-staffed day** (`filled > required`) — expect "full" in the Staffing filter and "+n over" in the cell,
   never a negative shortfall (Task 1/2 tests).

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/tasks/register/rows.ts` (+ test) | `RegisterRow` and `buildRegisterRows` — the join and every derived fact a row shows |
| `lib/tasks/register/filters.ts` (+ test) | URL keys, tabs (saved views), window resolution, `matchesRegister`, `isCapped` |
| `lib/tasks/register/sort.ts` (+ test) | column compare functions |
| `lib/tasks/register/summary.ts` (+ test) | the four strip counts |
| `lib/tasks/register/week.ts` (+ test) | calendar days, per-day counts, card tone |
| `lib/workers/profession-hue.ts` (+ test) | the profession dot hue, moved out of `components/workers/worker-columns.tsx` |
| `hooks/use-task-register.ts` | window query + joins → rows |
| `components/tasks/register/status-cell.tsx` | status dot/word/tint (tokens) |
| `components/tasks/register/register-columns.tsx` | `DataColumn<RegisterRow>[]` factory |
| `components/tasks/register/register-row-card.tsx` | mobile card |
| `components/tasks/register/register-strip.tsx` | the four `SummaryTile`s |
| `components/tasks/register/register-fields.ts` | `FilterField[]` + `FilterSection[]` factory |
| `components/tasks/register/register-calendar.tsx`, `calendar-card.tsx` | week view + mobile one-day view |
| `app/[locale]/dashboard/tasks/page.tsx` | thin composition (rewritten) |
| `messages/en.json`, `messages/de.json` | `tasks.register.*` |

---

### Task 1: Row model

**Files:**
- Create: `lib/tasks/register/rows.ts`
- Test: `lib/tasks/register/rows.test.ts`

**Interfaces:**
- Consumes: `deriveTaskStatus(task, now): DerivedTaskStatus`, `rowStaffing(task): RowStaffing`,
  `durationHours(scheduledAt, deadline): number | null` (`lib/tasks/dispatch-row.ts`), `isOpen(task)`
  (`lib/tasks/staffing.ts`), `toDayKey(d)` (`lib/ui/week.ts`).
- Produces:
  ```ts
  export interface RegisterRow {
    task: TaskItemDto;
    group: TaskGroupDto | null;
    title: string | null;
    repeating: boolean;
    status: DerivedTaskStatus;
    staffing: RowStaffing;
    over: number;               // filled - required, floored at 0
    professionIds: string[];
    dayKey: string;             // local yyyy-MM-dd of scheduledAt
    startMs: number;            // NaN when unparseable
    startTime: string;          // local "HH:mm" or "–"
    endTime: string | null;     // local "HH:mm" of deadline, or null
    durationH: number | null;
    unstaffedToday: boolean;    // status === "Unstaffed"
    startsSoon: boolean;        // 0 <= start - now < 4 h
    assignable: boolean;        // isOpen(task) && staffing.gap > 0
    ownerId: string | null;
    ratingFloor: number | null;
    createdAt: string | null;
    hasCheckin: boolean;
  }
  export function buildRegisterRows(
    tasks: TaskItemDto[],
    groupsById: ReadonlyMap<string, TaskGroupDto>,
    now: Date,
  ): RegisterRow[];
  ```

- [ ] **Step 1: Write the failing test** — `lib/tasks/register/rows.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { buildRegisterRows } from "@/lib/tasks/register/rows";
import type { TaskGroupDto, TaskItemDto, TaskWorkerDto } from "@/lib/types/task.types";

const NOW = new Date(2026, 8, 27, 10, 0); // local 27 Sep 2026 10:00

function worker(over: Partial<TaskWorkerDto> = {}): TaskWorkerDto {
  return {
    id: "tw-1", taskId: "t-1", workerId: "w-1", workerName: "Ali", outcome: "Pending",
    starRating: null, assignedAt: "2026-09-20T09:00:00Z", checkinAt: null, submittedAt: null,
    checkoutAt: null, checkinLat: null, checkinLng: null, checkinDoor: null, ...over,
  } as TaskWorkerDto;
}

function task(over: Partial<TaskItemDto> = {}): TaskItemDto {
  return {
    id: "t-1", groupId: "g-1", propertyId: "p-1", propertyName: "Sonnenhof",
    scheduledDate: "2026-09-27", scheduledAt: new Date(2026, 8, 27, 12, 0).toISOString(),
    deadline: new Date(2026, 8, 27, 18, 0).toISOString(), status: "Pending",
    requiredWorkerCount: 2, startedAt: null, completedAt: null, closureReason: null,
    supervisorWorkerId: null, workSummary: null, workers: [], ...over,
  } as TaskItemDto;
}

function group(over: Partial<TaskGroupDto> = {}): TaskGroupDto {
  return {
    id: "g-1", propertyId: "p-1", ownerId: "o-1", title: "House cleaning",
    defaultStartTime: "12:00:00", defaultDeadline: "18:00:00", instructions: null,
    days: { total: 2, pending: 2, checkedIn: 0, inReview: 0, done: 0, cancelled: 0, rejected: 0 },
    ratingFloor: 4, allowNewWorkers: true, eligibleProfessionIds: ["pr-1"], dates: [], tasks: [],
    createdAt: "2026-09-01T08:00:00Z", kind: "Booking", ...over,
  } as TaskGroupDto;
}

const byId = (...gs: TaskGroupDto[]) => new Map(gs.map((g) => [g.id, g]));

describe("buildRegisterRows", () => {
  it("joins the day to its booking", () => {
    const [row] = buildRegisterRows([task()], byId(group()), NOW);
    expect(row.title).toBe("House cleaning");
    expect(row.repeating).toBe(true);
    expect(row.professionIds).toEqual(["pr-1"]);
    expect(row.ownerId).toBe("o-1");
    expect(row.ratingFloor).toBe(4);
  });

  it("still yields a row when the booking is not in the list", () => {
    const [row] = buildRegisterRows([task({ groupId: "missing" })], byId(group()), NOW);
    expect(row.group).toBeNull();
    expect(row.title).toBeNull();
    expect(row.professionIds).toEqual([]);
    expect(row.repeating).toBe(false);
  });

  it("marks a single task as not repeating", () => {
    const [row] = buildRegisterRows([task()], byId(group({ kind: "SingleTask" })), NOW);
    expect(row.repeating).toBe(false);
  });

  it("reads times and the day key in local time", () => {
    const late = task({ scheduledAt: new Date(2026, 8, 27, 23, 30).toISOString(), deadline: null });
    const [row] = buildRegisterRows([late], byId(group()), NOW);
    expect(row.dayKey).toBe("2026-09-27");
    expect(row.startTime).toBe("23:30");
    expect(row.endTime).toBeNull();
  });

  it("flags an unstaffed day starting today and one starting within 4 hours", () => {
    const [row] = buildRegisterRows([task()], byId(group()), NOW);
    expect(row.unstaffedToday).toBe(true);
    expect(row.startsSoon).toBe(true);
    expect(row.assignable).toBe(true);
  });

  it("is not assignable once full, and counts over-staffing", () => {
    const full = task({ requiredWorkerCount: 1, workers: [worker(), worker({ id: "tw-2", workerId: "w-2" })] });
    const [row] = buildRegisterRows([full], byId(group()), NOW);
    expect(row.staffing.gap).toBe(0);
    expect(row.over).toBe(1);
    expect(row.assignable).toBe(false);
  });

  it("is not assignable once cancelled", () => {
    const [row] = buildRegisterRows([task({ status: "Cancelled" })], byId(group()), NOW);
    expect(row.status).toBe("Cancelled");
    expect(row.assignable).toBe(false);
  });

  it("knows whether anyone checked in", () => {
    const t = task({ workers: [worker({ checkinAt: "2026-09-27T09:00:00Z" })] });
    expect(buildRegisterRows([t], byId(group()), NOW)[0].hasCheckin).toBe(true);
  });

  it("survives an unparseable start", () => {
    const [row] = buildRegisterRows([task({ scheduledAt: "not-a-date" })], byId(group()), NOW);
    expect(Number.isNaN(row.startMs)).toBe(true);
    expect(row.startTime).toBe("–");
    expect(row.startsSoon).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/tasks/register/rows.test.ts`
Expected: FAIL — cannot find module `@/lib/tasks/register/rows`.

- [ ] **Step 3: Implement** — `lib/tasks/register/rows.ts`

```ts
// lib/tasks/register/rows.ts

import { deriveTaskStatus, type DerivedTaskStatus } from "@/lib/tasks/derived-status";
import { durationHours, rowStaffing, type RowStaffing } from "@/lib/tasks/dispatch-row";
import { isOpen } from "@/lib/tasks/staffing";
import { toDayKey } from "@/lib/ui/week";
import type { TaskGroupDto, TaskItemDto } from "@/lib/types/task.types";

const HOUR_MS = 3_600_000;
/** Design 06 · Schedule: "Red when it starts within 4 h." */
const SOON_HOURS = 4;

export interface RegisterRow {
  task: TaskItemDto;
  group: TaskGroupDto | null;
  title: string | null;
  repeating: boolean;
  status: DerivedTaskStatus;
  staffing: RowStaffing;
  over: number;
  professionIds: string[];
  dayKey: string;
  startMs: number;
  startTime: string;
  endTime: string | null;
  durationH: number | null;
  unstaffedToday: boolean;
  startsSoon: boolean;
  assignable: boolean;
  ownerId: string | null;
  ratingFloor: number | null;
  createdAt: string | null;
  hasCheckin: boolean;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * One row per day of work (spec §3). `TaskItemDto` carries no title, professions,
 * kind or owner — those live on the booking, joined here by `groupId`. A day whose
 * booking is missing from the cached list still renders: a list that drops rows
 * it cannot label hides work.
 *
 * Times and the day key are **local** — the admin plans in their own clock, and a
 * UTC slice would put a 23:30 day on tomorrow's date.
 */
export function buildRegisterRows(
  tasks: TaskItemDto[],
  groupsById: ReadonlyMap<string, TaskGroupDto>,
  now: Date,
): RegisterRow[] {
  const nowMs = now.getTime();
  return tasks.map((task) => {
    const group = groupsById.get(task.groupId) ?? null;
    const start = new Date(task.scheduledAt);
    const startMs = start.getTime();
    const valid = !Number.isNaN(startMs);
    const end = task.deadline ? new Date(task.deadline) : null;
    const staffing = rowStaffing(task);
    const status = deriveTaskStatus(task, now);
    const untilStart = startMs - nowMs;
    return {
      task,
      group,
      title: group?.title ?? null,
      repeating: group?.kind === "Booking",
      status,
      staffing,
      over: Math.max(0, staffing.filled - staffing.required),
      professionIds: group?.eligibleProfessionIds ?? [],
      dayKey: valid ? toDayKey(start) : task.scheduledDate,
      startMs,
      startTime: valid ? hhmm(start) : "–",
      endTime: end && !Number.isNaN(end.getTime()) ? hhmm(end) : null,
      durationH: durationHours(task.scheduledAt, task.deadline),
      unstaffedToday: status === "Unstaffed",
      startsSoon: valid && untilStart >= 0 && untilStart < SOON_HOURS * HOUR_MS,
      assignable: isOpen(task) && staffing.gap > 0,
      ownerId: group?.ownerId ?? null,
      ratingFloor: group?.ratingFloor ?? null,
      createdAt: group?.createdAt ?? null,
      hasCheckin: task.workers.some((w) => Boolean(w.checkinAt)),
    };
  });
}
```

- [ ] **Step 4: Run the test** — `npx vitest run lib/tasks/register/rows.test.ts` → all PASS.
- [ ] **Step 5: Commit**

```bash
git add lib/tasks/register/rows.ts lib/tasks/register/rows.test.ts
git commit -m "feat(tasks): the register's row model — one day, joined to its booking"
```

---

### Task 2: Filters, saved views and the window

**Files:**
- Create: `lib/tasks/register/filters.ts`
- Test: `lib/tasks/register/filters.test.ts`

**Interfaces:**
- Consumes: `RegisterRow` (Task 1); `toDayKey`, `fromDayKey`, `addDays`, `weekOf` (`lib/ui/week.ts`);
  `parseMulti` (`components/ui/filter-bar.tsx` — import the function; it has no React dependency).
- Produces:
  ```ts
  export const REGISTER_FILTER_KEYS: readonly string[];      // for useTableUrlState({ filterKeys })
  export const REGISTER_TABS = ["thisWeek", "today", "unstaffed", "short", "next7"] as const;
  export type RegisterTab = (typeof REGISTER_TABS)[number];
  export const DEFAULT_REGISTER_TAB: RegisterTab;            // "thisWeek"
  export interface RegisterWindow { fromKey: string; toKey: string; fromIso: string; toIso: string }
  export function resolveWindow(tab: string, values: Record<string, string>, todayKey: string): RegisterWindow;
  export function tabMatches(tab: string, row: RegisterRow, todayKey: string): boolean;
  export type StaffingBucket = "none" | "short" | "full" | "over";
  export function staffingBucket(row: RegisterRow): StaffingBucket;
  export interface RegisterLookups { cityByProperty: ReadonlyMap<string, string>; walkInOwnerId: string | null | undefined }
  export function matchesRegister(row: RegisterRow, values: Record<string, string>, lookups: RegisterLookups): boolean;
  export function matchesSearch(row: RegisterRow, needle: string): boolean;
  export const REGISTER_ROW_CAP = 5000;
  export function isCapped(count: number): boolean;
  ```

- [ ] **Step 1: Write the failing test** — `lib/tasks/register/filters.test.ts`

```ts
import { describe, expect, it } from "vitest";
import {
  isCapped, matchesRegister, matchesSearch, resolveWindow, staffingBucket, tabMatches,
  type RegisterLookups,
} from "@/lib/tasks/register/filters";
import type { RegisterRow } from "@/lib/tasks/register/rows";

const TODAY = "2026-09-27"; // a Sunday
const lookups: RegisterLookups = { cityByProperty: new Map([["p-1", "c-berlin"]]), walkInOwnerId: "o-walk" };

function row(over: Partial<RegisterRow> = {}): RegisterRow {
  return {
    task: { id: "t-12345678", propertyId: "p-1", propertyName: "Sonnenhof", requiredWorkerCount: 2 },
    group: null, title: "House cleaning", repeating: false, status: "Open",
    staffing: { filled: 1, required: 2, gap: 1, covered: false }, over: 0, professionIds: ["pr-1"],
    dayKey: TODAY, startMs: 0, startTime: "09:00", endTime: "15:00", durationH: 6,
    unstaffedToday: false, startsSoon: false, assignable: true, ownerId: "o-1", ratingFloor: 4,
    createdAt: null, hasCheckin: false, ...over,
  } as RegisterRow;
}

describe("resolveWindow", () => {
  it("defaults to this week, Monday to Sunday", () => {
    const w = resolveWindow("thisWeek", {}, TODAY);
    expect(w.fromKey).toBe("2026-09-21");
    expect(w.toKey).toBe("2026-09-27");
  });
  it("uses today for the today and unstaffed tabs", () => {
    expect(resolveWindow("today", {}, TODAY).fromKey).toBe(TODAY);
    expect(resolveWindow("unstaffed", {}, TODAY).toKey).toBe(TODAY);
  });
  it("uses the next seven days for short and next7", () => {
    const w = resolveWindow("short", {}, TODAY);
    expect(w.fromKey).toBe(TODAY);
    expect(w.toKey).toBe("2026-10-03");
  });
  it("lets an explicit date range win over the tab", () => {
    const w = resolveWindow("today", { from: "2026-09-01", to: "2026-09-10" }, TODAY);
    expect(w).toMatchObject({ fromKey: "2026-09-01", toKey: "2026-09-10" });
  });
  it("sends local midnight and the last local millisecond", () => {
    const w = resolveWindow("today", {}, TODAY);
    const from = new Date(w.fromIso);
    const to = new Date(w.toIso);
    expect([from.getHours(), from.getMinutes()]).toEqual([0, 0]);
    expect([to.getHours(), to.getMinutes(), to.getSeconds(), to.getMilliseconds()]).toEqual([23, 59, 59, 999]);
  });
  it("ignores a malformed bound", () => {
    expect(resolveWindow("thisWeek", { from: "01.09.2026" }, TODAY).fromKey).toBe("2026-09-21");
  });
});

describe("tabMatches", () => {
  it("narrows unstaffed, short and today", () => {
    expect(tabMatches("unstaffed", row({ unstaffedToday: true }), TODAY)).toBe(true);
    expect(tabMatches("unstaffed", row(), TODAY)).toBe(false);
    expect(tabMatches("short", row(), TODAY)).toBe(true);
    expect(tabMatches("short", row({ assignable: false }), TODAY)).toBe(false);
    expect(tabMatches("today", row({ dayKey: "2026-09-28" }), TODAY)).toBe(false);
    expect(tabMatches("thisWeek", row({ dayKey: "2026-09-28" }), TODAY)).toBe(true);
  });
});

describe("staffingBucket", () => {
  it("sorts a day into none, short, full or over", () => {
    expect(staffingBucket(row({ staffing: { filled: 0, required: 2, gap: 2, covered: false } }))).toBe("none");
    expect(staffingBucket(row())).toBe("short");
    expect(staffingBucket(row({ staffing: { filled: 2, required: 2, gap: 0, covered: true } }))).toBe("full");
    expect(staffingBucket(row({ over: 1, staffing: { filled: 3, required: 2, gap: 0, covered: true } }))).toBe("over");
  });
});

describe("matchesRegister", () => {
  it("passes everything with no filters", () => {
    expect(matchesRegister(row(), {}, lookups)).toBe(true);
  });
  it("filters by status, staffing, property, city, owner and profession", () => {
    expect(matchesRegister(row(), { status: "Open,Running" }, lookups)).toBe(true);
    expect(matchesRegister(row(), { status: "Done" }, lookups)).toBe(false);
    expect(matchesRegister(row(), { staffing: "full" }, lookups)).toBe(false);
    expect(matchesRegister(row(), { property: "p-2" }, lookups)).toBe(false);
    expect(matchesRegister(row(), { city: "c-berlin" }, lookups)).toBe(true);
    expect(matchesRegister(row(), { city: "c-munich" }, lookups)).toBe(false);
    expect(matchesRegister(row(), { owner: "o-1" }, lookups)).toBe(true);
    expect(matchesRegister(row(), { profession: "pr-9" }, lookups)).toBe(false);
  });
  it("filters by time of day, overdue, repeating and check-in", () => {
    expect(matchesRegister(row(), { startAfter: "10:00" }, lookups)).toBe(false);
    expect(matchesRegister(row(), { startBefore: "10:00" }, lookups)).toBe(true);
    expect(matchesRegister(row(), { overdue: "true" }, lookups)).toBe(false);
    expect(matchesRegister(row({ status: "Overdue" }), { overdue: "true" }, lookups)).toBe(true);
    expect(matchesRegister(row(), { repeating: "true" }, lookups)).toBe(false);
    expect(matchesRegister(row(), { checkedIn: "true" }, lookups)).toBe(false);
  });
  it("filters by workers required and rating floor", () => {
    expect(matchesRegister(row(), { reqMin: "3" }, lookups)).toBe(false);
    expect(matchesRegister(row(), { reqMax: "2" }, lookups)).toBe(true);
    expect(matchesRegister(row(), { ratingMin: "4.5" }, lookups)).toBe(false);
    expect(matchesRegister(row({ ratingFloor: null }), { ratingMin: "1" }, lookups)).toBe(false);
  });
  it("walk-in only needs the walk-in owner", () => {
    expect(matchesRegister(row({ ownerId: "o-walk" }), { walkIn: "true" }, lookups)).toBe(true);
    expect(matchesRegister(row(), { walkIn: "true" }, lookups)).toBe(false);
  });
  it("does not crash on a day without its booking", () => {
    const orphan = row({ ownerId: null, ratingFloor: null, professionIds: [], title: null });
    expect(matchesRegister(orphan, { owner: "o-1", profession: "pr-1" }, lookups)).toBe(false);
    expect(matchesRegister(orphan, {}, lookups)).toBe(true);
  });
  it("ignores a non-numeric bound", () => {
    expect(matchesRegister(row(), { reqMin: "abc" }, lookups)).toBe(true);
  });
});

describe("matchesSearch", () => {
  it("matches the title, the property and the short id", () => {
    expect(matchesSearch(row(), "house")).toBe(true);
    expect(matchesSearch(row(), "sonnen")).toBe(true);
    expect(matchesSearch(row(), "t-1234")).toBe(true);
    expect(matchesSearch(row({ title: null }), "house")).toBe(false);
  });
});

describe("isCapped", () => {
  it("is true at the 5,000-row ceiling", () => {
    expect(isCapped(4999)).toBe(false);
    expect(isCapped(5000)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to see it fail** — `npx vitest run lib/tasks/register/filters.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** — `lib/tasks/register/filters.ts`

```ts
// lib/tasks/register/filters.ts

import { parseMulti } from "@/components/ui/filter-bar";
import type { RegisterRow } from "@/lib/tasks/register/rows";
import { addDays, fromDayKey, toDayKey, weekOf } from "@/lib/ui/week";

/** Every wire param the register's filter band owns (spec §4). */
export const REGISTER_FILTER_KEYS = [
  "from", "to", "startAfter", "startBefore", "overdue", "repeating",
  "status", "staffing", "checkedIn",
  "property", "city", "owner", "walkIn",
  "profession", "reqMin", "reqMax", "ratingMin",
] as const;

/**
 * The saved views (design 01) as the table's tabs. A tab also sets the **default
 * window** — "Unstaffed today" is about today, "Short of a body" about the next
 * seven days — and an explicit date range in the band overrides it.
 */
export const REGISTER_TABS = ["thisWeek", "today", "unstaffed", "short", "next7"] as const;
export type RegisterTab = (typeof REGISTER_TABS)[number];
export const DEFAULT_REGISTER_TAB: RegisterTab = "thisWeek";

export interface RegisterWindow {
  fromKey: string;
  toKey: string;
  fromIso: string;
  toIso: string;
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function bounds(fromKey: string, toKey: string): RegisterWindow {
  const f = fromDayKey(fromKey);
  const t = fromDayKey(toKey);
  // ⚠ Local parts, and the LAST millisecond: the server compares scheduledTo
  // inclusively against a timestamp (`task.service.ts` getAdminTasksInRange).
  const from = new Date(f.getFullYear(), f.getMonth(), f.getDate(), 0, 0, 0, 0);
  const to = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999);
  return { fromKey, toKey, fromIso: from.toISOString(), toIso: to.toISOString() };
}

export function resolveWindow(
  tab: string,
  values: Record<string, string>,
  todayKey: string,
): RegisterWindow {
  const from = values.from && DAY_KEY.test(values.from) ? values.from : null;
  const to = values.to && DAY_KEY.test(values.to) ? values.to : null;
  if (from || to) return bounds(from ?? to!, to ?? from!);
  const today = fromDayKey(todayKey);
  switch (tab) {
    case "today":
    case "unstaffed":
      return bounds(todayKey, todayKey);
    case "short":
    case "next7":
      return bounds(todayKey, toDayKey(addDays(today, 6)));
    default: {
      const week = weekOf(todayKey, todayKey);
      return bounds(week.dayKeys[0], week.dayKeys[6]);
    }
  }
}

export function tabMatches(tab: string, row: RegisterRow, todayKey: string): boolean {
  switch (tab) {
    case "today":
      return row.dayKey === todayKey;
    case "unstaffed":
      return row.unstaffedToday;
    case "short":
      return row.assignable;
    default:
      return true;
  }
}

export type StaffingBucket = "none" | "short" | "full" | "over";

export function staffingBucket(row: RegisterRow): StaffingBucket {
  if (row.over > 0) return "over";
  if (row.staffing.covered) return "full";
  return row.staffing.filled === 0 ? "none" : "short";
}

export interface RegisterLookups {
  cityByProperty: ReadonlyMap<string, string>;
  /** `useWalkInOwnerId()`: undefined while pending, null when there is none. */
  walkInOwnerId: string | null | undefined;
}

function num(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Everything except the date (which is the server window) and the tab (which
 * the page applies). An absent or empty value means "any".
 */
export function matchesRegister(
  row: RegisterRow,
  values: Record<string, string>,
  lookups: RegisterLookups,
): boolean {
  if (values.startAfter && row.startTime !== "–" && row.startTime < values.startAfter) return false;
  if (values.startAfter && row.startTime === "–") return false;
  if (values.startBefore && (row.startTime === "–" || row.startTime >= values.startBefore)) return false;
  if (values.overdue === "true" && row.status !== "Overdue") return false;
  if (values.repeating === "true" && !row.repeating) return false;
  if (values.checkedIn === "true" && !row.hasCheckin) return false;

  const statuses = parseMulti(values.status);
  if (statuses.length && !statuses.includes(row.status)) return false;
  const buckets = parseMulti(values.staffing);
  if (buckets.length && !buckets.includes(staffingBucket(row))) return false;

  const properties = parseMulti(values.property);
  if (properties.length && !properties.includes(row.task.propertyId)) return false;
  if (values.city && lookups.cityByProperty.get(row.task.propertyId) !== values.city) return false;
  if (values.owner && row.ownerId !== values.owner) return false;
  if (values.walkIn === "true" && (!lookups.walkInOwnerId || row.ownerId !== lookups.walkInOwnerId)) {
    return false;
  }

  const professions = parseMulti(values.profession);
  if (professions.length && !professions.some((p) => row.professionIds.includes(p))) return false;
  const reqMin = num(values.reqMin);
  if (reqMin !== null && row.staffing.required < reqMin) return false;
  const reqMax = num(values.reqMax);
  if (reqMax !== null && row.staffing.required > reqMax) return false;
  const ratingMin = num(values.ratingMin);
  if (ratingMin !== null && (row.ratingFloor === null || row.ratingFloor < ratingMin)) return false;
  return true;
}

/** `needle` arrives lower-cased and trimmed (the shell's contract). */
export function matchesSearch(row: RegisterRow, needle: string): boolean {
  return [row.title, row.task.propertyName, row.task.id]
    .some((v) => (v ?? "").toLowerCase().includes(needle));
}

export const REGISTER_ROW_CAP = 5000;

/** Receiving exactly the ceiling means "at least this many" — the list is truncated. */
export function isCapped(count: number): boolean {
  return count >= REGISTER_ROW_CAP;
}
```

- [ ] **Step 4: Run** — `npx vitest run lib/tasks/register/filters.test.ts` → PASS. If `parseMulti` import from
  `components/ui/filter-bar` pulls React into the node test env and fails, copy its two-line body into this file
  instead (`(value ?? "").split(",").filter(Boolean)`) and note why in a comment.
- [ ] **Step 5: Commit**

```bash
git add lib/tasks/register/filters.ts lib/tasks/register/filters.test.ts
git commit -m "feat(tasks): register filters, saved views and the day window"
```

---

### Task 3: Sort, strip counts and the profession hue

**Files:**
- Create: `lib/tasks/register/sort.ts`, `lib/tasks/register/summary.ts`, `lib/workers/profession-hue.ts`
- Test: `lib/tasks/register/sort.test.ts`, `lib/tasks/register/summary.test.ts`, `lib/workers/profession-hue.test.ts`
- Modify: `components/workers/worker-columns.tsx:465-500` (import the moved hue)

**Interfaces:**
- Consumes: `RegisterRow` (Task 1), `deriveTaskStatus`, `rowStaffing`, `isOpen`.
- Produces:
  ```ts
  // sort.ts — ascending comparators for DataColumn.compare
  export function compareSchedule(a: RegisterRow, b: RegisterRow): number;
  export function compareStatus(a: RegisterRow, b: RegisterRow): number;
  export function compareStaffing(a: RegisterRow, b: RegisterRow): number;
  // summary.ts
  export interface RegisterSummary { unstaffedToday: number; short: number; overdue: number; next7: number }
  export function registerSummary(tasks: TaskItemDto[], now: Date): RegisterSummary;
  // profession-hue.ts
  export function professionHue(name: string): string;
  ```

- [ ] **Step 1: Write the failing tests**

`lib/tasks/register/sort.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { compareSchedule, compareStaffing, compareStatus } from "@/lib/tasks/register/sort";
import type { RegisterRow } from "@/lib/tasks/register/rows";

const r = (over: Partial<RegisterRow>) => ({ startMs: 0, status: "Open", staffing: { filled: 0, required: 1, gap: 1, covered: false }, ...over }) as RegisterRow;

describe("register sort", () => {
  it("orders by start, unparseable last", () => {
    const rows = [r({ startMs: 30 }), r({ startMs: NaN }), r({ startMs: 10 })];
    expect(rows.sort(compareSchedule).map((x) => x.startMs)).toEqual([10, 30, NaN]);
  });
  it("puts the states that need action first", () => {
    const rows = [r({ status: "Done" }), r({ status: "Unstaffed" }), r({ status: "Scheduled" }), r({ status: "Overdue" })];
    expect(rows.sort(compareStatus).map((x) => x.status)).toEqual(["Unstaffed", "Overdue", "Scheduled", "Done"]);
  });
  it("puts the biggest shortfall first", () => {
    const rows = [r({ staffing: { filled: 2, required: 2, gap: 0, covered: true } }), r({ staffing: { filled: 0, required: 3, gap: 3, covered: false } })];
    expect(rows.sort(compareStaffing)[0].staffing.gap).toBe(3);
  });
});
```

`lib/tasks/register/summary.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { registerSummary } from "@/lib/tasks/register/summary";
import type { TaskItemDto } from "@/lib/types/task.types";

const NOW = new Date(2026, 8, 27, 10, 0);
const at = (d: number, h: number) => new Date(2026, 8, d, h, 0).toISOString();
const t = (over: Partial<TaskItemDto>) => ({
  id: Math.random().toString(), groupId: "g", propertyId: "p", propertyName: "P", scheduledDate: "",
  scheduledAt: at(27, 12), deadline: at(27, 18), status: "Pending", requiredWorkerCount: 2,
  startedAt: null, completedAt: null, closureReason: null, supervisorWorkerId: null, workSummary: null,
  workers: [], ...over,
}) as TaskItemDto;
const w = { id: "tw", taskId: "t", workerId: "w", workerName: "A", outcome: "Pending", starRating: null,
  assignedAt: "", checkinAt: null, submittedAt: null, checkoutAt: null, checkinLat: null, checkinLng: null, checkinDoor: null };

describe("registerSummary", () => {
  it("counts the four tiles", () => {
    const s = registerSummary([
      t({}),                                                     // unstaffed today
      t({ scheduledAt: at(29, 9), deadline: at(29, 15), workers: [w] }), // short, next 7
      t({ scheduledAt: at(26, 9), deadline: at(26, 15), status: "CheckedIn" }), // overdue
      t({ scheduledAt: at(30, 9), deadline: at(30, 15), requiredWorkerCount: 1, workers: [w] }), // planned, full
      t({ scheduledAt: at(20, 9), deadline: at(20, 15), status: "Done" }), // ignored
    ], NOW);
    // next7 = today, the 29th and the 30th; yesterday's overdue day is outside it.
    expect(s).toEqual({ unstaffedToday: 1, short: 2, overdue: 1, next7: 3 });
  });
});
```
(`short` counts open days in the next 7 days with a gap — today's unstaffed day included; `next7` counts open
days starting today through today+6.)

`lib/workers/profession-hue.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { professionHue } from "@/lib/workers/profession-hue";

describe("professionHue", () => {
  it("is stable per name and one of the palette", () => {
    expect(professionHue("Cleaner")).toBe(professionHue("Cleaner"));
    expect(["#1C6B4C", "#2F6FED", "#12A594", "#7A5AF8", "#C2410C"]).toContain(professionHue("Gardener"));
  });
});
```

- [ ] **Step 2: Run to see them fail** — `npx vitest run lib/tasks/register lib/workers/profession-hue.test.ts`.

- [ ] **Step 3: Implement**

`lib/tasks/register/sort.ts`:
```ts
import type { DerivedTaskStatus } from "@/lib/tasks/derived-status";
import type { RegisterRow } from "@/lib/tasks/register/rows";

/** What needs a person first — the order the design's Status sort reads in. */
const STATUS_ORDER: DerivedTaskStatus[] = [
  "Unstaffed", "Overdue", "Disputed", "Open", "Running", "Review", "Scheduled", "Done", "Cancelled",
];

export function compareSchedule(a: RegisterRow, b: RegisterRow): number {
  const an = Number.isNaN(a.startMs), bn = Number.isNaN(b.startMs);
  if (an || bn) return an === bn ? 0 : an ? 1 : -1;
  return a.startMs - b.startMs;
}

export function compareStatus(a: RegisterRow, b: RegisterRow): number {
  const ai = STATUS_ORDER.indexOf(a.status), bi = STATUS_ORDER.indexOf(b.status);
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || compareSchedule(a, b);
}

/** Biggest shortfall first — "ascending" here means most urgent. */
export function compareStaffing(a: RegisterRow, b: RegisterRow): number {
  return b.staffing.gap - a.staffing.gap || compareSchedule(a, b);
}
```

`lib/tasks/register/summary.ts`:
```ts
import { deriveTaskStatus } from "@/lib/tasks/derived-status";
import { rowStaffing } from "@/lib/tasks/dispatch-row";
import { isOpen } from "@/lib/tasks/staffing";
import type { TaskItemDto } from "@/lib/types/task.types";

export interface RegisterSummary { unstaffedToday: number; short: number; overdue: number; next7: number }

/**
 * The strip (spec §3·2), counted over the Dispatch window — independent of the
 * register's filters, so it always answers "what needs doing now", and equal to
 * what Dispatch shows because it reads the same cache.
 */
export function registerSummary(tasks: TaskItemDto[], now: Date): RegisterSummary {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 7 * 86_400_000;
  const out = { unstaffedToday: 0, short: 0, overdue: 0, next7: 0 };
  for (const task of tasks) {
    const status = deriveTaskStatus(task, now);
    if (status === "Unstaffed") out.unstaffedToday++;
    if (status === "Overdue") out.overdue++;
    const at = new Date(task.scheduledAt).getTime();
    if (!isOpen(task) || Number.isNaN(at) || at < start || at >= end) continue;
    out.next7++;
    if (rowStaffing(task).gap > 0) out.short++;
  }
  return out;
}
```

`lib/workers/profession-hue.ts` — move `SKILL_HUES` and `skillHue` from `components/workers/worker-columns.tsx`
verbatim (keep its doc comment), export as `professionHue`, and in `worker-columns.tsx` replace the local
function with `import { professionHue } from "@/lib/workers/profession-hue";` (rename call sites
`skillHue(` → `professionHue(`).

- [ ] **Step 4: Run** — `npx vitest run lib/tasks/register lib/workers` → PASS; `npx tsc --noEmit -p .` clean.
- [ ] **Step 5: Commit**

```bash
git add lib/tasks/register/sort.ts lib/tasks/register/sort.test.ts lib/tasks/register/summary.ts lib/tasks/register/summary.test.ts lib/workers/profession-hue.ts lib/workers/profession-hue.test.ts components/workers/worker-columns.tsx
git commit -m "feat(tasks): register sort order and strip counts; profession hue shared"
```

---

### Task 4: The data hook

**Files:**
- Create: `hooks/use-task-register.ts`

**Interfaces:**
- Consumes: `taskService.getAdminTasksInRange(fromIso, toIso)`, `useAdminTaskGroups()` (`hooks/use-tasks.ts`),
  `useProperties()` (`hooks/use-properties.ts`), `useWalkInOwnerId()` (`hooks/use-owners.ts`), `useClock()`
  (`hooks/use-today.ts`), `isPermissionDenied` (`lib/onboarding/errors.ts`), `buildRegisterRows`,
  `RegisterWindow`, `RegisterLookups`.
- Produces:
  ```ts
  export function useTaskRegister(window: RegisterWindow): {
    rows: RegisterRow[]; count: number; lookups: RegisterLookups;
    isLoading: boolean; isError: boolean; isForbidden: boolean; refetch: () => void;
  };
  ```

- [ ] **Step 1: Implement** — `hooks/use-task-register.ts`

```ts
"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminTaskGroups } from "@/hooks/use-tasks";
import { useProperties } from "@/hooks/use-properties";
import { useWalkInOwnerId } from "@/hooks/use-owners";
import { useClock } from "@/hooks/use-today";
import { taskService } from "@/lib/services/task.service";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import { buildRegisterRows } from "@/lib/tasks/register/rows";
import type { RegisterLookups, RegisterWindow } from "@/lib/tasks/register/filters";

/**
 * The register's rows (spec §2): the day window from the server, joined to the
 * cached booking list. ⚠ The key is the `admin-tasks-range` family on purpose —
 * `invalidateTasks` clears it by prefix, so an Assign anywhere refreshes this.
 */
export function useTaskRegister(window: RegisterWindow) {
  const now = useClock();
  const tasks = useQuery({
    queryKey: ["admin-tasks-range", window.fromIso, window.toIso],
    queryFn: () => taskService.getAdminTasksInRange(window.fromIso, window.toIso),
  });
  const groups = useAdminTaskGroups();
  const properties = useProperties();
  const walkIn = useWalkInOwnerId();

  const groupsById = useMemo(
    () => new Map((groups.data ?? []).map((g) => [g.id, g])),
    [groups.data],
  );
  const lookups = useMemo<RegisterLookups>(() => ({
    cityByProperty: new Map(
      (properties.data ?? []).flatMap((p) => (p.city ? [[p.id, p.city.id] as const] : [])),
    ),
    walkInOwnerId: walkIn.isSuccess ? walkIn.data : undefined,
  }), [properties.data, walkIn.isSuccess, walkIn.data]);

  const rows = useMemo(
    () => (now ? buildRegisterRows(tasks.data ?? [], groupsById, new Date(now)) : []),
    [tasks.data, groupsById, now],
  );

  return {
    rows,
    count: tasks.data?.length ?? 0,
    lookups,
    // The clock is 0 on the server snapshot; rows wait for it rather than guess "today".
    isLoading: tasks.isLoading || groups.isLoading || !now,
    isError: tasks.isError && !isPermissionDenied(tasks.error),
    isForbidden: tasks.isError && isPermissionDenied(tasks.error),
    refetch: () => void tasks.refetch(),
  };
}
```

Check `useProperties()` returns `PropertyDto[]` in `.data` (read `hooks/use-properties.ts:22` and
`propertyService.getProperties`); if it returns a paged envelope, read its items array instead.
Check `useWalkInOwnerId()` returns `string | null` in `.data`.

- [ ] **Step 2: Verify** — `npx tsc --noEmit -p .` clean; `npx eslint hooks/use-task-register.ts` clean.
- [ ] **Step 3: Commit**

```bash
git add hooks/use-task-register.ts
git commit -m "feat(tasks): the register's data hook — day window joined to bookings"
```

---

### Task 5: The list — columns, filter band, strip, views, mobile card

**Files:**
- Create: `components/tasks/register/status-cell.tsx`, `components/tasks/register/register-columns.tsx`,
  `components/tasks/register/register-row-card.tsx`, `components/tasks/register/register-strip.tsx`,
  `components/tasks/register/register-fields.ts`
- Modify: `app/[locale]/dashboard/tasks/page.tsx` (rewrite), `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: everything from Tasks 1–4; `DataTable`, `TableUrlState` (`components/ui/data-table`,
  `hooks/use-table-url-state.ts`); `FilterField`, `FilterSection` (`components/ui/filter-bar.tsx`);
  `SummaryStrip`, `SummaryTile` (`components/ui/summary-strip.tsx`); `StaffingPipMeter`
  (`components/tasks/staffing-pip-meter.tsx`, props `{filled, required, urgent, size?}`); `propertyHue(id)`;
  `useDispatchQueue()` (`.data` = `TaskItemDto[]`); `useProfessions()`; `useOwnerDirectory()` for owner options
  (read its return shape before using).
- Produces: `registerColumns(opts): DataColumn<RegisterRow>[]` where
  `opts = { t, locale, professionName: (id) => string, onAssign: (row: RegisterRow) => void }`;
  `RegisterRowCard({ row, onAssign })`; `RegisterStrip({ summary, isLoading, onPick })` with
  `onPick: (tab: RegisterTab | "overdue") => void`; `registerFields(opts): { fields: FilterField[]; sections: FilterSection[] }`.

- [ ] **Step 1: Messages.** Add under `tasks.register` in `messages/en.json` and the same keys in `de.json`:

```json
"register": {
  "title": "Tasks",
  "subtitle": "Every day of work an owner has asked for, and how many people it still needs.",
  "search": "Property, title or id",
  "tabsLabel": "Saved views",
  "tabs": { "thisWeek": "This week", "today": "Today", "unstaffed": "Unstaffed today", "short": "Short of a body", "next7": "Next 7 days" },
  "strip": {
    "label": "Open right now",
    "unstaffed": { "title": "{count} unstaffed today", "detail": "nobody assigned, starts today", "action": "Fill" },
    "short": { "title": "{count} short of a body", "detail": "next 7 days, assigned < required", "action": "Open" },
    "overdue": { "title": "{count} overdue", "detail": "past deadline, not done", "action": "Chase" },
    "next7": { "title": "{count} next 7 days", "detail": "planned", "action": "Plan" }
  },
  "columns": { "task": "Task", "status": "Status", "schedule": "Schedule", "staffing": "Staffing", "professions": "Professions", "action": "Action", "deadline": "Deadline", "ratingFloor": "Rating floor", "created": "Created", "taskId": "Task id" },
  "status": { "Open": "Open", "Scheduled": "Scheduled", "Running": "Running", "Review": "In review", "Disputed": "In dispute", "Done": "Done", "Unstaffed": "Unstaffed", "Overdue": "Overdue", "Cancelled": "Cancelled" },
  "staffing": { "short": "{count, plural, one {one short} other {# short}}", "full": "fully staffed", "over": "+{count} over", "none": "nobody yet" },
  "assign": "Assign",
  "repeating": "Part of a multi-day booking",
  "capped": "Showing the first 5,000 days. Narrow the dates to see the rest.",
  "empty": { "title": "No tasks in these dates", "body": "Pick other dates or another view." },
  "sections": { "when": "When", "state": "State", "where": "Where & who for", "needs": "What it needs" },
  "filters": {
    "dates": "Date range", "timeOfDay": "Starts between", "overdue": "Deadline passed", "repeating": "Repeating",
    "status": "Status", "staffing": "Staffing", "checkedIn": "Has a check-in", "property": "Property",
    "city": "City", "owner": "Owner", "walkIn": "Walk-in only", "profession": "Profession",
    "required": "Workers required", "ratingMin": "Rating floor at least",
    "staffingOptions": { "none": "Nobody", "short": "Short", "full": "Full", "over": "Over" }
  }
}
```
German values (same keys): title "Aufgaben"; subtitle "Jeder Arbeitstag, den ein Eigentümer angefragt hat,
und wie viele Mitarbeiter noch fehlen."; search "Objekt, Titel oder ID"; tabsLabel "Gespeicherte Ansichten";
tabs "Diese Woche" / "Heute" / "Heute unbesetzt" / "Unterbesetzt" / "Nächste 7 Tage"; strip.label "Jetzt offen";
strip titles "{count} heute unbesetzt" / "{count} unterbesetzt" / "{count} überfällig" / "{count} in 7 Tagen",
details "niemand eingeteilt, beginnt heute" / "nächste 7 Tage, eingeteilt < benötigt" / "Frist vorbei, nicht erledigt" /
"geplant", actions "Besetzen" / "Öffnen" / "Nachfassen" / "Planen"; columns "Aufgabe", "Status", "Zeitplan",
"Besetzung", "Berufe", "Aktion", "Frist", "Mindestbewertung", "Erstellt", "Aufgaben-ID"; status "Offen", "Geplant",
"Läuft", "In Prüfung", "Beschwerde offen", "Erledigt", "Unbesetzt", "Überfällig", "Storniert"; staffing
"{count, plural, one {einer fehlt} other {# fehlen}}" / "voll besetzt" / "+{count} zu viel" / "noch niemand";
assign "Zuweisen"; repeating "Teil einer mehrtägigen Buchung"; capped "Es werden die ersten 5.000 Tage gezeigt.
Grenzen Sie den Zeitraum ein, um den Rest zu sehen."; empty "Keine Aufgaben in diesem Zeitraum" / "Wählen Sie
andere Daten oder eine andere Ansicht."; sections "Wann", "Zustand", "Wo & für wen", "Was benötigt wird";
filters "Zeitraum", "Beginn zwischen", "Frist vorbei", "Wiederkehrend", "Status", "Besetzung", "Mit Check-in",
"Objekt", "Stadt", "Eigentümer", "Nur Walk-in", "Beruf", "Benötigte Mitarbeiter", "Mindestbewertung ab",
staffingOptions "Niemand", "Zu wenig", "Voll", "Zu viel".

- [ ] **Step 2: `status-cell.tsx`** — dot + word; fill only for Running / Unstaffed / Overdue; tokens only:

```tsx
"use client";

import { useTranslations } from "next-intl";
import type { DerivedTaskStatus } from "@/lib/tasks/derived-status";
import { cn } from "@/lib/utils";

/** Design 04: colour is the exception. Only three states earn a fill. */
const TONE: Record<DerivedTaskStatus, { chip: string; dot: string }> = {
  Open: { chip: "text-muted-foreground", dot: "bg-muted-foreground/40" },
  Scheduled: { chip: "text-status-active", dot: "bg-status-active/50" },
  Running: { chip: "bg-status-active-tint px-2 text-status-active", dot: "bg-status-active" },
  Review: { chip: "text-status-pending-deep", dot: "bg-status-pending" },
  Disputed: { chip: "text-status-pending-deep", dot: "bg-status-pending" },
  Done: { chip: "text-muted-foreground/70", dot: "bg-status-active/30" },
  Unstaffed: { chip: "bg-status-cancelled-tint px-2 text-status-cancelled-deep", dot: "bg-status-cancelled" },
  Overdue: { chip: "bg-status-cancelled-tint px-2 text-status-cancelled-deep ring-1 ring-inset ring-status-cancelled/35", dot: "bg-status-cancelled-deep" },
  Cancelled: { chip: "text-muted-foreground/50", dot: "bg-muted-foreground/25" },
};

export function StatusCell({ status }: { status: DerivedTaskStatus }) {
  const t = useTranslations("tasks.register.status");
  const tone = TONE[status] ?? TONE.Open;
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-full text-xs font-semibold", tone.chip)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", tone.dot)} />
      {t(status)}
    </span>
  );
}
```

- [ ] **Step 3: `register-columns.tsx`** — a factory returning the six default columns + four picker columns.
  Column ids: `task`, `status`, `schedule`, `staffing`, `professions`, `action` (default on); `deadline`,
  `ratingFloor`, `created`, `taskId` (off by default — read `ColumnMeta` in `lib/ui/table-prefs.ts` for the
  field that marks a column hidden by default and the one that marks it fixed; `action` is fixed).
  Cells:
  - task: `<div class="flex min-w-0 flex-col gap-0.5">` title (`font-medium truncate`, `–` when null) +
    `Repeat` Lucide icon `size-3.5 text-muted-foreground` with `aria-label={t("repeating")}` when `row.repeating`;
    second line: `<span className="size-1.5 rounded-full" style={{ backgroundColor: propertyHue(row.task.propertyId) }} />`
    — ⚠ the one allowed inline colour, it is data-derived like `dispatch-task-row.tsx` does — then
    `row.task.propertyName ?? "–"` and `row.task.id.slice(0, 8)` in `font-mono text-[11px] text-muted-foreground`.
    compare: none.
  - status: `<StatusCell status={row.status} />`; compare `compareStatus`.
  - schedule: day label via `Intl.DateTimeFormat(locale, { weekday: "short", day: "2-digit", month: "short" })`
    of `new Date(row.startMs)` (or `–`), below it `font-mono text-xs` `${row.startTime}–${row.endTime ?? "…"}`;
    add `text-status-cancelled-deep` to both when `row.startsSoon`; compare `compareSchedule`.
  - staffing: `<StaffingPipMeter filled required urgent={row.unstaffedToday || row.startsSoon} size="sm" />` +
    `font-mono` `filled/required` + muted words: `over > 0 ? t("staffing.over", {count: over})` :
    `covered ? t("staffing.full")` : `filled === 0 ? t("staffing.none")` : `t("staffing.short", {count: gap})`;
    for `Done`/`Cancelled` render `–` instead; compare `compareStaffing`.
  - professions: first two `row.professionIds` as `<span className="inline-flex items-center gap-1 text-xs">`
    with a `size-1.5 rounded-full` dot coloured by `professionHue(name)` + name, then `+n` muted.
  - action: when `row.assignable`, `<Button size="sm" variant={row.unstaffedToday ? "default" : "outline"}
    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAssign(row); }}>` with `UserPlus` icon and
    `t("assign")`; wrap in `<Can permission="task:assign_worker_any">`. Otherwise nothing.
  - deadline: `font-mono` localized datetime of `row.task.deadline` or `–`.
  - ratingFloor: `font-mono` `≥ {n} ★` or `–`.
  - created: `font-mono` localized date of `row.createdAt` or `–`.
  - taskId: `font-mono text-xs` full id.

- [ ] **Step 4: `register-row-card.tsx`** — below 768 px (design 09): a card with title + repeat icon, property ·
  short id, then one line `StatusCell` · schedule · meter + fraction, and the Assign button when assignable (same
  handler, same `Can`). Follow `components/complaints/complaint-columns.tsx` `ComplaintRowCard` for structure.

- [ ] **Step 5: `register-strip.tsx`**

```tsx
"use client";

import { AlertTriangle, CalendarPlus, Clock, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { SummaryStrip, SummaryTile } from "@/components/ui/summary-strip";
import type { RegisterSummary } from "@/lib/tasks/register/summary";
import type { RegisterTab } from "@/lib/tasks/register/filters";

export function RegisterStrip({
  summary, isLoading, onPick,
}: {
  summary: RegisterSummary;
  isLoading: boolean;
  onPick: (target: RegisterTab | "overdue") => void;
}) {
  const t = useTranslations("tasks.register.strip");
  const total = summary.next7 + summary.overdue;
  return (
    <SummaryStrip label={t("label")} value={String(total)} isLoading={isLoading}>
      <SummaryTile icon={<AlertTriangle className="size-4" />} tone="critical" count={summary.unstaffedToday}
        title={t("unstaffed.title", { count: summary.unstaffedToday })} detail={t("unstaffed.detail")}
        action={t("unstaffed.action")} onClick={() => onPick("unstaffed")} />
      <SummaryTile icon={<UserPlus className="size-4" />} tone="warning" count={summary.short}
        title={t("short.title", { count: summary.short })} detail={t("short.detail")}
        action={t("short.action")} onClick={() => onPick("short")} />
      <SummaryTile icon={<Clock className="size-4" />} tone="neutral" count={summary.overdue}
        title={t("overdue.title", { count: summary.overdue })} detail={t("overdue.detail")}
        action={t("overdue.action")} onClick={() => onPick("overdue")} />
      <SummaryTile icon={<CalendarPlus className="size-4" />} tone="neutral" count={summary.next7}
        title={t("next7.title", { count: summary.next7 })} detail={t("next7.detail")}
        action={t("next7.action")} onClick={() => onPick("next7")} />
    </SummaryStrip>
  );
}
```

- [ ] **Step 6: `register-fields.ts`** — returns `{ fields, sections }` for the `DataTable` band:
  sections `when`, `state`, `where`, `needs` (titles from `tasks.register.sections`); fields:
  - `{ kind: "dateRange", section: "when", fromKey: "from", toKey: "to", label }`
  - `{ kind: "numberRange"… }` is for numbers; for time of day use two `select` fields `startAfter` /
    `startBefore` with options every hour `"06:00"…"22:00"` (label "Starts between" on the first, "and" hint on
    the second) — read `SelectField` in `filter-bar.tsx`.
  - `{ kind: "booleanGroup", section: "when", label: t("filters.overdue"), items: [{ key: "overdue", label: t("filters.overdue") }, { key: "repeating", label: t("filters.repeating") }] }`
    — a switch writes `"true"` or `""` (read `BooleanGroupField` in `filter-bar.tsx` to confirm the on value;
    `matchesRegister` compares `=== "true"`, adjust both if the band writes something else).
  - `{ kind: "multiSelect", section: "state", key: "status", options: the nine statuses }`
  - `{ kind: "multiSelect", section: "state", key: "staffing", options: none/short/full/over }`
  - `{ kind: "booleanGroup", section: "state", items: [{ key: "checkedIn", … }] }`
  - `{ kind: "multiSelect", section: "where", key: "property", searchable: true, options: properties }`
  - `{ kind: "select", section: "where", key: "city", options: the cities present in `lookups.cityByProperty`
    joined to `PropertyDto.city` names }`
  - `{ kind: "select", section: "where", key: "owner", options: owners }` (from `useOwnerDirectory()` — read its
    shape; if it needs a search term, pass `undefined` for all)
  - `{ kind: "booleanGroup", section: "where", items: [{ key: "walkIn", … }] }`
  - `{ kind: "multiSelect", section: "needs", key: "profession", options: professions }`
  - `{ kind: "numberRange", section: "needs", minKey: "reqMin", maxKey: "reqMax", label }`
  - `{ kind: "select", section: "needs", key: "ratingMin", options: ["3", "3.5", "4", "4.5"] }`

- [ ] **Step 7: Rewrite `app/[locale]/dashboard/tasks/page.tsx`** as a thin composition:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useTodayKey, useClock } from "@/hooks/use-today";
import { useDispatchQueue } from "@/hooks/use-tasks";
import { useTaskRegister } from "@/hooks/use-task-register";
import { useProfessions } from "@/hooks/use-professions";
import {
  DEFAULT_REGISTER_TAB, REGISTER_FILTER_KEYS, REGISTER_TABS, isCapped, matchesRegister,
  matchesSearch, resolveWindow, tabMatches, type RegisterTab,
} from "@/lib/tasks/register/filters";
import { registerSummary } from "@/lib/tasks/register/summary";
import type { RegisterRow } from "@/lib/tasks/register/rows";
import { registerColumns } from "@/components/tasks/register/register-columns";
import { RegisterRowCard } from "@/components/tasks/register/register-row-card";
import { RegisterStrip } from "@/components/tasks/register/register-strip";
import { registerFields } from "@/components/tasks/register/register-fields";
// Task 6 adds the assign sheet; Task 7 adds the calendar switch.

export default function TasksPage() {
  const t = useTranslations("tasks.register");
  const locale = useLocale();
  const todayKey = useTodayKey();
  const clock = useClock();
  const state = useTableUrlState({ filterKeys: [...REGISTER_FILTER_KEYS], defaultTab: DEFAULT_REGISTER_TAB });
  const window = useMemo(
    () => (todayKey ? resolveWindow(state.tab, state.filters, todayKey) : null),
    [state.tab, state.filters, todayKey],
  );
  // resolveWindow needs a real day; until the clock is known the hook gets a dummy
  // window and reports loading (useTaskRegister waits on the clock too).
  const register = useTaskRegister(window ?? resolveWindow(DEFAULT_REGISTER_TAB, {}, "2000-01-03"));
  const dispatch = useDispatchQueue();
  const professions = useProfessions();
  // `useClock()` is 0 on the server snapshot — count nothing rather than count against 1970.
  const summary = useMemo(
    () => (clock
      ? registerSummary(dispatch.data ?? [], new Date(clock))
      : { unstaffedToday: 0, short: 0, overdue: 0, next7: 0 }),
    [dispatch.data, clock],
  );
  const [assignRow, setAssignRow] = useState<RegisterRow | null>(null);

  // Read `useProfessions()`'s item shape (hooks/use-professions.ts) — use its display-name field.
  const professionName = (id: string) => professions.data?.find((p) => p.id === id)?.name ?? id;
  const columns = useMemo(
    () => registerColumns({ t, locale, professionName, onAssign: setAssignRow }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, locale, professions.data],
  );
  const tabRows = useMemo(
    () => register.rows.filter((r) => tabMatches(state.tab, r, todayKey)),
    [register.rows, state.tab, todayKey],
  );
  const tabs = REGISTER_TABS.map((value) => ({
    value, label: t(`tabs.${value}`),
    count: value === state.tab ? tabRows.length : undefined,
  }));
  const { fields, sections } = registerFields({ /* t, properties, owners, professions, lookups */ });

  function pick(target: RegisterTab | "overdue") {
    if (target === "overdue") { state.setTab("thisWeek"); state.setFilters({ overdue: "true", from: "", to: "" }); return; }
    state.setFilters({ from: "", to: "" });
    state.setTab(target);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <RegisterStrip summary={summary} isLoading={dispatch.isPending || !clock} onPick={pick} />
      {isCapped(register.count) ? <p className="text-xs text-muted-foreground">{t("capped")}</p> : null}
      <DataTable
        state={state}
        scope="tasks-register"
        title={t("title")}
        subtitle={t("subtitle")}
        columns={columns}
        rowKey={(r) => r.task.id}
        rowHref={(r) => `/dashboard/tasks/${r.task.groupId}`}
        rowLabel={(r) => r.title ?? r.task.propertyName ?? r.task.id}
        rowClassName={(r) => (r.unstaffedToday ? "border-l-2 border-l-status-cancelled" : undefined)}
        mobileCard={(r) => <RegisterRowCard row={r} onAssign={setAssignRow} />}
        tabs={tabs}
        tabsLabel={t("tabsLabel")}
        fields={fields}
        sections={sections}
        searchPlaceholder={t("search")}
        empty={{ title: t("empty.title"), body: t("empty.body") }}
        source={{
          mode: "client",
          rows: tabRows,
          isLoading: register.isLoading,
          isError: register.isError,
          isForbidden: register.isForbidden,
          matches: matchesSearch,
          filter: (row, values) => matchesRegister(row, values, register.lookups),
        }}
      />
    </div>
  );
}
```
Fill `registerFields({...})` with the real arguments from Step 6. Read `DataTable`'s `defaultSort` handling:
set `useTableUrlState({ defaultSort: { key: "schedule", dir: "asc" } })` using the `TableSort` shape in
`hooks/use-table-url-state.ts:35`. Check the shell's `rowClassName` rail pattern in the workers table and use
the same classes it uses for a left rail. The assign handler is wired in Task 6 — until then `setAssignRow`
only records the row.

- [ ] **Step 8: Verify** — `npx tsc --noEmit -p .`; `npx eslint app/[locale]/dashboard/tasks/page.tsx components/tasks/register`;
  `npx vitest run`; en/de parity (`node -e` key-diff like earlier tasks); open `/dashboard/tasks` at desktop and at
  375 px next to `../assets/Admin/Uyer Admin Tasks v2.dc.html` §01/§09 — strip, tabs, band, columns, row rail,
  mobile cards, loading/empty/no-match states.
- [ ] **Step 9: Commit**

```bash
git add app/[locale]/dashboard/tasks/page.tsx components/tasks/register messages/en.json messages/de.json
git commit -m "feat(tasks): the register list — one row per day, filter band, strip and saved views"
```

---

### Task 6: Assign on the row and the `/` · `N` keys

**Files:**
- Modify: `app/[locale]/dashboard/tasks/page.tsx`
- Create: `hooks/use-register-keys.ts`

**Interfaces:**
- Consumes: `AssignWorkerSheet` (`components/tasks/assign-worker-sheet.tsx` — props used by Dispatch:
  `task, propertyName, time, dateLabel, urgent, onClose, isPending, error, refusedWorkerId, onAssign`),
  `useAssignWorker()` (`hooks/use-tasks.ts`), `classifyAssignError` (`lib/tasks/assign-errors.ts`) and the
  `wordRefusal` mapping in `app/[locale]/dashboard/dispatch/page.tsx:~275-295` (copy that switch — four kinds:
  permission, catalog, legacy, unknown).
- Produces: `useRegisterKeys({ onSearch, onNext }: { onSearch: () => void; onNext: () => void }): void`.

- [ ] **Step 1: Wire Assign** — in the page, mount `AssignWorkerSheet` when `assignRow` is set, resolving the
  live task from `register.rows` by id (as Dispatch's `assignTarget` does), `urgent={assignRow.unstaffedToday}`,
  `dateLabel` = the schedule day label, `time={assignRow.startTime}`; `onAssign` sets `refusedWorkerId` then
  `assign.mutate({ taskId, workerId }, { onSuccess: close })`; `close` clears the row, the refused id and
  `assign.reset()`. Error text via the copied `wordRefusal` switch.
- [ ] **Step 2: `hooks/use-register-keys.ts`**

```ts
"use client";

import { useEffect } from "react";

/**
 * `/` focuses search, `N` opens Assign on the next unstaffed day (design 01 "Fast").
 * Ignored while typing or while a dialog is open. J/K/Enter/A row focus moves to
 * the Detail phase — the table shell does not expose its on-screen order.
 */
export function useRegisterKeys({ onSearch, onNext }: { onSearch: () => void; onNext: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === "/") { e.preventDefault(); onSearch(); }
      else if (e.key === "n" || e.key === "N") { e.preventDefault(); onNext(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSearch, onNext]);
}
```
- [ ] **Step 3: Use it** — `onSearch`: focus the table's search input (query `input[type="search"]` inside the
  table card, or the shell's search input — read `data-table.tsx` for an id/name to target); `onNext`: the first
  row of `register.rows` sorted by `compareSchedule` with `unstaffedToday` (else first `assignable`), then
  `setAssignRow(it)`.
- [ ] **Step 4: Verify** — tsc, eslint, vitest; browser: Assign from a row assigns and the row's meter moves
  (the register refetches through `invalidateTasks`); `/` and `N` work and do nothing while typing.
- [ ] **Step 5: Commit**

```bash
git add app/[locale]/dashboard/tasks/page.tsx hooks/use-register-keys.ts
git commit -m "feat(tasks): assign from a register row; / and N keys"
```

---

### Task 7: The calendar

**Files:**
- Create: `lib/tasks/register/week.ts`, `lib/tasks/register/week.test.ts`,
  `components/tasks/register/register-calendar.tsx`, `components/tasks/register/calendar-card.tsx`
- Modify: `app/[locale]/dashboard/tasks/page.tsx`, `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: `RegisterRow`, `weekOf`, `shiftWeek`, `Week` (`lib/ui/week.ts`), `compareSchedule`.
- Produces:
  ```ts
  export type CardTone = "running" | "scheduled" | "open" | "unstaffed" | "overdue" | "review" | "closed";
  export function cardTone(row: RegisterRow): CardTone;
  export interface CalendarDay { key: string; isToday: boolean; rows: RegisterRow[]; count: number; short: number }
  export function buildCalendarDays(rows: RegisterRow[], week: Week, todayKey: string): CalendarDay[];
  ```

- [ ] **Step 1: Failing test** — `lib/tasks/register/week.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { buildCalendarDays, cardTone } from "@/lib/tasks/register/week";
import { weekOf } from "@/lib/ui/week";
import type { RegisterRow } from "@/lib/tasks/register/rows";

const r = (over: Partial<RegisterRow>) => ({ dayKey: "2026-09-21", startMs: 1, status: "Open", assignable: false,
  staffing: { filled: 1, required: 1, gap: 0, covered: true }, ...over }) as RegisterRow;

describe("buildCalendarDays", () => {
  const week = weekOf("2026-09-21", "2026-09-23");
  it("lays seven days, today flagged, rows sorted by start", () => {
    const days = buildCalendarDays([r({ startMs: 9 }), r({ startMs: 3 }), r({ dayKey: "2026-09-23" })], week, "2026-09-23");
    expect(days).toHaveLength(7);
    expect(days[0].rows.map((x) => x.startMs)).toEqual([3, 9]);
    expect(days[2].isToday).toBe(true);
    expect(days[2].count).toBe(1);
  });
  it("sums the shortfall of the open days only", () => {
    const days = buildCalendarDays([
      r({ assignable: true, staffing: { filled: 0, required: 2, gap: 2, covered: false } }),
      r({ assignable: false, status: "Cancelled", staffing: { filled: 0, required: 3, gap: 3, covered: false } }),
    ], week, "2026-09-23");
    expect(days[0].short).toBe(2);
  });
  it("drops rows outside the week", () => {
    expect(buildCalendarDays([r({ dayKey: "2026-09-30" })], week, "2026-09-23").every((d) => d.count === 0)).toBe(true);
  });
});

describe("cardTone", () => {
  it("maps the statuses to the design's card tints", () => {
    expect(cardTone(r({ status: "Running" }))).toBe("running");
    expect(cardTone(r({ status: "Unstaffed" }))).toBe("unstaffed");
    expect(cardTone(r({ status: "Done" }))).toBe("closed");
    expect(cardTone(r({ status: "Cancelled" }))).toBe("closed");
    expect(cardTone(r({ status: "Disputed" }))).toBe("review");
  });
});
```

- [ ] **Step 2: Run** — FAIL (module missing).
- [ ] **Step 3: Implement** — `lib/tasks/register/week.ts`

```ts
import { compareSchedule } from "@/lib/tasks/register/sort";
import type { RegisterRow } from "@/lib/tasks/register/rows";
import type { Week } from "@/lib/ui/week";

export type CardTone = "running" | "scheduled" | "open" | "unstaffed" | "overdue" | "review" | "closed";

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
```

- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: `calendar-card.tsx`** — a `Link` to `/dashboard/tasks/{groupId}` styled by tone (tokens):
  `running` `bg-status-active-tint text-status-active`; `scheduled` `bg-accent/60 text-accent-foreground`;
  `open` `bg-muted text-foreground`; `unstaffed` `bg-status-cancelled-tint text-status-cancelled-deep`;
  `overdue` `bg-card ring-1 ring-inset ring-status-cancelled/45 text-status-cancelled-deep`; `review`
  `bg-status-pending-tint text-status-pending-deep`; `closed` `bg-card ring-1 ring-inset ring-border
  text-muted-foreground opacity-70`. Content: `font-mono text-[11px]` time; title + ` · {durationH} h` (when
  known); property dot (`propertyHue`) + name; `font-mono` `filled/required`. `rounded-[10px] p-2 text-xs`.
- [ ] **Step 6: `register-calendar.tsx`** — props `{ rows: RegisterRow[]; weekStartKey: string; todayKey: string;
  onWeek: (startKey: string) => void }`. Desktop (`md:` and up): header with ‹ `This week` › (buttons call
  `onWeek(shiftWeek(start, ±1))` / `onWeek(weekOf(todayKey, todayKey).startKey)`), the range label
  (`weekRangeLabel`), "N tasks in view · M short"; a `grid grid-cols-7` of columns — header weekday + date
  (today's date in a forest pill: `bg-primary text-primary-foreground rounded-full`), "N tasks", and a chip
  `M short` (`Badge tone="warning"`) or `all covered` (`Badge tone="success"`); cards stacked with `gap-1.5`;
  today's column `bg-accent/40`. Legend below: one small swatch per tone. Below `md`: one day at a time with
  ‹ › day buttons (local state for the selected day, defaulting to today inside the week), the line
  "Tue 01 Sep · 6 tasks · 4 short", and the cards stacked.
  Messages under `tasks.register.calendar`: `thisWeek` "This week" / "Diese Woche"; `inView` "{count} tasks in
  view · {short} short" / "{count} Aufgaben sichtbar · {short} fehlen"; `dayCount` "{count, plural, one {# task}
  other {# tasks}}" / "{count, plural, one {# Aufgabe} other {# Aufgaben}}"; `short` "{count} short" /
  "{count} fehlen"; `covered` "all covered" / "alles besetzt"; `legend` tone labels (reuse
  `tasks.register.status.*`); `prevWeek`/`nextWeek`/`prevDay`/`nextDay` aria labels.
- [ ] **Step 7: Page switch** — a List/Calendar toggle in `DataTable`'s `actions` slot, held in the URL as
  `?view=calendar` (read with `useSearchParams`, write with `router.replace` — or a `useTableUrlState` filter key
  `view`; prefer adding `"view"` and `"week"` to `REGISTER_FILTER_KEYS` so one mechanism owns the URL). In
  calendar mode: `week` param (Monday key) drives the date range — when it is set, pass
  `{ ...state.filters, from: weekStart, to: weekEnd }` to `resolveWindow`; render `RegisterCalendar` with the
  **filtered** rows (apply `tabMatches`, `matchesSearch` for `state.search`, and `matchesRegister` yourself,
  since the calendar is not inside `DataTable`) instead of the table body. Keep the strip and the filter band
  visible (render the band via the `DataTable` `toolbar` override only if needed — first try keeping `DataTable`
  mounted with `source.rows` and hiding its body; if the shell cannot hide its body, render `FilterBar
  variant="band"` directly above the calendar with the same `fields`/`sections`/`state`).
- [ ] **Step 8: Verify** — tsc, eslint, vitest, parity; browser at desktop and 375 px against design §02/§09:
  week switching, today tint, day chips, card tones, legend, filters narrowing the calendar, List↔Calendar keeping
  the same set.
- [ ] **Step 9: Commit**

```bash
git add lib/tasks/register/week.ts lib/tasks/register/week.test.ts components/tasks/register/register-calendar.tsx components/tasks/register/calendar-card.tsx app/[locale]/dashboard/tasks/page.tsx messages/en.json messages/de.json
git commit -m "feat(tasks): the register's week calendar over the same filtered set"
```

---

### Task 8: Clean-up, ledger, full verification

**Files:**
- Modify: `messages/en.json`, `messages/de.json` (remove now-unused `tasks.list.*` keys only if nothing else
  reads them — grep first), `BACKEND-REVISIONS.md` (§4 pass entry), `lib/types/task.types.ts` (drop
  `TASK_GROUP_STATUS_FILTERS` only if unused — grep)
- Keep: `components/tasks/tasks-calendar.tsx` (Owner Detail still uses it — grep `TasksCalendar` to confirm)

- [ ] **Step 1: Remove dead code** — grep for every import the old `tasks/page.tsx` had (`groupBucket`,
  `TaskDaysBadge`, `TASK_GROUP_STATUS_FILTERS`, `tasks.list.*`) and delete only what has no other reader.
- [ ] **Step 2: Ledger** — add a `### 2026-09-27 — the Tasks register (v2 list + calendar)` entry to
  `BACKEND-REVISIONS.md` §4 in the table style of the other entries: data approach, what is client-side, the
  design deltas (no Updated/Owner/City columns, no Owner type, no Export/New task, J/K/Enter/A deferred).
- [ ] **Step 3: Full verification** — `npx tsc --noEmit -p .`, `npm run lint`, `npx vitest run`,
  `node scripts/verify-v2.mjs`, `npm run build`; browser pass of List and Calendar at 1440 px and 375 px next to
  the design file.
- [ ] **Step 4: Commit**

```bash
git add BACKEND-REVISIONS.md messages/en.json messages/de.json lib/types/task.types.ts
git commit -m "chore(tasks): drop the old booking table; ledger for the register"
```
