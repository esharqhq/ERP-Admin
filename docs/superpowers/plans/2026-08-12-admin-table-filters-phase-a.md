# Admin Table Filters — Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Owners table its ten server-side filters and three new columns, driven by one shared filter component that four screens will eventually use.

**Architecture:** `components/ui/filter-bar.tsx` grows from single-selects to four control kinds (`select`, `dateRange`, `numberRange`, `triState`), staying pure presentation — values in, `onChange` out, state in the caller. The Owners page owns a flat `Record<string, string>` bag keyed by **wire param name**, and a tested pure function maps that bag to a typed `OwnerListQuery`. Server filtering only; nothing on this page filters in the browser.

**Tech Stack:** Next.js 16 App Router (client components), TypeScript, TanStack Query, next-intl, vitest, Tailwind + the repo's `components/ui` primitives.

**Spec:** `docs/superpowers/specs/2026-08-12-admin-table-filters-design.md`
**Backend contract:** `Backend/docs/handoff/f-02-4-owner-table-filters.md` (Revision 2026-08-12), `fnd-1-configurable-lookups.md` §5.2–5.3.

## Global Constraints

- **`""` means omit.** Every value in the bag is a string; an empty string means the param is not sent. This is the existing `FilterBar` convention.
- **`neverOrdered` unchecked must send *nothing*, not `false`.** `false` returns only owners who *have* ordered, hiding the group an admin is usually hunting for.
- **`neverOrdered=true` with either date bound is `400 invalid_filter_value`.** The date inputs must be disabled while it is selected.
- **Label `lastOrderedAt` "Last order", never "Last activity".** It measures ordering, not sign-in; this API has no login-recency data for any user type.
- **Render `companyCity` including blanks.** The blank rows are exactly the ones a city filter can never return.
- **`kind` defaults to `"select"`.** Existing `FilterBar` consumers (properties, docs-workspace, `data-table-card`, worker-documents) must keep working with no edit.
- **Do not touch `components/support/inbox-filters.tsx`.** Out of scope by instruction.
- **Every new user-facing string lands in BOTH `messages/en.json` and `messages/de.json`.** Key parity is asserted by the existing suite.
- **Out of scope:** column sorting and CSV export. Neither exists on any admin table today.

## File Structure

| File | Responsibility |
|---|---|
| `lib/ui/filter-validation.ts` (create) | Pure range rules: `from ≤ to`, `min ≤ max`, no negatives. No React. |
| `lib/ui/filter-validation.test.ts` (create) | Table-driven tests for the above. |
| `components/ui/filter-bar.tsx` (modify) | Gains three control kinds. Presentation only. |
| `lib/types/lookup.types.ts` (modify) | `CountryDto`, `CityDto`. |
| `lib/services/lookup.service.ts` (modify) | `getCountries`, `getCities(countryId)`. |
| `hooks/use-lookups.ts` (modify) | `useCountries`, `useCities(countryId)`. |
| `scripts/verify-v2.mjs` (modify) | Assert the six params' response columns **before** they are modelled. |
| `lib/types/owner.types.ts` (modify) | `OwnerListQuery` +6 params, `OwnerRowDto` +3 columns. |
| `lib/owners/owner-filter-query.ts` (create) | Bag → `OwnerListQuery`. The whole of the tricky logic. |
| `lib/owners/owner-filter-query.test.ts` (create) | Tests for it. |
| `app/[locale]/dashboard/(owner)/owners/page.tsx` (modify) | Wires the panel and the three columns. |
| `messages/{en,de}.json` (modify) | Filter labels, hints, column headers. |

---

### Task 1: Range validation rules

**Files:**
- Create: `lib/ui/filter-validation.ts`
- Test: `lib/ui/filter-validation.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `rangeError(from: string, to: string): "order" | null` and `countRangeError(min: string, max: string): "order" | "negative" | null`. Task 2 renders these; Task 5 refuses to build a query when either is non-null.

- [ ] **Step 1: Write the failing test**

```ts
// lib/ui/filter-validation.test.ts
import { describe, expect, it } from "vitest";
import { countRangeError, rangeError } from "@/lib/ui/filter-validation";

