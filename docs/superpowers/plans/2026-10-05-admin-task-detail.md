# Admin Task Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/dashboard/tasks/{groupId}` onto the v2 Task Detail design: a header card, a day rail, a days
list and the selected-day panel, with the selected day in `?day=`. Every visibility rule lives in tested
`lib/tasks/detail/` functions.

**Architecture:** This is a re-layout of an existing, working page. Every dialog, mutation hook and existing guard
(`canForceClose`, `canOverrideSupervisor`, `outcomeChoices`, `canRateTeam`, `closureTally`, `isGroupActive`,
`isWalkInSource`) is reused unchanged. The new decisions are pure functions in `lib/tasks/detail/`, tested with
vitest: which day opens, the chip, note, timeline and alert, which buttons show, and the header facts. Thin
components in `components/tasks/detail/` render them. The page shrinks to reads, selection and layout.

**Tech Stack:** Next 16 App Router (client page), TanStack Query, next-intl (`en`/`de`), shadcn `base-nova` on
`@base-ui/react` (not Radix), Tailwind v4 tokens, Lucide, vitest (`node` env).

**Spec:** `docs/superpowers/specs/2026-10-05-admin-task-detail-design.md`. Read it first; this plan argues from it.

## Global Constraints

- Colours are **tokens only**: `bg-status-*-tint`, `text-status-*-deep`, `text-primary`, `bg-muted`… No hex, no
  Tailwind palette (`text-blue-500`), no inline `style` colour.
- Status is a **tinted chip**, never a solid fill. Solid forest (`variant="default"` Button) is used only for the
  **one** primary action per section.
- Numbers, times, IDs and counts use `font-mono tabular-nums`.
- UPPERCASE only through the `overline-label` utility (11px). Everything else is sentence case.
- Icons are Lucide only. An icon that carries meaning sits in a tinted tile (`size-9 rounded-[10px]`). No emoji.
- **One badge per row.** An empty cell shows `–`.
- Loading is a skeleton at real height, never a spinner.
- Below 768px: stacked cards instead of tables, and **no horizontal scroll**.
- `messages/en.json` and `messages/de.json` stay **key-for-key identical**. Every string change edits both.
- No enum is exhaustive: day state (`canonicalTaskStatus` → `null`), `closureReason` and `kind` all keep a
  verbatim or neutral default branch.
- `closureReason == null` is **never** read as "accepted".
- `ownerProvidesTools == null` reads "Not specified", never "No".
- An empty-bodied `403` means permissions (`isPermissionDenied`), never onboarding.
- **Times:** every time printed comes from the UTC instants (`scheduledAt`, `deadline`, `startedAt`,
  `completedAt`, `complaint.*At`) in the viewer's local zone. The group's wall-clock `defaultStartTime` and
  `defaultDeadline` are **never printed** (spec §4).
- Nothing the backend doesn't send is invented: no force-close reason, no close time for `OwnerAccepted` or
  `ClosedForced`, no cancel date or actor (spec §2).
- Base-UI `Button` used as a link: `nativeButton={false}` + `render={<Link …/>}`. Sizes: `sm`, `icon-sm`.
  Variants: `default`, `outline`, `ghost`, `destructive`.
- Test command: `npx vitest run <file>`. Typecheck: `npx tsc --noEmit`. Lint: `npm run lint`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Spec refinements made while planning

Two changes **narrow spec §6** to the design's state sheet. Both come from reading the guards against the design:

1. **Change supervisor** shows only on `checkedIn` / `inReview`. The spec said `canOverrideSupervisor`, which is
   also true on `pending` and on an unknown state. The design shows only Assign on Pending (1a–1c) and says
   *"Supervisor stays empty — it's set at first check-in, never by default."*
2. **Force close** shows only on `checkedIn` / `inReview`. `canForceClose` is also true on `pending`, but the
   design doesn't offer it there. A pending day past its start cancels itself at window end (§0d), and
   force-closing one marks everyone a no-show. Pending days keep Assign only.

Also: spec §11 asked to add contract lines to `scripts/verify-v2.mjs`. **Every field this screen reads is
already gated there** (`TaskItemDto`, `TaskGroupDto`, `TaskWorkerDto.checkinDoor`, `PropertyDto.address/city`,
`TaskComplaintDto`), so Task 10 only runs it.

## Review Focus

1. **A `?day=` that is not in this booking** (a stale bell link, or a booking re-cut after a cancel) must fall back
   to the default day, not render an empty panel. Covered by a test in Task 1.
2. **The clock before it is known.** `useLiveClock()` is `0` on the server pass, and with `now = 0` no "late" or
   "start passed" verdict may fire. Covered by tests in Tasks 1 and 3.
3. **A booking where every day is cancelled.** The time-window fact must still render from the cancelled days
   rather than say nothing, and the "nothing left to run" notice must show. Covered by a test in Task 5.
4. **`requiredWorkerCount` of `0`, or below the assigned count** (a `PATCH` can lower the limit under the
   assigned count). There must be no negative open slots, and the alert must say "Ready", not "No workers".
   Covered by tests in Tasks 3 and 4.
5. **A worker with no `workerName`.** The late-arrival names and the rows must fall back to the first 8
   characters of the id, never `null`. Covered by a test in Task 3.

---

## File structure

**Create — pure logic, each with a `.test.ts` next to it:**
- `lib/tasks/detail/fixtures.ts`: test-only builders. Not a test file, so vitest doesn't run it; only tests
  import it.
- `lib/tasks/detail/day-time.ts`: the time constants (5 h auto-accept, 8 h window), instant parsing,
  window end, lateness, and the formatters.
- `lib/tasks/detail/select-day.ts`: `sortDays`, `pickDefaultDay`, `resolveSelectedDay`.
- `lib/tasks/detail/day-view.ts`: `dayTone`, `dayNote`, `dayStaffing`, `closureLabel`, `daySteps`.
- `lib/tasks/detail/day-alert.ts`: `dayAlert`. Split out of `day-view.ts` (where the spec listed it) because it
  has the most branches.
- `lib/tasks/detail/day-actions.ts`: `dayActions`, `rowActions`, `openSlots`, `isClosedDay`.
- `lib/tasks/detail/booking-facts.ts`: `isSingleDay`, `legendCounts`, `isNothingLeftToRun`, `windowFact`,
  `workersFact`, `datesFact`, `headerPlace`.
- `lib/tasks/detail/page-state.ts`: `classifyGroupLoad`.

**Create — components:**
- `components/tasks/detail/day-state-chip.tsx`: the tone map and chip.
- `components/tasks/detail/day-timeline.tsx`, `day-alert.tsx`, `day-workers.tsx`, `day-panel.tsx`.
- `components/tasks/detail/day-rail.tsx`, `days-list.tsx`, `detail-header-card.tsx`.
- `components/tasks/detail/detail-page-state.tsx`: skeleton and failure states.
- `components/tasks/detail/detail-modals.tsx`: the modal switch and mutations, moved out of the page.

**Modify:**
- `app/[locale]/dashboard/tasks/[id]/page.tsx`: rewritten as wiring.
- `app/[locale]/dashboard/tasks/day/[taskId]/page.tsx`: the redirect gains `?day=`.
- `hooks/use-complaints.ts`: `useTaskRead` gains an `enabled` parameter.
- `messages/en.json`, `messages/de.json`: `tasks.detail` replaced.
- `BACKEND-ASKS.md`, `BACKEND-REVISIONS.md`.

---

### Task 1: Time helpers and default-day selection

**Files:**
- Create: `lib/tasks/detail/fixtures.ts`
- Create: `lib/tasks/detail/day-time.ts`
- Create: `lib/tasks/detail/select-day.ts`
- Test: `lib/tasks/detail/day-time.test.ts`, `lib/tasks/detail/select-day.test.ts`

**Interfaces:**
- Consumes: `activeWorkers` (`lib/tasks/staffing.ts`), `canonicalTaskStatus` (`lib/tasks/status-vocab.ts`),
  `toLocalDateKey` (`lib/tasks/weekly-rows.ts`).
- Produces:
  - `HOUR_MS`, `AUTO_ACCEPT_MS`, `DEFAULT_WINDOW_MS`: `number`
  - `instant(iso: string | null | undefined): number | null`
  - `windowEndAt(task: Pick<TaskItemDto,"scheduledAt"|"deadline">): number | null`
  - `autoAcceptAt(task: Pick<TaskItemDto,"completedAt">): number | null`
  - `localMinuteOfDay(ms: number): number`
  - `lateWorkers(task: TaskItemDto, now: number): TaskWorkerDto[]`
  - `isStartPassed(task: TaskItemDto, now: number): boolean`
  - `workerLabel(w: Pick<TaskWorkerDto,"workerName"|"workerId">): string`
  - `formatHm(ms: number, locale: string): string`
  - `formatDayLong(key: string, locale: string): string`
  - `formatDayParts(key: string, locale: string): { wd: string; dd: string }`
  - `formatDateTime(iso: string | null, locale: string): string`
  - `sortDays(tasks: TaskItemDto[]): TaskItemDto[]`
  - `pickDefaultDay(tasks: TaskItemDto[], now: number, todayKey: string): string | null`
  - `resolveSelectedDay(tasks: TaskItemDto[], dayParam: string | null, now: number, todayKey: string): TaskItemDto | null`
  - Fixtures: `worker()`, `day()`, `booking()`, `complaint()`, `at()`

- [ ] **Step 1: Write the fixtures**

`lib/tasks/detail/fixtures.ts`:

```ts
import type {
  TaskComplaintDto,
  TaskGroupDto,
  TaskItemDto,
  TaskWorkerDto,
} from "@/lib/types/task.types";

/**
 * Test-only builders for `lib/tasks/detail/*.test.ts`. Not a `.test.ts`, so
 * vitest never runs it; no app code imports it.
 *
 * ⚠ Times are written WITHOUT a zone ("2026-10-05T08:00:00"), so they parse as
 * LOCAL time and every assertion about "08:00" or "minutes past start" holds in
 * whatever zone the test runner uses. The server sends `…Z`; the app renders in
 * local time, so local fixtures test what the admin sees.
 */
export const at = (local: string): number => new Date(local).getTime();

export function worker(over: Partial<TaskWorkerDto> = {}): TaskWorkerDto {
  return {
    id: "tw-1",
    taskId: "t-1",
    workerId: "w-1aaaaaaaaaaaa",
    workerName: "Sardor Aliyev",
    outcome: "Pending",
    starRating: null,
    assignedAt: "2026-09-24T10:00:00",
    checkinAt: null,
    submittedAt: null,
    checkoutAt: null,
    checkinLat: null,
    checkinLng: null,
    checkinDoor: null,
    ...over,
  };
}

export function day(over: Partial<TaskItemDto> = {}): TaskItemDto {
  return {
    id: "t-1",
    groupId: "g-1",
    propertyId: "p-1",
    propertyName: "Torstraße 88",
    scheduledDate: "2026-10-05",
    scheduledAt: "2026-10-05T08:00:00",
    deadline: "2026-10-05T12:00:00",
    status: "Pending",
    requiredWorkerCount: 3,
    startedAt: null,
    completedAt: null,
    closureReason: null,
    supervisorWorkerId: null,
    workSummary: null,
    workers: [],
    ...over,
  };
}

export function booking(over: Partial<TaskGroupDto> = {}): TaskGroupDto {
  return {
    id: "g-1",
    propertyId: "p-1",
    ownerId: "o-1",
    title: "Office cleaning · Torstraße 88",
    defaultStartTime: "08:00:00",
    defaultDeadline: "12:00:00",
    instructions: "Key box at the side entrance.",
    days: { total: 1, pending: 1, checkedIn: 0, inReview: 0, done: 0, cancelled: 0, rejected: 0 },
    ratingFloor: 4,
    allowNewWorkers: true,
    eligibleProfessionIds: [],
    dates: [],
    tasks: [day()],
    createdAt: "2026-09-24T10:12:00",
    kind: "Booking",
    ownerProvidesTools: true,
    addOnNote: null,
    cityId: null,
    ...over,
  };
}

export function complaint(over: Partial<TaskComplaintDto> = {}): TaskComplaintDto {
  return {
    id: "c-1",
    taskId: "t-1",
    raisedByOwnerUserId: "o-1",
    reason: "Kitchen floor left wet and sticky.",
    raisedAt: "2026-10-02T13:40:00",
    decision: "Open",
    decidedByAdminId: null,
    decidedAt: null,
    decisionNote: null,
    supportTicketId: null,
    photos: [],
    ...over,
  };
}
```

- [ ] **Step 2: Write the failing tests for `day-time.ts`**

`lib/tasks/detail/day-time.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  AUTO_ACCEPT_MS,
  DEFAULT_WINDOW_MS,
  autoAcceptAt,
  instant,
  isStartPassed,
  lateWorkers,
  localMinuteOfDay,
  windowEndAt,
  workerLabel,
} from "@/lib/tasks/detail/day-time";
import { at, day, worker } from "@/lib/tasks/detail/fixtures";

describe("instant", () => {
  it("reads null, empty and unparseable as null", () => {
    expect(instant(null)).toBeNull();
    expect(instant("")).toBeNull();
    expect(instant("not a date")).toBeNull();
  });
  it("parses an ISO string", () => {
    expect(instant("2026-10-05T08:00:00")).toBe(at("2026-10-05T08:00:00"));
  });
});

describe("windowEndAt — task-lifecycle.md §0d", () => {
  it("is the deadline when there is one", () => {
    expect(windowEndAt(day())).toBe(at("2026-10-05T12:00:00"));
  });
  it("is 8 hours after the start without a deadline", () => {
    expect(windowEndAt(day({ deadline: null }))).toBe(at("2026-10-05T08:00:00") + DEFAULT_WINDOW_MS);
  });
});

describe("autoAcceptAt", () => {
  it("is hand-in + 5 h", () => {
    expect(autoAcceptAt(day({ completedAt: "2026-10-05T11:52:00" }))).toBe(
      at("2026-10-05T11:52:00") + AUTO_ACCEPT_MS,
    );
  });
  it("is null before hand-in", () => {
    expect(autoAcceptAt(day())).toBeNull();
  });
});

describe("localMinuteOfDay", () => {
  it("counts minutes from local midnight", () => {
    expect(localMinuteOfDay(at("2026-10-05T08:30:00"))).toBe(510);
  });
});

describe("lateWorkers", () => {
  const live = day({
    status: "CheckedIn",
    startedAt: "2026-10-05T08:02:00",
    workers: [
      worker({ id: "a", checkinAt: "2026-10-05T08:02:00" }),
      worker({ id: "b", workerName: "Jamshid Tursunov", checkinAt: null }),
      worker({ id: "c", outcome: "Removed", checkinAt: null }),
    ],
  });

  it("names the active workers not checked in once the start has passed", () => {
    expect(lateWorkers(live, at("2026-10-05T08:34:00")).map((w) => w.id)).toEqual(["b"]);
  });
  it("is empty before the start", () => {
    expect(lateWorkers(live, at("2026-10-05T07:59:00"))).toEqual([]);
  });
  it("is empty while the clock is unknown (0)", () => {
    expect(lateWorkers(live, 0)).toEqual([]);
  });
  it("is empty on any state but CheckedIn", () => {
    expect(lateWorkers({ ...live, status: "InReview" }, at("2026-10-05T09:00:00"))).toEqual([]);
  });
  it("reads the legacy word Active as CheckedIn", () => {
    expect(lateWorkers({ ...live, status: "Active" }, at("2026-10-05T09:00:00"))).toHaveLength(1);
  });
});

describe("isStartPassed", () => {
  it("is true for a Pending day after its start", () => {
    expect(isStartPassed(day(), at("2026-10-05T08:01:00"))).toBe(true);
  });
  it("is false before the start, on other states, and with no clock", () => {
    expect(isStartPassed(day(), at("2026-10-05T07:00:00"))).toBe(false);
    expect(isStartPassed(day({ status: "CheckedIn" }), at("2026-10-05T09:00:00"))).toBe(false);
    expect(isStartPassed(day(), 0)).toBe(false);
  });
});

