# Phase 3 — FND-3 Paged Tables and Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Owners and Workers directories onto the FND-3 server-paged endpoints with real filters, sortable columns, URL-shareable views, and CSV/XLSX export.

**Architecture:** Docs answers *"who needs reviewing"*; these two screens are the full catalogue — rich filters, paging, export. All four dimensions (page, size, sort, filters) live in the **URL query**, which makes a view shareable and covers the "saved views" gap the API deliberately left to clients (spec §7 `:605`). One `use-paged-table` hook owns that serialization for both screens.

**Tech Stack:** Next.js 16 App Router, next-intl, TanStack react-query v5, axios, Tailwind v4, vitest.

**Depends on:** Phase 1 Close (all 8 tasks). Runs on **G4 only** — independent of Phase 2, and may run in parallel with it.

---

## What Phase 0 already built

The roadmap's 8-task outline predates Phase 0's work. Read this before starting, or two tasks get
rebuilt:

| Already done | Where | Consequence |
|---|---|---|
| `PagedResult<T>` envelope, `PagedQuery`, `DEFAULT_PAGE_SIZE = 25`, `MAX_PAGE_SIZE = 100`, `emptyPage()` | `lib/types/paged.types.ts` | Task 1 consumes these; it does not define them |
| **Every** FND-3 worker filter, typed | `lib/types/worker.types.ts:60-78` — `search`, `status`, `onboardingStatus`, `employeeType`, `professionIds[]`, `ratingMin`, `includeUnrated`, `experienceMin/Max`, `completedMin/Max`, `registeredFrom/To`, `hasActiveContract`, `onTask` | Task 5 builds only the **UI**; the query type is finished |
| `WORKER_SORT_COLUMNS` whitelist | `lib/types/worker.types.ts:81-87` | Task 1's guard uses it |
| Paged worker service, with repeated-key serialization | `lib/services/worker.service.ts:18-29` — `paramsSerializer: { indexes: null }` | Task 5 needs no service change |

**The owner half has none of this.** `lib/services/owner.service.ts:20` fetches the directory from
`/api/admin/owners/bosses` — the unpaged *picker* endpoint (spec §7 `:175`), not the paged table
endpoint at `:599`. That is Task 2's job.

---

## Two known primitive limits, and one real bug

Found while reading the components this phase must reuse. Each changes a task.

**1. `DataTableCard` cannot hold a sortable head.** `components/ui/data-table-card.tsx:10` types
columns as `{ label: string; className?: string }` and renders each inside a plain `TableHead`. This
phase needs `SortableTableHead`. Task 4 Step 1 extends the type rather than forking the component.

**2. `FilterMenu` is single-select only.** `components/ui/filter-menu.tsx:68` renders a
`DropdownMenuRadioGroup` per group — one value each. The worker filter set needs a multi-select
(`professionIds`, match-any), four numeric ranges, a date range, and two booleans. A radio dropdown
cannot express any of that. Task 5 builds a `Sheet`-based filter form; `FilterMenu` stays for the
owner screen, whose filters are all single-select.

**3. `TablePagination`'s default page sizes exceed the server's ceiling — this is a bug.**
`components/ui/table-pagination.tsx:30` defaults `pageSizeOptions = [50, 100, 200]`, and
`MAX_PAGE_SIZE` is **100**. `PagedQuery`'s own comment (`paged.types.ts:18`) says the server *"clamps
to [1,100] silently — 500 becomes 100, not an error"*. So choosing 200 returns 100 rows while the
component still computes `pageCount = ceil(total / 200)` — **half the real page count**, and the last
pages of the table become unreachable with no error anywhere. Task 1 Step 7 fixes it.

---

## Global Constraints

1. **All four view dimensions live in the URL.** `page`, `pageSize`, `sortBy`, `dir` and every filter
   are query params. A pasted URL reproduces the view exactly. This is the spec's stated substitute
   for server-side saved views.
2. **`sortBy` is whitelist-guarded client-side.** Anything outside the table's list is
   `400 invalid_sort_column`. A URL someone hand-edited must fall back to the default, never reach the
   server.
3. **`pageSize` is clamped to `MAX_PAGE_SIZE` client-side.** The server clamps silently, so an
   unclamped client shows wrong page counts rather than an error.
4. **`PagedResult.items` is `T[] | null`.** `paged.types.ts:8`. Always `?? []`. Never `.map` it raw.
5. **`dir` is PascalCase on the wire.** `SortDir = "Asc" | "Desc"` (`onboarding.types.ts:54`), while
   `SortableTableHead` takes `"asc" | "desc"`. Convert in one place — the hook — and never at a call
   site.
6. **`professionIds` serializes as a repeated key.** `paramsSerializer: { indexes: null }`. Axios's
   default would send `professionIds[0]=…`, which the server does not read. Already correct in
   `worker.service.ts:25`; the owner service needs the same option only if it grows an array param.
7. **Validate ranges client-side before requesting.** `registeredFrom > registeredTo` and any
   inverted numeric range return `400 invalid_filter_value`. The user should see the problem on the
   field, not as a request failure.
8. **Export is PII egress and is audited.** Every export writes an audit row. The button carries a
   "this action is logged" note — not buried in a tooltip. More than 50,000 matching rows is
   `400 export_too_large`; there is no async export, so the only remedy is "narrow the filter".
9. **`Blocked` means "was covered once and isn't now", not "banned".** Spec §7 `:608`. The filter
   label must say that. Omitting `status` excludes `Deleted`.
10. **`hasActiveContract` is a lagging mirror (≤ 1 h).** Tooltip says so. It is the same hourly
    reconciliation as `isActive`.
11. **Permission-aware rendering.** Export needs `owner:export` (30004) / the worker equivalent.
    An admin without it does not see the button.
12. **Reuse, don't re-invent.** Extend `DataTableCard`; do not fork it.
13. **Gates:** `npm run test` green, `npx tsc --noEmit` 0, `npm run lint` **0**, `npm run build`
    compiles.
14. **Commit per task.**

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `hooks/use-paged-table.ts` | **New.** URL ⇄ state for page/size/sort/filters; clamping; whitelist guard | 1 |
| `hooks/use-paged-table.test.ts` | **New.** Serialization round-trips and every guard | 1 |
| `components/ui/table-pagination.tsx` | Page-size options bounded by `MAX_PAGE_SIZE` | 1 |
| `lib/types/owner.types.ts` | `OwnerListQuery`, `OwnerRowDto`, `OWNER_SORT_COLUMNS` | 2 |
| `lib/services/owner.service.ts` | Paged `/api/admin/owners`; retire the `bosses`-as-directory call | 2 |
| `hooks/use-owners.ts` | `useOwnerTable(query)` returning `PagedResult<OwnerRowDto>` | 2 |
| `lib/services/export.service.ts` | **New.** Blob download, filename from `Content-Disposition` | 3 |
| `lib/filters/range.ts` | **New.** Range validation shared by both screens | 6 |
| `lib/filters/range.test.ts` | **New.** | 6 |
| `components/ui/data-table-card.tsx` | Columns may carry a rendered head | 4 |
| `components/directory/export-button.tsx` | **New.** Shared, permission-gated, with the audit note | 3 |
| `app/[locale]/dashboard/(owner)/owners/page.tsx` | Owners directory | 4 |
| `components/workers/worker-filter-sheet.tsx` | **New.** The rich worker filter form | 5 |
| `app/[locale]/dashboard/(worker)/workers/page.tsx` | Workers directory | 5 |
| `lib/csv.ts` | Keep for attendance; remove the two directory call sites | 7 |

---

## A note on detail density

