# Walk-in Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One page at `/dashboard/walk-in` where an admin files a manual order under the Default Owner and assigns a worker to it without leaving the page.

**Architecture:** A new route page composes three things: a one-line header built from existing owner reads, a new order form (the only new screen logic), and the existing `WeeklyWorkCard` as order history. The form posts `CreateTaskGroupRequest` to `POST /api/tasks/admin/groups` with an idempotency key, then renders the `201`'s nested tasks with an **Assign worker** button per task wired to the existing `AssignWorkerDialog`. All date arithmetic and request building live as pure functions in `lib/tasks/`, which is where the tests go.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · `@base-ui/react` wrappers in `components/ui/` · `@tanstack/react-query` · `next-intl` · `vitest`

**Spec:** `docs/superpowers/specs/2026-08-12-walk-in-orders-design.md`

## Global Constraints

- **Read the relevant guide in `node_modules/next/dist/docs/` before writing routing code.** Per `AGENTS.md`, this Next.js version has breaking changes against training data.
- **Every new user-visible string goes into BOTH `messages/en.json` and `messages/de.json` in the same commit.** A missing key throws at render in `next-intl`.
- **Never send a non-walk-in `propertyId` from this page.** A real owner as the target makes five contract refusals reachable (`onboarding_incomplete`, `contract_expired`, `contract_not_yet_active`, `contract_expiring_imminently`, `task_date_beyond_contract`), and this feature writes no UI for them.
- **`task_group:create_any` is code `110038`, seeded to SUPER_ADMIN only.** Gate the form with `useHasPermission`, never `<Can>` — the form must be visible-and-disabled for a MODERATOR, not absent.
- **Never build a date key with `toISOString()`.** Use `toLocalDateKey` from `lib/tasks/weekly-rows`. A late German evening is already tomorrow in UTC.
- **Date format on the wire:** `dates` are `"YYYY-MM-DD"`; `defaultStartTime` is `"HH:mm:ss"`.
- **Gates for every task:** `npx tsc --noEmit`, `npm run lint`, `npm test` — all three clean before the commit.
- **`/docs` is in `.gitignore` but specs and plans are tracked.** Use `git add -f` for files under `docs/`.

---

### Task 1: Move the idempotency helpers into `lib/http/`

The order form needs `X-Idempotency-Key`. The helpers exist but are private to the contract service, and importing a contract-domain helper into an order form is the wrong dependency.

**Files:**
- Create: `lib/http/idempotency.ts`
- Modify: `lib/services/contract.service.ts:11-30` (delete both helpers, import them)
- Modify: `app/[locale]/dashboard/(owner)/owner-documents/[ownerProfileId]/page.tsx:35` (import path)

**Interfaces:**
- Consumes: nothing
- Produces: `idempotent(key: string): { headers: { "X-Idempotency-Key": string } }` and `newIdempotencyKey(): string`

- [ ] **Step 1: Find every consumer before moving anything**

Run: `rg "newIdempotencyKey|idempotent\(" --type ts --type tsx`
Expected: hits only in `lib/services/contract.service.ts` and `app/[locale]/dashboard/(owner)/owner-documents/[ownerProfileId]/page.tsx`. If there is a third, add it to this task's file list.

- [ ] **Step 2: Create the new home**