describe("rangeError", () => {
  it("passes a well-ordered or half-open range", () => {
    expect(rangeError("2026-01-01", "2026-02-01")).toBeNull();
    expect(rangeError("2026-01-01", "")).toBeNull();
    expect(rangeError("", "2026-02-01")).toBeNull();
    expect(rangeError("", "")).toBeNull();
    // Equal bounds are a legal single-day window, not an error.
    expect(rangeError("2026-01-01", "2026-01-01")).toBeNull();
  });

  it("rejects a reversed range", () => {
    expect(rangeError("2026-03-01", "2026-02-01")).toBe("order");
  });
});

describe("countRangeError", () => {
  it("passes a well-ordered or half-open range", () => {
    expect(countRangeError("1", "5")).toBeNull();
    expect(countRangeError("", "5")).toBeNull();
    expect(countRangeError("0", "0")).toBeNull();
  });

  it("rejects a negative bound", () => {
    expect(countRangeError("-1", "")).toBe("negative");
    expect(countRangeError("", "-2")).toBe("negative");
  });

  it("rejects min above max", () => {
    expect(countRangeError("9", "2")).toBe("order");
  });

  // A blank is "no bound", never zero — sending 0 as a min would be a real filter.
  it("treats a blank as absent rather than as zero", () => {
    expect(countRangeError("", "")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/ui/filter-validation.test.ts`
Expected: FAIL — "Failed to resolve import ... filter-validation".

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/ui/filter-validation.ts
/**
 * Range rules shared by every filter panel. Pure and React-free so they can be
 * asserted directly — the panel renders their result, the query mapper refuses to
 * build a request while one is non-null.
 *
 * Each of these is a `400 invalid_filter_value` the user can see coming, which is
 * why they are checked here rather than left to the server.
 */

/** A blank bound means "open on that side", never zero and never today. */
export function rangeError(from: string, to: string): "order" | null {
  if (!from || !to) return null;
  return from > to ? "order" : null;
}

/**
 * Date strings are compared lexically on purpose: the inputs are
 * `<input type="date">` values, always `YYYY-MM-DD`, where lexical and
 * chronological order coincide. Anything else must not reach here.
 */
export function countRangeError(
  min: string,
  max: string,
): "order" | "negative" | null {
  const lo = min === "" ? null : Number(min);
  const hi = max === "" ? null : Number(max);
  if ((lo !== null && lo < 0) || (hi !== null && hi < 0)) return "negative";
  if (lo !== null && hi !== null && lo > hi) return "order";
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/ui/filter-validation.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/ui/filter-validation.ts lib/ui/filter-validation.test.ts
git commit -m "feat(ui): range rules for the shared filter panel"
```

---

### Task 2: FilterBar gains three control kinds

**Files:**
- Modify: `components/ui/filter-bar.tsx`

**Interfaces:**
- Consumes: `rangeError`, `countRangeError` from Task 1; `FilterOption` from `components/ui/filter-menu`.
- Produces: the exported `FilterField` union and a `fields` prop on `FilterBar`. Task 6 builds a `FilterField[]`.

**Why the old prop stays:** `groups: FilterGroup[]` has four live consumers. Keep it working and add `fields` beside it; a caller passes one or the other.

- [ ] **Step 1: Add the field union and the new controls**

Add above `FilterBarProps`:

```tsx
export type FilterField =
  | { kind?: "select"; key: string; label: string; options: FilterOption[]; hint?: string }
  | {
      kind: "dateRange";
      fromKey: string;
      toKey: string;
      label: string;
      hint?: string;
      /**
       * Computed by the CALLER, never derived here. The owners page passes
       * `values.neverOrdered === "true"` — combining that with a date bound is a
       * `400`. Keeping the rule at the call site is what stops this shared
       * component from collecting per-screen conditionals.
       */
      disabled?: boolean;
    }
  | { kind: "numberRange"; minKey: string; maxKey: string; label: string; hint?: string; disabled?: boolean }
  | {
      kind: "triState";
      key: string;
      label: string;
      anyLabel: string;
      trueLabel: string;
      falseLabel: string;
      hint?: string;
    };
```

Extend the props:

```tsx
export interface FilterBarProps {
  /** Legacy select-only shape. Kept for the four existing consumers. */
  groups?: FilterGroup[];
  /** The four-kind shape. Pass this OR `groups`, not both. */
  fields?: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
  allLabel: string;
  clearLabel: string;
  /** Shown under a range whose bounds are reversed. */
  orderErrorLabel?: string;
  /** Shown under a count range with a negative bound. */
  negativeErrorLabel?: string;
}
```

- [ ] **Step 2: Normalize groups into fields, and count active filters across every key**

Replace the `usable` / `activeCount` lines. A range contributes 1 when **either** bound is set, so the badge counts dimensions, not inputs:

```tsx
const normalized: FilterField[] =
  fields ?? (groups ?? []).map((g) => ({ kind: "select" as const, ...g }));

// A select with no options renders nothing — the option lists are derived from
// rows on client-side screens, so an empty list means a control that could only
// ever say "all", and a dead select reads as a broken one. Range and tri-state
// controls have no such list and are always usable.
const usable = normalized.filter(
  (f) => (f.kind ?? "select") !== "select" || f.options.length > 0,
);

const keysOf = (f: FilterField): string[] =>
  f.kind === "dateRange" ? [f.fromKey, f.toKey]
  : f.kind === "numberRange" ? [f.minKey, f.maxKey]
  : [f.key];

const activeCount = usable.filter((f) => keysOf(f).some((k) => values[k])).length;
```

- [ ] **Step 3: Render each kind**

Inside the `usable.map`, branch on `f.kind`. The `select` branch is the existing body unchanged. Add:

```tsx
{f.kind === "dateRange" && (
  <div className="flex items-center gap-1.5">
    <Input
      type="date"
      value={values[f.fromKey] ?? ""}
      max={values[f.toKey] || undefined}
      disabled={f.disabled}
      onChange={(e) => onChange(f.fromKey, e.target.value)}
      className="h-8 text-xs"
    />
    <span className="text-xs text-muted-foreground">–</span>
    <Input
      type="date"
      value={values[f.toKey] ?? ""}
      min={values[f.fromKey] || undefined}
      disabled={f.disabled}
      onChange={(e) => onChange(f.toKey, e.target.value)}
      className="h-8 text-xs"
    />
  </div>
)}

{f.kind === "numberRange" && (
  <div className="flex items-center gap-1.5">
    <Input
      type="number"
      min={0}
      step={1}
      inputMode="numeric"
      value={values[f.minKey] ?? ""}
      disabled={f.disabled}
      onChange={(e) => onChange(f.minKey, e.target.value)}
      className="h-8 text-xs"
    />
    <span className="text-xs text-muted-foreground">–</span>
    <Input
      type="number"
      min={0}
      step={1}
      inputMode="numeric"
      value={values[f.maxKey] ?? ""}
      disabled={f.disabled}
      onChange={(e) => onChange(f.maxKey, e.target.value)}
      className="h-8 text-xs"
    />
  </div>
)}
```

The tri-state is a three-option select, **not** a checkbox — a checkbox cannot express "omit vs `false`":

```tsx
{f.kind === "triState" && (() => {
  const items = [
    { value: ALL, label: f.anyLabel },
    { value: "true", label: f.trueLabel },
    { value: "false", label: f.falseLabel },
  ];
  return (
    <Select
      value={values[f.key] || ALL}
      onValueChange={(v) => onChange(f.key, v === ALL ? "" : (v as string))}
      items={items}
    >
      <SelectTrigger size="sm" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
})()}
```

- [ ] **Step 4: Render the hint and the range error under each field**

```tsx
{f.kind === "dateRange" && rangeError(values[f.fromKey] ?? "", values[f.toKey] ?? "") && (
  <p className="text-[11px] text-destructive">{orderErrorLabel}</p>
)}
{f.kind === "numberRange" && (() => {
  const err = countRangeError(values[f.minKey] ?? "", values[f.maxKey] ?? "");
  if (!err) return null;
  return (
    <p className="text-[11px] text-destructive">
      {err === "negative" ? negativeErrorLabel : orderErrorLabel}
    </p>
  );
})()}
{f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>}
```

Add the imports: `Input` from `@/components/ui/input`, and `countRangeError` / `rangeError` from `@/lib/ui/filter-validation`.

- [ ] **Step 5: Verify no existing consumer broke**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: tsc and lint clean; 151 + 6 = 157 tests pass. The four `groups` callers are untouched and must still compile.

- [ ] **Step 6: Commit**

```bash
git add components/ui/filter-bar.tsx
git commit -m "feat(ui): FilterBar gains date-range, number-range and tri-state controls"
```

---

### Task 3: Country and city lookups

**Files:**
- Modify: `lib/types/lookup.types.ts`, `lib/services/lookup.service.ts`, `hooks/use-lookups.ts`

**Interfaces:**
- Produces: `CountryDto`, `CityDto`, `useCountries()`, `useCities(countryId?: string)`. Task 6 builds the two selects from them.

- [ ] **Step 1: Add the DTOs**

Append to `lib/types/lookup.types.ts`. Note the file's header comment says Country/City are deliberately unmodelled *because properties have no city FK* — that reasoning holds for properties and does not extend to owners, so amend it rather than contradicting it silently:

```ts
/**
 * FND-1 §5.2. `GET /api/countries` — open to any authenticated user.
 * Seeded with Germany (`DE`) and Austria (`AT`) today; do not build against that
 * count, it is reference data an admin can add to.
 */
export interface CountryDto {
  id: string;
  code: string;
  nameDe: string;
  nameEn: string;
  currencyCode: string;
  isActive: boolean;
}

/**
 * FND-1 §5.3. `GET /api/countries/{countryId}/cities` — **there is no flat
 * "all cities" endpoint.** City has no `code` and is referenced by id;
 * uniqueness is `(countryId, nameEn)`, so two countries may hold the same name.
 * An unknown `countryId` is `404 country_not_found`.
 */
export interface CityDto {
  id: string;
  countryId: string;
  nameDe: string;
  nameEn: string;
  isActive: boolean;
}
```

- [ ] **Step 2: Add the reads**

```ts
  getCountries: async (): Promise<CountryDto[]> => {
    const { data } = await apiClient.get<CountryDto[]>("/api/countries");
    return data;
  },

  getCities: async (countryId: string): Promise<CityDto[]> => {
    const { data } = await apiClient.get<CityDto[]>(
      `/api/countries/${countryId}/cities`,
    );
    return data;
  },
```

- [ ] **Step 3: Add the hooks**

`useCities` stays idle until a country is chosen — there is no endpoint to call without one:

```ts
export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: () => lookupService.getCountries(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCities(countryId?: string) {
  return useQuery({
    queryKey: ["cities", countryId ?? null],
    queryFn: () => lookupService.getCities(countryId as string),
    enabled: Boolean(countryId),
    staleTime: 5 * 60 * 1000,
  });
}
```

Match the existing file's import style and the `lookupService` object name already in `lib/services/lookup.service.ts`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add lib/types/lookup.types.ts lib/services/lookup.service.ts hooks/use-lookups.ts
git commit -m "feat(lookups): country and city reads, for the owner company-city filter"
```

---

### Task 4: Assert the six columns live, then model them

Order matters: the gate declares the fields **before** the types do, so `verify:api` confirms them against a live response rather than a guide sentence. This is also the one direction the gate cannot catch on its own — it never reddens when the server *adds* a field.

**Files:**
- Modify: `scripts/verify-v2.mjs`, `lib/types/owner.types.ts`

**Interfaces:**
- Produces: `OwnerListQuery` + `companyCityId`, `lastOrderedFrom`, `lastOrderedTo`, `neverOrdered`, `taskCountMin`, `taskCountMax`; `OwnerRowDto` + `companyCity`, `lastOrderedAt`, `taskCount`. Task 5 maps into the query; Task 6 renders the columns.

- [ ] **Step 1: Extend the gate's expectation for `OwnerRowDto`**

In `scripts/verify-v2.mjs`, add the three columns to the existing `OwnerRowDto` entry:

```js
  OwnerRowDto: ["id", "fullName", "email", "phoneNumber", "status", "onboardingStatus",
    "isVerified", "propertyCount", "createdAt", "ownerType",
    // F-02 #4. `companyCity` is a NAME, while the filter param is `companyCityId` —
    // a city lives only on an owner's company record, which is why the filter can
    // reach neither private individuals nor companies with a blank city.
    "companyCity", "lastOrderedAt", "taskCount"],
```

- [ ] **Step 2: Run the gate and confirm the server has them**

Run: `npm run verify:api`
Expected: `PASS  schema OwnerRowDto` and `ALL PASS`. **If it fails, stop** — the guide would then disagree with the live server, which is a backend bug to report rather than a field to add.

- [ ] **Step 3: Extend the query and row types**

In `lib/types/owner.types.ts`, add to `OwnerListQuery`:

```ts
  /**
   * F-02 #4. A city id from `GET /api/countries/{id}/cities`, **not** a name.
   * ⚠ An unrecognised id returns an **empty page, not an error** — the backend
   * assumes it came from that dropdown, so a stale id looks like "no matches".
   */
  companyCityId?: string;
  lastOrderedFrom?: string;
  lastOrderedTo?: string;
  /**
   * Three-state. `true` → never ordered · `false` → has ordered · **omitted →
   * both**. Omitting is NOT the same as `false`: `false` hides every owner who
   * has never ordered, usually the exact group being hunted for.
   *
   * ⚠ Sending `true` with either date bound is `400 invalid_filter_value`.
   */
  neverOrdered?: boolean;
  taskCountMin?: number;
  taskCountMax?: number;
```

And to `OwnerRowDto`:

```ts
  /** The company's city NAME, `null` for a private individual or a blank city. */
  companyCity: string | null;
  /**
   * When they last **placed an order**. ⚠ Not a last-seen or last-login value —
   * there is no login-recency data in this API for any user type. Label it
   * "Last order". `null` when they have never ordered.
   */
  lastOrderedAt: string | null;
  /** Tasks across the properties they own; `0` if none. */
  taskCount: number;
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: clean, 157 pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-v2.mjs lib/types/owner.types.ts
git commit -m "feat(owners): model F-02 #4's six filter params and three columns"
```

---

### Task 5: Bag → OwnerListQuery

This is where every constraint that can be got wrong silently lives, so it is a pure function with tests rather than inline page code.

**Files:**
- Create: `lib/owners/owner-filter-query.ts`
- Test: `lib/owners/owner-filter-query.test.ts`

**Interfaces:**
- Consumes: `OwnerListQuery` from Task 4; `rangeError`/`countRangeError` from Task 1.
- Produces: `OWNER_FILTER_KEYS`, `buildOwnerFilterQuery(values): { ok: true; query: Partial<OwnerListQuery> } | { ok: false }`, and `clearCityOnCountryChange(values, countryId)`. Task 6 calls all three.

- [ ] **Step 1: Write the failing test**

```ts
// lib/owners/owner-filter-query.test.ts
import { describe, expect, it } from "vitest";
import {
  buildOwnerFilterQuery,
  clearCityOnCountryChange,
} from "@/lib/owners/owner-filter-query";

const empty: Record<string, string> = {};

describe("buildOwnerFilterQuery", () => {
  it("sends nothing at all when no filter is set", () => {
    const r = buildOwnerFilterQuery(empty);
    expect(r).toEqual({ ok: true, query: {} });
  });

  it("drops blanks rather than sending them as empty params", () => {
    const r = buildOwnerFilterQuery({ companyCityId: "", taskCountMin: "" });
    expect(r).toEqual({ ok: true, query: {} });
  });

  // The single most consequential rule in this file.
  it("omits neverOrdered when Any, and sends false when Has ordered", () => {
    expect(buildOwnerFilterQuery(empty)).toEqual({ ok: true, query: {} });
    expect(buildOwnerFilterQuery({ neverOrdered: "false" })).toEqual({
      ok: true,
      query: { neverOrdered: false },
    });
    expect(buildOwnerFilterQuery({ neverOrdered: "true" })).toEqual({
      ok: true,
      query: { neverOrdered: true },
    });
  });

  it("coerces counts to numbers and keeps zero", () => {
    const r = buildOwnerFilterQuery({ taskCountMin: "0", taskCountMax: "5" });
    expect(r).toEqual({ ok: true, query: { taskCountMin: 0, taskCountMax: 5 } });
  });

  it("refuses a reversed date range instead of letting the server 400", () => {
    expect(
      buildOwnerFilterQuery({ lastOrderedFrom: "2026-03-01", lastOrderedTo: "2026-02-01" }),
    ).toEqual({ ok: false });
  });

  it("refuses a reversed or negative count range", () => {
    expect(buildOwnerFilterQuery({ taskCountMin: "9", taskCountMax: "2" })).toEqual({ ok: false });
    expect(buildOwnerFilterQuery({ propertyCountMin: "-1" })).toEqual({ ok: false });
  });

  it("refuses never-ordered combined with a date bound", () => {
    expect(
      buildOwnerFilterQuery({ neverOrdered: "true", lastOrderedFrom: "2026-01-01" }),
    ).toEqual({ ok: false });
    expect(
      buildOwnerFilterQuery({ neverOrdered: "true", lastOrderedTo: "2026-01-01" }),
    ).toEqual({ ok: false });
    // `false` with a range is fine and often useful.
    expect(
      buildOwnerFilterQuery({ neverOrdered: "false", lastOrderedFrom: "2026-01-01" }),
    ).toEqual({ ok: true, query: { neverOrdered: false, lastOrderedFrom: "2026-01-01" } });
  });
});

describe("clearCityOnCountryChange", () => {
  // A stale companyCityId returns an EMPTY PAGE, not an error, so a leftover city
  // from the previous country looks like a legitimately empty result.
  it("drops the city when the country changes", () => {
    const next = clearCityOnCountryChange(
      { countryId: "de", companyCityId: "berlin" },
      "at",
    );
    expect(next.countryId).toBe("at");
    expect(next.companyCityId).toBe("");
  });

  it("keeps the city when the country is unchanged", () => {
    const next = clearCityOnCountryChange(
      { countryId: "de", companyCityId: "berlin" },
      "de",
    );
    expect(next.companyCityId).toBe("berlin");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/owners/owner-filter-query.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/owners/owner-filter-query.ts
import type { OwnerListQuery } from "@/lib/types/owner.types";
import { countRangeError, rangeError } from "@/lib/ui/filter-validation";

/**
 * The bag is keyed by **wire param name**, so the mapping below is 1:1 and
 * greppable. `countryId` is the one exception: it scopes which cities are
 * offered and is never sent — `companyCityId` is the only city param.
 */
export const OWNER_FILTER_KEYS = [
  "status",
  "onboardingStatus",
  "ownerType",
  "countryId",
  "companyCityId",
  "registeredFrom",
  "registeredTo",
  "lastOrderedFrom",
  "lastOrderedTo",
  "neverOrdered",
  "propertyCountMin",
  "propertyCountMax",
  "taskCountMin",
  "taskCountMax",
] as const;

const TEXT_KEYS = ["status", "onboardingStatus", "ownerType", "companyCityId",
  "registeredFrom", "registeredTo", "lastOrderedFrom", "lastOrderedTo"] as const;

const COUNT_KEYS = ["propertyCountMin", "propertyCountMax",
  "taskCountMin", "taskCountMax"] as const;

type Result =
  | { ok: true; query: Partial<OwnerListQuery> }
  | { ok: false };

/**
 * Refuses locally what the server would refuse anyway, so an admin sees the
 * reason next to the input instead of a toast. Returning `{ ok: false }` rather
 * than throwing keeps the caller a plain render.
 */
export function buildOwnerFilterQuery(values: Record<string, string>): Result {
  const v = (k: string) => values[k] ?? "";

  if (rangeError(v("registeredFrom"), v("registeredTo"))) return { ok: false };
  if (rangeError(v("lastOrderedFrom"), v("lastOrderedTo"))) return { ok: false };
  if (countRangeError(v("propertyCountMin"), v("propertyCountMax"))) return { ok: false };
  if (countRangeError(v("taskCountMin"), v("taskCountMax"))) return { ok: false };

  // An owner who never ordered has no date to compare, so the pair is a
  // contradiction rather than an empty result: `400 invalid_filter_value`.
  if (v("neverOrdered") === "true" && (v("lastOrderedFrom") || v("lastOrderedTo"))) {
    return { ok: false };
  }

  const query: Partial<OwnerListQuery> = {};

  for (const k of TEXT_KEYS) {
    if (v(k)) (query as Record<string, unknown>)[k] = v(k);
  }
  for (const k of COUNT_KEYS) {
    if (v(k) !== "") (query as Record<string, unknown>)[k] = Number(v(k));
  }
  // Only ever set from an explicit choice. A blank must not become `false`:
  // `false` returns ONLY owners who have ordered.
  if (v("neverOrdered") === "true") query.neverOrdered = true;
  else if (v("neverOrdered") === "false") query.neverOrdered = false;

  return { ok: true, query };
}

/** Changing the country invalidates the chosen city — see the test's comment. */
export function clearCityOnCountryChange(
  values: Record<string, string>,
  countryId: string,
): Record<string, string> {
  if ((values.countryId ?? "") === countryId) return values;
  return { ...values, countryId, companyCityId: "" };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/owners/owner-filter-query.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/owners/owner-filter-query.ts lib/owners/owner-filter-query.test.ts
git commit -m "feat(owners): map the filter bag to a typed owner list query"
```

---

### Task 6: Wire the Owners page

**Files:**
- Modify: `app/[locale]/dashboard/(owner)/owners/page.tsx`, `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: `FilterBar` + `FilterField` (Task 2), `useCountries`/`useCities` (Task 3), the extended types (Task 4), `buildOwnerFilterQuery`/`clearCityOnCountryChange` (Task 5).

- [ ] **Step 1: Add the strings to both locales**

Under `owners` in `messages/en.json`:

```json
"filters": {
  "country": "Country",
  "countryHint": "Scopes the city list; filters nothing on its own.",
  "companyCity": "Company city",
  "companyCityHint": "Only owners with a company address on file.",
  "registered": "Registered",
  "lastOrdered": "Last order",
  "neverOrdered": "Ordering",
  "neverOrderedAny": "Any",
  "neverOrderedTrue": "Never ordered",
  "neverOrderedFalse": "Has ordered",
  "propertyCount": "Properties",
  "taskCount": "Tasks",
  "rangeOrder": "The start must not be after the end.",
  "rangeNegative": "A count cannot be negative.",
  "invalidCombination": "Adjust the highlighted filters to see results."
},
"columns": {
  "companyCity": "Company city",
  "lastOrdered": "Last order",
  "tasks": "Tasks"
}
```

German (`messages/de.json`), same keys:

```json
"filters": {
  "country": "Land",
  "countryHint": "Begrenzt die Städteliste; filtert allein nichts.",
  "companyCity": "Firmenstadt",
  "companyCityHint": "Nur Eigentümer mit hinterlegter Firmenadresse.",
  "registered": "Registriert",
  "lastOrdered": "Letzte Bestellung",
  "neverOrdered": "Bestellungen",
  "neverOrderedAny": "Alle",
  "neverOrderedTrue": "Nie bestellt",
  "neverOrderedFalse": "Hat bestellt",
  "propertyCount": "Objekte",
  "taskCount": "Aufträge",
  "rangeOrder": "Der Beginn darf nicht nach dem Ende liegen.",
  "rangeNegative": "Eine Anzahl kann nicht negativ sein.",
  "invalidCombination": "Bitte die markierten Filter anpassen."
},
"columns": {
  "companyCity": "Firmenstadt",
  "lastOrdered": "Letzte Bestellung",
  "tasks": "Aufträge"
}
```

Merge into the existing `owners.columns` object rather than replacing it.

- [ ] **Step 2: Hold the bag and derive the query**

In the page, beside the existing state:

```tsx
const [filters, setFilters] = useState<Record<string, string>>({});

const countries = useCountries();
const cities = useCities(filters.countryId || undefined);

const built = useMemo(() => buildOwnerFilterQuery(filters), [filters]);

const query = useMemo<OwnerListQuery>(
  () => ({
    ...(built.ok ? built.query : {}),
    // The tab owns these two axes; where a tab and a filter address the same
    // param the tab wins, so it is spread last.
    ...queryFor(tab),
    search: search || undefined,
    page,
    pageSize,
  }),
  [built, tab, search, page, pageSize],
);

const { data, isLoading, isError, error } = useOwners(query);
```

Change the filter setter so any edit resets paging, and route the country through the city-clearing helper:

```tsx
const setFilter = (key: string, value: string) => {
  setFilters((prev) =>
    key === "countryId"
      ? clearCityOnCountryChange(prev, value)
      : { ...prev, [key]: value },
  );
  setPage(1);
};
```

- [ ] **Step 3: Build the field list**

```tsx
const label = (c: { nameDe: string; nameEn: string }) =>
  locale === "de" ? c.nameDe : c.nameEn;

const fields: FilterField[] = [
  { key: "countryId", label: t("filters.country"), hint: t("filters.countryHint"),
    options: (countries.data ?? []).filter((c) => c.isActive)
      .map((c) => ({ value: c.id, label: label(c) })) },
  { key: "companyCityId", label: t("filters.companyCity"), hint: t("filters.companyCityHint"),
    options: (cities.data ?? []).filter((c) => c.isActive)
      .map((c) => ({ value: c.id, label: label(c) })) },
  { kind: "dateRange", fromKey: "registeredFrom", toKey: "registeredTo",
    label: t("filters.registered") },
  { kind: "triState", key: "neverOrdered", label: t("filters.neverOrdered"),
    anyLabel: t("filters.neverOrderedAny"), trueLabel: t("filters.neverOrderedTrue"),
    falseLabel: t("filters.neverOrderedFalse") },
  { kind: "dateRange", fromKey: "lastOrderedFrom", toKey: "lastOrderedTo",
    label: t("filters.lastOrdered"),
    // The combination is a 400, so the inputs go dead rather than the request failing.
    disabled: filters.neverOrdered === "true" },
  { kind: "numberRange", minKey: "propertyCountMin", maxKey: "propertyCountMax",
    label: t("filters.propertyCount") },
  { kind: "numberRange", minKey: "taskCountMin", maxKey: "taskCountMax",
    label: t("filters.taskCount") },
];
```

The city select renders nothing until a country is chosen, because a `select` with no options renders nothing — which is the behaviour wanted here and needs no extra flag.

- [ ] **Step 4: Pass it to the table and add the three columns**

Add to the `DataTableCard` call:

```tsx
filters={
  <FilterBar
    fields={fields}
    values={filters}
    onChange={setFilter}
    onReset={() => { setFilters({}); setPage(1); }}
    allLabel={t("filters.neverOrderedAny")}
    clearLabel={tCommon("clear")}
    orderErrorLabel={t("filters.rangeOrder")}
    negativeErrorLabel={t("filters.rangeNegative")}
  />
}
```

Add three `columns` entries — `companyCity`, `lastOrdered` (**"Last order"**, never "Last activity"), `tasks` — and three `TableCell`s in `renderRow`:

```tsx
<TableCell className="text-sm text-muted-foreground">
  {/* Blanks are rendered on purpose: these are exactly the rows a city filter
      can never return, so a short filtered list explains itself. */}
  {o.companyCity || "—"}
</TableCell>

<TableCell className="text-sm tabular-nums text-muted-foreground">
  {o.lastOrderedAt ? formatJoined(o.lastOrderedAt, locale) : "—"}
</TableCell>

<TableCell className="text-sm tabular-nums text-muted-foreground text-center">
  {o.taskCount}
</TableCell>
```

- [ ] **Step 5: Show why the table is empty when the combination is refused**

Between the tab bar and the table, so a refused combination explains itself instead of looking like "no owners":

```tsx
{!built.ok && (
  <p className="text-xs text-destructive">{t("filters.invalidCombination")}</p>
)}
```

`useOwners` still runs with the tab/search/paging query, which is the right fallback: the table keeps showing something real rather than blanking.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run verify:api`
Expected: all clean; 157 tests pass; `ALL PASS` from the gate. The suite asserts EN/DE key parity, so a missing German key fails here.

- [ ] **Step 7: Commit**

```bash
git add "app/[locale]/dashboard/(owner)/owners/page.tsx" messages/en.json messages/de.json
git commit -m "feat(owners): ten server-side filters and the three F-02 #4 columns"
```

---

### Task 7: Record what moved

**Files:**
- Modify: `BACKEND-REVISIONS.md`

- [ ] **Step 1: Update the two rows**

Set `f-02-4-owner-table-filters.md` to `Absorbed to: 2026-08-12` with state `⚠ partly`, and note precisely what is and is not done: the six filter params and three columns are in; the **three sort keys and three export columns are not**, because no admin table sorts or exports at all. Update `fnd-3-table-query.md`'s note the same way.

- [ ] **Step 2: Commit**

```bash
git add BACKEND-REVISIONS.md
git commit -m "docs(revisions): F-02 #4's filters absorbed; sorting and export still absent"
```

---

## Self-Review

**Spec coverage:** four control kinds → Task 2. Country/city two-control problem and its lookup surface → Task 3. Ten owner filters → Tasks 4–6. Three columns with their labelling rules → Task 6. Tri-state omit-vs-false → Tasks 5 (mapping) and 2 (control). Date/count validation → Task 1. `neverOrdered` disabling the dates → Task 6 step 3. City cleared on country change → Task 5. Sorting and export explicitly out of scope → recorded in Task 7. Support untouched — no task references it.

**Placeholder scan:** none; every code step carries its content.

**Type consistency:** `FilterField` (Task 2) is consumed with the same key names in Task 6. `buildOwnerFilterQuery` returns `{ ok, query }` in Task 5 and is destructured as `built.ok` / `built.query` in Task 6. `rangeError`/`countRangeError` keep their Task 1 signatures in Tasks 2 and 5. `useCities(countryId?: string)` is called with `filters.countryId || undefined` in Task 6, matching its optional parameter.

**Phase B is deliberately absent** — Workers, Properties and Tasks adopt this component only after its contract stops moving.