Tasks 1, 2, 3 and 6 carry complete code, because they are logic and their correctness is decidable
here. **Task 5's filter sheet deliberately does not.** It specifies the field order, the grouping, the
interaction rules, the two labels whose meaning is not guessable from the field name, and the
validation wiring — and leaves the markup to the implementer, who per the roadmap's agent-assignment
table (`2026-08-04-v2-migration-roadmap.md:47`) must invoke `frontend-design:frontend-design` first.

Dictating the JSX for a form of that size would either duplicate what that skill exists to decide or
produce markup nobody chose. What the task does fix is everything a wrong choice would break:
which fields, in what order, writing through to the URL with no local draft state, and errors on the
field rather than on the request.

---

## Task 1: `use-paged-table` — the URL is the state

**Files:**
- Create: `hooks/use-paged-table.ts`
- Create: `hooks/use-paged-table.test.ts`
- Modify: `components/ui/table-pagination.tsx`

**Interfaces:**
- Consumes: `DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE`, `PagedQuery` from `lib/types/paged.types.ts`;
  `SortDir` from `lib/types/onboarding.types.ts`; `useRouter`/`usePathname` from `@/i18n/navigation`;
  `useSearchParams` from `next/navigation`.
- Produces:
  ```ts
  export interface PagedTableState<F extends Record<string, unknown>> {
    page: number;
    pageSize: number;
    sortBy: string;
    dir: SortDir;
    filters: F;
    /** Ready to spread into a service query. Empty filters are omitted. */
    query: PagedQuery & F;
    setPage(page: number): void;
    setPageSize(size: number): void;
    /** Same column toggles direction; a new column starts at the default. */
    toggleSort(column: string): void;
    setFilter(key: keyof F, value: unknown): void;
    reset(): void;
    /** `"asc" | "desc"` for SortableTableHead, which does not speak SortDir. */
    uiDir: "asc" | "desc";
    activeFilterCount: number;
  }
  export function usePagedTable<F extends Record<string, unknown>>(opts: {
    sortColumns: readonly string[];
    defaultSortBy: string;
    defaultDir?: SortDir;
    filterKeys: readonly (keyof F & string)[];
    /** Keys whose value is a repeated array in the URL (e.g. professionIds). */
    arrayKeys?: readonly (keyof F & string)[];
    /** Keys whose value is a boolean. */
    booleanKeys?: readonly (keyof F & string)[];
    /** Keys whose value is a number. */
    numberKeys?: readonly (keyof F & string)[];
  }): PagedTableState<F>;

  /** Exported for testing and reuse — pure, no React. */
  export function parseTableParams<F extends Record<string, unknown>>(
    params: URLSearchParams, opts: …,
  ): { page: number; pageSize: number; sortBy: string; dir: SortDir; filters: F };
  export function buildTableParams(state: …): URLSearchParams;
  ```
  The pure `parseTableParams` / `buildTableParams` pair is what the tests exercise — a hook needs a
  React renderer, and this suite is node-environment by design.

- [ ] **Step 1: Write the failing test**

```ts
// hooks/use-paged-table.test.ts
import { describe, expect, it } from "vitest";
import { buildTableParams, parseTableParams } from "@/hooks/use-paged-table";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/types/paged.types";

const OPTS = {
  sortColumns: ["fullName", "createdAt", "rating"] as const,
  defaultSortBy: "createdAt",
  defaultDir: "Desc" as const,
  filterKeys: ["search", "status", "professionIds", "ratingMin", "onTask"] as const,
  arrayKeys: ["professionIds"] as const,
  booleanKeys: ["onTask"] as const,
  numberKeys: ["ratingMin"] as const,
};

const parse = (qs: string) => parseTableParams(new URLSearchParams(qs), OPTS);

describe("parseTableParams — defaults", () => {
  it("falls back to page 1, the default size, and the default sort", () => {
    const s = parse("");
    expect(s.page).toBe(1);
    expect(s.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(s.sortBy).toBe("createdAt");
    expect(s.dir).toBe("Desc");
    expect(s.filters).toEqual({});
  });
});

describe("parseTableParams — guards", () => {
  it("clamps pageSize to MAX_PAGE_SIZE rather than trusting the URL", () => {
    // The server clamps silently, so an unclamped client would compute page
    // counts from a size it never actually got.
    expect(parse("pageSize=500").pageSize).toBe(MAX_PAGE_SIZE);
    expect(parse("pageSize=0").pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(parse("pageSize=-3").pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(parse("pageSize=abc").pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it("clamps page to at least 1", () => {
    expect(parse("page=0").page).toBe(1);
    expect(parse("page=-5").page).toBe(1);
    expect(parse("page=abc").page).toBe(1);
    expect(parse("page=7").page).toBe(7);
  });

  it("rejects a sortBy outside the whitelist instead of forwarding it", () => {
    // Reaching the server with this is 400 invalid_sort_column, and a
    // hand-edited URL should not be able to break the screen.
    expect(parse("sortBy=passwordHash").sortBy).toBe("createdAt");
    expect(parse("sortBy=rating").sortBy).toBe("rating");
  });

  it("accepts only the two SortDir literals, case-sensitively", () => {
    expect(parse("dir=Asc").dir).toBe("Asc");
    expect(parse("dir=asc").dir).toBe("Desc");
    expect(parse("dir=sideways").dir).toBe("Desc");
  });
});

describe("parseTableParams — filters", () => {
  it("reads a string filter and omits an empty one", () => {
    expect(parse("search=müller").filters.search).toBe("müller");
    expect(parse("search=").filters).toEqual({});
    expect(parse("search=%20%20").filters).toEqual({});
  });

  it("collects a repeated key into an array", () => {
    expect(parse("professionIds=a&professionIds=b").filters.professionIds).toEqual(["a", "b"]);
  });

  it("reads a single repeated key as a one-element array, not a string", () => {
    expect(parse("professionIds=a").filters.professionIds).toEqual(["a"]);
  });

  it("coerces numbers and drops unparseable ones", () => {
    expect(parse("ratingMin=4").filters.ratingMin).toBe(4);
    expect(parse("ratingMin=4.5").filters.ratingMin).toBe(4.5);
    expect(parse("ratingMin=high").filters).toEqual({});
  });

  it("coerces booleans from the two literals only", () => {
    expect(parse("onTask=true").filters.onTask).toBe(true);
    expect(parse("onTask=false").filters.onTask).toBe(false);
    expect(parse("onTask=1").filters).toEqual({});
  });

  it("ignores a param that is not a declared filter key", () => {
    expect(parse("injected=x").filters).toEqual({});
  });
});

describe("buildTableParams", () => {
  const base = {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: "createdAt",
    dir: "Desc" as const,
    filters: {},
  };

  it("omits everything that equals its default, keeping a clean URL", () => {
    expect(buildTableParams(base, OPTS).toString()).toBe("");
  });

  it("writes only what differs from the default", () => {
    const qs = buildTableParams({ ...base, page: 3, sortBy: "rating" }, OPTS);
    expect(qs.get("page")).toBe("3");
    expect(qs.get("sortBy")).toBe("rating");
    expect(qs.get("pageSize")).toBeNull();
    expect(qs.get("dir")).toBeNull();
  });

  it("writes an array filter as repeated keys", () => {
    const qs = buildTableParams(
      { ...base, filters: { professionIds: ["a", "b"] } },
      OPTS,
    );
    expect(qs.getAll("professionIds")).toEqual(["a", "b"]);
  });

  it("omits an empty array, an empty string, and undefined", () => {
    const qs = buildTableParams(
      { ...base, filters: { professionIds: [], search: "", ratingMin: undefined } },
      OPTS,
    );
    expect(qs.toString()).toBe("");
  });

  it("round-trips every dimension", () => {
    const state = {
      page: 4,
      pageSize: 50,
      sortBy: "fullName",
      dir: "Asc" as const,
      filters: {
        search: "müller",
        professionIds: ["a", "b"],
        ratingMin: 4,
        onTask: true,
      },
    };
    const reparsed = parseTableParams(buildTableParams(state, OPTS), OPTS);
    expect(reparsed).toEqual(state);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run test`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the pure half**