```ts
// lib/http/idempotency.ts

/**
 * Routes marked `[Idempotent]` replay the cached 201 for 24 h when the same key
 * arrives twice, so the key must stay **the same across retries of one intent**.
 * That is the whole point: a retried request must not author a second row.
 *
 * The caller supplies it. Generating it inside the request helper would give
 * every retry a fresh key, turning a retried create into a duplicate — exactly
 * what the header exists to prevent.
 */
export function idempotent(key: string) {
  return { headers: { "X-Idempotency-Key": key } };
}

/**
 * Mint one key per user-initiated attempt and hold it (a ref, not state) for as
 * long as that attempt may be retried. Do not call it per request.
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 3: Point the contract service at it**

Delete `idempotent` and `newIdempotencyKey` (and their doc comments) from `lib/services/contract.service.ts` and add to its imports:

```ts
import { idempotent, newIdempotencyKey } from "@/lib/http/idempotency";
```

`newIdempotencyKey` was `export`ed from the contract service and the owner-documents page imports it from there. Remove that re-export — one home, not two — and change the page's import to:

```ts
import { newIdempotencyKey } from "@/lib/http/idempotency";
```

If step 1 turned up a third importer, point it at the new module in this same commit.

- [ ] **Step 4: Prove the move changed no behaviour**

Run: `npx tsc --noEmit; npm run lint; npm test`
Expected: all clean, `125 passed`. There is no new test in this task on purpose — a pure move introduces no behaviour to assert, and `tsc` plus the unchanged suite is the real gate. Then:

Run: `rg "from \"@/lib/services/contract.service\"" --type ts --type tsx`
Expected: no hit imports `newIdempotencyKey` from there any more.

- [ ] **Step 5: Commit**

```bash
git add lib/http/idempotency.ts lib/services/contract.service.ts "app/[locale]/dashboard/(owner)/owner-documents/[ownerProfileId]/page.tsx"
git commit -m "refactor(http): idempotency helpers leave the contract service"
```

---

### Task 2: Month-grid arithmetic as tested pure functions

**Files:**
- Create: `lib/tasks/month-grid.ts`
- Test: `lib/tasks/month-grid.test.ts`

**Interfaces:**
- Consumes: `toLocalDateKey` from `lib/tasks/weekly-rows`
- Produces:
  - `type MonthGridCell = { key: string; day: number; inMonth: boolean }`
  - `type YearMonth = { year: number; month: number }` — `month` is 0-indexed, as `Date` uses
  - `monthGrid(ym: YearMonth): MonthGridCell[]` — always 42 cells, Monday first
  - `shiftMonth(ym: YearMonth, delta: number): YearMonth`
  - `isPastDay(key: string, todayKey: string): boolean`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/tasks/month-grid.test.ts
import { describe, expect, it } from "vitest";
import {
  isPastDay,
  monthGrid,
  shiftMonth,
  type MonthGridCell,
} from "@/lib/tasks/month-grid";

const inMonth = (cells: MonthGridCell[]) => cells.filter((c) => c.inMonth);

describe("monthGrid", () => {
  it("always returns six weeks, so the grid does not change height month to month", () => {
    expect(monthGrid({ year: 2026, month: 1 })).toHaveLength(42);
    expect(monthGrid({ year: 2026, month: 7 })).toHaveLength(42);
  });

  it("starts on a Monday, whatever weekday the month starts on", () => {
    for (const month of [0, 1, 5, 8, 11]) {
      const first = monthGrid({ year: 2026, month })[0];
      // 1 = Monday in `Date.getDay()`.
      expect(new Date(`${first.key}T00:00:00`).getDay()).toBe(1);
    }
  });

  it("holds exactly the month's own days, leap years included", () => {
    expect(inMonth(monthGrid({ year: 2026, month: 1 }))).toHaveLength(28);
    expect(inMonth(monthGrid({ year: 2028, month: 1 }))).toHaveLength(29);
    expect(inMonth(monthGrid({ year: 2026, month: 7 }))).toHaveLength(31);
  });

  it("pads with the neighbouring months' real dates, not blanks", () => {
    const cells = monthGrid({ year: 2026, month: 1 });
    expect(inMonth(cells)[0].key).toBe("2026-02-01");
    expect(cells[0].key.startsWith("2026-01")).toBe(true);
    expect(cells[41].key.startsWith("2026-0")).toBe(true);
    // Every cell carries a usable key — a null would have to be guarded at
    // every call site.
    expect(cells.every((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.key))).toBe(true);
  });

  it("numbers each cell by its own day of the month", () => {
    const cells = monthGrid({ year: 2026, month: 1 });
    const first = inMonth(cells)[0];
    expect(first.day).toBe(1);
    expect(inMonth(cells).at(-1)!.day).toBe(28);
  });
});

describe("shiftMonth", () => {
  it("rolls the year at both ends", () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });

  it("moves within a year without touching it", () => {
    expect(shiftMonth({ year: 2026, month: 7 }, 1)).toEqual({ year: 2026, month: 8 });
  });
});

describe("isPastDay", () => {
  it("treats today as not past — an order can be filed for this morning", () => {
    expect(isPastDay("2026-08-12", "2026-08-12")).toBe(false);
  });

  it("marks yesterday past and tomorrow not", () => {
    expect(isPastDay("2026-08-11", "2026-08-12")).toBe(true);
    expect(isPastDay("2026-08-13", "2026-08-12")).toBe(false);
  });

  it("compares as dates, not as numbers — a key sorts correctly across months", () => {
    expect(isPastDay("2026-07-31", "2026-08-01")).toBe(true);
    expect(isPastDay("2026-09-01", "2026-08-31")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/tasks/month-grid.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/tasks/month-grid"`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/tasks/month-grid.ts
import { toLocalDateKey } from "@/lib/tasks/weekly-rows";

/** `month` is 0-indexed, matching `Date` — not 1-indexed like an ISO key. */
export interface YearMonth {
  year: number;
  month: number;
}

export interface MonthGridCell {
  /** `YYYY-MM-DD`, local. */
  key: string;
  /** Day of ITS OWN month, so a padding cell reads 29 rather than 0. */
  day: number;
  inMonth: boolean;
}

const CELLS = 42;

/**
 * Six weeks of dates covering one month, Monday first.
 *
 * Always 42 cells, even for a 28-day February that starts on a Monday and would
 * fit in four rows: a grid that changes height as the admin pages through months
 * makes the button under it jump.
 *
 * Padding cells carry the neighbouring months' real dates rather than nulls —
 * a nullable key would have to be guarded at every call site, and the dates are
 * genuinely selectable if the admin wants the 1st of next month.
 */
export function monthGrid({ year, month }: YearMonth): MonthGridCell[] {
  const first = new Date(year, month, 1);
  // `getDay()` is Sunday-based (0..6); this repo's calendars run Monday-first.
  const lead = (first.getDay() + 6) % 7;

  const cells: MonthGridCell[] = [];
  for (let i = 0; i < CELLS; i++) {
    const d = new Date(year, month, 1 - lead + i);
    cells.push({
      key: toLocalDateKey(d),
      day: d.getDate(),
      inMonth: d.getMonth() === month && d.getFullYear() === year,
    });
  }
  return cells;
}

/** `new Date(y, m + delta, 1)` normalises the year rollover for us. */
export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/**
 * Both arguments are `YYYY-MM-DD`, which sorts lexicographically in date order —
 * so this needs no parsing, and cannot drift by a timezone.
 */