describe("workerLabel", () => {
  it("falls back to the id's first 8 characters", () => {
    expect(workerLabel(worker({ workerName: null, workerId: "abcdef0123456" }))).toBe("abcdef01");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run lib/tasks/detail/day-time.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/tasks/detail/day-time"`.

- [ ] **Step 4: Implement `day-time.ts`**

`lib/tasks/detail/day-time.ts`:

```ts
import { activeWorkers } from "@/lib/tasks/staffing";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import type { TaskItemDto, TaskWorkerDto } from "@/lib/types/task.types";

export const HOUR_MS = 3_600_000;

/** `task-lifecycle.md` §0d — a handed-in day nobody reviews accepts itself after five hours. */
export const AUTO_ACCEPT_MS = 5 * HOUR_MS;

/** §0d — "the work window" ends at the day's `deadline`, or 8 hours after its start. */
export const DEFAULT_WINDOW_MS = 8 * HOUR_MS;

/** An ISO instant as epoch ms, or `null` for absent or unparseable. */
export function instant(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

export function windowEndAt(task: Pick<TaskItemDto, "scheduledAt" | "deadline">): number | null {
  const end = instant(task.deadline);
  if (end !== null) return end;
  const start = instant(task.scheduledAt);
  return start === null ? null : start + DEFAULT_WINDOW_MS;
}

/**
 * When an `InReview` day accepts itself. ⚠ Approximate: the job ticks every
 * 5 minutes (§0d), so the UI always words it "about"/"≈".
 */
export function autoAcceptAt(task: Pick<TaskItemDto, "completedAt">): number | null {
  const handed = instant(task.completedAt);
  return handed === null ? null : handed + AUTO_ACCEPT_MS;
}

/** Minutes since local midnight — compares two days' windows by wall clock. */
export function localMinuteOfDay(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Active workers not checked in on a `CheckedIn` day whose start has passed —
 * design 2a. ⚠ Never a No-show verdict: marking one is an admin decision.
 * `now === 0` is the unknown server-pass clock and decides nothing.
 */
export function lateWorkers(task: TaskItemDto, now: number): TaskWorkerDto[] {
  if (now <= 0) return [];
  if (canonicalTaskStatus(task.status) !== "checkedIn") return [];
  const start = instant(task.scheduledAt);
  if (start === null || now <= start) return [];
  return activeWorkers(task).filter((w) => !w.checkinAt);
}

/**
 * A `Pending` day whose start has passed and nobody has checked in. Not in the
 * design; it is the §0d timer state, where the day cancels itself at window end.
 */
export function isStartPassed(task: TaskItemDto, now: number): boolean {
  if (now <= 0) return false;
  if (canonicalTaskStatus(task.status) !== "pending") return false;
  const start = instant(task.scheduledAt);
  return start !== null && now > start;
}

export function workerLabel(w: Pick<TaskWorkerDto, "workerName" | "workerId">): string {
  return w.workerName?.trim() || w.workerId.slice(0, 8);
}

export function formatHm(ms: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(ms);
}

/** `"yyyy-MM-dd"` → a local Date at midnight. `scheduledDate` is a local calendar date. */
function dateFromKey(key: string): Date | null {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** "Tue, 29 Sep 2026". */
export function formatDayLong(key: string, locale: string): string {
  const d = dateFromKey(key);
  if (!d) return key;
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** `{ wd: "Tue", dd: "29" }` for the rail and the days list. */
export function formatDayParts(key: string, locale: string): { wd: string; dd: string } {
  const d = dateFromKey(key);
  if (!d) return { wd: "", dd: key };
  return {
    wd: new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d),
    dd: String(d.getDate()).padStart(2, "0"),
  };
}

export function formatDateTime(iso: string | null, locale: string): string {
  const t = instant(iso);
  if (t === null) return "–";
  return new Date(t).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run lib/tasks/detail/day-time.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing tests for `select-day.ts`**

`lib/tasks/detail/select-day.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { pickDefaultDay, resolveSelectedDay, sortDays } from "@/lib/tasks/detail/select-day";
import { at, day, worker } from "@/lib/tasks/detail/fixtures";

const NOW = at("2026-10-05T09:00:00");
const TODAY = "2026-10-05";

const done = day({ id: "d29", scheduledDate: "2026-09-29", scheduledAt: "2026-09-29T08:00:00", status: "Done" });
const disputed = day({ id: "d02", scheduledDate: "2026-10-02", scheduledAt: "2026-10-02T08:00:00", status: "Rejected" });
const review = day({ id: "d03", scheduledDate: "2026-10-03", scheduledAt: "2026-10-03T08:00:00", status: "InReview" });
const todayLate = day({
  id: "d05",
  status: "CheckedIn",
  workers: [worker({ checkinAt: null })],
});
const todayOk = day({ id: "d05", status: "Pending" });
const next = day({ id: "d06", scheduledDate: "2026-10-06", scheduledAt: "2026-10-06T08:00:00" });

describe("sortDays", () => {
  it("orders by scheduledDate without touching the input", () => {
    const input = [next, done];
    expect(sortDays(input).map((t) => t.id)).toEqual(["d29", "d06"]);
    expect(input.map((t) => t.id)).toEqual(["d06", "d29"]);
  });
});

describe("pickDefaultDay — spec §3", () => {
  it("opens a disputed day first", () => {
    expect(pickDefaultDay([done, todayLate, disputed, next], NOW, TODAY)).toBe("d02");
  });
  it("then a late checked-in day", () => {
    expect(pickDefaultDay([done, review, todayLate, next], NOW, TODAY)).toBe("d05");
  });
  it("then an in-review day", () => {
    expect(pickDefaultDay([done, review, todayOk, next], NOW, TODAY)).toBe("d03");
  });
  it("then today", () => {
    expect(pickDefaultDay([done, todayOk, next], NOW, TODAY)).toBe("d05");
  });
  it("then the next upcoming day", () => {
    expect(pickDefaultDay([done, next], NOW, TODAY)).toBe("d06");
  });
  it("then the last day", () => {
    expect(pickDefaultDay([done], NOW, TODAY)).toBe("d29");
  });
  it("skips today/next while the date is unknown, landing on the last day", () => {
    expect(pickDefaultDay([todayOk, next], 0, "")).toBe("d06");
  });
  it("answers null for no days", () => {
    expect(pickDefaultDay([], NOW, TODAY)).toBeNull();
  });
});

describe("resolveSelectedDay", () => {
  it("honours a ?day= that belongs to the booking", () => {
    expect(resolveSelectedDay([done, next], "d29", NOW, TODAY)?.id).toBe("d29");
  });
  it("falls back to the default for a ?day= not in the booking", () => {
    expect(resolveSelectedDay([done, next], "stale-id", NOW, TODAY)?.id).toBe("d06");
  });
  it("is null with no days", () => {
    expect(resolveSelectedDay([], "d29", NOW, TODAY)).toBeNull();
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npx vitest run lib/tasks/detail/select-day.test.ts`
Expected: FAIL — cannot resolve `@/lib/tasks/detail/select-day`.

- [ ] **Step 8: Implement `select-day.ts`**

`lib/tasks/detail/select-day.ts`:

```ts
import { lateWorkers } from "@/lib/tasks/detail/day-time";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import type { TaskItemDto } from "@/lib/types/task.types";

export function sortDays(tasks: TaskItemDto[]): TaskItemDto[] {
  return [...tasks].sort(
    (a, b) =>
      a.scheduledDate.localeCompare(b.scheduledDate) ||
      a.scheduledAt.localeCompare(b.scheduledAt),
  );
}

/**
 * The day the panel opens on when `?day=` names none — spec §3, needs-attention
 * first: disputed → late check-in → in review → today → next upcoming → last.
 * `todayKey === ""` (no clock yet) skips the two date rungs.
 */
export function pickDefaultDay(
  tasks: TaskItemDto[],
  now: number,
  todayKey: string,
): string | null {
  const days = sortDays(tasks);
  if (days.length === 0) return null;
  const find = (p: (t: TaskItemDto) => boolean) => days.find(p)?.id;
  return (
    find((t) => canonicalTaskStatus(t.status) === "rejected") ??
    find((t) => lateWorkers(t, now).length > 0) ??
    find((t) => canonicalTaskStatus(t.status) === "inReview") ??
    (todayKey ? find((t) => t.scheduledDate === todayKey) : undefined) ??
    (todayKey ? find((t) => t.scheduledDate > todayKey) : undefined) ??
    days[days.length - 1].id
  );
}

/** `?day=` when it names a day of this booking, else the default. */
export function resolveSelectedDay(
  tasks: TaskItemDto[],
  dayParam: string | null,
  now: number,
  todayKey: string,
): TaskItemDto | null {
  const hit = dayParam ? tasks.find((t) => t.id === dayParam) : undefined;
  if (hit) return hit;
  const id = pickDefaultDay(tasks, now, todayKey);
  return tasks.find((t) => t.id === id) ?? null;
}
```

- [ ] **Step 9: Run both tests to verify they pass**

Run: `npx vitest run lib/tasks/detail`
Expected: PASS (both files).

- [ ] **Step 10: Commit**

```bash
git add lib/tasks/detail/fixtures.ts lib/tasks/detail/day-time.ts lib/tasks/detail/day-time.test.ts lib/tasks/detail/select-day.ts lib/tasks/detail/select-day.test.ts
git commit -m "feat(tasks): detail time helpers and needs-attention default day

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Day chip, note, staffing and timeline

**Files:**
- Create: `lib/tasks/detail/day-view.ts`
- Test: `lib/tasks/detail/day-view.test.ts`

**Interfaces:**
- Consumes: from Task 1, `instant`, `autoAcceptAt`, `lateWorkers`, `isStartPassed`. Also `activeWorkers`,
  `canonicalTaskStatus`, `TaskStateKey`.
- Produces:
  - `type DayTone = TaskStateKey | "unknown"`; `dayTone(task): DayTone`
  - `type NoteTone = "muted" | "warning" | "danger"`
  - `interface DayNote { key: "unfilled"|"fullyStaffed"|"startPassed"|"late"|"onSite"|"waitingOwner"|"disputed"|"closure"|"noReason"|"cancelled"|"none"; tone: NoteTone; count?: number; at?: number | null; reason?: string }`
  - `dayNote(task, now): DayNote`
  - `dayStaffing(task): { filled: number; required: number; tone: NoteTone } | null`
  - `type Label = { key: string } | { raw: string }`; `closureLabel(reason: string | null): Label`
  - `type StepState = "ok"|"current"|"todo"|"bad"|"badOpen"|"skip"|"cancel"|"off"`
  - `type StepTime = { kind: "at"; at: number } | { kind: "about"; at: number } | { kind: "auto"; at: number } | { kind: "beforeStart" } | { kind: "skipped" } | { kind: "none" }`
  - `interface DayStep { label: Label; state: StepState; time: StepTime }`
  - `daySteps(task, complaint: TaskComplaintDto | null | undefined): DayStep[]` (always 4 entries)

- [ ] **Step 1: Write the failing test**

`lib/tasks/detail/day-view.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  closureLabel,
  dayNote,
  dayStaffing,
  daySteps,
  dayTone,
} from "@/lib/tasks/detail/day-view";
import { AUTO_ACCEPT_MS } from "@/lib/tasks/detail/day-time";
import { at, complaint, day, worker } from "@/lib/tasks/detail/fixtures";

const NOW = at("2026-10-05T07:00:00");

describe("dayTone", () => {
  it("reads every state through canonicalTaskStatus", () => {
    expect(dayTone(day({ status: "Active" }))).toBe("checkedIn");
    expect(dayTone(day({ status: "Rejected" }))).toBe("rejected");
  });
  it("is unknown for a word the panel does not know", () => {
    expect(dayTone(day({ status: "Paused" }))).toBe("unknown");
  });
});

describe("dayNote — spec §4.1", () => {
  it("pending with nobody: unfilled, danger", () => {
    expect(dayNote(day(), NOW)).toEqual({ key: "unfilled", count: 3, tone: "danger" });
  });
  it("pending short: unfilled, warning", () => {
    expect(dayNote(day({ workers: [worker()] }), NOW)).toEqual({ key: "unfilled", count: 2, tone: "warning" });
  });
  it("pending full: fully staffed", () => {
    const full = day({ workers: [worker({ id: "a" }), worker({ id: "b" }), worker({ id: "c" })] });
    expect(dayNote(full, NOW).key).toBe("fullyStaffed");
  });
  it("pending past start: start passed, before staffing", () => {
    expect(dayNote(day(), at("2026-10-05T08:30:00"))).toEqual({ key: "startPassed", tone: "warning" });
  });
  it("checked in with a late worker", () => {
    const live = day({ status: "CheckedIn", workers: [worker({ checkinAt: null })] });
    expect(dayNote(live, at("2026-10-05T08:30:00"))).toEqual({ key: "late", count: 1, tone: "warning" });
  });
  it("checked in, all on site", () => {
    const live = day({ status: "CheckedIn", startedAt: "2026-10-05T08:02:00", workers: [worker({ checkinAt: "2026-10-05T08:02:00" })] });
    expect(dayNote(live, at("2026-10-05T08:30:00"))).toEqual({ key: "onSite", at: at("2026-10-05T08:02:00"), tone: "muted" });
  });
  it("in review, disputed, cancelled", () => {
    expect(dayNote(day({ status: "InReview" }), NOW).key).toBe("waitingOwner");
    expect(dayNote(day({ status: "Rejected" }), NOW)).toEqual({ key: "disputed", tone: "danger" });
    expect(dayNote(day({ status: "Cancelled" }), NOW).key).toBe("cancelled");
  });
  it("done carries the reason, and a null reason is never 'accepted'", () => {
    expect(dayNote(day({ status: "Done", closureReason: "AutoAccepted" }), NOW)).toEqual({ key: "closure", reason: "AutoAccepted", tone: "muted" });
    expect(dayNote(day({ status: "Done", closureReason: null }), NOW).key).toBe("noReason");
  });
  it("unknown state: none", () => {
    expect(dayNote(day({ status: "Paused" }), NOW).key).toBe("none");
  });
});

describe("dayStaffing", () => {
  it("is null on a cancelled day", () => {
    expect(dayStaffing(day({ status: "Cancelled" }))).toBeNull();
  });
  it("tones 0 danger and short warning on an open day", () => {
    expect(dayStaffing(day())).toEqual({ filled: 0, required: 3, tone: "danger" });
    expect(dayStaffing(day({ workers: [worker()] }))?.tone).toBe("warning");
  });
  it("stays muted on a closed day whatever the count", () => {
    expect(dayStaffing(day({ status: "Done" }))?.tone).toBe("muted");
  });
});

describe("closureLabel", () => {
  it("names the four known reasons, prints an unknown one verbatim, and calls null 'closed'", () => {
    expect(closureLabel("ClosedForced")).toEqual({ key: "ClosedForced" });
    expect(closureLabel("ClosedSomehow")).toEqual({ raw: "ClosedSomehow" });
    expect(closureLabel(null)).toEqual({ key: "closed" });
  });
});

describe("daySteps — spec §4.2", () => {
  const states = (task: Parameters<typeof daySteps>[0], c = null) => daySteps(task, c).map((s) => s.state);

  it("always has four steps", () => {
    expect(daySteps(day({ status: "Paused" }), null)).toHaveLength(4);
  });
  it("pending / checked in / in review", () => {
    expect(states(day())).toEqual(["current", "todo", "todo", "todo"]);
    expect(states(day({ status: "CheckedIn" }))).toEqual(["ok", "current", "todo", "todo"]);
    expect(states(day({ status: "InReview" }))).toEqual(["ok", "ok", "current", "todo"]);
  });
  it("in review shows the auto-accept time on step 4", () => {
    const s = daySteps(day({ status: "InReview", completedAt: "2026-10-05T11:52:00" }), null);
    expect(s[3].time).toEqual({ kind: "auto", at: at("2026-10-05T11:52:00") + AUTO_ACCEPT_MS });
  });
  it("disputed", () => {
    const s = daySteps(day({ status: "Rejected" }), null);
    expect(s.map((x) => x.state)).toEqual(["ok", "ok", "bad", "badOpen"]);
    expect(s[2].label).toEqual({ key: "handedInDisputed" });
    expect(s[3].label).toEqual({ key: "awaitingRuling" });
  });
  it("done with no hand-in (force-closed) skips step 3", () => {
    const s = daySteps(day({ status: "Done", closureReason: "ClosedForced", completedAt: null }), null);
    expect(s.map((x) => x.state)).toEqual(["ok", "ok", "skip", "ok"]);
    expect(s[2].time).toEqual({ kind: "skipped" });
    expect(s[3].time).toEqual({ kind: "none" });
    expect(s[3].label).toEqual({ key: "ClosedForced" });
  });
  it("done · auto-accepted: 'about' hand-in + 5 h", () => {
    const s = daySteps(day({ status: "Done", closureReason: "AutoAccepted", completedAt: "2026-09-30T11:40:00" }), null);
    expect(s[3].time).toEqual({ kind: "about", at: at("2026-09-30T11:40:00") + AUTO_ACCEPT_MS });
  });
  it("done · upheld: the ruling time, only when the complaint is loaded", () => {
    const t = day({ status: "Done", closureReason: "ClosedReplacement", completedAt: "2026-10-02T11:52:00" });
    expect(daySteps(t, null)[3].time).toEqual({ kind: "none" });
    expect(daySteps(t, complaint({ decidedAt: "2026-10-02T15:10:00" }))[3].time).toEqual({ kind: "at", at: at("2026-10-02T15:10:00") });
  });
  it("done · owner-accepted has no close time (no closedAt on the DTO)", () => {
    const s = daySteps(day({ status: "Done", closureReason: "OwnerAccepted", completedAt: "2026-09-29T11:48:00" }), null);
    expect(s[3].time).toEqual({ kind: "none" });
  });
  it("cancelled before start", () => {
    const s = daySteps(day({ status: "Cancelled" }), null);
    expect(s.map((x) => x.state)).toEqual(["ok", "cancel", "off", "off"]);
    expect(s[1].time).toEqual({ kind: "beforeStart" });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/tasks/detail/day-view.test.ts`
Expected: FAIL — cannot resolve `@/lib/tasks/detail/day-view`.

- [ ] **Step 3: Implement `day-view.ts`**

`lib/tasks/detail/day-view.ts`:

```ts
import {
  autoAcceptAt,
  instant,
  isStartPassed,
  lateWorkers,
} from "@/lib/tasks/detail/day-time";
import { activeWorkers } from "@/lib/tasks/staffing";
import { canonicalTaskStatus, type TaskStateKey } from "@/lib/tasks/status-vocab";
import type { TaskComplaintDto, TaskItemDto } from "@/lib/types/task.types";

/** The six day states plus `unknown`: the set is not closed (spec §4.1). */
export type DayTone = TaskStateKey | "unknown";

export function dayTone(task: Pick<TaskItemDto, "status">): DayTone {
  return canonicalTaskStatus(task.status) ?? "unknown";
}

export type NoteTone = "muted" | "warning" | "danger";

export interface DayNote {
  key:
    | "unfilled"
    | "fullyStaffed"
    | "startPassed"
    | "late"
    | "onSite"
    | "waitingOwner"
    | "disputed"
    | "closure"
    | "noReason"
    | "cancelled"
    | "none";
  tone: NoteTone;
  count?: number;
  at?: number | null;
  reason?: string;
}

/** The one-line note under a day's chip in the days list — spec §4.1. */
export function dayNote(task: TaskItemDto, now: number): DayNote {
  switch (canonicalTaskStatus(task.status)) {
    case "pending": {
      if (isStartPassed(task, now)) return { key: "startPassed", tone: "warning" };
      const filled = activeWorkers(task).length;
      const required = task.requiredWorkerCount;
      if (filled < required) {
        return { key: "unfilled", count: required - filled, tone: filled === 0 ? "danger" : "warning" };
      }
      return { key: "fullyStaffed", tone: "muted" };
    }
    case "checkedIn": {
      const late = lateWorkers(task, now).length;
      return late > 0
        ? { key: "late", count: late, tone: "warning" }
        : { key: "onSite", at: instant(task.startedAt), tone: "muted" };
    }
    case "inReview":
      return { key: "waitingOwner", tone: "muted" };
    case "rejected":
      return { key: "disputed", tone: "danger" };
    case "done":
      // ⚠ null is "closed before 2026-09-21", never "accepted".
      return task.closureReason
        ? { key: "closure", reason: task.closureReason, tone: "muted" }
        : { key: "noReason", tone: "muted" };
    case "cancelled":
      return { key: "cancelled", tone: "muted" };
    default:
      return { key: "none", tone: "muted" };
  }
}

/**
 * `{filled}/{required}` for a day row. `null` on a cancelled day (shown `–`).
 * Colour only while the day is open — a finished day's count is history, not a
 * to-do.
 */
export function dayStaffing(
  task: TaskItemDto,
): { filled: number; required: number; tone: NoteTone } | null {
  const state = canonicalTaskStatus(task.status);
  if (state === "cancelled") return null;
  const filled = activeWorkers(task).length;
  const required = task.requiredWorkerCount;
  const open = state === "pending" || state === "checkedIn";
  const tone: NoteTone = !open ? "muted" : filled === 0 ? "danger" : filled < required ? "warning" : "muted";
  return { filled, required, tone };
}

/** A message key under `tasks.detail.*`, or a word to print verbatim. */
export type Label = { key: string } | { raw: string };

const KNOWN_CLOSURES: ReadonlySet<string> = new Set([
  "OwnerAccepted",
  "AutoAccepted",
  "ClosedForced",
  "ClosedReplacement",
]);

/** Key under `tasks.detail.closure.*`; an unknown reason prints verbatim; null is "Closed". */
export function closureLabel(reason: string | null): Label {
  if (!reason) return { key: "closed" };
  return KNOWN_CLOSURES.has(reason) ? { key: reason } : { raw: reason };
}

export type StepState = "ok" | "current" | "todo" | "bad" | "badOpen" | "skip" | "cancel" | "off";

export type StepTime =
  | { kind: "at"; at: number }
  | { kind: "about"; at: number }
  | { kind: "auto"; at: number }
  | { kind: "beforeStart" }
  | { kind: "skipped" }
  | { kind: "none" };

export interface DayStep {
  label: Label;
  state: StepState;
  time: StepTime;
}

const NONE: StepTime = { kind: "none" };

function atTime(iso: string | null | undefined): StepTime {
  const t = instant(iso);
  return t === null ? NONE : { kind: "at", at: t };
}

/**
 * Step 4's time on a Done day. There is no `closedAt` (spec §2 #2), so only two
 * reasons have one: AutoAccepted (≈ hand-in + 5 h) and ClosedReplacement (the
 * ruling, from the per-day complaint read).
 */
function closedTime(task: TaskItemDto, complaint: TaskComplaintDto | null | undefined): StepTime {
  if (task.closureReason === "AutoAccepted") {
    const t = autoAcceptAt(task);
    return t === null ? NONE : { kind: "about", at: t };
  }
  if (task.closureReason === "ClosedReplacement") return atTime(complaint?.decidedAt);
  return NONE;
}

/** Scheduled → Checked in → Handed in → Closed — spec §4.2. Always four steps. */
export function daySteps(
  task: TaskItemDto,
  complaint: TaskComplaintDto | null | undefined,
): DayStep[] {
  const step = (key: string, state: StepState, time: StepTime = NONE): DayStep => ({
    label: { key },
    state,
    time,
  });
  const scheduled = (state: StepState) => step("scheduled", state, atTime(task.scheduledAt));

  switch (canonicalTaskStatus(task.status)) {
    case "pending":
      return [scheduled("current"), step("checkedIn", "todo"), step("handedIn", "todo"), step("closed", "todo")];
    case "checkedIn":
      return [scheduled("ok"), step("checkedIn", "current", atTime(task.startedAt)), step("handedIn", "todo"), step("closed", "todo")];
    case "inReview": {
      const auto = autoAcceptAt(task);
      return [
        scheduled("ok"),
        step("checkedIn", "ok", atTime(task.startedAt)),
        step("handedIn", "current", atTime(task.completedAt)),
        step("closed", "todo", auto === null ? NONE : { kind: "auto", at: auto }),
      ];
    }
    case "rejected":
      return [
        scheduled("ok"),
        step("checkedIn", "ok", atTime(task.startedAt)),
        step("handedInDisputed", "bad", atTime(task.completedAt)),
        step("awaitingRuling", "badOpen"),
      ];
    case "done": {
      const handed = instant(task.completedAt);
      return [
        scheduled("ok"),
        step("checkedIn", "ok", atTime(task.startedAt)),
        handed === null
          ? step("handedIn", "skip", { kind: "skipped" })
          : step("handedIn", "ok", { kind: "at", at: handed }),
        { label: closureLabel(task.closureReason), state: "ok", time: closedTime(task, complaint) },
      ];
    }
    case "cancelled":
      return [
        scheduled("ok"),
        step("cancelled", "cancel", task.startedAt ? atTime(task.startedAt) : { kind: "beforeStart" }),
        step("handedIn", "off"),
        step("closed", "off"),
      ];
    default:
      return [step("scheduled", "todo"), step("checkedIn", "todo"), step("handedIn", "todo"), step("closed", "todo")];
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run lib/tasks/detail/day-view.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tasks/detail/day-view.ts lib/tasks/detail/day-view.test.ts
git commit -m "feat(tasks): detail day chip, note, staffing and four-step timeline

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The day alert

**Files:**
- Create: `lib/tasks/detail/day-alert.ts`
- Test: `lib/tasks/detail/day-alert.test.ts`

**Interfaces:**
- Consumes: from Task 1, `instant`, `autoAcceptAt`, `windowEndAt`, `lateWorkers`, `isStartPassed` and
  `workerLabel`. Also `activeWorkers` and `canonicalTaskStatus`.
- Produces:
  - `type AlertTone = "critical" | "warning" | "positive" | "neutral"`
  - `type DayAlert` (a union keyed by `kind`, shown below)
  - `dayAlert(task, complaint: TaskComplaintDto | null | undefined, now: number): DayAlert | null`

- [ ] **Step 1: Write the failing test**

`lib/tasks/detail/day-alert.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dayAlert } from "@/lib/tasks/detail/day-alert";
import { AUTO_ACCEPT_MS } from "@/lib/tasks/detail/day-time";
import { at, complaint, day, worker } from "@/lib/tasks/detail/fixtures";

const EARLY = at("2026-10-05T07:00:00");

describe("dayAlert — spec §4.3", () => {
  it("disputed with the complaint loaded", () => {
    const c = complaint({ photos: [{ id: "p", url: "u", originalFileName: "a.jpg", fileSize: 1, mimeType: "image/jpeg", uploadedAt: "2026-10-02T13:40:00" }] });
    expect(dayAlert(day({ status: "Rejected" }), c, EARLY)).toEqual({
      kind: "complaint",
      tone: "critical",
      reason: c.reason,
      photos: 1,
      raisedAt: at("2026-10-02T13:40:00"),
    });
  });
  it("disputed before the complaint loads", () => {
    expect(dayAlert(day({ status: "Rejected" }), null, EARLY)).toEqual({ kind: "complaintUnloaded", tone: "critical" });
  });
  it("late arrival names each late worker, with the id fallback, and counts minutes", () => {
    const live = day({
      status: "CheckedIn",
      workers: [worker({ id: "a", workerName: "Jamshid Tursunov" }), worker({ id: "b", workerName: null, workerId: "abcdef0123456" })],
    });
    expect(dayAlert(live, null, at("2026-10-05T08:34:00"))).toEqual({
      kind: "late",
      tone: "warning",
      names: ["Jamshid Tursunov", "abcdef01"],
      minutes: 34,
    });
  });
  it("checked in with everyone on site has no alert", () => {
    const live = day({ status: "CheckedIn", workers: [worker({ checkinAt: "2026-10-05T08:01:00" })] });
    expect(dayAlert(live, null, at("2026-10-05T09:00:00"))).toBeNull();
  });
  it("pending past start: cancels itself at window end — not in the design", () => {
    expect(dayAlert(day(), null, at("2026-10-05T08:10:00"))).toEqual({
      kind: "startPassed",
      tone: "warning",
      cancelsAt: at("2026-10-05T12:00:00"),
    });
  });
  it("pending with the clock unknown never claims 'start passed'", () => {
    expect(dayAlert(day(), null, 0)?.kind).toBe("noWorkers");
  });
  it("pending staffing: none / short / ready", () => {
    expect(dayAlert(day(), null, EARLY)).toEqual({ kind: "noWorkers", tone: "critical", required: 3, startsAt: at("2026-10-05T08:00:00") });
    expect(dayAlert(day({ workers: [worker()] }), null, EARLY)).toEqual({ kind: "understaffed", tone: "warning", open: 2, required: 3, startsAt: at("2026-10-05T08:00:00") });
    const full = day({ workers: [worker({ id: "a" }), worker({ id: "b" }), worker({ id: "c" })] });
    expect(dayAlert(full, null, EARLY)).toEqual({ kind: "ready", tone: "positive", required: 3 });
  });
  it("a limit of 0, or one lowered under the assigned count, reads Ready", () => {
    expect(dayAlert(day({ requiredWorkerCount: 0 }), null, EARLY)?.kind).toBe("ready");
    expect(dayAlert(day({ requiredWorkerCount: 1, workers: [worker({ id: "a" }), worker({ id: "b" })] }), null, EARLY)?.kind).toBe("ready");
  });
  it("in review: hand-in and auto-accept times", () => {
    expect(dayAlert(day({ status: "InReview", completedAt: "2026-10-05T11:52:00" }), null, EARLY)).toEqual({
      kind: "waitingOwner",
      tone: "warning",
      handedAt: at("2026-10-05T11:52:00"),
      autoAt: at("2026-10-05T11:52:00") + AUTO_ACCEPT_MS,
    });
  });
  it("done: one alert per closure reason, none for OwnerAccepted", () => {
    const done = (closureReason: string | null) => dayAlert(day({ status: "Done", closureReason }), null, EARLY);
    expect(done("OwnerAccepted")).toBeNull();
    expect(done("AutoAccepted")).toEqual({ kind: "autoAccepted", tone: "neutral" });
    expect(done("ClosedForced")).toEqual({ kind: "forced", tone: "neutral" });
    expect(done(null)).toEqual({ kind: "legacyClosed", tone: "neutral" });
    expect(done("ClosedSomehow")).toEqual({ kind: "unknownReason", tone: "neutral", reason: "ClosedSomehow" });
  });
  it("done · upheld uses the ruling when loaded", () => {
    const t = day({ status: "Done", closureReason: "ClosedReplacement" });
    expect(dayAlert(t, null, EARLY)).toEqual({ kind: "upheld", tone: "critical", note: null, decidedAt: null });
    expect(dayAlert(t, complaint({ decisionNote: "Photos confirm wet floor.", decidedAt: "2026-10-02T15:10:00" }), EARLY)).toEqual({
      kind: "upheld",
      tone: "critical",
      note: "Photos confirm wet floor.",
      decidedAt: at("2026-10-02T15:10:00"),
    });
  });
  it("cancelled, and an unknown state", () => {
    expect(dayAlert(day({ status: "Cancelled" }), null, EARLY)).toEqual({ kind: "cancelled", tone: "neutral" });
    expect(dayAlert(day({ status: "Paused" }), null, EARLY)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/tasks/detail/day-alert.test.ts`
Expected: FAIL — cannot resolve `@/lib/tasks/detail/day-alert`.

- [ ] **Step 3: Implement `day-alert.ts`**

`lib/tasks/detail/day-alert.ts`:

```ts
import {
  autoAcceptAt,
  instant,
  isStartPassed,
  lateWorkers,
  windowEndAt,
  workerLabel,
} from "@/lib/tasks/detail/day-time";
import { activeWorkers } from "@/lib/tasks/staffing";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import type { TaskComplaintDto, TaskItemDto } from "@/lib/types/task.types";

export type AlertTone = "critical" | "warning" | "positive" | "neutral";

/**
 * At most one alert per day — spec §4.3. Values are data (ms, counts, names);
 * the component formats and words them, so nothing here is a sentence.
 */
export type DayAlert =
  | { kind: "complaint"; tone: "critical"; reason: string; photos: number; raisedAt: number | null }
  | { kind: "complaintUnloaded"; tone: "critical" }
  | { kind: "late"; tone: "warning"; names: string[]; minutes: number }
  | { kind: "startPassed"; tone: "warning"; cancelsAt: number | null }
  | { kind: "waitingOwner"; tone: "warning"; handedAt: number | null; autoAt: number | null }
  | { kind: "upheld"; tone: "critical"; note: string | null; decidedAt: number | null }
  | { kind: "forced"; tone: "neutral" }
  | { kind: "autoAccepted"; tone: "neutral" }
  | { kind: "legacyClosed"; tone: "neutral" }
  | { kind: "unknownReason"; tone: "neutral"; reason: string }
  | { kind: "noWorkers"; tone: "critical"; required: number; startsAt: number | null }
  | { kind: "understaffed"; tone: "warning"; open: number; required: number; startsAt: number | null }
  | { kind: "ready"; tone: "positive"; required: number }
  | { kind: "cancelled"; tone: "neutral" };

export function dayAlert(
  task: TaskItemDto,
  complaint: TaskComplaintDto | null | undefined,
  now: number,
): DayAlert | null {
  switch (canonicalTaskStatus(task.status)) {
    case "rejected":
      // ⚠ `complaint` rides only on `GET /api/tasks/{id}`; the booking's nested
      // tasks always carry null. "Disputed" is read from the status, never from it.
      return complaint
        ? {
            kind: "complaint",
            tone: "critical",
            reason: complaint.reason,
            photos: complaint.photos?.length ?? 0,
            raisedAt: instant(complaint.raisedAt),
          }
        : { kind: "complaintUnloaded", tone: "critical" };

    case "checkedIn": {
      const late = lateWorkers(task, now);
      if (late.length === 0) return null;
      const start = instant(task.scheduledAt) ?? now;
      return {
        kind: "late",
        tone: "warning",
        names: late.map(workerLabel),
        minutes: Math.floor((now - start) / 60_000),
      };
    }

    case "pending": {
      if (isStartPassed(task, now)) {
        return { kind: "startPassed", tone: "warning", cancelsAt: windowEndAt(task) };
      }
      const filled = activeWorkers(task).length;
      const required = task.requiredWorkerCount;
      const startsAt = instant(task.scheduledAt);
      // `>=` first: a PATCH can lower the limit under the assigned count, and a
      // limit of 0 with nobody on it is not "no workers".
      if (filled >= required) return { kind: "ready", tone: "positive", required };
      if (filled === 0) return { kind: "noWorkers", tone: "critical", required, startsAt };
      return { kind: "understaffed", tone: "warning", open: required - filled, required, startsAt };
    }

    case "inReview":
      return {
        kind: "waitingOwner",
        tone: "warning",
        handedAt: instant(task.completedAt),
        autoAt: autoAcceptAt(task),
      };

    case "done":
      switch (task.closureReason) {
        case null:
          // ⚠ Closed before 2026-09-21 — never guessed as "accepted".
          return { kind: "legacyClosed", tone: "neutral" };
        case "OwnerAccepted":
          return null;
        case "AutoAccepted":
          return { kind: "autoAccepted", tone: "neutral" };
        case "ClosedForced":
          // The admin's reason is not on any DTO (spec §2 #1) — not quoted.
          return { kind: "forced", tone: "neutral" };
        case "ClosedReplacement":
          return {
            kind: "upheld",
            tone: "critical",
            note: complaint?.decisionNote?.trim() || null,
            decidedAt: instant(complaint?.decidedAt),
          };
        default:
          return { kind: "unknownReason", tone: "neutral", reason: task.closureReason };
      }

    case "cancelled":
      // No date, no actor: neither is on any DTO (spec §2 #3).
      return { kind: "cancelled", tone: "neutral" };

    default:
      return null;
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run lib/tasks/detail/day-alert.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tasks/detail/day-alert.ts lib/tasks/detail/day-alert.test.ts
git commit -m "feat(tasks): detail day alert — one per state, nothing the DTO lacks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Which buttons show

**Files:**
- Create: `lib/tasks/detail/day-actions.ts`
- Test: `lib/tasks/detail/day-actions.test.ts`

**Interfaces:**
- Consumes: `canRateTeam` (`lib/tasks/team-rating.ts`), `outcomeChoices` (`lib/tasks/outcome-override.ts`),
  `activeWorkers`, `VACATED_OUTCOMES` (`lib/tasks/staffing.ts`), `canonicalTaskStatus`, `normalizeStatus`.
- Produces:
  - `type DayActionKey = "supervisor" | "forceClose" | "assign" | "openComplaint" | "rateTeam"`
  - `dayActions(task: TaskItemDto): DayActionKey[]`, in display order (the primary action last)
  - `type RowActionKey = "rate" | "outcome" | "unassign"`
  - `rowActions(task: TaskItemDto, worker: TaskWorkerDto, now: number): RowActionKey[]`
  - `openSlots(task: TaskItemDto): number`
  - `isClosedDay(task: TaskItemDto): boolean`

- [ ] **Step 1: Write the failing test**

`lib/tasks/detail/day-actions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dayActions, isClosedDay, openSlots, rowActions } from "@/lib/tasks/detail/day-actions";
import { at, day, worker } from "@/lib/tasks/detail/fixtures";

const BEFORE = at("2026-10-05T06:00:00");

describe("dayActions — spec §6 + plan refinements", () => {
  it("pending: Assign only (no supervisor, no force close — design 1a–1c)", () => {
    expect(dayActions(day())).toEqual(["assign"]);
  });
  it("checked in: supervisor, force close, assign", () => {
    expect(dayActions(day({ status: "CheckedIn" }))).toEqual(["supervisor", "forceClose", "assign"]);
  });
  it("in review: supervisor, force close — no Assign (dropped vs the old page)", () => {
    expect(dayActions(day({ status: "InReview" }))).toEqual(["supervisor", "forceClose"]);
  });
  it("disputed: open complaint only", () => {
    expect(dayActions(day({ status: "Rejected" }))).toEqual(["openComplaint"]);
  });
  it("done: rate team only when someone Completed", () => {
    expect(dayActions(day({ status: "Done", workers: [worker({ outcome: "Completed" })] }))).toEqual(["rateTeam"]);
    expect(dayActions(day({ status: "Done", workers: [worker({ outcome: "NoShow" })] }))).toEqual([]);
  });
  it("cancelled and unknown: nothing", () => {
    expect(dayActions(day({ status: "Cancelled" }))).toEqual([]);
    expect(dayActions(day({ status: "Paused" }))).toEqual([]);
  });
});

describe("rowActions", () => {
  it("rate only a Completed worker (task_worker_not_completed otherwise)", () => {
    const done = day({ status: "Done" });
    expect(rowActions(done, worker({ outcome: "Completed" }), BEFORE)).toContain("rate");
    expect(rowActions(done, worker({ outcome: "NoShow" }), BEFORE)).not.toContain("rate");
  });
  it("unassign only an active worker on an open day", () => {
    expect(rowActions(day(), worker(), BEFORE)).toContain("unassign");
    expect(rowActions(day({ status: "CheckedIn" }), worker(), BEFORE)).toContain("unassign");
    expect(rowActions(day({ status: "InReview" }), worker(), BEFORE)).not.toContain("unassign");
    expect(rowActions(day(), worker({ outcome: "Removed" }), BEFORE)).not.toContain("unassign");
  });
  it("change outcome follows outcomeChoices (§0j)", () => {
    expect(rowActions(day({ status: "Done" }), worker({ outcome: "Completed" }), BEFORE)).toContain("outcome");
    expect(rowActions(day({ status: "InReview" }), worker(), BEFORE)).not.toContain("outcome");
  });
});

describe("openSlots", () => {
  it("counts unfilled slots on open days only, never negative", () => {
    expect(openSlots(day({ workers: [worker()] }))).toBe(2);
    expect(openSlots(day({ status: "CheckedIn" }))).toBe(3);
    expect(openSlots(day({ status: "InReview" }))).toBe(0);
    expect(openSlots(day({ requiredWorkerCount: 1, workers: [worker({ id: "a" }), worker({ id: "b" })] }))).toBe(0);
  });
});

describe("isClosedDay", () => {
  it("is done or cancelled", () => {
    expect(isClosedDay(day({ status: "Done" }))).toBe(true);
    expect(isClosedDay(day({ status: "Cancelled" }))).toBe(true);
    expect(isClosedDay(day({ status: "Rejected" }))).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/tasks/detail/day-actions.test.ts`
Expected: FAIL — cannot resolve `@/lib/tasks/detail/day-actions`.

- [ ] **Step 3: Implement `day-actions.ts`**

`lib/tasks/detail/day-actions.ts`:

```ts
import { outcomeChoices } from "@/lib/tasks/outcome-override";
import { activeWorkers, VACATED_OUTCOMES } from "@/lib/tasks/staffing";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import { canRateTeam } from "@/lib/tasks/team-rating";
import {
  normalizeStatus,
  type TaskItemDto,
  type TaskWorkerDto,
} from "@/lib/types/task.types";

export type DayActionKey = "supervisor" | "forceClose" | "assign" | "openComplaint" | "rateTeam";

/**
 * The selected day's buttons, in display order (primary last) — spec §6 as
 * narrowed by the plan. Permissions are NOT decided here; each button is still
 * wrapped in `<Can>`.
 *
 * - Supervisor / force close: CheckedIn and InReview only. Both server guards
 *   also accept Pending, but the design offers neither there: the supervisor is
 *   set at first check-in, and a pending day past start cancels itself.
 * - Assign: Pending and CheckedIn only. ⚠ Our rule, not the server's —
 *   admin-assign has no state guard (`GT_AdminFillHasNoDateOrStatusGuard`),
 *   so this function is the only thing stopping a fill on a handed-in day.
 */
export function dayActions(task: TaskItemDto): DayActionKey[] {
  const state = canonicalTaskStatus(task.status);
  const out: DayActionKey[] = [];
  if (state === "checkedIn" || state === "inReview") out.push("supervisor", "forceClose");
  if (state === "pending" || state === "checkedIn") out.push("assign");
  if (state === "rejected") out.push("openComplaint");
  if (canRateTeam(task)) out.push("rateTeam");
  return out;
}

export type RowActionKey = "rate" | "outcome" | "unassign";

/**
 * One worker row's icons.
 * - rate: `Completed` only — any other outcome answers `task_worker_not_completed`.
 * - outcome: wherever §0j accepts some value (`outcomeChoices`).
 * - unassign: an active worker on Pending/CheckedIn — the server refuses
 *   Review/Done/Cancelled with `task_not_unassignable`.
 */
export function rowActions(task: TaskItemDto, worker: TaskWorkerDto, now: number): RowActionKey[] {
  const state = canonicalTaskStatus(task.status);
  const outcome = normalizeStatus(worker.outcome);
  const out: RowActionKey[] = [];
  if (outcome === "completed") out.push("rate");
  if (outcomeChoices(task, worker.outcome, now).length > 0) out.push("outcome");
  if ((state === "pending" || state === "checkedIn") && !VACATED_OUTCOMES.has(outcome)) {
    out.push("unassign");
  }
  return out;
}

/** "Open slot" rows — Pending/CheckedIn only; never negative (limit can drop under the count). */
export function openSlots(task: TaskItemDto): number {
  const state = canonicalTaskStatus(task.status);
  if (state !== "pending" && state !== "checkedIn") return 0;
  return Math.max(0, task.requiredWorkerCount - activeWorkers(task).length);
}

/** Shows "No actions — this day is closed" when no button is visible. */
export function isClosedDay(task: TaskItemDto): boolean {
  const state = canonicalTaskStatus(task.status);
  return state === "done" || state === "cancelled";
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run lib/tasks/detail/day-actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tasks/detail/day-actions.ts lib/tasks/detail/day-actions.test.ts
git commit -m "feat(tasks): detail button visibility — only what the server accepts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Header facts and page-load classification

**Files:**
- Create: `lib/tasks/detail/booking-facts.ts`, `lib/tasks/detail/page-state.ts`
- Test: `lib/tasks/detail/booking-facts.test.ts`, `lib/tasks/detail/page-state.test.ts`

**Interfaces:**
- Consumes: from Task 1, `instant` and `localMinuteOfDay`; from Task 1's `select-day.ts`, `sortDays`. Also
  `canonicalTaskStatus`, `TaskStateKey`, and `isPermissionDenied` (`lib/onboarding/errors.ts`).
- Produces:
  - `isSingleDay(group: Pick<TaskGroupDto,"kind"|"tasks">): boolean`
  - `legendCounts(tasks: TaskItemDto[]): Record<TaskStateKey, number>`
  - `isNothingLeftToRun(group: Pick<TaskGroupDto,"days">): boolean`
  - `type WindowFact = { kind: "same"; start: number; end: number | null } | { kind: "varies" } | { kind: "none" }`;
    `windowFact(tasks): WindowFact`
  - `workersFact(tasks): { min: number; max: number } | null`
  - `datesFact(tasks): { first: string; last: string; count: number } | null`
  - `type Place = { kind: "walkIn" } | { kind: "text"; text: string } | { kind: "none" }`;
    `headerPlace(input: { isWalkIn: boolean | null; address?: string | null; cityName?: string | null; propertyName?: string | null }): Place`
  - `type GroupLoadFailure = "forbidden" | "notFound" | "error"`; `classifyGroupLoad(error: unknown): GroupLoadFailure`

- [ ] **Step 1: Write the failing tests**

`lib/tasks/detail/booking-facts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  datesFact,
  headerPlace,
  isNothingLeftToRun,
  isSingleDay,
  legendCounts,
  windowFact,
  workersFact,
} from "@/lib/tasks/detail/booking-facts";
import { at, booking, day } from "@/lib/tasks/detail/fixtures";

const d = (id: string, date: string, over = {}) =>
  day({ id, scheduledDate: date, scheduledAt: `${date}T08:00:00`, deadline: `${date}T12:00:00`, ...over });

describe("isSingleDay", () => {
  it("is a SingleTask, or a booking with one day", () => {
    expect(isSingleDay(booking({ kind: "SingleTask" }))).toBe(true);
    expect(isSingleDay(booking({ tasks: [d("a", "2026-10-05")] }))).toBe(true);
    expect(isSingleDay(booking({ tasks: [d("a", "2026-10-05"), d("b", "2026-10-06")] }))).toBe(false);
  });
});

describe("legendCounts", () => {
  it("counts days per state and drops unknown words", () => {
    const c = legendCounts([d("a", "2026-10-01", { status: "Done" }), d("b", "2026-10-02", { status: "Done" }), d("c", "2026-10-03", { status: "Paused" })]);
    expect(c.done).toBe(2);
    expect(c.pending).toBe(0);
    expect(Object.values(c).reduce((s, n) => s + n, 0)).toBe(2);
  });
});

describe("isNothingLeftToRun — spec §7", () => {
  const days = (over: object) => ({ days: { total: 3, pending: 0, checkedIn: 0, inReview: 0, done: 2, cancelled: 1, rejected: 0, ...over } });
  it("is true with a cancelled day and nothing open", () => {
    expect(isNothingLeftToRun(days({}))).toBe(true);
  });
  it("is false while any day is open or disputed, or nothing was cancelled", () => {
    expect(isNothingLeftToRun(days({ pending: 1 }))).toBe(false);
    expect(isNothingLeftToRun(days({ rejected: 1 }))).toBe(false);
    expect(isNothingLeftToRun(days({ cancelled: 0, done: 3 }))).toBe(false);
  });
});

describe("windowFact — times from instants, never the wall-clock defaults", () => {
  it("is one window when every live day shares it", () => {
    expect(windowFact([d("a", "2026-10-05"), d("b", "2026-10-06")])).toEqual({
      kind: "same",
      start: at("2026-10-05T08:00:00"),
      end: at("2026-10-05T12:00:00"),
    });
  });
  it("ignores cancelled days when live ones exist", () => {
    const odd = d("b", "2026-10-06", { status: "Cancelled", scheduledAt: "2026-10-06T10:00:00" });
    expect(windowFact([d("a", "2026-10-05"), odd]).kind).toBe("same");
  });
  it("still answers from cancelled days when every day is cancelled", () => {
    expect(windowFact([d("a", "2026-10-05", { status: "Cancelled" })]).kind).toBe("same");
  });
  it("varies when two live days differ", () => {
    expect(windowFact([d("a", "2026-10-05"), d("b", "2026-10-06", { scheduledAt: "2026-10-06T09:00:00" })]).kind).toBe("varies");
  });
  it("keeps a null end when there is no deadline", () => {
    expect(windowFact([d("a", "2026-10-05", { deadline: null })])).toEqual({ kind: "same", start: at("2026-10-05T08:00:00"), end: null });
  });
  it("is none with no days", () => {
    expect(windowFact([])).toEqual({ kind: "none" });
  });
});

describe("workersFact / datesFact", () => {
  it("reports a range when days differ", () => {
    expect(workersFact([d("a", "2026-10-05"), d("b", "2026-10-06", { requiredWorkerCount: 2 })])).toEqual({ min: 2, max: 3 });
    expect(workersFact([])).toBeNull();
  });
  it("reports first and last date in order", () => {
    expect(datesFact([d("b", "2026-10-07"), d("a", "2026-09-29")])).toEqual({ first: "2026-09-29", last: "2026-10-07", count: 2 });
    expect(datesFact([])).toBeNull();
  });
});

describe("headerPlace", () => {
  it("walk-in wins", () => {
    expect(headerPlace({ isWalkIn: true, address: "x" })).toEqual({ kind: "walkIn" });
  });
  it("address with the city appended once", () => {
    expect(headerPlace({ isWalkIn: false, address: "Torstraße 88, 10119", cityName: "Berlin" })).toEqual({ kind: "text", text: "Torstraße 88, 10119 Berlin" });
    expect(headerPlace({ isWalkIn: false, address: "Torstraße 88, 10119 Berlin", cityName: "Berlin" })).toEqual({ kind: "text", text: "Torstraße 88, 10119 Berlin" });
  });
  it("falls back to the property name, then none", () => {
    expect(headerPlace({ isWalkIn: null, propertyName: "Torstraße 88" })).toEqual({ kind: "text", text: "Torstraße 88" });
    expect(headerPlace({ isWalkIn: null })).toEqual({ kind: "none" });
  });
});
```

`lib/tasks/detail/page-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import { classifyGroupLoad } from "@/lib/tasks/detail/page-state";

function apiError(status: number, data: unknown): AxiosError {
  const err = new AxiosError("failed");
  // @ts-expect-error — a minimal response is all the reader touches.
  err.response = { status, data };
  return err;
}

describe("classifyGroupLoad — spec §7 (permission, then 404, then generic)", () => {
  it("an empty-bodied 403 is permissions", () => {
    expect(classifyGroupLoad(apiError(403, ""))).toBe("forbidden");
  });
  it("404 is not found", () => {
    expect(classifyGroupLoad(apiError(404, ""))).toBe("notFound");
  });
  it("5xx and network failures are generic", () => {
    expect(classifyGroupLoad(apiError(500, ""))).toBe("error");
    expect(classifyGroupLoad(new Error("Network Error"))).toBe("error");
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run lib/tasks/detail/booking-facts.test.ts lib/tasks/detail/page-state.test.ts`
Expected: FAIL — cannot resolve the two modules.

- [ ] **Step 3: Implement `booking-facts.ts`**

`lib/tasks/detail/booking-facts.ts`:

```ts
import { instant, localMinuteOfDay } from "@/lib/tasks/detail/day-time";
import { sortDays } from "@/lib/tasks/detail/select-day";
import { canonicalTaskStatus, type TaskStateKey } from "@/lib/tasks/status-vocab";
import type { TaskGroupDto, TaskItemDto } from "@/lib/types/task.types";

/** One day only: no rail, no days list (spec §3). */
export function isSingleDay(group: Pick<TaskGroupDto, "kind" | "tasks">): boolean {
  return group.kind === "SingleTask" || (group.tasks ?? []).length === 1;
}

/** Legend counts — from the tasks, the same source as the rail, so the two agree. */
export function legendCounts(tasks: TaskItemDto[]): Record<TaskStateKey, number> {
  const counts: Record<TaskStateKey, number> = {
    pending: 0,
    checkedIn: 0,
    inReview: 0,
    rejected: 0,
    done: 0,
    cancelled: 0,
  };
  for (const t of tasks) {
    const s = canonicalTaskStatus(t.status);
    if (s) counts[s] += 1;
  }
  return counts;
}

/**
 * The design's "Booking cancelled" condition, plus `rejected == 0`. Worded
 * neutrally in the UI ("No days left to run") — the same counts come from one
 * owner-cancelled or self-cancelled day, and nothing says which (spec §7).
 */
export function isNothingLeftToRun(group: Pick<TaskGroupDto, "days">): boolean {
  const d = group.days;
  if (!d) return false;
  return d.cancelled > 0 && d.pending === 0 && d.checkedIn === 0 && d.inReview === 0 && d.rejected === 0;
}

export type WindowFact =
  | { kind: "same"; start: number; end: number | null }
  | { kind: "varies" }
  | { kind: "none" };

/**
 * The header's time window, from the day INSTANTS — never `defaultStartTime`,
 * which carries no zone and disagrees with them for a viewer outside Berlin.
 * Compared by local wall clock; cancelled days are ignored unless all are.
 */
export function windowFact(tasks: TaskItemDto[]): WindowFact {
  const live = tasks.filter((t) => canonicalTaskStatus(t.status) !== "cancelled");
  const pool = sortDays(live.length > 0 ? live : tasks);
  if (pool.length === 0) return { kind: "none" };
  const signature = (t: TaskItemDto): string | null => {
    const s = instant(t.scheduledAt);
    if (s === null) return null;
    const e = instant(t.deadline);
    return `${localMinuteOfDay(s)}-${e === null ? "" : localMinuteOfDay(e)}`;
  };
  const first = signature(pool[0]);
  if (first === null) return { kind: "none" };
  if (pool.some((t) => signature(t) !== first)) return { kind: "varies" };
  return { kind: "same", start: instant(pool[0].scheduledAt)!, end: instant(pool[0].deadline) };
}

export function workersFact(tasks: TaskItemDto[]): { min: number; max: number } | null {
  if (tasks.length === 0) return null;
  const counts = tasks.map((t) => t.requiredWorkerCount);
  return { min: Math.min(...counts), max: Math.max(...counts) };
}

export function datesFact(tasks: TaskItemDto[]): { first: string; last: string; count: number } | null {
  if (tasks.length === 0) return null;
  const sorted = sortDays(tasks);
  return { first: sorted[0].scheduledDate, last: sorted[sorted.length - 1].scheduledDate, count: sorted.length };
}

export type Place = { kind: "walkIn" } | { kind: "text"; text: string } | { kind: "none" };

/**
 * The `{place}` half of the header line. A walk-in order's own address cannot be
 * read back (`f-02b-6` §4.2), so it says so instead of printing the placeholder
 * property's address.
 */
export function headerPlace(input: {
  isWalkIn: boolean | null;
  address?: string | null;
  cityName?: string | null;
  propertyName?: string | null;
}): Place {
  if (input.isWalkIn === true) return { kind: "walkIn" };
  const address = input.address?.trim();
  if (address) {
    const city = input.cityName?.trim();
    const text = city && !address.includes(city) ? `${address} ${city}` : address;
    return { kind: "text", text };
  }
  const name = input.propertyName?.trim();
  return name ? { kind: "text", text: name } : { kind: "none" };
}
```

- [ ] **Step 4: Implement `page-state.ts`**

`lib/tasks/detail/page-state.ts`:

```ts
import { AxiosError } from "axios";
import { isPermissionDenied } from "@/lib/onboarding/errors";

export type GroupLoadFailure = "forbidden" | "notFound" | "error";

/**
 * Why `GET /api/tasks/groups/{id}` failed — spec §7. Permission first: an
 * empty-bodied 403 is the permission filter, never onboarding.
 *
 * ⚠ NEEDS-LIVE: what this read answers for an UNKNOWN id is undocumented (it
 * checks permissions in the action). If it is an empty 403, a deleted booking
 * lands on "forbidden" and the forbidden copy must cover "or the link is wrong".
 */
export function classifyGroupLoad(error: unknown): GroupLoadFailure {
  if (isPermissionDenied(error)) return "forbidden";
  const status = error instanceof AxiosError ? error.response?.status : undefined;
  if (status === 404) return "notFound";
  return "error";
}
```

- [ ] **Step 5: Run them to verify they pass**

Run: `npx vitest run lib/tasks/detail`
Expected: PASS (all seven files: day-time, select-day, day-view, day-alert, day-actions, booking-facts,
page-state).

- [ ] **Step 6: Commit**

```bash
git add lib/tasks/detail/booking-facts.ts lib/tasks/detail/booking-facts.test.ts lib/tasks/detail/page-state.ts lib/tasks/detail/page-state.test.ts
git commit -m "feat(tasks): detail header facts from day instants, and load-failure classes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Messages (en + de)

**Files:**
- Modify: `messages/en.json` (the `tasks.detail` object)
- Modify: `messages/de.json` (the `tasks.detail` object)

**Interfaces:**
- Produces: the `tasks.detail.*` keys that Tasks 7–9 read. `backToList` is kept, because the bell resolver
  reads it. Every old key under `tasks.detail` is replaced; Step 1 confirms only the old page reads them.

- [ ] **Step 1: Confirm no other reader of the old keys**

Run: `git grep -n -E "detail\.(infoTitle|tasksTitle|noTasks|noWorkers|closedBeforeReasons|info\.|taskColumns|workerColumns)" -- app components lib hooks`
Expected: matches **only** in `app/[locale]/dashboard/tasks/[id]/page.tsx` (rewritten in Task 9). Hits in
other namespaces, such as `attendance` or `skill-requests`, use their own `detail` objects; ignore them. If
any other `tasks.detail` reader shows up, keep that key in the new block.

- [ ] **Step 2: Replace `tasks.detail` in `messages/en.json`**

Replace the whole `"detail": { … }` object inside `"tasks"` with:

```json
"detail": {
  "backToList": "Back to tasks",
  "created": "Created {date}",
  "kindBooking": "Booking · {count, plural, one {# day} other {# days}}",
  "kindSingle": "Single task",
  "progress": "Progress",
  "progressBooking": "/ {total} days done",
  "progressSingle": "/ 1 day",
  "walkIn": "Walk-in order",
  "cancelBooking": "Cancel booking",
  "cancelTask": "Cancel task",
  "noDays": "This booking has no days.",
  "nothingLeft": "No days left to run — {cancelled} of {total} days were cancelled. Finished days keep their status. You can still copy it as a new order.",
  "states": {
    "pending": "Pending",
    "checkedIn": "Checked in",
    "inReview": "In review",
    "rejected": "Disputed",
    "done": "Done",
    "cancelled": "Cancelled"
  },
  "facts": {
    "window": "Time window",
    "windowFrom": "from {start}",
    "windowVaries": "Varies by day",
    "everyDay": "every day",
    "oneDay": "one day",
    "eightHours": "8 h window",
    "workers": "Workers / day",
    "required": "required",
    "ratingFloor": "Rating floor",
    "ratingAny": "Any",
    "ratingSub": "minimum to join",
    "newWorkers": "New workers",
    "allowed": "Allowed",
    "notAllowed": "Not allowed",
    "tools": "Cleaning tools",
    "toolsSub": "on site",
    "date": "Date",
    "dates": "Dates",
    "dayCount": "{count, plural, one {# day} other {# days}}"
  },
  "instructions": "Instructions for workers",
  "addOn": "Add-on note",
  "days": "Days",
  "tally": "Closed: {accepted} accepted · {auto} auto · {forced} forced · {upheld} upheld",
  "tallyNoReason": "{count} no reason",
  "notes": {
    "unfilled": "{count, plural, one {# slot unfilled} other {# slots unfilled}}",
    "fullyStaffed": "Fully staffed",
    "startPassed": "Start passed — nobody in",
    "late": "{count, plural, one {# worker late} other {# workers late}}",
    "onSite": "On site since {time}",
    "onSiteUnknown": "On site",
    "waitingOwner": "Waiting for owner",
    "disputed": "Owner complaint — needs ruling",
    "noReason": "Closed · no reason saved",
    "cancelled": "Cancelled"
  },
  "closure": {
    "OwnerAccepted": "Accepted by owner",
    "AutoAccepted": "Auto-accepted",
    "ClosedForced": "Force-closed by admin",
    "ClosedReplacement": "Complaint upheld",
    "closed": "Closed"
  },
  "steps": {
    "scheduled": "Scheduled",
    "checkedIn": "Checked in",
    "cancelled": "Cancelled",
    "handedIn": "Handed in",
    "handedInDisputed": "Handed in · disputed",
    "awaitingRuling": "Awaiting ruling",
    "closed": "Closed",
    "beforeStart": "before start",
    "skipped": "skipped",
    "about": "about {time}",
    "auto": "auto ≈ {time}"
  },
  "today": "today",
  "dayWindow": "{start} – {end} · {count, plural, one {# worker needed} other {# workers needed}}",
  "dayWindowOpen": "from {start} · {count, plural, one {# worker needed} other {# workers needed}}",
  "alerts": {
    "complaint": { "title": "Owner complaint — open", "text": "“{reason}” · {photos, plural, =0 {no photos} one {# photo} other {# photos}} · raised {raised}" },
    "complaintUnloaded": { "title": "Owner complaint — open", "text": "The owner disputed this day. Open the complaint to see it and rule." },
    "late": { "title": "Late arrival", "text": "{names} {count, plural, one {has} other {have}} not checked in — {minutes} min past start." },
    "startPassed": { "title": "Start time passed", "text": "Nobody has checked in. If no one starts by {time}, the day cancels itself." },
    "waitingOwner": { "title": "Waiting for the owner", "text": "Handed in at {handed}. If the owner doesn't accept or complain within 5 hours, it accepts itself around {auto}." },
    "upheld": { "title": "Complaint upheld", "text": "A replacement visit is owed — plan it as a new order.", "decided": "Decided {date}: “{note}”", "decidedNoNote": "Decided {date}." },
    "forced": { "title": "Force-closed by an admin", "text": "Workers and the owner were notified with the reason." },
    "autoAccepted": { "title": "Auto-accepted", "text": "The owner didn't review within 5 hours, so the day closed by itself." },
    "legacyClosed": { "title": "Closed", "text": "This day closed before 21 Sep 2026, when reasons started being saved." },
    "noWorkers": { "title": "No workers assigned", "text": "{required} of {required} slots still open. The day starts at {start}." },
    "understaffed": { "title": "Understaffed", "text": "{open} of {required} slots still open. The day starts at {start}." },
    "ready": { "title": "Ready", "text": "All {required} slots are filled. Nothing to do until workers check in." },
    "cancelled": { "title": "Day cancelled", "text": "Assigned workers were released." }
  },
  "supervisor": "Supervisor",
  "supervisorSub": "first worker to check in",
  "supervisorNotYet": "Not yet — the first worker to check in",
  "supervisorNone": "None recorded",
  "summary": "Work summary",
  "summaryLater": "Written by the supervisor at hand-in.",
  "summaryNone": "No summary was written.",
  "workers": "Workers",
  "openCount": "{count} open",
  "fullyStaffed": "fully staffed",
  "released": "released",
  "columns": {
    "worker": "Worker",
    "outcome": "Outcome",
    "checkIn": "Check-in",
    "checkOut": "Check-out",
    "rating": "Rating",
    "actions": "Actions"
  },
  "supervisorTag": "Supervisor",
  "openSlot": "Open slot {n}",
  "nobody": "Nobody was on this day.",
  "noActions": "No actions — this day is closed",
  "outcomes": {
    "Pending": "Pending",
    "Completed": "Completed",
    "NoShow": "No-show",
    "Removed": "Removed",
    "Cancelled": "Cancelled"
  },
  "page": {
    "errorTitle": "Couldn't load this booking",
    "errorText": "The server didn't answer. Your data is safe — try again.",
    "retry": "Try again",
    "notFoundTitle": "Booking not found",
    "notFoundText": "It may have been deleted, or the link is wrong.",
    "forbiddenTitle": "You can't open this booking",
    "forbiddenText": "Your role doesn't include booking details. Ask a super admin for access."
  }
}
```

- [ ] **Step 3: Replace `tasks.detail` in `messages/de.json`**

Replace the whole `"detail": { … }` object inside `"tasks"` with:

```json
"detail": {
  "backToList": "Zurück zu den Aufträgen",
  "created": "Erstellt {date}",
  "kindBooking": "Buchung · {count, plural, one {# Tag} other {# Tage}}",
  "kindSingle": "Einzelauftrag",
  "progress": "Fortschritt",
  "progressBooking": "/ {total} Tage erledigt",
  "progressSingle": "/ 1 Tag",
  "walkIn": "Walk-in-Auftrag",
  "cancelBooking": "Buchung stornieren",
  "cancelTask": "Auftrag stornieren",
  "noDays": "Diese Buchung hat keine Tage.",
  "nothingLeft": "Keine Tage mehr offen — {cancelled} von {total} Tagen wurden storniert. Abgeschlossene Tage behalten ihren Status. Sie können sie weiterhin als neuen Auftrag kopieren.",
  "states": {
    "pending": "Ausstehend",
    "checkedIn": "Eingecheckt",
    "inReview": "In Prüfung",
    "rejected": "Beanstandet",
    "done": "Erledigt",
    "cancelled": "Storniert"
  },
  "facts": {
    "window": "Zeitfenster",
    "windowFrom": "ab {start}",
    "windowVaries": "Je nach Tag",
    "everyDay": "jeden Tag",
    "oneDay": "ein Tag",
    "eightHours": "8-Std.-Fenster",
    "workers": "Kräfte / Tag",
    "required": "benötigt",
    "ratingFloor": "Mindestbewertung",
    "ratingAny": "Keine",
    "ratingSub": "zum Beitreten",
    "newWorkers": "Neue Kräfte",
    "allowed": "Erlaubt",
    "notAllowed": "Nicht erlaubt",
    "tools": "Reinigungsmittel",
    "toolsSub": "vor Ort",
    "date": "Datum",
    "dates": "Daten",
    "dayCount": "{count, plural, one {# Tag} other {# Tage}}"
  },
  "instructions": "Hinweise für die Kräfte",
  "addOn": "Zusatznotiz",
  "days": "Tage",
  "tally": "Abgeschlossen: {accepted} angenommen · {auto} automatisch · {forced} erzwungen · {upheld} stattgegeben",
  "tallyNoReason": "{count} ohne Grund",
  "notes": {
    "unfilled": "{count, plural, one {# Platz offen} other {# Plätze offen}}",
    "fullyStaffed": "Voll besetzt",
    "startPassed": "Start vorbei — niemand da",
    "late": "{count, plural, one {# Kraft verspätet} other {# Kräfte verspätet}}",
    "onSite": "Vor Ort seit {time}",
    "onSiteUnknown": "Vor Ort",
    "waitingOwner": "Wartet auf den Eigentümer",
    "disputed": "Beschwerde — Entscheidung nötig",
    "noReason": "Abgeschlossen · kein Grund gespeichert",
    "cancelled": "Storniert"
  },
  "closure": {
    "OwnerAccepted": "Vom Eigentümer angenommen",
    "AutoAccepted": "Automatisch angenommen",
    "ClosedForced": "Vom Admin erzwungen",
    "ClosedReplacement": "Beschwerde stattgegeben",
    "closed": "Abgeschlossen"
  },
  "steps": {
    "scheduled": "Geplant",
    "checkedIn": "Eingecheckt",
    "cancelled": "Storniert",
    "handedIn": "Abgegeben",
    "handedInDisputed": "Abgegeben · beanstandet",
    "awaitingRuling": "Wartet auf Entscheidung",
    "closed": "Abgeschlossen",
    "beforeStart": "vor Beginn",
    "skipped": "übersprungen",
    "about": "etwa {time}",
    "auto": "automatisch ≈ {time}"
  },
  "today": "heute",
  "dayWindow": "{start} – {end} · {count, plural, one {# Kraft benötigt} other {# Kräfte benötigt}}",
  "dayWindowOpen": "ab {start} · {count, plural, one {# Kraft benötigt} other {# Kräfte benötigt}}",
  "alerts": {
    "complaint": { "title": "Beschwerde des Eigentümers — offen", "text": "„{reason}“ · {photos, plural, =0 {keine Fotos} one {# Foto} other {# Fotos}} · eingereicht {raised}" },
    "complaintUnloaded": { "title": "Beschwerde des Eigentümers — offen", "text": "Der Eigentümer hat diesen Tag beanstandet. Öffnen Sie die Beschwerde, um sie zu sehen und zu entscheiden." },
    "late": { "title": "Verspätung", "text": "{names} {count, plural, one {hat} other {haben}} nicht eingecheckt — {minutes} Min. nach Beginn." },
    "startPassed": { "title": "Startzeit vorbei", "text": "Niemand hat eingecheckt. Beginnt bis {time} niemand, storniert sich der Tag selbst." },
    "waitingOwner": { "title": "Wartet auf den Eigentümer", "text": "Abgegeben um {handed}. Nimmt der Eigentümer nicht innerhalb von 5 Stunden an oder beschwert sich, wird der Tag gegen {auto} automatisch angenommen." },
    "upheld": { "title": "Beschwerde stattgegeben", "text": "Ein Ersatzeinsatz ist fällig — planen Sie ihn als neuen Auftrag.", "decided": "Entschieden {date}: „{note}“", "decidedNoNote": "Entschieden {date}." },
    "forced": { "title": "Vom Admin erzwungen abgeschlossen", "text": "Kräfte und Eigentümer wurden mit dem Grund benachrichtigt." },
    "autoAccepted": { "title": "Automatisch angenommen", "text": "Der Eigentümer hat nicht innerhalb von 5 Stunden geprüft, daher wurde der Tag selbst abgeschlossen." },
    "legacyClosed": { "title": "Abgeschlossen", "text": "Dieser Tag wurde vor dem 21.09.2026 abgeschlossen, als noch keine Gründe gespeichert wurden." },
    "noWorkers": { "title": "Keine Kräfte zugewiesen", "text": "{required} von {required} Plätzen noch offen. Der Tag beginnt um {start}." },
    "understaffed": { "title": "Unterbesetzt", "text": "{open} von {required} Plätzen noch offen. Der Tag beginnt um {start}." },
    "ready": { "title": "Bereit", "text": "Alle {required} Plätze sind besetzt. Nichts zu tun, bis die Kräfte einchecken." },
    "cancelled": { "title": "Tag storniert", "text": "Zugewiesene Kräfte wurden freigegeben." }
  },
  "supervisor": "Verantwortliche Kraft",
  "supervisorSub": "erste Kraft beim Einchecken",
  "supervisorNotYet": "Noch nicht — die erste Kraft beim Einchecken",
  "supervisorNone": "Nicht erfasst",
  "summary": "Arbeitsbericht",
  "summaryLater": "Wird von der verantwortlichen Kraft bei der Abgabe geschrieben.",
  "summaryNone": "Es wurde kein Bericht geschrieben.",
  "workers": "Kräfte",
  "openCount": "{count} offen",
  "fullyStaffed": "voll besetzt",
  "released": "freigegeben",
  "columns": {
    "worker": "Kraft",
    "outcome": "Ergebnis",
    "checkIn": "Check-in",
    "checkOut": "Check-out",
    "rating": "Bewertung",
    "actions": "Aktionen"
  },
  "supervisorTag": "Verantwortlich",
  "openSlot": "Offener Platz {n}",
  "nobody": "An diesem Tag war niemand eingeteilt.",
  "noActions": "Keine Aktionen — dieser Tag ist abgeschlossen",
  "outcomes": {
    "Pending": "Ausstehend",
    "Completed": "Erledigt",
    "NoShow": "Nicht erschienen",
    "Removed": "Entfernt",
    "Cancelled": "Storniert"
  },
  "page": {
    "errorTitle": "Diese Buchung konnte nicht geladen werden",
    "errorText": "Der Server hat nicht geantwortet. Ihre Daten sind sicher — versuchen Sie es erneut.",
    "retry": "Erneut versuchen",
    "notFoundTitle": "Buchung nicht gefunden",
    "notFoundText": "Sie wurde möglicherweise gelöscht, oder der Link ist falsch.",
    "forbiddenTitle": "Sie können diese Buchung nicht öffnen",
    "forbiddenText": "Ihre Rolle umfasst keine Buchungsdetails. Bitten Sie einen Super-Admin um Zugriff."
  }
}
```

- [ ] **Step 4: Verify both files parse and are key-for-key identical under `tasks.detail`**

Run:
```bash
node -e "const flat=(o,p='')=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?flat(v,p+k+'.'):[p+k]);const e=flat(require('./messages/en.json').tasks.detail).sort(),d=flat(require('./messages/de.json').tasks.detail).sort();const a=e.filter(k=>!d.includes(k)),b=d.filter(k=>!e.includes(k));console.log(e.length,d.length,a,b);process.exit(a.length||b.length?1:0)"
```
Expected: two equal counts, followed by `[] []`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/de.json
git commit -m "feat(tasks): Task Detail messages (en + de)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Day components — chip, timeline, alert, workers

**Files:**
- Create: `components/tasks/detail/day-state-chip.tsx`
- Create: `components/tasks/detail/day-timeline.tsx`
- Create: `components/tasks/detail/day-alert.tsx`
- Create: `components/tasks/detail/day-workers.tsx`

**Interfaces:**
- Consumes: from Tasks 1–4, `dayTone`, `DayTone`, `daySteps`, `DayStep`, `StepState`, `StepTime`, `Label`,
  `dayAlert`, `DayAlert`, `rowActions`, `openSlots`, `formatHm`, `instant`, `workerLabel`, and
  `activeWorkers`. Also `CheckinDoorLabel` (`components/attendance/checkin-door-label.tsx`) and `Can`.
- Produces:
  - `DAY_TONE_CLASS: Record<DayTone, { chip: string; dot: string; bar: string }>`
  - `<DayStateChip task={TaskItemDto} />`
  - `<DayTimeline task complaint locale />`
  - `<DayAlertBox task complaint now locale />`
  - `<DayWorkers task now locale onAssign onRate onOutcome onUnassign />`, whose handlers are
    `() => void` and `(tw: TaskWorkerDto) => void`

There are no component tests, by design (CLAUDE.md). The behaviour is in the tested `lib/` functions; these
files are checked by `tsc`, `lint`, `build` and the browser pass in Task 10.

- [ ] **Step 1: Write `day-state-chip.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { dayTone, type DayTone } from "@/lib/tasks/detail/day-view";
import type { TaskItemDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

/**
 * The detail page's own day-state tones, after the design (Done forest,
 * Checked in fresh, In review amber, Disputed red, Pending and Cancelled grey).
 * ⚠ Not `TaskStatusBadge`: four other screens use that one's tones.
 */
export const DAY_TONE_CLASS: Record<DayTone, { chip: string; dot: string; bar: string }> = {
  done: { chip: "bg-status-verified-tint text-status-verified", dot: "bg-status-verified", bar: "bg-status-verified" },
  checkedIn: { chip: "bg-status-active-tint text-status-active", dot: "bg-status-active", bar: "bg-status-active" },
  inReview: { chip: "bg-status-pending-tint text-status-pending-deep", dot: "bg-status-pending", bar: "bg-status-pending" },
  rejected: { chip: "bg-status-cancelled-tint text-status-cancelled-deep", dot: "bg-status-cancelled", bar: "bg-status-cancelled" },
  pending: { chip: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50", bar: "bg-muted-foreground/25" },
  cancelled: {
    chip: "bg-muted text-muted-foreground/70",
    dot: "bg-muted-foreground/30",
    bar: "bg-[repeating-linear-gradient(135deg,var(--color-muted)_0_4px,var(--color-background)_4px_8px)]",
  },
  unknown: { chip: "text-muted-foreground ring-1 ring-inset ring-border", dot: "bg-muted-foreground/40", bar: "bg-muted" },
};

export function DayStateChip({ task, className }: { task: TaskItemDto; className?: string }) {
  const t = useTranslations("tasks.detail.states");
  const tone = dayTone(task);
  const c = DAY_TONE_CLASS[tone];
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 self-start rounded-md px-2 text-[11px] font-semibold",
        c.chip,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", c.dot)} />
      {/* An unknown state prints the server's word, never a guess. */}
      {tone === "unknown" ? task.status || "–" : t(tone)}
    </span>
  );
}
```

- [ ] **Step 2: Write `day-timeline.tsx`**

```tsx
"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatHm } from "@/lib/tasks/detail/day-time";
import { daySteps, type Label, type StepState, type StepTime } from "@/lib/tasks/detail/day-view";
import type { TaskComplaintDto, TaskItemDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

const DOT: Record<StepState, string> = {
  ok: "bg-primary text-primary-foreground",
  current: "bg-primary text-primary-foreground ring-4 ring-status-verified-tint",
  bad: "bg-status-cancelled text-background",
  badOpen: "bg-card ring-2 ring-inset ring-status-cancelled",
  skip: "bg-card ring-2 ring-inset ring-border",
  cancel: "bg-muted-foreground text-background",
  todo: "bg-card ring-2 ring-inset ring-border",
  off: "bg-card ring-2 ring-inset ring-muted",
};

const LINE: Record<StepState, string> = {
  ok: "bg-primary",
  current: "bg-primary",
  bad: "bg-status-cancelled",
  badOpen: "bg-status-cancelled",
  skip: "bg-border",
  cancel: "bg-border",
  todo: "bg-border",
  off: "bg-muted",
};

const LABEL: Record<StepState, string> = {
  ok: "text-foreground",
  current: "text-foreground",
  bad: "text-status-cancelled-deep",
  badOpen: "text-status-cancelled-deep",
  skip: "text-muted-foreground",
  cancel: "text-foreground",
  todo: "text-muted-foreground",
  off: "text-muted-foreground/60",
};

export function DayTimeline({
  task,
  complaint,
  locale,
}: {
  task: TaskItemDto;
  complaint: TaskComplaintDto | null;
  locale: string;
}) {
  const t = useTranslations("tasks.detail");
  const steps = daySteps(task, complaint);

  const label = (l: Label) => ("raw" in l ? l.raw : l.key in CLOSURE_KEYS ? t(`closure.${l.key}`) : t(`steps.${l.key}`));
  const time = (s: StepTime) => {
    switch (s.kind) {
      case "at":
        return formatHm(s.at, locale);
      case "about":
        return t("steps.about", { time: formatHm(s.at, locale) });
      case "auto":
        return t("steps.auto", { time: formatHm(s.at, locale) });
      case "beforeStart":
        return t("steps.beforeStart");
      case "skipped":
        return t("steps.skipped");
      default:
        return "–";
    }
  };

  return (
    <ol className="grid gap-3 md:grid-cols-4 md:gap-0">
      {steps.map((s, i) => {
        const next = steps[i + 1];
        const filled = s.state === "ok" || s.state === "current" || s.state === "bad" || s.state === "cancel";
        return (
          <li key={i} className="flex gap-3 md:flex-col md:gap-2">
            <div className="flex items-center md:w-full">
              <span className={cn("flex size-[22px] flex-none items-center justify-center rounded-full", DOT[s.state])}>
                {s.state === "cancel" ? (
                  <X className="size-3" strokeWidth={3} />
                ) : filled ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : null}
              </span>
              {next ? <span aria-hidden className={cn("hidden h-0.5 flex-1 md:block", LINE[next.state])} /> : null}
            </div>
            <span className="flex flex-col gap-0.5 md:pr-3">
              <span className={cn("text-[13px] font-semibold", LABEL[s.state])}>{label(s.label)}</span>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{time(s.time)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Step 4 of a Done day carries a closure-reason key; those words live under `closure.*`. */
const CLOSURE_KEYS: Record<string, true> = {
  OwnerAccepted: true,
  AutoAccepted: true,
  ClosedForced: true,
  ClosedReplacement: true,
};
```

⚠ Note on `label`: `closureLabel(null)` returns `{ key: "closed" }`, which resolves to `steps.closed`. That key
exists in Task 6 ("Closed"), so a legacy Done day reads "Closed". It never reads "Accepted".

- [ ] **Step 3: Write `day-alert.tsx`**

```tsx
"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { dayAlert, type AlertTone, type DayAlert } from "@/lib/tasks/detail/day-alert";
import { formatHm } from "@/lib/tasks/detail/day-time";
import type { TaskComplaintDto, TaskItemDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

const TONE: Record<AlertTone, { box: string; tile: string; title: string }> = {
  critical: {
    box: "bg-status-cancelled-tint/50 ring-status-cancelled/25",
    tile: "bg-status-cancelled-tint text-status-cancelled-deep",
    title: "text-status-cancelled-deep",
  },
  warning: {
    box: "bg-status-pending-tint/60 ring-status-pending/25",
    tile: "bg-status-pending-tint text-status-pending-deep",
    title: "text-status-pending-deep",
  },
  positive: {
    box: "bg-status-verified-tint/50 ring-status-verified/20",
    tile: "bg-status-verified-tint text-status-verified",
    title: "text-status-verified",
  },
  neutral: { box: "bg-muted/60 ring-border", tile: "bg-muted text-muted-foreground", title: "text-foreground" },
};

const ICON = { critical: AlertTriangle, warning: AlertTriangle, positive: CheckCircle2, neutral: Info } as const;

export function DayAlertBox({
  task,
  complaint,
  now,
  locale,
}: {
  task: TaskItemDto;
  complaint: TaskComplaintDto | null;
  now: number;
  locale: string;
}) {
  const t = useTranslations("tasks.detail.alerts");
  const alert = dayAlert(task, complaint, now);
  if (!alert) return null;

  const hm = (ms: number | null) => (ms === null ? "–" : formatHm(ms, locale));
  const dt = (ms: number | null) =>
    ms === null ? "–" : new Date(ms).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  const { title, text } = words(alert, t, hm, dt);
  const tone = TONE[alert.tone];
  const Icon = alert.kind === "cancelled" ? XCircle : ICON[alert.tone];

  return (
    <div className={cn("flex items-start gap-3 rounded-xl p-3 ring-1 ring-inset", tone.box)}>
      <span className={cn("flex size-9 flex-none items-center justify-center rounded-[10px]", tone.tile)}>
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("text-[13px] font-semibold", tone.title)}>{title}</span>
        {text ? <span className="text-[13px] leading-snug text-foreground/80 text-pretty">{text}</span> : null}
      </span>
    </div>
  );
}

type T = ReturnType<typeof useTranslations<"tasks.detail.alerts">>;

function words(
  a: DayAlert,
  t: T,
  hm: (ms: number | null) => string,
  dt: (ms: number | null) => string,
): { title: string; text: string | null } {
  switch (a.kind) {
    case "complaint":
      return { title: t("complaint.title"), text: t("complaint.text", { reason: a.reason, photos: a.photos, raised: dt(a.raisedAt) }) };
    case "complaintUnloaded":
      return { title: t("complaintUnloaded.title"), text: t("complaintUnloaded.text") };
    case "late":
      return { title: t("late.title"), text: t("late.text", { names: a.names.join(", "), count: a.names.length, minutes: a.minutes }) };
    case "startPassed":
      return { title: t("startPassed.title"), text: t("startPassed.text", { time: hm(a.cancelsAt) }) };
    case "waitingOwner":
      return { title: t("waitingOwner.title"), text: t("waitingOwner.text", { handed: hm(a.handedAt), auto: hm(a.autoAt) }) };
    case "upheld": {
      const decided =
        a.decidedAt === null
          ? ""
          : a.note
            ? `${t("upheld.decided", { date: dt(a.decidedAt), note: a.note })} `
            : `${t("upheld.decidedNoNote", { date: dt(a.decidedAt) })} `;
      return { title: t("upheld.title"), text: `${decided}${t("upheld.text")}` };
    }
    case "forced":
      return { title: t("forced.title"), text: t("forced.text") };
    case "autoAccepted":
      return { title: t("autoAccepted.title"), text: t("autoAccepted.text") };
    case "legacyClosed":
      return { title: t("legacyClosed.title"), text: t("legacyClosed.text") };
    case "unknownReason":
      return { title: a.reason, text: null };
    case "noWorkers":
      return { title: t("noWorkers.title"), text: t("noWorkers.text", { required: a.required, start: hm(a.startsAt) }) };
    case "understaffed":
      return { title: t("understaffed.title"), text: t("understaffed.text", { open: a.open, required: a.required, start: hm(a.startsAt) }) };
    case "ready":
      return { title: t("ready.title"), text: t("ready.text", { required: a.required }) };
    case "cancelled":
      return { title: t("cancelled.title"), text: t("cancelled.text") };
  }
}
```

If `ReturnType<typeof useTranslations<"tasks.detail.alerts">>` doesn't typecheck with this next-intl version,
replace the `T` alias with `(key: string, values?: Record<string, string | number>) => string` and pass `t` cast
`as unknown as T`. The repo's other pure helpers type `t` this way (see `components/tasks/group-cancel-toast.ts`'s
`Translate` type, and reuse it if it fits).

- [ ] **Step 4: Write `day-workers.tsx`**

```tsx
"use client";

import { RefreshCw, Star, UserMinus, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { CheckinDoorLabel } from "@/components/attendance/checkin-door-label";
import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import { openSlots, rowActions, type RowActionKey } from "@/lib/tasks/detail/day-actions";
import { formatHm, instant, lateWorkers, workerLabel } from "@/lib/tasks/detail/day-time";
import { activeWorkers } from "@/lib/tasks/staffing";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import { normalizeStatus, type TaskItemDto, type TaskWorkerDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

const OUTCOME_TONE: Record<string, string> = {
  completed: "bg-status-verified-tint text-status-verified",
  pending: "bg-muted text-muted-foreground",
  noshow: "bg-status-cancelled-tint text-status-cancelled-deep",
  removed: "bg-status-cancelled-tint text-status-cancelled-deep",
  cancelled: "bg-muted text-muted-foreground/70",
};
const OUTCOME_KEY: Record<string, string> = {
  completed: "Completed",
  pending: "Pending",
  noshow: "NoShow",
  removed: "Removed",
  cancelled: "Cancelled",
};

const ROW_GRID = "md:grid md:grid-cols-[minmax(0,2.2fr)_1.1fr_1.4fr_1fr_0.8fr_104px] md:items-center md:gap-3";

const PERMISSION: Record<RowActionKey, string> = {
  rate: "task_worker:rate_any",
  outcome: "task_worker:mark_outcome_any",
  unassign: "task:unassign_worker_any",
};

export function DayWorkers({
  task,
  now,
  locale,
  onAssign,
  onRate,
  onOutcome,
  onUnassign,
}: {
  task: TaskItemDto;
  now: number;
  locale: string;
  onAssign: () => void;
  onRate: (tw: TaskWorkerDto) => void;
  onOutcome: (tw: TaskWorkerDto) => void;
  onUnassign: (tw: TaskWorkerDto) => void;
}) {
  const t = useTranslations("tasks.detail");
  const tActions = useTranslations("tasks.actions");
  const state = canonicalTaskStatus(task.status);
  const workers = task.workers ?? [];
  const slots = openSlots(task);
  const filled = activeWorkers(task).length;
  const late = new Set(lateWorkers(task, now).map((w) => w.id));
  const open = state === "pending" || state === "checkedIn";
  const cancelled = state === "cancelled";

  const staffTone =
    !open ? "text-muted-foreground" : filled === 0 ? "text-status-cancelled-deep" : filled < task.requiredWorkerCount ? "text-status-pending-deep" : "text-muted-foreground";
  const staffNote = cancelled ? t("released") : !open ? "" : slots > 0 ? t("openCount", { count: slots }) : t("fullyStaffed");
  const hm = (iso: string | null) => {
    const ms = instant(iso);
    return ms === null ? "–" : formatHm(ms, locale);
  };
  const handler: Record<RowActionKey, (tw: TaskWorkerDto) => void> = { rate: onRate, outcome: onOutcome, unassign: onUnassign };
  const icon: Record<RowActionKey, React.ReactNode> = {
    rate: <Star className="size-4" />,
    outcome: <RefreshCw className="size-4" />,
    unassign: <UserMinus className="size-4" />,
  };
  const iconLabel: Record<RowActionKey, string> = {
    rate: tActions("rate"),
    outcome: tActions("outcome"),
    unassign: tActions("unassign"),
  };

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-bold">
          {t("workers")}{" "}
          {!cancelled ? (
            <span className={cn("font-mono text-[13px] tabular-nums", staffTone)}>
              {filled}/{task.requiredWorkerCount}
            </span>
          ) : null}
        </h3>
        {staffNote ? <span className="text-xs text-muted-foreground">{staffNote}</span> : null}
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-inset ring-border">
        <div className={cn("hidden border-b bg-muted/40 px-3.5 py-2 text-muted-foreground", ROW_GRID)}>
          <span className="overline-label">{t("columns.worker")}</span>
          <span className="overline-label">{t("columns.outcome")}</span>
          <span className="overline-label">{t("columns.checkIn")}</span>
          <span className="overline-label">{t("columns.checkOut")}</span>
          <span className="overline-label">{t("columns.rating")}</span>
          <span className="overline-label text-right">{t("columns.actions")}</span>
        </div>

        {workers.map((tw) => {
          const outcome = normalizeStatus(tw.outcome);
          const isSup = tw.workerId === task.supervisorWorkerId;
          const noShow = outcome === "noshow";
          const actions = rowActions(task, tw, now);
          const name = workerLabel(tw);
          return (
            <div
              key={tw.id}
              className={cn(
                "flex flex-col gap-2 border-b px-3.5 py-3 last:border-b-0",
                ROW_GRID,
                noShow && "bg-status-cancelled-tint/30",
              )}
            >
              <div className="flex items-center justify-between gap-2 md:contents">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-8 flex-none items-center justify-center rounded-full text-xs font-semibold",
                      isSup ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    {initials(name)}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        "truncate text-[13px] font-semibold",
                        noShow && "text-status-cancelled-deep",
                        outcome === "cancelled" && "text-muted-foreground",
                      )}
                    >
                      {name}
                    </span>
                    {isSup ? <span className="text-[11px] font-semibold text-status-active">{t("supervisorTag")}</span> : null}
                  </span>
                </span>
                {/* The row's one badge. */}
                <span
                  className={cn(
                    "inline-flex h-5 items-center self-center rounded-md px-2 text-[11px] font-semibold md:justify-self-start",
                    OUTCOME_TONE[outcome] ?? "text-muted-foreground ring-1 ring-inset ring-border",
                  )}
                >
                  {OUTCOME_KEY[outcome] ? t(`outcomes.${OUTCOME_KEY[outcome]}`) : tw.outcome || "–"}
                </span>
              </div>

              <dl className="grid grid-cols-3 gap-2 text-xs md:contents">
                <div className="flex flex-col gap-0.5">
                  <dt className="overline-label text-muted-foreground md:hidden">{t("columns.checkIn")}</dt>
                  <dd className="flex flex-col gap-0.5">
                    <span className={cn("font-mono text-[13px] tabular-nums", late.has(tw.id) && "text-status-cancelled-deep")}>
                      {hm(tw.checkinAt)}
                    </span>
                    <CheckinDoorLabel door={tw.checkinDoor} />
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="overline-label text-muted-foreground md:hidden">{t("columns.checkOut")}</dt>
                  <dd className="font-mono text-[13px] tabular-nums">{hm(tw.checkoutAt)}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="overline-label text-muted-foreground md:hidden">{t("columns.rating")}</dt>
                  <dd className="flex items-center gap-1 font-mono text-[13px] tabular-nums">
                    <Star
                      className={cn(
                        "size-3.5",
                        tw.starRating != null ? "fill-status-pending text-status-pending" : "text-muted-foreground/40",
                      )}
                    />
                    {tw.starRating != null ? tw.starRating.toFixed(1) : "–"}
                  </dd>
                </div>
              </dl>

              <div className="flex justify-end gap-0.5">
                {actions.map((key) => (
                  <Can key={key} permission={PERMISSION[key]}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={iconLabel[key]}
                      aria-label={iconLabel[key]}
                      className={key === "unassign" ? "text-destructive" : undefined}
                      onClick={() => handler[key](tw)}
                    >
                      {icon[key]}
                    </Button>
                  </Can>
                ))}
              </div>
            </div>
          );
        })}

        {Array.from({ length: slots }, (_, k) => (
          <div key={`slot-${k}`} className="flex items-center justify-between gap-3 border-b bg-muted/20 px-3.5 py-3 last:border-b-0">
            <span className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full text-muted-foreground ring-[1.5px] ring-inset ring-border">
                <UserPlus className="size-3.5" />
              </span>
              <span className="text-[13px] text-muted-foreground">{t("openSlot", { n: filled + k + 1 })}</span>
            </span>
            <Can permission="task:assign_worker_any">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onAssign}>
                <UserPlus className="size-3.5" />
                {tActions("assign")}
              </Button>
            </Can>
          </div>
        ))}

        {workers.length === 0 && slots === 0 ? (
          <p className="px-3.5 py-5 text-center text-[13px] text-muted-foreground">{t("nobody")}</p>
        ) : null}
      </div>
    </section>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "–";
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `components/tasks/detail/*`. The old page still compiles, because nothing it imports
changed. If the `T` alias in `day-alert.tsx` fails, apply the fallback given under Step 3.

- [ ] **Step 6: Commit**

```bash
git add components/tasks/detail/day-state-chip.tsx components/tasks/detail/day-timeline.tsx components/tasks/detail/day-alert.tsx components/tasks/detail/day-workers.tsx
git commit -m "feat(tasks): detail day components — chip, timeline, alert, workers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Page-level components — panel, days list, rail, header, states, modals

**Files:**
- Create: `components/tasks/detail/day-panel.tsx`
- Create: `components/tasks/detail/days-list.tsx`
- Create: `components/tasks/detail/day-rail.tsx`
- Create: `components/tasks/detail/detail-header-card.tsx`
- Create: `components/tasks/detail/detail-page-state.tsx`
- Create: `components/tasks/detail/detail-modals.tsx`

**Interfaces:**
- Consumes: Task 7 components, plus `dayActions`, `isClosedDay`, `dayNote`, `dayStaffing`, `closureLabel`,
  `legendCounts`, `windowFact`, `workersFact`, `datesFact`, `isSingleDay`, `Place`, `GroupLoadFailure`,
  `formatDayLong`, `formatDayParts`, `formatHm` and `formatDateTime`. Also the existing `closureTally`,
  `toolsAnswerKey` and `TOOLS_MESSAGE` (`lib/tasks/order-facts.ts`), every existing dialog, and the existing
  mutation hooks.
- Produces:
  - `type DetailModal` (the same union as the old page's `ModalState`)
  - `<DetailModals modal group groupId sourceIsWalkIn onClose />`
  - `<DayPanel task complaint now locale todayKey onModal />`, where
    `onModal: (m: Exclude<DetailModal, null>) => void`
  - `<DaysList days selectedId onSelect now locale group />`
  - `<DayRail days selectedId onSelect locale />`
  - `<DetailHeaderCard group days selectedId onSelect single ownerName place locale />`
  - `<DetailSkeleton single />`, `<DetailFailure kind onRetry />`

- [ ] **Step 1: Write `detail-modals.tsx`** (moved from the old page; behaviour unchanged)

```tsx
"use client";

import { useTranslations } from "next-intl";
import { AssignWorkerDialog } from "@/components/tasks/assign-worker-dialog";
import { CloneOrderDialog } from "@/components/tasks/clone-order-dialog";
import { ConfirmDialog } from "@/components/tasks/confirm-dialog";
import { ForceCloseDialog } from "@/components/tasks/force-close-dialog";
import { toastGroupCancel } from "@/components/tasks/group-cancel-toast";
import { OutcomeDialog } from "@/components/tasks/outcome-dialog";
import { RateTeamDialog } from "@/components/tasks/rate-team-dialog";
import { RateWorkerDialog } from "@/components/tasks/rate-worker-dialog";
import { SupervisorOverrideDialog } from "@/components/tasks/supervisor-override-dialog";
import { useAssignWorker, useCancelTaskGroup, useRateWorker, useUnassignWorker } from "@/hooks/use-tasks";
import { useClock } from "@/hooks/use-today";
import { getValidationMessage } from "@/lib/http/api-error";
import { outcomeChoices } from "@/lib/tasks/outcome-override";
import { ratingErrorKey } from "@/lib/tasks/team-rating";
import type { TaskGroupDto, TaskItemDto, TaskWorkerDto } from "@/lib/types/task.types";

export type DetailModal =
  | { type: "cancelGroup" }
  | { type: "clone" }
  | { type: "assign"; taskId: string }
  | { type: "supervisor"; task: TaskItemDto }
  | { type: "forceClose"; task: TaskItemDto }
  | { type: "rateTeam"; task: TaskItemDto }
  | { type: "rate"; taskId: string; tw: TaskWorkerDto }
  | { type: "outcome"; task: TaskItemDto; tw: TaskWorkerDto }
  | { type: "unassign"; taskId: string; tw: TaskWorkerDto }
  | null;

/** Conditionally mounted dialogs, so each open starts with fresh state. */
export function DetailModals({
  modal,
  group,
  groupId,
  sourceIsWalkIn,
  onClose,
}: {
  modal: DetailModal;
  group: TaskGroupDto;
  groupId: string;
  sourceIsWalkIn: boolean | null;
  onClose: () => void;
}) {
  const t = useTranslations("tasks");
  const cancelGroup = useCancelTaskGroup();
  const assignWorker = useAssignWorker(groupId);
  const unassignWorker = useUnassignWorker(groupId);
  const rateWorker = useRateWorker(groupId);
  const clock = useClock();

  const close = () => {
    // The per-worker star keeps its last refusal in the mutation; reset only an
    // error — a reset mid-flight would drop the pending call's callbacks.
    if (rateWorker.isError) rateWorker.reset();
    onClose();
  };
  const rateWorkerError = (err: unknown): string | null => {
    if (!err) return null;
    const key = ratingErrorKey(err);
    return key ? t(`rateErrors.${key}`) : (getValidationMessage(err) ?? t("rateErrors.generic"));
  };
  const name = (tw: TaskWorkerDto) => tw.workerName ?? tw.workerId.slice(0, 8);

  if (!modal) return null;
  switch (modal.type) {
    case "supervisor":
      return <SupervisorOverrideDialog open onClose={close} task={modal.task} groupId={groupId} />;
    case "forceClose":
      return <ForceCloseDialog open onClose={close} task={modal.task} groupId={groupId} />;
    case "cancelGroup":
      return (
        <ConfirmDialog
          open
          onClose={close}
          isPending={cancelGroup.isPending}
          title={t("actions.cancelGroupTitle")}
          description={t("actions.cancelGroupConfirm")}
          confirmLabel={t("actions.cancelGroup")}
          destructive
          onConfirm={() =>
            cancelGroup.mutate(
              { id: groupId, before: group.days },
              {
                onSuccess: (outcome) => {
                  toastGroupCancel(outcome, t);
                  close();
                },
              },
            )
          }
        />
      );
    case "clone":
      return sourceIsWalkIn === null ? null : (
        <CloneOrderDialog open onClose={close} source={group} isWalkIn={sourceIsWalkIn} />
      );
    case "assign":
      return (
        <AssignWorkerDialog
          open
          onClose={close}
          isPending={assignWorker.isPending}
          onAssign={(workerId) => assignWorker.mutate({ taskId: modal.taskId, workerId }, { onSuccess: close })}
        />
      );
    case "rateTeam":
      return <RateTeamDialog open onClose={close} task={modal.task} groupId={groupId} />;
    case "rate":
      return (
        <RateWorkerDialog
          open
          onClose={close}
          isPending={rateWorker.isPending}
          workerName={name(modal.tw)}
          initial={modal.tw.starRating}
          error={rateWorkerError(rateWorker.error)}
          onStarsChange={() => {
            if (rateWorker.isError) rateWorker.reset();
          }}
          onConfirm={(stars) =>
            rateWorker.mutate(
              { taskId: modal.taskId, workerId: modal.tw.workerId, body: { stars } },
              { onSuccess: close },
            )
          }
        />
      );
    case "outcome":
      return (
        <OutcomeDialog
          open
          onClose={close}
          taskId={modal.task.id}
          worker={modal.tw}
          choices={outcomeChoices(modal.task, modal.tw.outcome, clock)}
          groupId={groupId}
        />
      );
    case "unassign":
      return (
        <ConfirmDialog
          open
          onClose={close}
          isPending={unassignWorker.isPending}
          title={t("actions.unassignTitle")}
          description={t("actions.unassignConfirm", { name: name(modal.tw) })}
          confirmLabel={t("actions.unassign")}
          destructive
          onConfirm={() =>
            unassignWorker.mutate({ taskId: modal.taskId, workerId: modal.tw.workerId }, { onSuccess: close })
          }
        />
      );
  }
}
```

- [ ] **Step 2: Write `day-panel.tsx`**

```tsx
"use client";

import { LockKeyhole, MessageSquareWarning, ShieldCheck, Star, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Can } from "@/components/auth/can";
import { DayAlertBox } from "@/components/tasks/detail/day-alert";
import { DayStateChip } from "@/components/tasks/detail/day-state-chip";
import { DayTimeline } from "@/components/tasks/detail/day-timeline";
import { DayWorkers } from "@/components/tasks/detail/day-workers";
import type { DetailModal } from "@/components/tasks/detail/detail-modals";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { dayActions, isClosedDay } from "@/lib/tasks/detail/day-actions";
import { formatDayLong, formatHm, instant } from "@/lib/tasks/detail/day-time";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";
import type { TaskComplaintDto, TaskItemDto } from "@/lib/types/task.types";

export function DayPanel({
  task,
  complaint,
  now,
  locale,
  todayKey,
  onModal,
}: {
  task: TaskItemDto;
  complaint: TaskComplaintDto | null;
  now: number;
  locale: string;
  todayKey: string;
  onModal: (m: Exclude<DetailModal, null>) => void;
}) {
  const t = useTranslations("tasks.detail");
  const tTasks = useTranslations("tasks");
  const state = canonicalTaskStatus(task.status);
  const actions = dayActions(task);
  const start = instant(task.scheduledAt);
  const end = instant(task.deadline);
  const count = task.requiredWorkerCount;
  const windowLine =
    start === null
      ? null
      : end === null
        ? t("dayWindowOpen", { start: formatHm(start, locale), count })
        : t("dayWindow", { start: formatHm(start, locale), end: formatHm(end, locale), count });
  const title = `${formatDayLong(task.scheduledDate, locale)}${task.scheduledDate === todayKey ? ` · ${t("today")}` : ""}`;

  const supervisor = (task.workers ?? []).find((w) => w.workerId === task.supervisorWorkerId);
  const openDay = state === "pending" || state === "checkedIn";
  const supervisorText = supervisor
    ? (supervisor.workerName ?? supervisor.workerId.slice(0, 8))
    : openDay
      ? t("supervisorNotYet")
      : state === "cancelled"
        ? "–"
        : t("supervisorNone");
  const summary = task.workSummary?.trim();
  const summaryText = summary || (openDay ? t("summaryLater") : state === "cancelled" ? "–" : t("summaryNone"));

  return (
    <Card className="gap-5 px-5 py-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            <DayStateChip task={task} />
          </div>
          {windowLine ? <span className="text-[13px] text-muted-foreground">{windowLine}</span> : null}
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {actions.includes("supervisor") ? (
            <Can permission="task:supervisor_override_any">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onModal({ type: "supervisor", task })}>
                <ShieldCheck className="size-3.5" />
                {tTasks("supervisor.submit")}
              </Button>
            </Can>
          ) : null}
          {actions.includes("forceClose") ? (
            <Can permission="task:force_close_any">
              <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => onModal({ type: "forceClose", task })}>
                <LockKeyhole className="size-3.5" />
                {tTasks("forceClose.action")}
              </Button>
            </Can>
          ) : null}
          {actions.includes("assign") ? (
            <Can permission="task:assign_worker_any">
              <Button size="sm" className="gap-1.5" onClick={() => onModal({ type: "assign", taskId: task.id })}>
                <UserPlus className="size-3.5" />
                {tTasks("actions.assign")}
              </Button>
            </Can>
          ) : null}
          {actions.includes("openComplaint") ? (
            <Button size="sm" nativeButton={false} className="gap-1.5" render={<Link href={`/dashboard/complaints/${task.id}`} />}>
              <MessageSquareWarning className="size-3.5" />
              {tTasks("actions.viewComplaint")}
            </Button>
          ) : null}
          {actions.includes("rateTeam") ? (
            <Can permission="task_worker:rate_any">
              <Button size="sm" className="gap-1.5" onClick={() => onModal({ type: "rateTeam", task })}>
                <Star className="size-3.5" />
                {tTasks("rateTeam.action")}
              </Button>
            </Can>
          ) : null}
          {actions.length === 0 && isClosedDay(task) ? (
            <span className="flex h-8 items-center text-xs text-muted-foreground">{t("noActions")}</span>
          ) : null}
        </div>
      </div>

      <DayTimeline task={task} complaint={complaint} locale={locale} />
      <DayAlertBox task={task} complaint={complaint} now={now} locale={locale} />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-3 ring-1 ring-inset ring-border">
          <span className="overline-label text-muted-foreground">{t("supervisor")}</span>
          <span className="text-sm font-semibold">{supervisorText}</span>
          <span className="text-[11px] text-muted-foreground">{t("supervisorSub")}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-3 ring-1 ring-inset ring-border">
          <span className="overline-label text-muted-foreground">{t("summary")}</span>
          <span className={summary ? "whitespace-pre-wrap text-[13px] leading-relaxed" : "text-[13px] text-muted-foreground"}>
            {summaryText}
          </span>
        </div>
      </div>

      <DayWorkers
        task={task}
        now={now}
        locale={locale}
        onAssign={() => onModal({ type: "assign", taskId: task.id })}
        onRate={(tw) => onModal({ type: "rate", taskId: task.id, tw })}
        onOutcome={(tw) => onModal({ type: "outcome", task, tw })}
        onUnassign={(tw) => onModal({ type: "unassign", taskId: task.id, tw })}
      />
    </Card>
  );
}
```

The panel's primary actions (Assign, Open complaint, Rate team) use `variant="default"` (solid forest). At most
one of them shows per state (see `dayActions`), so each panel has exactly one solid action.

- [ ] **Step 3: Write `day-rail.tsx`**

```tsx
"use client";

import { DAY_TONE_CLASS } from "@/components/tasks/detail/day-state-chip";
import { formatDayParts } from "@/lib/tasks/detail/day-time";
import { dayTone } from "@/lib/tasks/detail/day-view";
import type { TaskItemDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

/** One bar per day, 7 per row (days need not be consecutive, so a row is not a week). */
export function DayRail({
  days,
  selectedId,
  onSelect,
  locale,
}: {
  days: TaskItemDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  locale: string;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const { wd, dd } = formatDayParts(d.scheduledDate, locale);
        const selected = d.id === selectedId;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(d.id)}
            aria-pressed={selected}
            aria-label={`${wd} ${dd}`}
            className="flex flex-col gap-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <span
              className={cn(
                "h-2 rounded-full",
                DAY_TONE_CLASS[dayTone(d)].bar,
                selected && "ring-2 ring-primary ring-offset-2 ring-offset-card",
              )}
            />
            <span className={cn("font-mono text-[11px] tabular-nums", selected ? "text-foreground" : "text-muted-foreground")}>
              {wd} {dd}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Write `days-list.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { DayStateChip } from "@/components/tasks/detail/day-state-chip";
import { Card } from "@/components/ui/card";
import { formatDayParts, formatHm } from "@/lib/tasks/detail/day-time";
import { closureLabel, dayNote, dayStaffing, type NoteTone } from "@/lib/tasks/detail/day-view";
import { closureTally } from "@/lib/tasks/order-facts";
import type { TaskGroupDto, TaskItemDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

const NOTE_TONE: Record<NoteTone, string> = {
  muted: "text-muted-foreground",
  warning: "text-status-pending-deep",
  danger: "text-status-cancelled-deep",
};

export function DaysList({
  days,
  selectedId,
  onSelect,
  now,
  locale,
  group,
}: {
  days: TaskItemDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  now: number;
  locale: string;
  group: TaskGroupDto;
}) {
  const t = useTranslations("tasks.detail");
  const tally = closureTally(group.closed, group.days?.done);
  const count = (key: string) => tally?.rows.find((r) => r.key === key)?.count ?? 0;

  const noteText = (task: TaskItemDto) => {
    const n = dayNote(task, now);
    switch (n.key) {
      case "unfilled":
      case "late":
        return t(`notes.${n.key}`, { count: n.count ?? 0 });
      case "onSite":
        return n.at != null ? t("notes.onSite", { time: formatHm(n.at, locale) }) : t("notes.onSiteUnknown");
      case "closure": {
        const l = closureLabel(n.reason ?? null);
        return "raw" in l ? l.raw : t(`closure.${l.key}`);
      }
      case "none":
        return "–";
      default:
        return t(`notes.${n.key}`);
    }
  };

  return (
    <Card className="gap-1 px-2.5 pt-3.5 pb-2.5">
      <div className="flex flex-col gap-0.5 px-2 pb-2">
        <h2 className="text-[15px] font-bold">{t("days")}</h2>
        {/* `closed` does not sum to `days.done` before 2026-09-21 — the remainder is
            "no reason", never a discrepancy. */}
        {tally ? (
          <span className="text-[11px] text-muted-foreground">
            {t("tally", {
              accepted: count("ownerAccepted"),
              auto: count("autoAccepted"),
              forced: count("closedForced"),
              upheld: count("closedReplacement"),
            })}
            {tally.unexplained > 0 ? ` · ${t("tallyNoReason", { count: tally.unexplained })}` : null}
          </span>
        ) : null}
      </div>
      <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-1">
        {days.map((d) => {
          const { wd, dd } = formatDayParts(d.scheduledDate, locale);
          const selected = d.id === selectedId;
          const note = dayNote(d, now);
          const staff = dayStaffing(d);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d.id)}
              aria-pressed={selected}
              className={cn(
                "flex items-center gap-3 rounded-xl p-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "bg-status-verified-tint/60 ring-[1.5px] ring-inset ring-status-active" : "hover:bg-muted/50",
              )}
            >
              <span className="flex w-10 flex-none flex-col items-center">
                <span className="overline-label text-muted-foreground">{wd}</span>
                <span className="font-mono text-lg font-semibold tabular-nums">{dd}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <DayStateChip task={d} />
                <span className={cn("truncate text-[11px]", NOTE_TONE[note.tone])}>{noteText(d)}</span>
              </span>
              <span
                className={cn(
                  "flex-none font-mono text-xs font-semibold tabular-nums",
                  staff ? NOTE_TONE[staff.tone] : "text-muted-foreground/60",
                )}
              >
                {staff ? `${staff.filled}/${staff.required}` : "–"}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Write `detail-header-card.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { DayRail } from "@/components/tasks/detail/day-rail";
import { DAY_TONE_CLASS } from "@/components/tasks/detail/day-state-chip";
import { Card } from "@/components/ui/card";
import {
  datesFact,
  legendCounts,
  windowFact,
  workersFact,
  type Place,
} from "@/lib/tasks/detail/booking-facts";
import { formatDateTime, formatDayLong, formatHm } from "@/lib/tasks/detail/day-time";
import { TOOLS_MESSAGE, kindKey, toolsAnswerKey } from "@/lib/tasks/order-facts";
import type { TaskStateKey } from "@/lib/tasks/status-vocab";
import type { TaskGroupDto, TaskItemDto } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

const LEGEND: TaskStateKey[] = ["done", "checkedIn", "inReview", "rejected", "pending", "cancelled"];

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

  const kind = kindKey(group.kind);
  const kindText =
    kind === "single" || (kind === null && single && !group.kind)
      ? t("kindSingle")
      : kind === "booking"
        ? t("kindBooking", { count: days.length })
        : (group.kind ?? t("kindBooking", { count: days.length }));
  const placeText = place.kind === "walkIn" ? t("walkIn") : place.kind === "text" ? place.text : null;
  const line = [ownerName, placeText].filter(Boolean).join(" · ") || "–";

  const counts = legendCounts(days);
  const win = windowFact(days);
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
      sub: win.kind === "same" && win.end === null ? t("facts.eightHours") : single ? t("facts.oneDay") : t("facts.everyDay"),
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
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="overline-label inline-flex h-[22px] items-center rounded-md bg-muted px-2 text-foreground/80">
              {kindText}
            </span>
            <span className="text-xs text-muted-foreground">{t("created", { date: formatDateTime(group.createdAt, locale) })}</span>
          </div>
          <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight md:text-[26px]">{group.title || "–"}</h1>
          <span className="text-sm text-muted-foreground">{line}</span>
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
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
                <span aria-hidden className={cn("size-2 rounded-full", DAY_TONE_CLASS[s].bar)} />
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
              <span className="whitespace-pre-wrap text-[13px] leading-relaxed text-pretty">{instructions}</span>
            </div>
          ) : null}
          {addOn ? (
            <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-3 ring-1 ring-inset ring-border">
              <span className="overline-label text-muted-foreground">{t("addOn")}</span>
              <span className="whitespace-pre-wrap text-[13px] leading-relaxed">{addOn}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
```

- [ ] **Step 6: Write `detail-page-state.tsx`**

```tsx
"use client";

import { AlertTriangle, FileQuestion, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import type { GroupLoadFailure } from "@/lib/tasks/detail/page-state";
import { cn } from "@/lib/utils";

/** Final-layout skeleton: a 260px header, then 300px + fluid (or one column). */
export function DetailSkeleton({ single }: { single: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-[260px] w-full rounded-xl" />
      <div className={cn("grid gap-4", !single && "lg:grid-cols-[300px_minmax(0,1fr)]")}>
        {!single ? <Skeleton className="h-[520px] rounded-xl" /> : null}
        <Skeleton className="h-[520px] rounded-xl" />
      </div>
    </div>
  );
}

const VIEW: Record<GroupLoadFailure, { icon: typeof AlertTriangle; tile: string; prefix: "error" | "notFound" | "forbidden" }> = {
  error: { icon: AlertTriangle, tile: "bg-status-cancelled-tint text-status-cancelled-deep", prefix: "error" },
  notFound: { icon: FileQuestion, tile: "bg-muted text-muted-foreground", prefix: "notFound" },
  forbidden: { icon: Lock, tile: "bg-status-pending-tint text-status-pending-deep", prefix: "forbidden" },
};

export function DetailFailure({ kind, onRetry }: { kind: GroupLoadFailure; onRetry: () => void }) {
  const t = useTranslations("tasks.detail");
  const v = VIEW[kind];
  const Icon = v.icon;
  return (
    <Card className="items-center gap-3 px-6 py-14 text-center">
      <span className={cn("flex size-12 items-center justify-center rounded-[14px]", v.tile)}>
        <Icon className="size-6" />
      </span>
      <span className="text-lg font-bold">{t(`page.${v.prefix}Title`)}</span>
      <span className="max-w-md text-sm text-muted-foreground text-pretty">{t(`page.${v.prefix}Text`)}</span>
      {kind === "error" ? (
        <Button size="sm" onClick={onRetry}>
          {t("page.retry")}
        </Button>
      ) : (
        <Button size="sm" nativeButton={false} render={<Link href="/dashboard/tasks" />}>
          {t("backToList")}
        </Button>
      )}
    </Card>
  );
}
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. If a dialog's prop type differs from the moved code (for example `CloneOrderDialog`'s
`source`), copy the exact call from the old page, which compiles today. The calls above are copied verbatim
from it.

- [ ] **Step 8: Commit**

```bash
git add components/tasks/detail/day-panel.tsx components/tasks/detail/days-list.tsx components/tasks/detail/day-rail.tsx components/tasks/detail/detail-header-card.tsx components/tasks/detail/detail-page-state.tsx components/tasks/detail/detail-modals.tsx
git commit -m "feat(tasks): detail panel, days list, rail, header card, page states, modals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Wire the page, the bell resolver and the per-day complaint read

**Files:**
- Modify: `hooks/use-complaints.ts:61-66` (`useTaskRead` gains `enabled`)
- Modify: `app/[locale]/dashboard/tasks/[id]/page.tsx` (full rewrite)
- Modify: `app/[locale]/dashboard/tasks/day/[taskId]/page.tsx:35` (redirect gains `?day=`)

**Interfaces:**
- Consumes: everything above, plus `useTaskGroup`, `useWalkInOwnerId`, `useOwner` (`hooks/use-owners.ts`),
  `usePropertyById` (`hooks/use-properties.ts`), `useHasPermission`, `useLiveClock`, `useTodayKey`,
  `isGroupActive` and `isWalkInSource`.
- Produces: the route.

- [ ] **Step 1: Read the Next 16 `useSearchParams` guide**

Read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md` (AGENTS.md
requires it). This route is dynamic (`[id]`), so it is not prerendered and needs no `<Suspense>`. The repo's
`app/[locale]/dashboard/(owner)/walk-in/page.tsx` already uses `useSearchParams` with
`router.replace("?tab=…", { scroll: false })` from `next/navigation` without one. Follow that pattern. If
`npm run build` in Task 10 warns about a missing Suspense boundary, wrap the page body in `<Suspense
fallback={<DetailSkeleton single={false} />}>`.

- [ ] **Step 2: Give `useTaskRead` an `enabled` flag**

In `hooks/use-complaints.ts`, replace:

```ts
export function useTaskRead(taskId: string) {
  return useQuery({
    queryKey: complaintKeys.task(taskId),
    queryFn: () => taskService.getTask(taskId),
  });
}
```

with:

```ts
/**
 * `GET /api/tasks/{taskId}` — the only read that carries `complaint`. The Task
 * Detail page reads it for the selected day only when that day is disputed or
 * closed by an upheld complaint (`enabled`); the complaint page always does.
 */
export function useTaskRead(taskId: string, enabled = true) {
  return useQuery({
    queryKey: complaintKeys.task(taskId),
    queryFn: () => taskService.getTask(taskId),
    enabled: enabled && !!taskId,
  });
}
```

- [ ] **Step 3: Rewrite the page**

Replace the whole of `app/[locale]/dashboard/tasks/[id]/page.tsx` with:

```tsx
"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Copy, Info, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Can } from "@/components/auth/can";
import { DayPanel } from "@/components/tasks/detail/day-panel";
import { DaysList } from "@/components/tasks/detail/days-list";
import { DetailHeaderCard } from "@/components/tasks/detail/detail-header-card";
import { DetailModals, type DetailModal } from "@/components/tasks/detail/detail-modals";
import { DetailFailure, DetailSkeleton } from "@/components/tasks/detail/detail-page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { useTaskRead } from "@/hooks/use-complaints";
import { useOwner, useWalkInOwnerId } from "@/hooks/use-owners";
import { usePropertyById } from "@/hooks/use-properties";
import { useTaskGroup } from "@/hooks/use-tasks";
import { useLiveClock, useTodayKey } from "@/hooks/use-today";
import { Link } from "@/i18n/navigation";
import { isWalkInSource } from "@/lib/tasks/clone-order";
import { headerPlace, isNothingLeftToRun, isSingleDay } from "@/lib/tasks/detail/booking-facts";
import { classifyGroupLoad } from "@/lib/tasks/detail/page-state";
import { resolveSelectedDay, sortDays } from "@/lib/tasks/detail/select-day";
import { isGroupActive } from "@/lib/tasks/staffing";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";

/**
 * The booking page — spec `2026-10-05-admin-task-detail-design.md`. Thin on
 * purpose: every decision is a tested function in `lib/tasks/detail/`.
 */
export default function TaskGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("tasks");
  const tDetail = useTranslations("tasks.detail");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dayParam = searchParams.get("day");
  // Ticks each minute: "34 min past start" and late verdicts must move.
  const now = useLiveClock();
  const todayKey = useTodayKey();

  const { data: group, isLoading, error, refetch } = useTaskGroup(id);
  const walkIn = useWalkInOwnerId();
  const canReadProperty = useHasPermission("property:list");
  const canReadOwner = useHasPermission("owner:list");
  const [modal, setModal] = useState<DetailModal>(null);

  const days = useMemo(() => sortDays(group?.tasks ?? []), [group?.tasks]);
  const selected = resolveSelectedDay(days, dayParam, now, todayKey);

  // Pin the default day into the URL once, so it does not jump as the clock
  // turns a day "late", and so the address is shareable.
  useEffect(() => {
    if (!dayParam && selected) router.replace(`?day=${selected.id}`, { scroll: false });
  }, [dayParam, selected, router]);
  const selectDay = (taskId: string) => router.replace(`?day=${taskId}`, { scroll: false });

  /**
   * `null` while the walk-in lookup has not answered — then copy is hidden and
   * the address is not fetched: the walk-in property's address is a placeholder.
   */
  const sourceIsWalkIn = group ? isWalkInSource(group, walkIn.isSuccess ? walkIn.data : undefined) : null;
  // `""` disables each read (both hooks gate `enabled` on the id).
  const property = usePropertyById(group && canReadProperty && sourceIsWalkIn === false ? group.propertyId : "");
  const owner = useOwner(group && canReadOwner ? group.ownerId : "");

  const selectedState = selected ? canonicalTaskStatus(selected.status) : null;
  const needsComplaint =
    !!selected && (selectedState === "rejected" || (selectedState === "done" && selected.closureReason === "ClosedReplacement"));
  const complaintRead = useTaskRead(selected?.id ?? "", needsComplaint);
  const complaint = needsComplaint ? (complaintRead.data?.complaint ?? null) : null;

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      className="w-fit gap-1.5 text-muted-foreground"
      render={<Link href="/dashboard/tasks" />}
    >
      <ArrowLeft className="size-4" />
      {tDetail("backToList")}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {backButton}
        <DetailSkeleton single={false} />
      </div>
    );
  }
  if (error || !group) {
    return (
      <div className="flex flex-col gap-4">
        {backButton}
        <DetailFailure kind={error ? classifyGroupLoad(error) : "error"} onRetry={() => refetch()} />
      </div>
    );
  }

  const single = isSingleDay(group);
  const nothingLeft = isNothingLeftToRun(group);
  const cityName = property.data?.city ? (locale === "de" ? property.data.city.nameDe : property.data.city.nameEn) : null;
  const place = headerPlace({
    isWalkIn: sourceIsWalkIn,
    address: property.data?.address,
    cityName,
    propertyName: days[0]?.propertyName,
  });
  const ownerName = owner.data?.fullName?.trim() || null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backButton}
        <div className="flex flex-wrap gap-2">
          {/* Any state can be copied (F-07 ·10) — a finished booking is what gets repeated. */}
          {sourceIsWalkIn !== null ? (
            <Can permission="task_group:create_any">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setModal({ type: "clone" })}>
                <Copy className="size-3.5" />
                {t("clone.action")}
              </Button>
            </Can>
          ) : null}
          {isGroupActive(group) && !nothingLeft ? (
            <Can permission="task_group:cancel_any">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive"
                onClick={() => setModal({ type: "cancelGroup" })}
              >
                <XCircle className="size-3.5" />
                {single ? tDetail("cancelTask") : tDetail("cancelBooking")}
              </Button>
            </Can>
          ) : null}
        </div>
      </div>

      {nothingLeft ? (
        <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3 ring-1 ring-inset ring-border">
          <Info className="size-4 flex-none text-muted-foreground" />
          <span className="text-[13px]">
            {tDetail("nothingLeft", { cancelled: group.days.cancelled, total: group.days.total })}
          </span>
        </div>
      ) : null}

      <DetailHeaderCard
        group={group}
        days={days}
        selectedId={selected?.id ?? null}
        onSelect={selectDay}
        single={single}
        ownerName={ownerName}
        place={place}
        locale={locale}
      />

      <div className={single ? "flex flex-col gap-4" : "grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]"}>
        {!single ? (
          <DaysList
            days={days}
            selectedId={selected?.id ?? null}
            onSelect={selectDay}
            now={now}
            locale={locale}
            group={group}
          />
        ) : null}
        {selected ? (
          <DayPanel
            task={selected}
            complaint={complaint}
            now={now}
            locale={locale}
            todayKey={todayKey}
            onModal={setModal}
          />
        ) : (
          <Card className="px-5 py-10 text-center text-sm text-muted-foreground">{tDetail("noDays")}</Card>
        )}
      </div>

      <DetailModals
        modal={modal}
        group={group}
        groupId={id}
        sourceIsWalkIn={sourceIsWalkIn}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
```

⚠ The cancel button changes from `variant="destructive"` (solid red) to a danger outline, following the design and
the "status is never a solid fill; one solid action" rule. The confirm dialog is still destructive.

- [ ] **Step 4: The bell resolver lands on the day**

In `app/[locale]/dashboard/tasks/day/[taskId]/page.tsx`, replace:

```ts
    if (data?.groupId) router.replace(`/dashboard/tasks/${data.groupId}`);
  }, [data?.groupId, router]);
```

with:

```ts
    if (data?.groupId) router.replace(`/dashboard/tasks/${data.groupId}?day=${taskId}`);
  }, [data?.groupId, router, taskId]);
```

Also update the doc comment above the component. Change "A day id → its booking page." to
"A day id → its booking page, opened on that day (`?day=`)."

- [ ] **Step 5: Typecheck, lint and test**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: all green. `npm test` runs the whole suite, including the seven new files. Fix any unused-import lint
from the old page's helpers (`TaskDaysBadge`, `TaskStatusBadge` and others are no longer imported here; they
stay in the repo for their other readers).

- [ ] **Step 6: Check for dead message keys**

Run: `git grep -n -E "\"(infoTitle|tasksTitle|noTasks|closedBeforeReasons)\"" -- messages`
Expected: no matches. They were removed in Task 6, and nothing now reads them.

- [ ] **Step 7: Commit**

```bash
git add hooks/use-complaints.ts "app/[locale]/dashboard/tasks/[id]/page.tsx" "app/[locale]/dashboard/tasks/day/[taskId]/page.tsx"
git commit -m "feat(tasks): the booking page becomes the v2 Task Detail; the bell lands on its day

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Verify, ledger and backend asks

**Files:**
- Modify: `BACKEND-ASKS.md` (append a section)
- Modify: `BACKEND-REVISIONS.md` (§1 watermarks, §4 a new pass entry at the top)

- [ ] **Step 1: Full regression**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all green. If the build warns that `useSearchParams` needs a Suspense boundary, apply the wrap from
Task 9 Step 1 and re-run.

- [ ] **Step 2: Contract gate**

Run: `npm run verify:api`
Expected: `0 FAIL`. Every field this screen reads is already listed in `scripts/verify-v2.mjs`, so no script
change is needed. If a line fails, stop and report it: a failure means the live API moved.

- [ ] **Step 3: Browser pass**

Use the `run` skill, or `npm run dev` plus the `claude-in-chrome` skill. Sign in on the dev environment (its demo
seed, 2026-10-03, has bookings and single tasks in every day state). Open the register, click into bookings, and
check each item at **1440px, 900px and 390px**:
- a booking with a disputed day: it opens on that day, shows the complaint alert with the reason and photo count,
  and the Open complaint button goes to `/dashboard/complaints/{taskId}`;
- a booking with today checked in and someone late: the late alert names them, and the check-in `–` is red;
- an in-review day: the timeline's step 4 reads `auto ≈ HH:mm`, and there is no Assign button;
- Done days of each reason: the alert, the step-4 label, and Rate team only where someone Completed;
- a cancelled booking: the "No days left to run" notice, Copy only, no Cancel;
- a single task: no rail, no days list, and the header reads "Single task";
- the bell → day link (`/dashboard/tasks/day/{taskId}`): it lands with `?day=` on that day;
- at 390px: no horizontal scroll, worker rows are cards, and the timeline is vertical;
- dark mode: the tones are readable, and the cancelled rail stripe is visible.

Compare the header card, padding and row style against Owner Detail (`/dashboard/owners/{id}`), the screen next
to it. Record anything you couldn't check (for example, a state the seed doesn't have) in the pass entry.

- [ ] **Step 4: Live probes**

Each probe needs a session. Do them in the browser's devtools, or skip one and record that it is open:
- `GET /api/tasks/groups/00000000-0000-0000-0000-000000000000` as SUPER_ADMIN. Is the answer `404` or an empty
  `403`?
  - If it is an **empty `403`**, change both `forbiddenText` strings. en: `"Your role may not include booking
    details, or the link may be wrong."` de: `"Ihre Rolle umfasst möglicherweise keine Buchungsdetails, oder
    der Link ist falsch."`
  - Then add a note to the comment on `classifyGroupLoad`, and commit.
- The same booking read with a MODERATOR token. Does it read, or answer an empty `403`? Record the result.

- [ ] **Step 5: Append the backend asks**

Add this at the end of `BACKEND-ASKS.md`:

```markdown
---

## Open — 2026-10-05 · three things the Task Detail design shows that no DTO returns

**Not blocking** — the panel ships without them and words around each (spec
`docs/superpowers/specs/2026-10-05-admin-task-detail-design.md` §2). Checked at `origin/main` `26f57e1`
against `task-lifecycle.md` §0d and `TaskItemDto` / `TaskGroupDto`.

1. **The force-close reason is write-only.** `POST /api/tasks/{taskId}/force-close` requires `reason`, and it is
   sent to the workers and the owner in their notification, but no DTO returns it — not the booking, not
   `GET /api/tasks/{id}`. Nothing names the admin either.
   **Ask:** `TaskItemDto.closureNote` (string, set when `closureReason == "ClosedForced"`) and
   `closedByAdminName`.
2. **No close time.** `completedAt` is the hand-in (§0d), so a Done day's close moment is unknowable for
   `OwnerAccepted` and `ClosedForced`. (We derive `AutoAccepted` ≈ hand-in + 5 h and `ClosedReplacement` from
   `complaint.decidedAt`.)
   **Ask:** `TaskItemDto.closedAt`.
3. **No cancel time and no cancel actor.** Neither `TaskGroupDto` nor `TaskItemDto` says when a day or a booking
   was cancelled, or by whom/what: the owner, the group cancel (which skips days inside 3 h), or the self-cancel
   at window end (§0d).
   **Ask:** `TaskItemDto.cancelledAt` + `cancelReason` (a sibling of `closureReason`, e.g. `OwnerCancelled` ·
   `GroupCancelled` · `AutoCancelledNotStarted` · `AdminCancelled`), optionally `TaskGroupDto.cancelledAt`.
```

- [ ] **Step 6: Update the ledger**

In `BACKEND-REVISIONS.md` §1:
- Set **CHANGELOG reviewed through** to
  `**2026-10-03** — the demo-seed entry (data only; nothing to build on this screen); nothing newer at \`26f57e1\``.
- Set **Last HEAD check** to
  `2026-10-05, \`origin/main\` \`26f57e1\`. Commits touching \`docs/handoff\` or \`index/\` since \`9de945d9\`: the demo-seed close-out (\`8538811\`, \`3b0c4b4\`) a mind card (\`2d4c43b\`) and \`385963e\` (fix: owners — \`isActive\` enforced on the admin location edit; relevant to the WP2 remainder, not to tasks). No task contract moved.`
- Leave `task-lifecycle.md`'s **Absorbed to** unchanged (WP6 and WP11 are still open).

In §4, insert at the top (above the 2026-09-27 register entry):

```markdown
### 2026-10-05 — Task Detail (the booking page on the v2 detail design)

`docs/superpowers/specs/2026-10-05-admin-task-detail-design.md` +
`docs/superpowers/plans/2026-10-05-admin-task-detail.md`. A re-layout of `/dashboard/tasks/{groupId}` onto the
two design files (`ERP-Admin-Assests/Uyer Admin Task Detail*.dc.html`): header card with progress, rail and
facts; days list; selected-day panel with a four-step timeline, one state alert, supervisor/summary and a workers
table with open-slot rows. No new route or field — every dialog and guard is reused.

| What changed | Where |
|---|---|
| The selected day lives in `?day=`; default is needs-attention first (disputed → late → in review → today → next → last), pinned into the URL once | `lib/tasks/detail/select-day.ts` |
| The bell resolver lands on the day (`?day=`) | `app/[locale]/dashboard/tasks/day/[taskId]/page.tsx` |
| Chip, note, staffing, timeline and alert per day state, incl. a pending-past-start alert the design lacks (§0d self-cancel) | `lib/tasks/detail/day-view.ts`, `day-alert.ts` |
| Buttons narrowed to what the server accepts: Assign/unassign on Pending+CheckedIn only (admin-assign has **no** state guard — `GT_AdminFillHasNoDateOrStatusGuard` — so the client is the only guard); the per-row star on `Completed` only; supervisor and force-close on CheckedIn+InReview only (design) | `lib/tasks/detail/day-actions.ts` |
| Every time from the UTC instants in the viewer's zone; the group's zone-less `defaultStartTime`/`defaultDeadline` are no longer printed | `lib/tasks/detail/booking-facts.ts` |
| The complaint is read per selected day (`GET /api/tasks/{id}`) only when disputed or upheld | `hooks/use-complaints.ts` (`useTaskRead(id, enabled)`) |

Design deltas: no force-close reason, no close time for OwnerAccepted/ClosedForced, no cancel date or actor —
none is on any DTO (BACKEND-ASKS 2026-10-05). The design's "This booking was cancelled" is worded neutrally
("No days left to run — n of N cancelled"): the same counts come from one owner- or self-cancelled day.

Live probes: <fill in Step 4's results, or "not run — no session">. Browser: <fill in Step 3's results>.
```

Before committing, replace the two `<fill in …>` markers with what Steps 3 and 4 actually found.

- [ ] **Step 7: Commit**

```bash
git add BACKEND-ASKS.md BACKEND-REVISIONS.md messages/en.json messages/de.json lib/tasks/detail/page-state.ts
git commit -m "docs(tasks): Task Detail pass — ledger, HEAD 26f57e1, three backend asks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`messages/*` and `page-state.ts` are staged only if Step 4 changed them. `git add` on an unchanged file is a no-op.)