```ts
// hooks/use-paged-table.ts
"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type PagedQuery,
} from "@/lib/types/paged.types";
import type { SortDir } from "@/lib/types/onboarding.types";

export interface PagedTableOptions<F extends Record<string, unknown>> {
  sortColumns: readonly string[];
  defaultSortBy: string;
  defaultDir?: SortDir;
  filterKeys: readonly (keyof F & string)[];
  arrayKeys?: readonly (keyof F & string)[];
  booleanKeys?: readonly (keyof F & string)[];
  numberKeys?: readonly (keyof F & string)[];
}

interface ParsedState<F> {
  page: number;
  pageSize: number;
  sortBy: string;
  dir: SortDir;
  filters: F;
}

function clampPage(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/**
 * The server clamps `pageSize` to [1,100] **silently** — 500 comes back as 100
 * with no error (`lib/types/paged.types.ts:18`). An unclamped client therefore
 * computes `pageCount` from a size it never received, and the tail of the table
 * becomes unreachable with nothing to indicate why.
 */
function clampPageSize(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(n), MAX_PAGE_SIZE);
}

export function parseTableParams<F extends Record<string, unknown>>(
  params: URLSearchParams,
  opts: PagedTableOptions<F>,
): ParsedState<F> {
  const rawSort = params.get("sortBy");
  // A hand-edited or stale URL must not reach the server: an unknown column is
  // 400 invalid_sort_column, which would break the screen on load.
  const sortBy =
    rawSort && opts.sortColumns.includes(rawSort) ? rawSort : opts.defaultSortBy;

  const rawDir = params.get("dir");
  // Case-sensitive on purpose — SortDir is PascalCase on the wire.
  const dir: SortDir =
    rawDir === "Asc" || rawDir === "Desc" ? rawDir : (opts.defaultDir ?? "Desc");

  const filters = {} as Record<string, unknown>;
  for (const key of opts.filterKeys) {
    if (opts.arrayKeys?.includes(key)) {
      const all = params.getAll(key).filter((v) => v.trim() !== "");
      if (all.length > 0) filters[key] = all;
      continue;
    }
    const raw = params.get(key);
    if (raw === null || raw.trim() === "") continue;

    if (opts.booleanKeys?.includes(key)) {
      if (raw === "true") filters[key] = true;
      else if (raw === "false") filters[key] = false;
      continue;
    }
    if (opts.numberKeys?.includes(key)) {
      const n = Number(raw);
      if (Number.isFinite(n)) filters[key] = n;
      continue;
    }
    filters[key] = raw;
  }

  return {
    page: clampPage(params.get("page")),
    pageSize: clampPageSize(params.get("pageSize")),
    sortBy,
    dir,
    filters: filters as F,
  };
}

/**
 * Serialize back to a URL, **omitting anything at its default**. A clean URL is
 * the point: a shared link should show what the sharer changed, not thirty
 * params of which twenty-eight are defaults.
 */
export function buildTableParams<F extends Record<string, unknown>>(
  state: ParsedState<F>,
  opts: PagedTableOptions<F>,
): URLSearchParams {
  const params = new URLSearchParams();
  if (state.page !== 1) params.set("page", String(state.page));
  if (state.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(state.pageSize));
  if (state.sortBy !== opts.defaultSortBy) params.set("sortBy", state.sortBy);
  if (state.dir !== (opts.defaultDir ?? "Desc")) params.set("dir", state.dir);

  for (const key of opts.filterKeys) {
    const value = (state.filters as Record<string, unknown>)[key];
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, String(v));
      continue;
    }
    params.set(key, String(value));
  }
  return params;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run test`

Expected: PASS. The round-trip case is the one that catches asymmetry between the two functions; if
it fails, compare which keys each side treats as defaults.

- [ ] **Step 5: Add the hook on top of the pure pair**

```ts
// hooks/use-paged-table.ts — continued

export interface PagedTableState<F extends Record<string, unknown>> {
  page: number;
  pageSize: number;
  sortBy: string;
  dir: SortDir;
  filters: F;
  query: PagedQuery & F;
  setPage(page: number): void;
  setPageSize(size: number): void;
  toggleSort(column: string): void;
  setFilter(key: keyof F & string, value: unknown): void;
  reset(): void;
  uiDir: "asc" | "desc";
  activeFilterCount: number;
}

export function usePagedTable<F extends Record<string, unknown>>(
  opts: PagedTableOptions<F>,
): PagedTableState<F> {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo(
    () => parseTableParams<F>(new URLSearchParams(searchParams.toString()), opts),
    // `opts` is a literal at every call site; depending on searchParams alone
    // keeps this from re-parsing on every render.
    [searchParams, opts],
  );

  const push = useCallback(
    (next: ParsedState<F>) => {
      const qs = buildTableParams(next, opts).toString();
      // `replace`, not `push`: paging is not navigation, and filling the back
      // stack with every filter keystroke makes Back useless.
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [opts, pathname, router],
  );

  return {
    ...state,
    query: { page: state.page, pageSize: state.pageSize, sortBy: state.sortBy, dir: state.dir, ...state.filters },
    uiDir: state.dir === "Asc" ? "asc" : "desc",
    activeFilterCount: Object.keys(state.filters).length,
    setPage: (page) => push({ ...state, page }),
    // Changing the page size while deep in the table would land on a page that
    // may no longer exist, so reset to 1.
    setPageSize: (pageSize) => push({ ...state, pageSize, page: 1 }),
    toggleSort: (column) =>
      push({
        ...state,
        page: 1,
        sortBy: column,
        dir:
          state.sortBy === column
            ? state.dir === "Asc"
              ? "Desc"
              : "Asc"
            : (opts.defaultDir ?? "Desc"),
      }),
    // Any filter change invalidates the current page number.
    setFilter: (key, value) =>
      push({ ...state, page: 1, filters: { ...state.filters, [key]: value } as F }),
    reset: () =>
      push({
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        sortBy: opts.defaultSortBy,
        dir: opts.defaultDir ?? "Desc",
        filters: {} as F,
      }),
  };
}
```

- [ ] **Step 6: Verify the hook compiles and `opts` identity is stable**

Run: `npx tsc --noEmit`

Expected: exit 0. Then confirm every call site declares its `opts` object **outside** the component
(a module-level `const`), not inline — an inline literal is a new object each render and the `useMemo`
would re-parse every time. Add a comment at each call site saying so.

- [ ] **Step 7: Fix the page-size ceiling bug in `TablePagination`**

`components/ui/table-pagination.tsx:30` offers 200, which exceeds `MAX_PAGE_SIZE` of 100. The server
returns 100 rows while the component computes `pageCount = ceil(total / 200)` — half the real count,
making the tail of the table unreachable with no error shown.

```tsx
import { MAX_PAGE_SIZE } from "@/lib/types/paged.types";

/**
 * Bounded by the server's ceiling, not by taste. `PagedQuery` documents that the
 * server clamps `pageSize` to [1,100] silently, so offering 200 returned 100 rows
 * while `pageCount` was computed from 200 — the last pages of the table simply
 * could not be reached, and nothing said why.
 */
const DEFAULT_PAGE_SIZE_OPTIONS = [25, 50, MAX_PAGE_SIZE];

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: TablePaginationProps) {
  // Guard the prop too: a caller passing an over-ceiling option would reintroduce
  // exactly the bug this default fixes.
  const options = pageSizeOptions.filter((n) => n >= 1 && n <= MAX_PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(total / Math.min(pageSize, MAX_PAGE_SIZE)));
  // …rest unchanged, iterating `options` instead of `pageSizeOptions`
```