export function isPastDay(key: string, todayKey: string): boolean {
  return key < todayKey;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/tasks/month-grid.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Run the full gates**

Run: `npx tsc --noEmit; npm run lint; npm test`
Expected: all clean, `135 passed`.

- [ ] **Step 6: Commit**

```bash
git add lib/tasks/month-grid.ts lib/tasks/month-grid.test.ts
git commit -m "feat(tasks): month-grid arithmetic, Monday-first and timezone-safe"
```

---

### Task 3: The request builder and its type

**Files:**
- Create: `lib/tasks/walk-in-order.ts`
- Test: `lib/tasks/walk-in-order.test.ts`
- Modify: `lib/types/task.types.ts` (append `CreateTaskGroupRequest`)

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces:
  - `CreateTaskGroupRequest` in `lib/types/task.types.ts`
  - `type WalkInOrderDraft = { title: string; date: string; startTime: string; workerLimit: string; instructions: string }` — all strings, because they come straight from inputs
  - `type WalkInOrderErrorKey = "titleRequired" | "dateRequired" | "startTimeRequired" | "workerLimitInvalid"`
  - `buildWalkInOrder(draft: WalkInOrderDraft, propertyId: string): { ok: true; body: CreateTaskGroupRequest } | { ok: false; error: WalkInOrderErrorKey }`

- [ ] **Step 1: Add the request type**

Append to `lib/types/task.types.ts`, after `TaskGroupDto`:

```ts
/**
 * Body of `POST /api/tasks/admin/groups` (`task_group:create_any`, 110038) — and
 * of the owner-side `POST /api/tasks/groups`. There is deliberately no admin
 * shape and no `ownerUserId`: a `propertyId` already implies its owner.
 *
 * The five optional fields are unused by the walk-in form; they are typed so the
 * next consumer does not have to re-derive the contract.
 */
export interface CreateTaskGroupRequest {
  propertyId: string;
  title: string;
  /** `"HH:mm:ss"` — a bare `"HH:mm"` is not accepted. */
  defaultStartTime: string;
  defaultWorkerLimit: number;
  /** Explicit dates, `"YYYY-MM-DD"`, **not** a range. One task per date. */
  dates: string[];
  defaultDeadline?: string | null;
  instructions?: string | null;
  /** Not shown to workers. */
  internalNote?: string | null;
  /** `0.0`–`5.0`; omitted leaves it wide open. */
  ratingFloor?: number;
  /** Omitted or empty means any profession. */
  eligibleProfessionIds?: string[];
  /** Defaults to `true` server-side. */
  allowNewWorkers?: boolean;
}
```

- [ ] **Step 2: Write the failing tests**

```ts
// lib/tasks/walk-in-order.test.ts
import { describe, expect, it } from "vitest";
import {
  buildWalkInOrder,
  type WalkInOrderDraft,
} from "@/lib/tasks/walk-in-order";

const PROPERTY = "87c9fa97-bc61-4629-9372-84a573dfc8d0";

function draft(over: Partial<WalkInOrderDraft> = {}): WalkInOrderDraft {
  return {
    title: "Phone order — Frau Weber",
    date: "2026-08-18",
    startTime: "09:00",
    workerLimit: "2",
    instructions: "Ring twice. Keys with the neighbour.",
    ...over,
  };
}

describe("buildWalkInOrder — the body it sends", () => {
  it("widens the time input to the seconds the API requires", () => {
    const r = buildWalkInOrder(draft(), PROPERTY);
    expect(r.ok && r.body.defaultStartTime).toBe("09:00:00");
  });

  it("leaves an already-widened time alone", () => {
    const r = buildWalkInOrder(draft({ startTime: "09:30:00" }), PROPERTY);
    expect(r.ok && r.body.defaultStartTime).toBe("09:30:00");
  });

  it("sends the one date as an array, because the wire field is one", () => {
    const r = buildWalkInOrder(draft(), PROPERTY);
    expect(r.ok && r.body.dates).toEqual(["2026-08-18"]);
  });

  it("trims the title and coerces the worker count to a number", () => {
    const r = buildWalkInOrder(draft({ title: "  Phone order  ", workerLimit: "3" }), PROPERTY);
    expect(r.ok && r.body.title).toBe("Phone order");
    expect(r.ok && r.body.defaultWorkerLimit).toBe(3);
  });

  it("omits blank instructions rather than sending an empty string", () => {
    const r = buildWalkInOrder(draft({ instructions: "   " }), PROPERTY);
    expect(r.ok && "instructions" in r.body).toBe(false);
  });

  it("sends none of the five optional fields the form does not collect", () => {
    const r = buildWalkInOrder(draft(), PROPERTY);
    expect(r.ok && Object.keys(r.body).sort()).toEqual([
      "dates",
      "defaultStartTime",
      "defaultWorkerLimit",
      "instructions",
      "propertyId",
      "title",
    ]);
  });
});

describe("buildWalkInOrder — what it refuses locally", () => {
  /**
   * These four are `[Required]` server-side and come back as ASP.NET
   * problem-details, a different envelope from this API's `{error}` — cheaper to
   * refuse here than to render two error shapes.
   */
  it("refuses a blank or whitespace title", () => {
    expect(buildWalkInOrder(draft({ title: "" }), PROPERTY)).toEqual({
      ok: false,
      error: "titleRequired",
    });
    expect(buildWalkInOrder(draft({ title: "   " }), PROPERTY)).toEqual({
      ok: false,
      error: "titleRequired",
    });
  });

  it("refuses a missing date", () => {
    expect(buildWalkInOrder(draft({ date: "" }), PROPERTY)).toEqual({
      ok: false,
      error: "dateRequired",
    });
  });

  it("refuses a missing start time", () => {
    expect(buildWalkInOrder(draft({ startTime: "" }), PROPERTY)).toEqual({
      ok: false,
      error: "startTimeRequired",
    });
  });

  it("refuses a worker count below one, blank, or not a number", () => {
    for (const workerLimit of ["0", "-1", "", "abc", "1.5"]) {
      expect(buildWalkInOrder(draft({ workerLimit }), PROPERTY)).toEqual({
        ok: false,
        error: "workerLimitInvalid",
      });
    }
  });

  /**
   * No fifth error key for a missing property: the page does not render the form
   * without one, so an empty `propertyId` cannot reach here. The builder passes
   * it through rather than inventing a rule nothing enforces.
   */
  it("passes an empty property through, because the page never renders the form without one", () => {
    const r = buildWalkInOrder(draft(), "");
    expect(r.ok && r.body.propertyId).toBe("");
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run lib/tasks/walk-in-order.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/tasks/walk-in-order"`.

- [ ] **Step 4: Write the implementation**

```ts
// lib/tasks/walk-in-order.ts
import type { CreateTaskGroupRequest } from "@/lib/types/task.types";

/** Every field is a string because every field comes straight from an input. */
export interface WalkInOrderDraft {
  title: string;
  /** `YYYY-MM-DD`, from the month grid. */
  date: string;
  /** `HH:mm` from `<input type="time">`, or `HH:mm:ss`. */
  startTime: string;
  workerLimit: string;
  instructions: string;
}

/** Keys under the `walkIn.errors` i18n namespace. */
export type WalkInOrderErrorKey =
  | "titleRequired"
  | "dateRequired"
  | "startTimeRequired"
  | "workerLimitInvalid";

export type WalkInOrderResult =
  | { ok: true; body: CreateTaskGroupRequest }
  | { ok: false; error: WalkInOrderErrorKey };

/** `<input type="time">` yields `HH:mm`; the API rejects anything shorter than `HH:mm:ss`. */
function toWireTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

/**
 * Form state → request body, or the first thing wrong with it.
 *
 * The four refusals exist because those fields are `[Required]` server-side and
 * a missing one returns ASP.NET **problem-details** — `{type,title,status,errors}`
 * rather than this API's `{error}`. Rendering two error envelopes costs more than
 * refusing here, which is the same call `message-owner-dialog` makes.
 */
export function buildWalkInOrder(
  draft: WalkInOrderDraft,
  propertyId: string,
): WalkInOrderResult {
  const title = draft.title.trim();
  if (!title) return { ok: false, error: "titleRequired" };
  if (!draft.date) return { ok: false, error: "dateRequired" };
  if (!draft.startTime) return { ok: false, error: "startTimeRequired" };

  // `Number("")` is 0 and `Number("1.5")` is 1.5 — both have to fail, so the
  // integer check is explicit rather than a `parseInt` that would round.
  const workerLimit = Number(draft.workerLimit);
  if (!Number.isInteger(workerLimit) || workerLimit < 1) {
    return { ok: false, error: "workerLimitInvalid" };
  }

  const instructions = draft.instructions.trim();

  return {
    ok: true,
    body: {
      propertyId,
      title,
      defaultStartTime: toWireTime(draft.startTime),
      defaultWorkerLimit: workerLimit,
      dates: [draft.date],
      // Spread rather than `instructions: instructions || null`: an omitted key
      // and an explicit null are the same to the server, and omitting keeps the
      // body to what the form actually collected.
      ...(instructions ? { instructions } : {}),
    },
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/tasks/walk-in-order.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 6: Run the full gates**

Run: `npx tsc --noEmit; npm run lint; npm test`
Expected: all clean, `146 passed`.

- [ ] **Step 7: Commit**

```bash
git add lib/tasks/walk-in-order.ts lib/tasks/walk-in-order.test.ts lib/types/task.types.ts
git commit -m "feat(tasks): build a walk-in order body, and refuse locally what returns problem-details"
```

---

### Task 4: The service call, the hook, and the invalidation bug

**Files:**
- Modify: `lib/services/task.service.ts` (add `createAdminGroup`)
- Modify: `hooks/use-tasks.ts:32-39` (export a plain `invalidateTasks`, add `["owner-task-groups"]`, add `useCreateTaskGroup`)
- Test: `hooks/use-tasks.test.ts` (create)

**Interfaces:**
- Consumes: `CreateTaskGroupRequest` (Task 3), `idempotent` (Task 1)
- Produces:
  - `taskService.createAdminGroup(body: CreateTaskGroupRequest, idempotencyKey: string): Promise<TaskGroupDto>`
  - `invalidateTasks(qc: QueryClient, groupId?: string): void`
  - `useCreateTaskGroup()` — a mutation over `{ body, idempotencyKey }` returning `TaskGroupDto`

- [ ] **Step 1: Write the failing test for the invalidation list**

```ts
// hooks/use-tasks.test.ts
import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { invalidateTasks } from "@/hooks/use-tasks";

/**
 * The task mutations' invalidation list, exercised against a real `QueryClient` —
 * no component render, no jsdom. Same shape as `hooks/use-contracts.test.ts`.
 *
 * `["owner-task-groups"]` is the row this shipped without: `useOwnerTaskGroups`
 * reads it, `WeeklyWorkCard` renders from it, and nothing invalidated it — so the
 * owner detail page's weekly card stayed stale after a worker was assigned from
 * Dispatching, and the walk-in page's history would have stayed stale after a
 * create.
 */
describe("invalidateTasks", () => {
  it("invalidates both admin task keys and the owner-scoped one", () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    invalidateTasks(qc);

    const keys = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(keys).toContainEqual(["admin-task-groups"]);
    expect(keys).toContainEqual(["admin-tasks"]);
    expect(keys).toContainEqual(["owner-task-groups"]);
  });

  it("invalidates the single-group detail key only when a group id is known", () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    invalidateTasks(qc, "group-1");
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toContainEqual([
      "task-group",
      "group-1",
    ]);

    spy.mockClear();
    invalidateTasks(qc);
    expect(
      spy.mock.calls.some((c) => (c[0]?.queryKey as unknown[])?.[0] === "task-group"),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run hooks/use-tasks.test.ts`
Expected: FAIL — `invalidateTasks` is not exported from `@/hooks/use-tasks`.

- [ ] **Step 3: Add the service method**

In `lib/services/task.service.ts`, extend the type import with `CreateTaskGroupRequest`, add `import { idempotent } from "@/lib/http/idempotency";`, and add this method after `getAdminTaskGroups`:

```ts
  /**
   * `task_group:create_any` (110038, SUPER_ADMIN only) — an admin creates a task
   * group on behalf of a property's owner. The body carries no `ownerUserId`:
   * a `propertyId` already implies its owner.
   *
   * `idempotencyKey` must be **held across retries of one attempt** — a repeat
   * with the same key replays the cached 201 for 24 h instead of filing a second
   * order. Mint it with `newIdempotencyKey()` into a ref, not per call.
   *
   * The response's `propertyName` is `""` and its `isEnrolled` is `true` on this
   * route; both are meaningless here. `Location` points at a PROPERTY-scoped read
   * an admin cannot follow — do not follow it.
   */
  createAdminGroup: async (
    body: CreateTaskGroupRequest,
    idempotencyKey: string,
  ): Promise<TaskGroupDto> => {
    const { data } = await apiClient.post<TaskGroupDto>(
      "/api/tasks/admin/groups",
      body,
      idempotent(idempotencyKey),
    );
    return data;
  },
```

- [ ] **Step 4: Export the invalidation as a plain function and fix its list**

Replace `hooks/use-tasks.ts:32-39` with:

```ts
/**
 * Exported as a plain function so its key list is testable without rendering —
 * `hooks/use-tasks.test.ts` asserts it against a real `QueryClient`.
 *
 * `["owner-task-groups"]` is here because `useOwnerTaskGroups` reads it and
 * `WeeklyWorkCard` renders from it. Without it, assigning a worker from
 * Dispatching left the owner detail page's weekly card stale until a reload.
 */
export function invalidateTasks(qc: QueryClient, groupId?: string) {
  qc.invalidateQueries({ queryKey: ["admin-task-groups"] });
  qc.invalidateQueries({ queryKey: ["admin-tasks"] });
  qc.invalidateQueries({ queryKey: ["owner-task-groups"] });
  if (groupId) qc.invalidateQueries({ queryKey: ["task-group", groupId] });
}

function useInvalidateTasks() {
  const qc = useQueryClient();
  return (groupId?: string) => invalidateTasks(qc, groupId);
}
```

Extend the react-query import at the top of the file to carry the type:

```ts
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
```

- [ ] **Step 5: Add the create hook**

Append to `hooks/use-tasks.ts`, and extend its type import with `CreateTaskGroupRequest`:

```ts
/**
 * File a task group as an admin. The caller owns the idempotency key: it must be
 * the same string across retries of one attempt and a fresh one for a new order.
 */
export function useCreateTaskGroup() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({
      body,
      idempotencyKey,
    }: {
      body: CreateTaskGroupRequest;
      idempotencyKey: string;
    }) => taskService.createAdminGroup(body, idempotencyKey),
    onSuccess: (group) => invalidate(group.id),
  });
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run hooks/use-tasks.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 7: Run the full gates**

Run: `npx tsc --noEmit; npm run lint; npm test`
Expected: all clean, `148 passed`.

- [ ] **Step 8: Commit**

```bash
git add lib/services/task.service.ts hooks/use-tasks.ts hooks/use-tasks.test.ts
git commit -m "feat(tasks): admin task-group create, and the owner-scoped key nothing invalidated"
```

---

### Task 5: Copy, both locales

Done as its own task and before the UI so no component is written against a missing key.

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Produces: the `walkIn` namespace and `nav.walkIn`, used by Tasks 6, 7 and 8.

- [ ] **Step 1: Add the English copy**

Add a top-level `"walkIn"` object to `messages/en.json`, as a sibling of `"owners"`:

```json
  "walkIn": {
    "title": "Walk-in orders",
    "subtitle": "File an order taken by phone, Instagram, WhatsApp or Telegram. It is booked under the system account below.",
    "systemAccount": "System account",
    "property": "Property",
    "unseeded": "The walk-in account is not set up in this environment, so no order can be filed. It is created by the backend seeder, not from here.",
    "noPermission": "Filing an order needs the create-task-group permission, which your role does not hold.",
    "form": {
      "title": "Order title",
      "titlePlaceholder": "Phone order — Frau Weber, 3 rooms",
      "date": "Date",
      "startTime": "Start time",
      "workers": "Workers needed",
      "instructions": "Instructions for the worker",
      "instructionsPlaceholder": "Ring twice. Keys with the neighbour.",
      "submit": "File the order"
    },
    "errors": {
      "titleRequired": "Give the order a title.",
      "dateRequired": "Pick a date.",
      "startTimeRequired": "Set a start time.",
      "workerLimitInvalid": "At least one worker is needed.",
      "propertyGone": "The walk-in property is no longer there. Reload the page.",
      "generic": "The order could not be filed. Please try again."
    },
    "created": {
      "title": "Order filed",
      "body": "Assign a worker now, or leave it for the dispatch queue.",
      "assign": "Assign worker",
      "assigned": "Worker assigned",
      "another": "File another order"
    }
  },
```

Add to the existing `"nav"` object in the same file:

```json
    "walkIn": "Walk-in",
```

- [ ] **Step 2: Add the German copy**

Add the mirror object to `messages/de.json`, same position:

```json
  "walkIn": {
    "title": "Laufkundschaft-Aufträge",
    "subtitle": "Einen per Telefon, Instagram, WhatsApp oder Telegram aufgenommenen Auftrag erfassen. Er wird unter dem Systemkonto unten gebucht.",
    "systemAccount": "Systemkonto",
    "property": "Objekt",
    "unseeded": "Das Laufkundschaft-Konto ist in dieser Umgebung nicht eingerichtet, daher kann kein Auftrag erfasst werden. Es wird vom Backend-Seeder erstellt, nicht hier.",
    "noPermission": "Zum Erfassen eines Auftrags fehlt Ihrer Rolle die Berechtigung zum Anlegen von Aufgabengruppen.",
    "form": {
      "title": "Auftragstitel",
      "titlePlaceholder": "Telefonauftrag — Frau Weber, 3 Zimmer",
      "date": "Datum",
      "startTime": "Startzeit",
      "workers": "Benötigte Mitarbeiter",
      "instructions": "Hinweise für den Mitarbeiter",
      "instructionsPlaceholder": "Zweimal klingeln. Schlüssel beim Nachbarn.",
      "submit": "Auftrag erfassen"
    },
    "errors": {
      "titleRequired": "Geben Sie dem Auftrag einen Titel.",
      "dateRequired": "Wählen Sie ein Datum.",
      "startTimeRequired": "Legen Sie eine Startzeit fest.",
      "workerLimitInvalid": "Mindestens ein Mitarbeiter ist erforderlich.",
      "propertyGone": "Das Laufkundschaft-Objekt ist nicht mehr vorhanden. Laden Sie die Seite neu.",
      "generic": "Der Auftrag konnte nicht erfasst werden. Bitte erneut versuchen."
    },
    "created": {
      "title": "Auftrag erfasst",
      "body": "Weisen Sie jetzt einen Mitarbeiter zu oder überlassen Sie den Auftrag der Dispositionsliste.",
      "assign": "Mitarbeiter zuweisen",
      "assigned": "Mitarbeiter zugewiesen",
      "another": "Weiteren Auftrag erfassen"
    }
  },
```

And to `"nav"`:

```json
    "walkIn": "Laufkundschaft",
```

`"Laufkundschaft"` matches what `owners.tabs.walkIn` already says in this file — the two must not diverge.

- [ ] **Step 3: Prove both files still parse and the key sets match**

Run:
```bash
node -e "const a=require('./messages/en.json'),b=require('./messages/de.json');const f=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v?f(v,p+k+'.'):[p+k]);const A=f(a),B=f(b);console.log('en',A.length,'de',B.length);console.log('en-only',A.filter(k=>!B.includes(k)));console.log('de-only',B.filter(k=>!A.includes(k)));"
```
Expected: equal counts, and both "only" lists empty.

- [ ] **Step 4: Run the full gates**

Run: `npx tsc --noEmit; npm run lint; npm test`
Expected: all clean, `148 passed`.

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/de.json
git commit -m "i18n(walk-in): copy for the manual-order page, both locales"
```

---

### Task 6: The month date picker component

**Files:**
- Create: `components/tasks/month-date-picker.tsx`

**Interfaces:**
- Consumes: `monthGrid`, `shiftMonth`, `isPastDay`, `YearMonth` (Task 2); `toLocalDateKey` from `lib/tasks/weekly-rows`
- Produces: `<MonthDatePicker value={string[]} onChange={(v: string[]) => void} disabled?={boolean} />`

- [ ] **Step 1: Write the component**

```tsx
// components/tasks/month-date-picker.tsx
"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  isPastDay,
  monthGrid,
  shiftMonth,
  type YearMonth,
} from "@/lib/tasks/month-grid";
import { toLocalDateKey } from "@/lib/tasks/weekly-rows";
import { cn } from "@/lib/utils";

/** Monday-first, matching `tasks-calendar.tsx`. */
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/**
 * Pick the day an order is for.
 *
 * Single-select: clicking a day replaces the selection. `value` is an array
 * anyway, because the wire field is one — which makes multi-select a change of
 * this handler rather than of the interface.
 *
 * Past days are disabled. Nothing server-side refuses them; work that has been
 * and gone cannot be usefully staffed, so the refusal is ours.
 */
export function MonthDatePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const locale = useLocale();
  const todayKey = toLocalDateKey(new Date());

  const [view, setView] = useState<YearMonth>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const cells = useMemo(() => monthGrid(view), [view]);
  const selected = new Set(value);

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          disabled={disabled}
          onClick={() => setView((v) => shiftMonth(v, -1))}
          aria-label={monthLabel}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          disabled={disabled}
          onClick={() => setView((v) => shiftMonth(v, 1))}
          aria-label={monthLabel}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="py-1 text-center text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
          >
            {w}
          </span>
        ))}

        {cells.map((cell) => {
          const past = isPastDay(cell.key, todayKey);
          const isSelected = selected.has(cell.key);
          return (
            <button
              key={cell.key}
              type="button"
              disabled={disabled || past}
              aria-pressed={isSelected}
              onClick={() => onChange([cell.key])}
              className={cn(
                "flex h-9 items-center justify-center rounded-md border text-[13px] tabular-nums transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40",
                isSelected
                  ? "border-primary bg-primary font-medium text-primary-foreground hover:bg-primary/90"
                  : "border-transparent hover:bg-accent/40",
                // A padding day stays clickable but recedes: it is a real,
                // selectable date, just not part of the month on screen.
                !isSelected && !cell.inMonth && "text-muted-foreground/50",
                !isSelected && cell.inMonth && "text-foreground",
                cell.key === todayKey && !isSelected && "border-border font-medium",
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the gates**

Run: `npx tsc --noEmit; npm run lint; npm test`
Expected: all clean, `148 passed`. No new test: the arithmetic is already covered by Task 2 and this file is a renderer over it.

- [ ] **Step 3: Verify the two icon names actually exist in this lucide version**

Run: `node -e "const l=require('lucide-react');for(const n of ['ChevronLeft','ChevronRight'])console.log(n, typeof l[n])"`
Expected: both `function`. `lucide-react` v1 renamed many icons and keeps the old names only as aliases; if either prints `undefined`, find the canonical name before continuing.

- [ ] **Step 4: Commit**

```bash
git add components/tasks/month-date-picker.tsx
git commit -m "feat(tasks): a month grid for picking the day an order is for"
```

---

### Task 7: The order form and in-place staffing

**Files:**
- Create: `components/walk-in/walk-in-order-form.tsx`

**Interfaces:**
- Consumes: `buildWalkInOrder`, `WalkInOrderDraft`, `WalkInOrderErrorKey` (Task 3); `useCreateTaskGroup` (Task 4); the `walkIn` namespace (Task 5); `MonthDatePicker` (Task 6); `newIdempotencyKey` (Task 1); the existing `AssignWorkerDialog`, `useAssignWorker`, `useHasPermission`, `getApiErrorCode`
- Produces: `<WalkInOrderForm propertyId={string} />`

- [ ] **Step 1: Write the component**

```tsx
// components/walk-in/walk-in-order-form.tsx
"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssignWorkerDialog } from "@/components/tasks/assign-worker-dialog";
import { MonthDatePicker } from "@/components/tasks/month-date-picker";
import { useAssignWorker, useCreateTaskGroup } from "@/hooks/use-tasks";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { getApiErrorCode } from "@/lib/http/api-error";
import { newIdempotencyKey } from "@/lib/http/idempotency";
import {
  buildWalkInOrder,
  type WalkInOrderDraft,
  type WalkInOrderErrorKey,
} from "@/lib/tasks/walk-in-order";
import type { TaskGroupDto, TaskItemDto } from "@/lib/types/task.types";

const EMPTY: WalkInOrderDraft = {
  title: "",
  date: "",
  startTime: "09:00",
  workerLimit: "1",
  instructions: "",
};

/**
 * File one order under the walk-in property, then staff it without leaving.
 *
 * `propertyId` is a prop rather than a field: exactly one walk-in property
 * exists, the page above resolves it, and the page does not render this form at
 * all when it is missing. Sending any other property would make five
 * contract-derived refusals reachable that this form deliberately cannot render.
 */
export function WalkInOrderForm({ propertyId }: { propertyId: string }) {
  const t = useTranslations("walkIn");
  const canCreate = useHasPermission("task_group:create_any");

  const [draft, setDraft] = useState<WalkInOrderDraft>(EMPTY);
  const [localError, setLocalError] = useState<WalkInOrderErrorKey | null>(null);
  const [created, setCreated] = useState<TaskGroupDto | null>(null);

  /**
   * One key per attempt, held across retries — that is what makes the route's
   * `[Idempotent]` replay work. A fresh key per request would turn a retried
   * order into two orders.
   */
  const key = useRef<string | null>(null);
  const create = useCreateTaskGroup();

  function set<K extends keyof WalkInOrderDraft>(field: K) {
    return (value: string) => setDraft((d) => ({ ...d, [field]: value }));
  }

  function handleSubmit() {
    setLocalError(null);
    const result = buildWalkInOrder(draft, propertyId);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    key.current ??= newIdempotencyKey();
    create.mutate(
      { body: result.body, idempotencyKey: key.current },
      {
        onSuccess: (group) => {
          setCreated(group);
          // Only now is the intent finished, so only now may the key change.
          key.current = null;
        },
      },
    );
  }

  function fileAnother() {
    setCreated(null);
    setDraft(EMPTY);
    setLocalError(null);
    create.reset();
  }

  const serverError = create.isError
    ? getApiErrorCode(create.error) === "property_not_found"
      ? t("errors.propertyGone")
      : t("errors.generic")
    : null;

  if (created) {
    return <CreatedPanel group={created} onAnother={fileAnother} />;
  }

  const disabled = !canCreate || create.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          {t("form.submit")}
        </h2>
        {!canCreate ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{t("noPermission")}</p>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wi-title">{t("form.title")}</Label>
          <Input
            id="wi-title"
            value={draft.title}
            onChange={(e) => set("title")(e.target.value)}
            placeholder={t("form.titlePlaceholder")}
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("form.date")}</Label>
          <MonthDatePicker
            value={draft.date ? [draft.date] : []}
            onChange={(v) => set("date")(v[0] ?? "")}
            disabled={disabled}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wi-time">{t("form.startTime")}</Label>
            <Input
              id="wi-time"
              type="time"
              value={draft.startTime}
              onChange={(e) => set("startTime")(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wi-workers">{t("form.workers")}</Label>
            <Input
              id="wi-workers"
              type="number"
              min={1}
              step={1}
              value={draft.workerLimit}
              onChange={(e) => set("workerLimit")(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wi-instructions">{t("form.instructions")}</Label>
          <textarea
            id="wi-instructions"
            value={draft.instructions}
            onChange={(e) => set("instructions")(e.target.value)}
            placeholder={t("form.instructionsPlaceholder")}
            disabled={disabled}
            className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>

        {localError ? (
          <p className="text-sm text-destructive">
            {t(`errors.${localError}` as Parameters<typeof t>[0])}
          </p>
        ) : serverError ? (
          <p className="text-sm text-destructive">{serverError}</p>
        ) : null}

        <Button onClick={handleSubmit} disabled={disabled} className="self-start">
          {create.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t("form.submit")}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * The `201` already carries `tasks[]`, one per date, each with its id — so
 * staffing needs no re-fetch. `propertyName` on those tasks is `""` and
 * `isEnrolled` is `true` on this route; neither is rendered.
 */
function CreatedPanel({
  group,
  onAnother,
}: {
  group: TaskGroupDto;
  onAnother: () => void;
}) {
  const t = useTranslations("walkIn");

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold tracking-tight">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          {t("created.title")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("created.body")}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {group.tasks.map((task) => (
          <TaskStaffingRow key={task.id} task={task} groupId={group.id} />
        ))}
        <Button variant="outline" onClick={onAnother} className="mt-1 self-start">
          {t("created.another")}
        </Button>
      </CardContent>
    </Card>
  );
}

function TaskStaffingRow({ task, groupId }: { task: TaskItemDto; groupId: string }) {
  const t = useTranslations("walkIn");
  const [open, setOpen] = useState(false);
  const assign = useAssignWorker(groupId);
  const assigned = task.workers.length > 0 || assign.isSuccess;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
      <span className="text-[13px] tabular-nums">{task.scheduledDate}</span>
      {assigned ? (
        <span className="text-[13px] text-muted-foreground">{t("created.assigned")}</span>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {t("created.assign")}
        </Button>
      )}

      {/* Mounted only while open — the picker seeds its search on first render. */}
      {open ? (
        <AssignWorkerDialog
          open={open}
          onClose={() => !assign.isPending && setOpen(false)}
          isPending={assign.isPending}
          error={assign.isError ? t("errors.generic") : null}
          onAssign={(workerId) =>
            assign.mutate(
              { taskId: task.id, workerId },
              { onSuccess: () => setOpen(false) },
            )
          }
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Run the gates**

Run: `npx tsc --noEmit; npm run lint; npm test`
Expected: all clean, `148 passed`.

- [ ] **Step 3: Verify the icon names**

Run: `node -e "const l=require('lucide-react');for(const n of ['CheckCircle2','Loader2'])console.log(n, typeof l[n])"`
Expected: both `function`. If `CheckCircle2` is `undefined`, use `CircleCheck` — v1 renamed the numbered variants.

- [ ] **Step 4: Commit**

```bash
git add components/walk-in/walk-in-order-form.tsx
git commit -m "feat(walk-in): the order form, and staffing the task it just created"
```

---

### Task 8: The page and the sidebar entry

**Files:**
- Create: `app/[locale]/dashboard/(owner)/walk-in/page.tsx`
- Modify: `lib/nav-items.ts:49-56` (add the nav item)

**Interfaces:**
- Consumes: `WalkInOrderForm` (Task 7); the `walkIn` namespace and `nav.walkIn` (Task 5); the existing `useWalkInOwnerId`, `useOwner`, `useOwnerProperties`, `WeeklyWorkCard`

- [ ] **Step 1: Read the routing guide before writing the route**

Run: `ls node_modules/next/dist/docs/`
Then read whichever file covers App Router pages. `AGENTS.md` requires this: the version in this repo has breaking changes against training data, and this task creates a route.

- [ ] **Step 2: Add the nav entry**

In `lib/nav-items.ts`, add to the `owner` group's `items`, immediately after the `Owners` entry:

```ts
      // Gated on `owner:list`, not on `task_group:create_any` (110038): 110038
      // is SUPER_ADMIN-only, and a MODERATOR should reach this page and see the
      // account and its order history. The form disables itself.
      { title: "Walk-in",    labelKey: "nav.walkIn",     url: "/dashboard/walk-in",         icon: Phone,      permission: "owner:list" },
```

Add `Phone` to the lucide import at the top of the file. `Phone` is already used elsewhere in this codebase, so it is a canonical name in this version.

- [ ] **Step 3: Write the page**

```tsx
// app/[locale]/dashboard/(owner)/walk-in/page.tsx
"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WeeklyWorkCard } from "@/components/owners/weekly-work-card";
import { WalkInOrderForm } from "@/components/walk-in/walk-in-order-form";
import { useOwner, useOwnerProperties, useWalkInOwnerId } from "@/hooks/use-owners";

/**
 * Filing an order that arrived by phone, Instagram, WhatsApp or Telegram.
 *
 * The task engine cannot create work without an owner and a property, and these
 * customers have neither — so the backend seeds one permanent account with one
 * property and every manual order is filed under it. There is nothing to create
 * here but the order itself: the account is capped at one by the database, and
 * delete, edit, contract and ticket against it are all refused.
 */
export default function WalkInPage() {
  const t = useTranslations("walkIn");

  const walkIn = useWalkInOwnerId();
  const walkInId = walkIn.data ?? "";
  // All three carry `enabled: !!id`, so they stay idle until the id resolves.
  const owner = useOwner(walkInId);
  const { data: properties = [], isPending: propertiesPending } =
    useOwnerProperties(walkInId);

  const property = properties[0] ?? null;
  const settling = walkIn.isPending || (!!walkInId && propertiesPending);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {settling ? (
        <>
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </>
      ) : !walkIn.data || !property ? (
        /**
         * `useWalkInOwnerId` resolves to `null` rather than throwing when the
         * environment has no walk-in row, and the property list can be empty for
         * the same reason. Neither is an empty state — it is an unseeded
         * environment, which is a fact about the system and not about an owner.
         * No form is rendered: an enabled form over a missing property only
         * produces `400 property_not_found` after the order has been typed.
         */
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("unseeded")}</p>
        </div>
      ) : (
        <>
          {/* One line, no card: the account is context for the form below it,
              not the subject of the page. `HeroCard` is deliberately not used —
              it reads a contract period, and this account can never hold one. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-border px-4 py-3">
            <span className="text-sm font-medium">{owner.data?.fullName ?? "—"}</span>
            <Badge variant="secondary">{t("systemAccount")}</Badge>
            <span className="text-sm text-muted-foreground">
              {t("property")}: {property.name || property.address}
            </span>
          </div>

          <WalkInOrderForm propertyId={property.id} />

          {/* Kept beyond the letter of the request: a worker cannot hold two
              assignments on one date (`400 worker_has_overlapping_assignment`),
              and seeing what is already booked is how that is avoided. */}
          <WeeklyWorkCard ownerUserId={walkInId} properties={properties} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the gates**

Run: `npx tsc --noEmit; npm run lint; npm test`
Expected: all clean, `148 passed`.

- [ ] **Step 5: Prove the route builds and the gate resolves**

Run: `npm run build`
Expected: `Compiled successfully`, and `/[locale]/dashboard/walk-in` appears in the route list.

Then read `resolveRouteGate` at `lib/nav-items.ts:126-142` and confirm by hand that the new nav item's `url` puts `/dashboard/walk-in` into the sorted prefix list with `permission: "owner:list"`, and that no longer prefix matches it first. There is no runtime check for this — `resolveRouteGate` is TypeScript with no test file, so reading it is the verification.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/dashboard/(owner)/walk-in/page.tsx" lib/nav-items.ts
git commit -m "feat(walk-in): a page for manual orders, under the Owner group"
```

---

## What no gate here covers

State this plainly when reporting the work, rather than implying the green suite covers the feature:

- **Nothing renders a component in the test suite.** `vitest` runs over `lib/` and `hooks/` with no jsdom. So the page layout, the month grid's appearance, the disabled-form state for a MODERATOR, the unseeded state, and the created-panel staffing flow are all unverified by any gate.
- **No request is ever issued.** `createAdminGroup`, the idempotency header and every error branch are typed and reasoned about, not observed. The first real `201` is the first evidence.
- **The `de` copy is machine-written.** It mirrors the phrasing already in `de.json` where one existed, and is a first draft where none did.

A browser pass over `/dashboard/walk-in` — file one order, assign one worker, then reload and confirm it is in the history — is what actually validates this feature.