- [ ] **Step 8: Find every existing caller and confirm none passes an over-ceiling option**

```bash
rg -n 'TablePagination' --glob '!components/ui/table-pagination.tsx' .
rg -n 'pageSizeOptions' .
```

Any caller passing `[…, 200]` is fixed in this step. Note which screens use the component — attendance
and tasks likely do, and this change affects them.

- [ ] **Step 9: Gates**

Run: `npm run test && npx tsc --noEmit && npm run lint && npm run build`

- [ ] **Step 10: Commit**

```bash
git add hooks/use-paged-table.ts hooks/use-paged-table.test.ts components/ui/table-pagination.tsx
git commit -m "$(cat <<'EOF'
feat(tables): usePagedTable keeps the whole view in the URL

Page, size, sort and every filter are query params, which makes a view
shareable — the spec's deliberate substitute for server-side saved views.

Two guards matter and both are tested. sortBy is checked against the table's
whitelist, because a hand-edited URL reaching the server is 400
invalid_sort_column and would break the screen on load. pageSize is clamped to
MAX_PAGE_SIZE, because the server clamps silently and an unclamped client
computes page counts from a size it never received.

Also fixes TablePagination, which offered 200 rows per page against a server
ceiling of 100: it returned 100 rows and computed half the real page count, so
the last pages of every paged table were unreachable and nothing said why.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: The owner directory moves onto the FND-3 endpoint

`lib/services/owner.service.ts:20` serves the directory from `/api/admin/owners/bosses`. That is the
**bosses picker** — spec §7 `:175` describes it as "a separate, unpaged endpoint". Using it as the
directory means no paging, no filters, no sorting, and a list silently truncated to whatever the
picker returns.

Spec §7 `:617` also notes the legacy `GET /api/owners` admin listing is **retired (404)**, while
`GET /api/owners/{id}` and `/sub-accounts` still work. Check the service for calls to the retired
path.

**Files:**
- Modify: `lib/types/owner.types.ts` — add `OwnerListQuery`, `OwnerRowDto`, `OWNER_SORT_COLUMNS`
- Modify: `lib/services/owner.service.ts`
- Modify: `hooks/use-owners.ts`

**Interfaces:**
- Consumes: `PagedQuery`, `PagedResult` from `lib/types/paged.types.ts`; `AccountStatusFilter`,
  `OnboardingStatus` from `lib/types/onboarding.types.ts`.
- Produces:
  ```ts
  export interface OwnerListQuery extends PagedQuery {
    search?: string;
    status?: AccountStatusFilter;
    onboardingStatus?: OnboardingStatus;
    registeredFrom?: string;
    registeredTo?: string;
    propertyCountMin?: number;
    propertyCountMax?: number;
  }
  export const OWNER_SORT_COLUMNS = ["fullName", "createdAt", "propertyCount"] as const;
  // owner.service.ts
  getOwnerTable(query: OwnerListQuery): Promise<PagedResult<OwnerRowDto>>;
  // hooks/use-owners.ts
  export function useOwnerTable(query: OwnerListQuery): UseQueryResult<PagedResult<OwnerRowDto>>;
  ```

- [ ] **Step 1: Read the DTO from the backend before writing the type**

`OwnerRowDto` is defined at `Backend/GermanyERP.Domain/Models/DTOs/Owners/OwnerDtos.cs:37-50`. Read
it and mirror the field names exactly. Do **not** copy the file — cite it.

```bash
sed -n '37,50p' "D:/projekts/ERP-Uyer/Backend/GermanyERP.Domain/Models/DTOs/Owners/OwnerDtos.cs"
```

Known from the 2026-08-07 review: it has **no** `profilePictureUrl` (backend ask #7) and **no**
contract period (ask #8). Both are non-blocking.

- [ ] **Step 2: Add the query type and sort whitelist**

Mirror the worker shape (`lib/types/worker.types.ts:60-87`) so both tables read the same.

```ts
// lib/types/owner.types.ts

/** FND-3 owner table filters. Spec §7 `:599`. */
export interface OwnerListQuery extends PagedQuery {
  search?: string;
  /** Omitting this excludes Deleted. `Blocked` = "was covered once and isn't now". */
  status?: AccountStatusFilter;
  onboardingStatus?: OnboardingStatus;
  registeredFrom?: string;
  registeredTo?: string;
  propertyCountMin?: number;
  propertyCountMax?: number;
}

/** `sortBy` whitelist — anything else is `400 invalid_sort_column`. */
export const OWNER_SORT_COLUMNS = ["fullName", "createdAt", "propertyCount"] as const;
```

- [ ] **Step 3: Add the paged service call, keeping `bosses` for what it is**

```ts
  /**
   * FND-3 owner table. Paged, filtered, sorted server-side.
   *
   * Distinct from `listOwners()` below, which hits `/api/admin/owners/bosses` —
   * that is the unpaged **picker** endpoint (spec §7 `:175`) and is correct for a
   * dropdown. It was serving the directory, which meant no paging, no filters,
   * and a list silently truncated to whatever the picker returns.
   */
  getOwnerTable: async (
    query: OwnerListQuery = {},
  ): Promise<PagedResult<OwnerRowDto>> => {
    const { data } = await apiClient.get<PagedResult<OwnerRowDto>>(
      "/api/admin/owners",
      { params: query },
    );
    return data;
  },
```

Leave `listOwners` in place and rename nothing — the contracts party picker and the property-create
dialog both use it as a picker, which is its correct role. Add a one-line comment on it saying so.

- [ ] **Step 4: Check for calls to the retired legacy listing**

```bash
rg -n "'/api/owners'|\"/api/owners\"|\`/api/owners\`" lib/ hooks/ app/
```

Expected: only `/api/owners/{id}` and `/api/owners/{id}/sub-accounts`, which still exist. A bare
`GET /api/owners` is retired and 404s — if one is found, it is a live bug and must be repointed at
`/api/admin/owners` in this step.

- [ ] **Step 5: Add the hook**

```ts
export function useOwnerTable(query: OwnerListQuery) {
  return useQuery({
    // The whole query is in the key, so paging and filtering are cached per view
    // and going Back to a previous page is instant.
    queryKey: ["owner-table", query],
    queryFn: () => ownerService.getOwnerTable(query),
  });
}
```

- [ ] **Step 6: Gates**

Run: `npx tsc --noEmit && npm run lint && npm run build`

- [ ] **Step 7: Commit**

```bash
git add lib/types/owner.types.ts lib/services/owner.service.ts hooks/use-owners.ts
git commit -m "$(cat <<'EOF'
feat(owners): the directory reads the FND-3 table endpoint

It was reading /api/admin/owners/bosses — the unpaged picker endpoint — as if it
were the directory. That meant no paging, no filters, no sorting, and a list
silently truncated to whatever the picker returns.

listOwners() stays exactly as it is: the contracts party picker and the
property-create dialog want a picker, and that is what it is for.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Export service and the shared export button

**Files:**
- Create: `lib/services/export.service.ts`
- Create: `components/directory/export-button.tsx`
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: `apiClient`; `useHasPermission`.
- Produces:
  ```ts
  export type ExportFormat = "csv" | "xlsx";
  export interface ExportResult { blob: Blob; filename: string }
  /** Same params as the table query; paging is ignored server-side. */
  export function exportTable(
    path: string, query: Record<string, unknown>, format: ExportFormat,
  ): Promise<ExportResult>;
  export function triggerDownload(result: ExportResult): void;
  ```

- [ ] **Step 1: Write the service**

```ts
// lib/services/export.service.ts
import { apiClient } from "@/lib/http/client";

export type ExportFormat = "csv" | "xlsx";

export interface ExportResult {
  blob: Blob;
  filename: string;
}

/**
 * FND-3 export. Streams an attachment using the **same** params as the table
 * query — paging is ignored server-side, so the export always covers the whole
 * filtered set (spec §7 `:609`).
 *
 * Errors worth handling by code, not by status alone:
 * - `400 export_too_large` — more than 50,000 matching rows. **There is no async
 *   export**, so the only remedy is a narrower filter. Say that.
 * - `400 invalid_format` — anything other than csv|xlsx. Unreachable from the UI,
 *   but a hand-built URL can produce it.
 *
 * Every export writes an audit row and is PII egress.
 */
export async function exportTable(
  path: string,
  query: Record<string, unknown>,
  format: ExportFormat,
): Promise<ExportResult> {
  const response = await apiClient.get<Blob>(path, {
    params: { ...query, format },
    // Repeated keys, matching the table query's serialization.
    paramsSerializer: { indexes: null },
    responseType: "blob",
  });

  return {
    blob: response.data,
    filename: filenameFrom(response.headers?.["content-disposition"], format),
  };
}

/**
 * Prefer the server's own filename — it encodes what was exported and when.
 * Falls back to a dated name rather than `download`, so a user with several
 * exports in their downloads folder can still tell them apart.
 */
function filenameFrom(disposition: unknown, format: ExportFormat): string {
  if (typeof disposition === "string") {
    // RFC 5987 `filename*=UTF-8''…` first — it survives non-ASCII, which a
    // German-market export will contain.
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
    if (encoded?.[1]) {
      try {
        return decodeURIComponent(encoded[1].trim());
      } catch {
        // Malformed percent-encoding: fall through to the plain form.
      }
    }
    const plain = /filename="?([^";]+)"?/i.exec(disposition);
    if (plain?.[1]) return plain[1].trim();
  }
  return `export.${format}`;
}

/** Object-URL download. Revoked immediately — the browser has already read it. */
export function triggerDownload({ blob, filename }: ExportResult): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Handle the blob-error trap**

With `responseType: "blob"`, axios delivers a **4xx body as a Blob too**, so
`error.response.data.error` is a Blob, not an object, and every existing error-code check silently
fails. Add a reader:

```ts
/**
 * A blob request delivers error bodies as blobs as well, so the usual
 * `data.error` lookup returns a Blob and every code check silently misses.
 */
export async function readBlobErrorCode(error: unknown): Promise<string | null> {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (!(data instanceof Blob)) return null;
  try {
    const parsed = JSON.parse(await data.text()) as { error?: string };
    return parsed.error ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Write the button**

```tsx
// components/directory/export-button.tsx
"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportTable, readBlobErrorCode, triggerDownload, type ExportFormat,
} from "@/lib/services/export.service";
import { useHasPermission } from "@/hooks/use-current-permissions";

export function ExportButton({
  path,
  query,
  permission,
}: {
  path: string;
  query: Record<string, unknown>;
  permission: string;
}) {
  const t = useTranslations("directory.export");
  const allowed = useHasPermission(permission);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permission-aware, not 403-driven: an admin without owner:export never sees
  // the control rather than discovering the limit by pressing it.
  if (!allowed) return null;

  async function run(format: ExportFormat) {
    setBusy(true);
    setError(null);
    try {
      triggerDownload(await exportTable(path, query, format));
    } catch (e) {
      const code = await readBlobErrorCode(e);
      setError(
        code === "export_too_large"
          ? t("tooLarge")
          : code === "invalid_format"
            ? t("invalidFormat")
            : t("failed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" className="gap-2" disabled={busy} />}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          <span className="hidden sm:inline">{t("label")}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => run("csv")}>{t("csv")}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("xlsx")}>{t("xlsx")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Visible, not a tooltip. This is PII egress and it is audited — the
          person pressing it should know before they press it. */}
      <span className="text-[11px] text-muted-foreground">{t("auditNote")}</span>
      {error ? <span className="text-[11px] text-destructive">{error}</span> : null}
    </div>
  );
}
```

- [ ] **Step 4: Add the copy, both locales**

```json
// messages/en.json — under "directory"
"export": {
  "label": "Export",
  "csv": "CSV",
  "xlsx": "Excel (XLSX)",
  "auditNote": "Exports are recorded in the audit log.",
  "tooLarge": "Too many rows to export at once. Narrow the filter and try again.",
  "invalidFormat": "That file format isn't supported.",
  "failed": "The export didn't finish. Try again."
}
```
```json
// messages/de.json — under "directory"
"export": {
  "label": "Exportieren",
  "csv": "CSV",
  "xlsx": "Excel (XLSX)",
  "auditNote": "Exporte werden im Audit-Log erfasst.",
  "tooLarge": "Zu viele Zeilen für einen Export. Filter einschränken und erneut versuchen.",
  "invalidFormat": "Dieses Dateiformat wird nicht unterstützt.",
  "failed": "Der Export wurde nicht abgeschlossen. Bitte erneut versuchen."
}
```

- [ ] **Step 5: Parity, then gates**

Run the parity script, then `npx tsc --noEmit && npm run lint && npm run build`.

- [ ] **Step 6: Commit**

```bash
git add lib/services/export.service.ts components/directory/export-button.tsx messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
feat(directory): CSV/XLSX export, with the audit note in plain sight

The export reuses the table's own params — paging is ignored server-side, so it
always covers the whole filtered set.

Two things that would otherwise fail quietly. With responseType blob, axios
delivers 4xx bodies as blobs too, so the usual data.error lookup returns a Blob
and every code check misses; readBlobErrorCode parses it. And the filename comes
from Content-Disposition, RFC 5987 form first, because a German-market export
contains non-ASCII names.

The audit note is on the page, not in a tooltip. This is PII egress and it is
logged, and the person pressing the button should know that before pressing it.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Owners directory screen

**Files:**
- Modify: `components/ui/data-table-card.tsx` — columns may carry a rendered head
- Rewrite: `app/[locale]/dashboard/(owner)/owners/page.tsx`
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: `usePagedTable`, `useOwnerTable`, `ExportButton`, `TablePagination`,
  `SortableTableHead`, `FilterMenu`, `DataTableCard`.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Extend `DataTableColumn` instead of forking the card**

`data-table-card.tsx:10` types a column as `{ label, className }` and wraps each in a plain
`TableHead`. A sortable column needs its own element.

```tsx
export type DataTableColumn = {
  label: string
  className?: string
  /**
   * A fully rendered head cell, for sortable columns. When present, `label` is
   * used only as the React key — the node supplies its own `TableHead`, because
   * `SortableTableHead` renders one.
   */
  head?: React.ReactNode
}
```

In the header map, render `col.head` directly when present:

```tsx
{columns.map((col) =>
  col.head ?? (
    <TableHead key={col.label} className={cn(HEAD_CLASS, col.className)}>
      {col.label}
    </TableHead>
  ),
)}
```

Extract the existing head class string to a `HEAD_CLASS` const so the sortable and plain heads stay
visually identical — `SortableTableHead` already uses the same tokens.

- [ ] **Step 2: Confirm the change is backwards-compatible**

```bash
rg -n 'DataTableCard' --glob '!components/ui/data-table-card.tsx' .
npx tsc --noEmit
```

`head` is optional, so every existing caller is unaffected. `tsc` proves it. Note which screens use
the card.

- [ ] **Step 3: Write the screen**

```tsx
// app/[locale]/dashboard/(owner)/owners/page.tsx
"use client";

import { useTranslations } from "next-intl";
import { DataTableCard } from "@/components/ui/data-table-card";
import { FilterMenu } from "@/components/ui/filter-menu";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { TablePagination } from "@/components/ui/table-pagination";
import { ExportButton } from "@/components/directory/export-button";
import { usePagedTable } from "@/hooks/use-paged-table";
import { useOwnerTable } from "@/hooks/use-owners";
import { OWNER_SORT_COLUMNS, type OwnerListQuery } from "@/lib/types/owner.types";
import { ACCOUNT_STATUS_FILTERS, ONBOARDING_STATUSES } from "@/lib/types/onboarding.types";

/**
 * Module-level, not inline: `usePagedTable` memoizes on this object's identity,
 * so an inline literal would re-parse the URL on every render.
 */
const TABLE_OPTS = {
  sortColumns: OWNER_SORT_COLUMNS,
  defaultSortBy: "createdAt",
  defaultDir: "Desc",
  filterKeys: [
    "search", "status", "onboardingStatus",
    "registeredFrom", "registeredTo",
    "propertyCountMin", "propertyCountMax",
  ],
  numberKeys: ["propertyCountMin", "propertyCountMax"],
} as const;

export default function OwnersPage() {
  const t = useTranslations("owners");
  const tOnboarding = useTranslations("onboarding");
  const table = usePagedTable<Partial<OwnerListQuery>>(TABLE_OPTS);
  const { data, isLoading } = useOwnerTable(table.query as OwnerListQuery);

  // `items` is `T[] | null` on the envelope — never map it raw.
  const rows = data?.items ?? [];

  const sortable = (column: string, label: string) => (
    <SortableTableHead
      key={column}
      label={label}
      active={table.sortBy === column}
      direction={table.uiDir}
      onClick={() => table.toggleSort(column)}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {/* …existing page heading… */}

      <DataTableCard
        title={t("list")}
        count={data?.total ?? 0}
        searchPlaceholder={t("searchPlaceholder")}
        searchValue={(table.filters.search as string) ?? ""}
        onSearchChange={(v) => table.setFilter("search", v)}
        columns={[
          { label: t("directory.columns.owner"), head: sortable("fullName", t("directory.columns.owner")) },
          { label: t("directory.columns.email") },
          { label: t("directory.columns.status") },
          { label: t("directory.columns.properties"), head: sortable("propertyCount", t("directory.columns.properties")) },
          { label: t("directory.columns.registered"), head: sortable("createdAt", t("directory.columns.registered")) },
        ]}
        data={rows}
        renderRow={(owner) => /* …existing row… */ null}
        filter={
          <FilterMenu
            allLabel={t("directory.all")}
            values={{
              status: (table.filters.status as string) ?? "",
              onboardingStatus: (table.filters.onboardingStatus as string) ?? "",
            }}
            onChange={(key, value) =>
              table.setFilter(key as never, value === "" ? undefined : value)
            }
            groups={[
              {
                key: "status",
                label: t("directory.accountStatus"),
                options: ACCOUNT_STATUS_FILTERS.map((s) => ({
                  value: s,
                  // `Blocked` is not "banned" — spec §7. The label must say what
                  // it means or an admin reads a lapsed subject as a punished one.
                  label: t(`directory.status.${s}`),
                })),
              },
              {
                key: "onboardingStatus",
                label: t("directory.stage"),
                options: ONBOARDING_STATUSES.map((s) => ({
                  value: s,
                  label: tOnboarding(`status.${s}`),
                })),
              },
            ]}
          />
        }
        action={
          <ExportButton
            path="/api/admin/owners/export"
            query={table.query}
            permission="owner:export"
          />
        }
      />

      <TablePagination
        page={table.page}
        pageSize={table.pageSize}
        total={data?.total ?? 0}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
      />
    </div>
  );
}
```

Keep the existing `renderRow` body and heading; only the surrounding wiring changes. Add a
`properties` and `registered` column key to i18n if absent.

- [ ] **Step 4: Write the `Blocked` label carefully, both locales**

```json
// messages/en.json — under "owners.directory"
"all": "All",
"accountStatus": "Account",
"stage": "Stage",
"status": {
  "Active": "Active",
  "Pending": "Pending",
  "Deleted": "Deleted",
  "Blocked": "Cover lapsed"
}
```
```json
// messages/de.json — under "owners.directory"
"all": "Alle",
"accountStatus": "Konto",
"stage": "Phase",
"status": {
  "Active": "Aktiv",
  "Pending": "Ausstehend",
  "Deleted": "Gelöscht",
  "Blocked": "Deckung abgelaufen"
}
```

`Blocked` → "Cover lapsed" / "Deckung abgelaufen", **not** "Blocked"/"Gesperrt". Spec §7 `:608`:
it means "was covered once and isn't now". Calling it blocked or banned describes a punishment that
did not happen.

- [ ] **Step 5: Gates and browser check**

Run: `npm run test && npx tsc --noEmit && npm run lint && npm run build`, then `npm run dev`.

Without live data the table is empty. What **can** be verified without a backend, and must be:
- pasting `?page=3&sortBy=fullName&dir=Asc&status=Blocked` reproduces that state in the controls
- clicking a sortable head twice flips the arrow and rewrites the URL
- changing the page size resets to page 1
- the page-size dropdown offers **no option above 100**
- the export button is absent for an admin lacking `owner:export`
- Back does not step through every filter keystroke (the hook uses `replace`)

Record which of these were confirmed.

- [ ] **Step 6: Commit**

```bash
git add components/ui/data-table-card.tsx app/\[locale\]/dashboard/\(owner\)/owners/page.tsx messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
feat(owners): server-paged directory with filters, sorting and export

DataTableColumn gains an optional rendered head so a sortable column can supply
its own TableHead — the card is extended rather than forked, and every existing
caller is untouched because the field is optional.

The Blocked filter is labelled "Cover lapsed", not "Blocked". Per spec §7 it
means "was covered once and isn't now"; the obvious label describes a
punishment that did not happen.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Workers directory screen and the rich filter sheet

`WorkerListQuery` and the paged service already exist (see "What Phase 0 already built"). This task
is UI only.

`FilterMenu` cannot express this set: `professionIds` is multi-select match-any, there are four
numeric ranges plus a date range, and two booleans. A radio dropdown has no shape for any of it. Use
a `Sheet` — it exists at `components/ui/sheet.tsx`.

**Files:**
- Create: `components/workers/worker-filter-sheet.tsx`
- Modify: `app/[locale]/dashboard/(worker)/workers/page.tsx`
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: `WorkerListQuery`, `WORKER_SORT_COLUMNS`; `useProfessions` from
  `hooks/use-professions.ts` for the multi-select options; `validateRanges` from Task 6.
- Produces:
  ```tsx
  export function WorkerFilterSheet({
    filters, onChange, onReset, activeCount,
  }: {
    filters: Partial<WorkerListQuery>;
    onChange: (key: keyof WorkerListQuery, value: unknown) => void;
    onReset: () => void;
    activeCount: number;
  }): React.ReactElement;
  ```

- [ ] **Step 1: Build the sheet**

Structure, in this order — most-used first, not schema order:

1. **Professions** — checkbox list from `useProfessions()`, match-any. Label says "any of these",
   because match-any is not the obvious reading of a multi-select.
2. **Rating** — `ratingMin` number, plus an `includeUnrated` checkbox. These two interact and must sit
   together: `includeUnrated` keeps unrated workers **alongside** the `ratingMin` set, so with it on,
   a minimum of 4 returns 4-plus *and* unrated. Say that in help text; it is not guessable.
3. **Experience** — `experienceMin` / `experienceMax`.
4. **Completed tasks** — `completedMin` / `completedMax`.
5. **Registered** — `registeredFrom` / `registeredTo` dates.
6. **Employee type** — `employeeType`.
7. **Cover** — `hasActiveContract`, with a tooltip: *reconciled hourly, so this can lag by up to an
   hour*. It is the same lagging mirror as `isActive`.
8. **On task now** — `onTask`.

Footer holds Reset and a live count. Every field writes through `onChange` immediately — no local
draft state, because the URL is the state and a draft would make the sheet and the URL disagree.

Show each range's validation error inline from Task 6's `validateRanges`, and **disable nothing** —
an inverted range shows a message on the field, and the request is simply not issued.

- [ ] **Step 2: Wire the screen exactly as Task 4 did**

Same `usePagedTable` shape, with a module-level `TABLE_OPTS`:

```tsx
const TABLE_OPTS = {
  sortColumns: WORKER_SORT_COLUMNS,
  defaultSortBy: "createdAt",
  defaultDir: "Desc",
  filterKeys: [
    "search", "status", "onboardingStatus", "employeeType", "professionIds",
    "ratingMin", "includeUnrated", "experienceMin", "experienceMax",
    "completedMin", "completedMax", "registeredFrom", "registeredTo",
    "hasActiveContract", "onTask",
  ],
  arrayKeys: ["professionIds"],
  booleanKeys: ["includeUnrated", "hasActiveContract", "onTask"],
  numberKeys: [
    "ratingMin", "experienceMin", "experienceMax", "completedMin", "completedMax",
  ],
} as const;
```

Sortable heads on `fullName`, `createdAt`, `rating`, `experience`, `completedTasks` — the whitelist,
nothing else. Export at `/api/admin/workers/export`.

Replace the two `useWorkers({ onboardingStatus, pageSize: MAX_PAGE_SIZE })` calls the page makes today
only if this screen is the caller. **The contracts party picker in
`app/[locale]/dashboard/contracts/page.tsx:100-107` uses that pattern deliberately** — one query per
eligible stage, because `onboardingStatus` takes a single value and cannot express "Approved OR
Active". Do not touch it.

- [ ] **Step 3: Add the copy, both locales**

Full ranges and help text. The two that must not be paraphrased:

```json
// messages/en.json — under "workers.filters"
"professionsHelp": "Matches a worker with any of the selected professions.",
"includeUnratedHelp": "Keeps workers with no rating yet, alongside those meeting the minimum.",
"hasActiveContractHelp": "Reconciled hourly, so this can be up to an hour behind."
```
```json
// messages/de.json — under "workers.filters"
"professionsHelp": "Trifft auf Mitarbeiter mit mindestens einem der ausgewählten Berufe zu.",
"includeUnratedHelp": "Behält Mitarbeiter ohne Bewertung, zusätzlich zu denen, die das Minimum erfüllen.",
"hasActiveContractHelp": "Wird stündlich abgeglichen und kann daher bis zu eine Stunde veraltet sein."
```

- [ ] **Step 4: Gates and browser check**

Same list as Task 4 Step 5, plus:
- selecting two professions produces `?professionIds=a&professionIds=b`, **not** `professionIds[0]=a`
- an inverted range shows an inline message and issues **no** request (watch the network tab)
- resetting clears every param and returns to a bare URL

- [ ] **Step 5: Commit**

```bash
git add components/workers/worker-filter-sheet.tsx app/\[locale\]/dashboard/\(worker\)/workers/page.tsx messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
feat(workers): the full FND-3 filter set, in a sheet

FilterMenu is one radio group per dimension, which cannot express any of this:
professions is multi-select match-any, there are four numeric ranges and a date
range, and three booleans. A sheet can.

Two labels carry meaning that is not guessable from the field name.
includeUnrated keeps unrated workers *alongside* the ratingMin set, so a
minimum of 4 with it on returns 4-plus and unrated. hasActiveContract is the
same hourly mirror as isActive and can be an hour behind.

The query type and paged service were already correct from Phase 0; this is UI
only. The contracts party picker's two-query pattern is left alone — it exists
because onboardingStatus takes one value and cannot say "Approved OR Active".

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Client-side range validation

Spec §7 `:614`: inconsistent ranges return `400 invalid_filter_value`. A user should see that on the
field, not as a failed request.

**Files:**
- Create: `lib/filters/range.ts`
- Create: `lib/filters/range.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface RangePair { minKey: string; maxKey: string }
  /** Keys that are the *max* side of an inverted pair. */
  export function validateRanges(
    filters: Record<string, unknown>, pairs: readonly RangePair[],
  ): Set<string>;
  export const WORKER_RANGES: readonly RangePair[];
  export const OWNER_RANGES: readonly RangePair[];
  ```

- [ ] **Step 1: Write the failing test**

```ts
// lib/filters/range.test.ts
import { describe, expect, it } from "vitest";
import { validateRanges, WORKER_RANGES } from "@/lib/filters/range";

describe("validateRanges", () => {
  it("finds nothing wrong with a valid or partial range", () => {
    expect(validateRanges({ experienceMin: 1, experienceMax: 5 }, WORKER_RANGES).size).toBe(0);
    expect(validateRanges({ experienceMin: 5 }, WORKER_RANGES).size).toBe(0);
    expect(validateRanges({ experienceMax: 5 }, WORKER_RANGES).size).toBe(0);
    expect(validateRanges({}, WORKER_RANGES).size).toBe(0);
  });

  it("flags the max side of an inverted numeric range", () => {
    const bad = validateRanges({ experienceMin: 9, experienceMax: 2 }, WORKER_RANGES);
    expect(bad.has("experienceMax")).toBe(true);
  });

  it("accepts an equal min and max — a single-value range is valid", () => {
    expect(validateRanges({ completedMin: 3, completedMax: 3 }, WORKER_RANGES).size).toBe(0);
  });

  it("compares dates as dates, not as strings", () => {
    const bad = validateRanges(
      { registeredFrom: "2026-08-01", registeredTo: "2026-07-01" },
      WORKER_RANGES,
    );
    expect(bad.has("registeredTo")).toBe(true);
    const ok = validateRanges(
      { registeredFrom: "2026-07-01", registeredTo: "2026-08-01" },
      WORKER_RANGES,
    );
    expect(ok.size).toBe(0);
  });

  it("ignores an unparseable date rather than calling it inverted", () => {
    expect(
      validateRanges({ registeredFrom: "nonsense", registeredTo: "2026-07-01" }, WORKER_RANGES).size,
    ).toBe(0);
  });

  it("flags every inverted pair, not just the first", () => {
    const bad = validateRanges(
      { experienceMin: 9, experienceMax: 2, completedMin: 8, completedMax: 1 },
      WORKER_RANGES,
    );
    expect(bad.size).toBe(2);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run test` → module not found.

- [ ] **Step 3: Write the module**

```ts
// lib/filters/range.ts

export interface RangePair {
  minKey: string;
  maxKey: string;
}

export const WORKER_RANGES: readonly RangePair[] = [
  { minKey: "experienceMin", maxKey: "experienceMax" },
  { minKey: "completedMin", maxKey: "completedMax" },
  { minKey: "registeredFrom", maxKey: "registeredTo" },
];

export const OWNER_RANGES: readonly RangePair[] = [
  { minKey: "propertyCountMin", maxKey: "propertyCountMax" },
  { minKey: "registeredFrom", maxKey: "registeredTo" },
];

/**
 * Returns the **max-side keys** of every inverted pair, so a form can mark the
 * field the user most likely mistyped.
 *
 * An unparseable value is not an inversion. It is a separate problem, and
 * reporting "the range is backwards" for a typo would send the user looking at
 * the wrong thing.
 */
export function validateRanges(
  filters: Record<string, unknown>,
  pairs: readonly RangePair[],
): Set<string> {
  const invalid = new Set<string>();
  for (const { minKey, maxKey } of pairs) {
    const min = comparable(filters[minKey]);
    const max = comparable(filters[maxKey]);
    if (min === null || max === null) continue;
    // Equal is valid: a single-value range is a legitimate query.
    if (min > max) invalid.add(maxKey);
  }
  return invalid;
}

/** Numbers as themselves; date strings as epoch ms. Anything else is `null`. */
function comparable(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `npm run test`

- [ ] **Step 5: Wire it into both screens**

In each screen, compute `const invalid = validateRanges(table.filters, WORKER_RANGES)` and pass it to
the filter UI, which marks those fields. Then **skip the request** while `invalid.size > 0`.

The worker hook already takes `enabled` as a **second positional argument** —
`hooks/use-workers.ts:13` is `useWorkers(query: WorkerListQuery = {}, enabled = true)`. Use that
signature; there is no options object:

```tsx
// Workers — hooks/use-workers.ts:13 already accepts `enabled` positionally.
const { data, isLoading } = useWorkers(table.query, invalid.size === 0);
```

`useOwnerTable` from Task 2 does **not** yet take `enabled`. Add it there with the same
backwards-compatible positional shape, so both tables read identically:

```tsx
export function useOwnerTable(query: OwnerListQuery, enabled = true) {
  return useQuery({
    queryKey: ["owner-table", query],
    queryFn: () => ownerService.getOwnerTable(query),
    enabled,
  });
}
```

```tsx
// Owners
const { data, isLoading } = useOwnerTable(table.query as OwnerListQuery, invalid.size === 0);
```

- [ ] **Step 6: Gates and commit**

```bash
npm run test && npx tsc --noEmit && npm run lint && npm run build
git add lib/filters/range.ts lib/filters/range.test.ts app/\[locale\]/dashboard hooks/
git commit -m "$(cat <<'EOF'
feat(filters): catch inverted ranges before they reach the server

registeredFrom > registeredTo is 400 invalid_filter_value. Showing that as a
failed request makes the user guess which of five range fields was wrong, so
the max side of each inverted pair is marked and the request is not issued.

Dates compare as dates, not as strings, and an unparseable value is not
reported as an inversion — that is a different mistake and pointing at the
wrong one wastes the user's time. An equal min and max is valid.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Retire the client-side CSV path for these two tables

**Files:**
- Modify: the two directory screens — remove `lib/csv.ts` imports
- Keep: `lib/csv.ts` itself

**Interfaces:** none.

- [ ] **Step 1: Find every consumer**

```bash
rg -n "from ['\"]@/lib/csv" .
```

Expected: the two directory screens plus attendance. **`lib/csv.ts` stays** — attendance has no
server-side export endpoint, so its client-side path is the only one it has.

- [ ] **Step 2: Remove only the two directory call sites**

A client-side CSV exports **the current page**, not the filtered set, and writes no audit row. Both
are wrong for a PII export of a full directory. The server export replaces it for these two screens
and only these two.

- [ ] **Step 3: Gates and commit**

```bash
npm run test && npx tsc --noEmit && npm run lint && npm run build
git add app/\[locale\]/dashboard
git commit -m "$(cat <<'EOF'
refactor(directory): drop the client-side CSV path from the two directories

It exported the current page rather than the filtered set, and wrote no audit
row — both wrong for a full-directory PII export.

lib/csv.ts stays: attendance has no server export endpoint, so its client-side
path is the only one it has.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Phase gate

- [ ] **Step 1: Full gate**

```bash
npm run test && npx tsc --noEmit && npm run lint && npm run build && npm run verify:api
```

- [ ] **Step 2: Confirm no unpaged directory read survives**

```bash
rg -n 'owners/bosses' app/ | rg -v 'contracts|property-create'
```

Expected: no output. The bosses endpoint may only be reached by pickers.

- [ ] **Step 3: `vercel:react-best-practices` over the new components, then `simplify` over the diff**

`simplify` should find the two directory screens are near-duplicates around `usePagedTable` +
`DataTableCard` + `TablePagination`. Extract the shared shell only if the extraction is genuinely
smaller than the duplication — two screens with different filter models is a thin case for
abstraction, and a wrong shared shell costs more than the repetition.

- [ ] **Step 4: Update the roadmap and INTEGRATION.md, then PR**

Note in `INTEGRATION.md` that ERP-Admin now covers FND-3 for both tables including export, and that
none of it has run against live.

---

## Assumption Ledger — verify when G2 lands

| # | Assumption | Depends on it | Breaks how |
|---|---|---|---|
| **AL-1** | `GET /api/admin/owners` returns `PagedResult<OwnerRowDto>` with the field names read from `OwnerDtos.cs:37-50`. Never called. | Task 2, Task 4 | Rows render blank cells; `total` undefined makes pagination show 0 pages |
| **AL-2** | `OWNER_SORT_COLUMNS` matches the server's whitelist exactly. Taken from spec §7 `:601`, not from code. | Sortable heads | `400 invalid_sort_column` on first click of a column the server does not accept |
| **AL-3** | The export endpoints stream with a `Content-Disposition` filename. If absent, downloads are all named `export.csv`. | `filenameFrom` | Cosmetic — several exports become indistinguishable in the downloads folder |
| **AL-4** | A 4xx from a blob request really does arrive as a Blob, so `readBlobErrorCode` is needed and correct. If axios delivers JSON instead, the parse returns null and every export error shows the generic message. | Export error copy | `export_too_large` shows as "didn't finish" — the user never learns to narrow the filter, which is the one useful instruction |
| ~~**AL-5**~~ | ~~The worker-export permission code was not verified.~~ **DISCHARGED 2026-08-10.** Both confirmed from the backend index: `owner:export` **(30004)** at `index/controllers/owners.md:34`, `worker:export` **(80006)** at `index/controllers/workers.md:15`. Use those exact strings. | — | — |
| **AL-5b** | `?format` is `string?` **deliberately** on both export routes and defaults to `csv`. As a non-nullable parameter it was implicitly required, so an omitted `?format=` returned **problem-details** before the `?? "csv"` default could apply — fixed 2026-08-05. Our `ExportButton` always sends an explicit format, so this never bites us. | `exportTable` | None while we always send it. Recorded so nobody "tidies up" the explicit param |
| **AL-6** | `professionIds` repeated-key serialization is what the server reads. Correct in `worker.service.ts:25`; the export path repeats the option but is untested. | Worker export with professions | Profession filter silently ignored on export — the file contains more rows than the screen showed |
| **AL-7** | The server clamps `pageSize` silently rather than erroring, as `paged.types.ts:18` states. | `clampPageSize`, pagination math | If it 400s instead, a stale URL with `pageSize=500` fails the screen on load rather than degrading |
| **AL-8** | `Blocked` means "cover lapsed". Taken from spec §7 `:608`. | The filter label | A mislabelled status is a compliance-reading error, not a cosmetic one |

**AL-4 and AL-6 are the quiet ones.** AL-6 in particular produces a file that looks right and
contains the wrong rows — an export claiming to be filtered but is not is worse than a failed export.
If one live check is possible, export the worker table with two professions selected and count the
rows against the screen.
</content>
