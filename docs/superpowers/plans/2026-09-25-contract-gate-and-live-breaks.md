# Contract gate and two live breaks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the contract gate trustworthy again, then fix the two production bugs it points at: checked-in days treated as closed, and the Owners table's city filter/column/KYC address reading fields the backend removed.

**Architecture:** Three packages from the 2026-09-25 audit, in order. **WP0** — `scripts/verify-v2.mjs` asserts the contract that shipped (done, commit `00584aa`, listed here for review). **WP1** — every "is this day still open?" decision goes through the existing `canonicalTaskStatus` (`lib/tasks/status-vocab.ts`) instead of a hand-written lowercase word list. **WP2** — the owner location reads and writes move from the company's old `companyCity*` / `cityName*` fields to the owner's own `cityId`/`countryId`/`city`/`country` and the company's `registrationAddress`. All behaviour lives in `lib/`, where the tests are.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · `@tanstack/react-query` · `next-intl` · `vitest` (node env, `lib/**` and `hooks/**` only)

**Spec:** `BACKEND-REVISIONS.md` §3 **WP0, WP1, WP2** (evidence with `file:line`), which cites the backend contract at `origin/main` `692bd26`:
`task-lifecycle.md` §0 (2026-09-17 rename), `owner-location-model.md` §1–§4, `f-02-4-owner-table-filters.md` §2 + §2.1, `fnd-3-table-query.md` §5.1, CHANGELOG 2026-09-01 (`RepresentativeAuthorization`). Read them with `git -C "$GERMANY_ERP" show origin/main:docs/handoff/<file>`.

## Global Constraints

- **Backend: read only `origin/main`.** `git -C "$GERMANY_ERP" show origin/main:<path>`. Never pull, checkout or write in that checkout — other agents work there.
- **Every user-visible string goes into BOTH `messages/en.json` and `messages/de.json` in the same commit.** The two files are kept key-for-key identical (0 keys differ today).
- **Never treat a backend enum as exhaustive.** Unknown values get a defined answer (a default branch), never a crash.
- **Keep status guards as allowlists.** An unknown or future day state must read as *not open* (guidance lessons §2).
- **Gates for every task, all clean before its commit:** `npx vitest run` (baseline 1198 passed), `npx tsc --noEmit` (clean), `npm run lint` (baseline: 0 errors, 1 existing warning `useWorkerDocs` unused — do not count it as yours).
- **Contract gate:** `env -u ERP_ADMIN_EMAIL -u ERP_ADMIN_PASSWORD node scripts/verify-v2.mjs` — swagger-only, read-only. Baseline after WP0: **2 FAIL / 107 PASS**. After Task 5 it must be **0 FAIL**.
- **`/docs` is gitignored; plans are force-added:** `git add -f docs/superpowers/plans/…`.
- Branch: `fix/contract-gate-and-live-breaks` (exists). Commit per task. **No merge or push** without the user's go-ahead.

## Review Focus

Inputs no task's tests exercise that are most likely to bite someone:

1. **A bookmarked Owners URL with `?companyCityId=…`** — after the rename the key is unknown to the filter bag and is silently dropped, so the table shows everyone. Expected: acceptable (the old link was already unfiltered in production); no migration.
2. **Country chosen, no city** — today the country picker "filters nothing". After Task 3 it **does filter** (the backend's `countryId` is a real filter). An admin who relied on "country only scopes the list" now sees fewer rows. Expected: the hint text says so (Task 3 copy).
3. **An owner with a country but no city** — the column must show the country and a dash for the city, never an empty cell that reads as a rendering bug (Task 4).
4. **A cached response still carrying the old word `"Active"`** — must still read as open, because `canonicalTaskStatus` deliberately maps both spellings (Task 1 test pins it).
5. **A seventh, unknown day state from a future backend** — must read as *closed* and not throw (Task 1 test pins it; WP0's `TaskStatus` enum check turns the gate red first).

---

### Task 0: Review WP0 — the contract gate (already committed, `00584aa`)

Built before this plan existed. Review it; if rejected, `git revert 00584aa` and redo it under this plan.

**What it changed (`scripts/verify-v2.mjs`):**
- Enum expectations updated to the live contract: `AccountStatusFilter` = `Active,Pending,Deleted,Lapsed,Blocked`; `OwnerKYCDocType` + `RepresentativeAuthorization`.
- New enum check `TaskStatus` = `Pending,CheckedIn,InReview,Done,Cancelled,Rejected`, pointed at `lib/tasks/status-vocab.ts`.
- `WorkerRowDto` expected fields: `employeeType`/`onTask` out; `booked`, `country`, `city`, `lastSeenAt`, `lastLoginAt`, `agency`, `pendingAgency`, `pendingAgencyStatus` in (all rendered by the Workers table).
- "Must be gone" section takes arrays; asserts `WorkerRowDto.employeeType/onTask` and `WorkerDetailDto.address/employeeType` gone.
- `GET /api/tasks/admin` must take `scheduledFrom`, `scheduledTo`, `status`.
- Logged-in run: the KYC list is a `PagedResult` (`items` + `total`), not a bare array.

- [ ] **Step 1: Re-run the gate and confirm the baseline**

Run: `env -u ERP_ADMIN_EMAIL -u ERP_ADMIN_PASSWORD node scripts/verify-v2.mjs | grep -E '^FAIL|FAILURE'`
Expected exactly:
```
FAIL  OwnerRowDto missing: companyCity
FAIL  OwnerCompanyDto missing: countryId, countryNameDe, countryNameEn, cityId, cityNameDe, cityNameEn
2 FAILURE(S)
```
Both are real (WP2) and are fixed by Tasks 5 and 6.

---

### Task 1: A checked-in day is open again (`isOpen`)

Since 2026-09-17 the server sends `"CheckedIn"`; `OPEN_STATUSES = {"pending","active"}` never matches it, so Dispatch hides *fill* on a checked-in day and the under-staffing and owner-attention signals skip it. All four consumers (`components/dispatch/dispatch-task-row.tsx:100`, `lib/tasks/dispatch-row.ts:41`, `lib/owners/attention.ts:124`, `components/walk-in/walk-in-order-sheet.tsx:278`) call `isOpen()`, so this one function is the fix.

**Files:**
- Modify: `lib/tasks/staffing.ts:1-40` (import, `OPEN_STATUSES` → `OPEN_STATES`, `isOpen`) and the comment at `:89`
- Test: `lib/tasks/staffing.test.ts:105-113`

**Interfaces:**
- Consumes: `canonicalTaskStatus(raw: string | null | undefined): TaskStateKey | null` and `type TaskStateKey` from `@/lib/tasks/status-vocab`.
- Produces: `isOpen(task: TaskItemDto): boolean` — unchanged signature. `OPEN_STATUSES` is removed (no importer outside this file).

- [ ] **Step 1: Write the failing test** — replace the `describe("isOpen", …)` block in `lib/tasks/staffing.test.ts` with:

```ts
describe("isOpen", () => {
  // F-07 ·0 (2026-09-17) renamed `Active` → `CheckedIn`. A checked-in day still
  // takes workers; the legacy word stays open because a cached response can carry it.
  it.each(["Pending", "CheckedIn", "pending", "checkedin", "Active"])(
    "is true for %s",
    (status) => {
      expect(isOpen(task({ status }))).toBe(true);
    },
  );

  // Settled or handed-in days are closed — and so is a word the panel has never
  // seen: the guard is an allowlist, so a future state fails closed.
  it.each(["InReview", "Review", "Done", "Cancelled", "Rejected", "Paused", ""])(
    "is false for %s",
    (status) => {
      expect(isOpen(task({ status }))).toBe(false);
    },
  );
});

describe("needsWorkers on a checked-in day", () => {
  it("is true when the day has started and nobody is on it", () => {
    expect(needsWorkers(task({ status: "CheckedIn", workers: [] }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run lib/tasks/staffing.test.ts`
Expected: FAIL on `is true for CheckedIn`, `is true for checkedin` and `needsWorkers on a checked-in day` (received `false`). Every other case passes.

- [ ] **Step 3: Minimal implementation** — in `lib/tasks/staffing.ts`, add the import and replace the set and `isOpen`:

```ts
import { canonicalTaskStatus, type TaskStateKey } from "@/lib/tasks/status-vocab";
```

```ts
/**
 * The day states a dispatcher may still fill: not started, or started. Handed-in,
 * settled and disputed days are not dispatch targets.
 *
 * ⚠ An allowlist over the canonical key, never a raw lowercase word list: the
 * states were renamed on 2026-09-17 (`Active` → `CheckedIn`) and a word list
 * silently closed every checked-in day. An unknown future state is `null` here,
 * so it reads as closed rather than as open.
 */
const OPEN_STATES: ReadonlySet<TaskStateKey> = new Set(["pending", "checkedIn"]);
```

```ts
export function isOpen(task: TaskItemDto): boolean {
  const state = canonicalTaskStatus(task.status);
  return state !== null && OPEN_STATES.has(state);
}
```

Keep the existing doc comment above the old `OPEN_STATUSES` line (the paragraph about `GT_AdminFillHasNoDateOrStatusGuard`) above `OPEN_STATES`. At `:89` change "Shared for the same reason `OPEN_STATUSES` is" → "Shared for the same reason `isOpen` is". If `normalizeStatus` is no longer used for the task status in this file, keep its import only if `activeWorkers` still uses it (it does, for `outcome`).

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run lib/tasks` → all pass. Then the gates: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`.

- [ ] **Step 5: The two colour maps that still know only the old words**

A sweep of every task-status comparison (`git grep -n -E '"(active|review)"'` and `normalizeStatus(…status)` over `lib hooks components app`, done 2026-09-25) found two more sites. Both have a fallback, so they mis-colour rather than break. Every other hit compares an onboarding stage, a ticket, a leave request or a document — different enums, untouched.
  - `components/dashboard/dashboard-charts.tsx:40-47` `STATUS_COLORS`: add `checkedin: "var(--chart-2)"` and `inreview: "var(--status-pending)"`. Keep `active` for a cached old response.
  - `components/dispatch/dispatch-task-row.tsx:34-40` `STATUS_TONE`: add `checkedin: "bg-status-active-tint text-status-active"`, `inreview: "bg-status-pending-tint text-status-pending-deep"` and `rejected: "bg-status-pending-tint text-status-pending-deep"`. Keep `active`/`review`.

  Components are verified by `tsc` and by looking at them — `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```bash
git add lib/tasks/staffing.ts lib/tasks/staffing.test.ts components/dashboard/dashboard-charts.tsx components/dispatch/dispatch-task-row.tsx
git commit -m "fix(tasks): a checked-in day is open for dispatch again (WP1)"
```

---

### Task 2: The shift grid reads handed-in and disputed days

`hooks/use-worker-shifts.ts:181` checks `"review"`; since 09-17 the server says `"InReview"`, and since 09-21 a disputed day is `"Rejected"`. A worker who never clocked in on such a past day reads **missed**; the rule the code already states for a handed-in day is **done**. This keeps that rule and only fixes the vocabulary.

**Files:**
- Modify: `hooks/use-worker-shifts.ts:163-186` (`shiftState`)
- Test: `hooks/use-worker-shifts.test.ts` (new `it` inside `describe("toShifts")`)

**Interfaces:**
- Consumes: `canonicalTaskStatus` from `@/lib/tasks/status-vocab`.
- Produces: nothing new — `toShifts(...)` keeps its signature.

⚑ **Decision for review:** a `Rejected` day is treated like `InReview` (handed in; the owner disputes it). If you want a separate "disputed" shift state instead, say so and this task grows a new `ShiftState` value plus copy.

- [ ] **Step 1: Write the failing test** — add inside `describe("toShifts", …)`:

```ts
  it.each(["InReview", "Rejected", "Done"])(
    "reads a past %s day the worker never clocked into as done, not missed",
    (status) => {
      const [shift] = toShifts(
        [task({ status, scheduledDate: "2026-08-24", scheduledAt: "2026-08-24T08:00:00" })],
        ME,
        WEEK,
        TODAY,
      );
      expect(shift.state).toBe("done");
    },
  );
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run hooks/use-worker-shifts.test.ts`
Expected: FAIL for `InReview` and `Rejected` (received `"missed"`); `Done` passes.

- [ ] **Step 3: Minimal implementation** — in `shiftState`, replace the two `status` lines:

```ts
  const state = canonicalTaskStatus(task.status);
  if (state === "done" || state === "inReview" || state === "rejected") return "done";
  if (state === "cancelled") return "scheduled";
```

and add `import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";`. Leave the `mine.outcome` check on `normalizeStatus` — outcomes are a different enum.

- [ ] **Step 4: Run the tests and see them pass** — `npx vitest run hooks/use-worker-shifts.test.ts`, then the three gates.

- [ ] **Step 5: Commit**

```bash
git add hooks/use-worker-shifts.ts hooks/use-worker-shifts.test.ts
git commit -m "fix(workers): handed-in and disputed days read as done on the shift grid (WP1)"
```

---

### Task 3: The owner city filter sends what the backend reads

The live `GET /api/admin/owners` takes `CityId` and `CountryId`; it has no `companyCityId`, so today's city filter is ignored and the whole table comes back. Per `f-02-4` §2.1 the pair filters on the **owner's own** location and reaches every owner. `countryId` is now a real filter, not just a scope for the city list.

**Files:**
- Modify: `lib/owners/owner-filter-query.ts` (keys, `TEXT_KEYS`, doc comments, `clearCityOnCountryChange`)
- Modify: `lib/types/owner.types.ts:112-125` (`OwnerListQuery`)
- Modify: `app/[locale]/dashboard/(owner)/owners/page.tsx:150-178` (field key, label, hint comment)
- Modify: `messages/en.json` + `messages/de.json` (`owners.filters`)
- Test: `lib/owners/owner-filter-query.test.ts`

**Interfaces:**
- Produces: `OwnerListQuery.cityId?: string`, `OwnerListQuery.countryId?: string` (replacing `companyCityId`). Filter-bag keys `countryId`, `cityId`. `clearCityOnCountryChange(values, countryId)` now clears `cityId`.

- [ ] **Step 1: Write the failing tests** — in `lib/owners/owner-filter-query.test.ts`:
  - Replace the test `"never sends countryId, which only scopes the city list"` (`:21-25`) with:

```ts
  // owner-location-model (2026-08-13): `countryId` is a real filter on the owner's
  // own location, AND-combined with `cityId`. It used to only scope the city list.
  it("sends countryId on its own", () => {
    expect(buildOwnerFilterQuery({ countryId: "de" })).toEqual({
      ok: true,
      query: { countryId: "de" },
    });
  });

  it("sends the city as cityId, never the removed companyCityId", () => {
    const result = buildOwnerFilterQuery({ countryId: "de", cityId: "berlin-id" });
    expect(result).toEqual({ ok: true, query: { countryId: "de", cityId: "berlin-id" } });
    expect(JSON.stringify(result)).not.toContain("companyCityId");
  });
```

  - In every other test in the file, rename the key `companyCityId` → `cityId` (lines 15, 52, 55, 102, 106, 111, 114, 119, 123), and in the comment at `:98` write "A stale `cityId`".

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run lib/owners/owner-filter-query.test.ts`
Expected: FAIL — `sends countryId on its own` (received `query: {}`), `sends the city as cityId` (cityId dropped), and the renamed cases (`cityId` not in `OWNER_FILTER_KEYS`/`TEXT_KEYS`, `clearCityOnCountryChange` clears `companyCityId`).

- [ ] **Step 3: Minimal implementation** — `lib/owners/owner-filter-query.ts`:
  - In `OWNER_FILTER_KEYS` replace `"companyCityId"` with `"cityId"` (keep `"countryId"`).
  - In `TEXT_KEYS` add `"countryId"` and replace `"companyCityId"` with `"cityId"`.
  - Replace the header comment's last two sentences with: *"`countryId` and `cityId` filter on the owner's own location (owner-location-model, 2026-08-13) and AND-combine; they replaced F-02 #4's `companyCityId`, which the route no longer reads — sending it returns the whole table."*
  - `TEXT_KEYS` comment: `/** Sent as-is when non-blank. */`
  - `clearCityOnCountryChange`: return `{ ...values, countryId, cityId: "" }`; in its comment replace `companyCityId` with `cityId`.

  `lib/types/owner.types.ts` `OwnerListQuery`: replace the `companyCityId?` member and its comment with:

```ts
  /**
   * owner-location-model (2026-08-13). The owner **operates** in this country /
   * city — the owner's own account, not their company, so it reaches every owner.
   * AND-combined. Ids from `GET /api/countries` and `/api/countries/{id}/cities`.
   *
   * ⚠ An unrecognised id returns an **empty page, not an error**, so clear
   * `cityId` whenever the country changes.
   */
  countryId?: string;
  cityId?: string;
```

  `owners/page.tsx`: the city field becomes `key: "cityId"`, `label: t("filters.city")`, `hint: t("filters.cityHint")`; the country field keeps `key: "countryId"`, `hint: t("filters.countryHint")`. Replace the two stale comments ("It genuinely filters nothing…", "§2.1: a city lives only on a company record…") with `// f-02-4 §2.1: both filter the owner's own location and reach every owner.`

  `messages/en.json` → `owners.filters` (the block at `:997-1002`): remove `companyCity` / `companyCityHint`; set

```json
      "country": "Country",
      "countryHint": "The owner's own location, not their company's. Also scopes the city list.",
      "city": "City",
      "cityHint": "Pick a country first. An owner who has not set a location is excluded.",
```

  `messages/de.json` → same keys:

```json
      "country": "Land",
      "countryHint": "Der eigene Standort des Eigentümers, nicht der seiner Firma. Begrenzt auch die Städteliste.",
      "city": "Stadt",
      "cityHint": "Zuerst ein Land wählen. Eigentümer ohne Standort werden ausgeschlossen.",
```

  Then `grep -rn "companyCityId" lib app components hooks` must print nothing.

- [ ] **Step 4: Run the tests and see them pass** — `npx vitest run lib/owners`, then the three gates. `tsc` catches any remaining `companyCityId` reader.

- [ ] **Step 5: Commit**

```bash
git add lib/owners/owner-filter-query.ts lib/owners/owner-filter-query.test.ts lib/types/owner.types.ts "app/[locale]/dashboard/(owner)/owners/page.tsx" messages/en.json messages/de.json
git commit -m "fix(owners): the city filter sends cityId/countryId, which the route reads (WP2)"
```

---

### Task 4: The Owners table shows the owner's city and country

The live `OwnerRowDto` carries `city` and `country` (names) and no `companyCity`, so the column is blank for every owner. `f-02-4` §2.1: render the columns **including blanks** — a blank means "this owner hasn't set a location".

**Files:**
- Modify: `lib/types/owner.types.ts:68-77` (`OwnerRowDto`)
- Modify: `app/[locale]/dashboard/(owner)/owners/page.tsx:330-339` (column)
- Modify: `messages/en.json` + `messages/de.json` (`owners.columns`)
- Modify: `scripts/verify-v2.mjs` (`OwnerRowDto` expected fields; owners route params)
- Test: `scripts/verify-v2.mjs` (the contract gate) + `npx tsc --noEmit` (the column is a component; this repo verifies components by `tsc`, not unit tests)

**Interfaces:**
- Produces: `OwnerRowDto.city: string | null`, `OwnerRowDto.country: string | null` (replacing `companyCity`).

- [ ] **Step 1: Write the failing check** — in `scripts/verify-v2.mjs` `EXPECTED_FIELDS.OwnerRowDto`, replace `"companyCity"` with `"city", "country"`, and replace the F-02 #4 comment above it with `// owner-location-model (2026-08-13): the owner's own city/country NAMES; companyCity is gone.` Then, after the `tasksParams` block, add:

```js
// owner-location-model (2026-08-13) replaced `companyCityId` with this pair.
// An unknown query key is ignored, so a stale name returns the whole table.
const ownersParams = (swagger.paths["/api/admin/owners"]?.get?.parameters ?? []).map((p) => p.name.toLowerCase());
for (const p of ["cityid", "countryid"]) {
  if (ownersParams.includes(p)) ok(`GET /api/admin/owners takes ?${p}`);
  else bad(`GET /api/admin/owners lost ?${p}`);
}
if (ownersParams.includes("companycityid")) bad("GET /api/admin/owners still takes ?companyCityId");
else ok("GET /api/admin/owners no longer takes ?companyCityId");
```

  Swagger lists the params PascalCase (`CityId`) — hence `toLowerCase()`.

- [ ] **Step 2: Run the gate** — `env -u ERP_ADMIN_EMAIL -u ERP_ADMIN_PASSWORD node scripts/verify-v2.mjs | grep -E '^FAIL|owners'`
Expected: the `OwnerRowDto` FAIL is gone (live has `city`/`country`), the three owners-param lines PASS, and only the `OwnerCompanyDto` FAIL remains (Task 5). Then `npx tsc --noEmit` — it now **fails** at `owners/page.tsx:337` only after Step 3's type change; that is the red for the app side.

- [ ] **Step 3: Implementation** — `lib/types/owner.types.ts` `OwnerRowDto`: replace `companyCity` and its comment with:

```ts
  /**
   * owner-location-model (2026-08-13). The owner's own city and country **names**
   * (not their company's). `null` when the owner has not set a location.
   *
   * ⚠ Render the column **including its blanks** (f-02-4 §2.1): a blank is exactly
   * the row a city/country filter can never return, which is what lets a short
   * filtered list explain itself.
   */
  city: string | null;
  country: string | null;
```

  `owners/page.tsx` column (`id: "companyCity"` block):

```tsx
      {
        id: "location",
        label: t("columns.location"),
        // Blanks rendered on purpose: those rows are the ones a location filter
        // can never return (f-02-4 §2.1).
        cell: (o) =>
          o.city || o.country ? (
            <div className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-sm">{o.city || "—"}</span>
              <span className="truncate text-[11px] text-muted-foreground">{o.country || "—"}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
```

  Renaming the column id is safe for saved column preferences (checked 2026-09-25): `resolveOrder` (`lib/ui/table-prefs.ts:65-90`) drops stored ids the registry no longer has and inserts an unseen id at its registry index. An admin who had hidden "Company city" sees "Location" — intended, it is a different column. Still run `grep -rn '"companyCity"' app components hooks lib` and rename any other reference to `"location"`.

  `messages/en.json` `owners.columns`: replace `"companyCity": "Company city"` with `"location": "Location"`. `messages/de.json`: replace `"companyCity": "Firmenstadt"` with `"location": "Standort"`.

- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; `grep -rn "companyCity" lib app components hooks messages` prints nothing; the gate shows only the `OwnerCompanyDto` FAIL; `npx vitest run`; `npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add lib/types/owner.types.ts "app/[locale]/dashboard/(owner)/owners/page.tsx" messages/en.json messages/de.json scripts/verify-v2.mjs
git commit -m "fix(owners): the table shows the owner's own city and country (WP2)"
```

---

### Task 5: The KYC company card shows the registration address

`owner-location-model` §4: `PUT /api/kyc/company` lost `countryId`/`cityId` and gained a required plain-text `registrationAddress`; `GET /api/kyc/me` and the admin KYC read changed to match. The live `OwnerCompanyDto` is `id, name, type, licenseNumber, licenseExpiry, registrationDate, registrationAddress, taxNumber`. `components/docs-workspace/detail/facts-rail.tsx:38-43` still builds "Registered in" from the six removed fields, so it is blank for every company.

**Files:**
- Modify: `lib/types/identity.types.ts:40-55` (`OwnerCompanyDto`)
- Modify: `components/docs-workspace/detail/facts-rail.tsx:38-43,90`
- Modify: `scripts/verify-v2.mjs` (`F031_FIELDS.OwnerCompanyDto`)
- Test: the contract gate + `npx tsc --noEmit`

**Interfaces:**
- Produces: `OwnerCompanyDto.registrationAddress: string | null` (replacing `countryId`, `countryNameDe`, `countryNameEn`, `cityId`, `cityNameDe`, `cityNameEn`).

- [ ] **Step 1: Write the failing check** — in `scripts/verify-v2.mjs` `F031_FIELDS.OwnerCompanyDto`, replace the six location fields with `"registrationAddress"`, with the comment `// owner-location-model §4 (2026-08-13): one plain-text address replaced the country/city pair.` Also add to the "must be GONE" object: `OwnerCompanyDto: ["countryId", "cityId", "cityNameEn", "countryNameEn"],`.

- [ ] **Step 2: Run the gate** — expected: **0 FAIL**. Then change the type (Step 3) and watch `npx tsc --noEmit` fail at `facts-rail.tsx:40-41`.

- [ ] **Step 3: Implementation** — `identity.types.ts` `OwnerCompanyDto`: delete the six fields and add

```ts
  /**
   * owner-location-model §4 (2026-08-13): the legal address exactly as written on
   * the registration document — one required string on write, replacing the
   * country/city pickers. `null` only on a company saved before the change.
   */
  registrationAddress: string | null;
```

  `facts-rail.tsx`: delete the `registeredIn` computation (`:38-43`) and render `<Fact label={t("registeredIn")} value={company.registrationAddress} />`. If `locale` is now unused in the component, keep it only if other `Fact`/`Expiry` calls still take it (they do — `Expiry` receives `locale`).

- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; `grep -rn "cityName\|countryName" lib components app hooks` prints nothing; gate **0 FAIL**; `npx vitest run`; `npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add lib/types/identity.types.ts components/docs-workspace/detail/facts-rail.tsx scripts/verify-v2.mjs
git commit -m "fix(kyc): the company card reads registrationAddress, not the removed city fields (WP2)"
```

---

### Task 6: The authorization letter — a name, and the company group

CHANGELOG 2026-09-01 added the owner document type `RepresentativeAuthorization` and says it *"is a company document and goes with the company"*. Two gaps: `components/owners/owner-documents-card.tsx:100-102` finds no `docType.<camelKey>` label and prints the raw enum name; and `lib/onboarding/doc-set.ts:26-30` `COMPANY_TYPES` lists three types, so `groupOf` files the letter under **Other** in the review workspace. The entry also says it is *"a name, not a rule"*: it satisfies no requirement. `requiredSet` reads `IDENTITY_TYPES` and `CompanyRegistration` only, so adding the letter to `COMPANY_TYPES` does not change what is required.

**Files:**
- Modify: `lib/onboarding/doc-set.ts:26-30`
- Test: `lib/onboarding/doc-set.test.ts`
- Modify: `messages/en.json` + `messages/de.json` — the `docType` block (`:107-115`)

- [ ] **Step 1: Write the failing test** — in `lib/onboarding/doc-set.test.ts` add:

```ts
describe("the representative's authorization letter (2026-09-01)", () => {
  it("is grouped with the company documents", () => {
    expect(groupOf("RepresentativeAuthorization")).toBe("company");
  });

  it("satisfies no requirement — a bundle of only the letter is still incomplete", () => {
    expect(requiredSet([doc({ type: "RepresentativeAuthorization" })], true).complete).toBe(false);
  });
});
```

  (`doc` is the file's existing fixture helper; import `groupOf` alongside `requiredSet` if it is not imported yet.)

- [ ] **Step 2: Run it** — `npx vitest run lib/onboarding/doc-set.test.ts`. Expected: FAIL on *grouped with the company documents* (received `"other"`); the second case passes, and must keep passing.

- [ ] **Step 3: Implementation** — append `"RepresentativeAuthorization"` to `COMPANY_TYPES` in `lib/onboarding/doc-set.ts`, with the comment `// 2026-09-01: a company document (deleted with the company), but it satisfies no requirement.` Re-run: both pass.

- [ ] **Step 4: Check the label gap** — `grep -n '"representativeAuthorization"' messages/en.json messages/de.json` prints nothing.

- [ ] **Step 5: Add the key** — after `"other"` in each `docType` block (add the comma to `"other"`):

  en: `"representativeAuthorization": "Authorization letter"`
  de: `"representativeAuthorization": "Vollmacht"`

- [ ] **Step 6: Verify** — the grep now prints one line per file; `npx vitest run` (the onboarding i18n tests still pass); key-parity check:

```bash
node -e 'const f=(o,p="")=>Object.entries(o).flatMap(([k,v])=>v&&typeof v=="object"?f(v,p+k+"."):[p+k]);const a=new Set(f(require("./messages/en.json"))),b=new Set(f(require("./messages/de.json")));console.log([...a].filter(x=>!b.has(x)).length,[...b].filter(x=>!a.has(x)).length)'
```
Expected: `0 0`.

- [ ] **Step 7: Commit**

```bash
git add lib/onboarding/doc-set.ts lib/onboarding/doc-set.test.ts messages/en.json messages/de.json
git commit -m "fix(kyc): the authorization letter is a named company document (WP2)"
```

---

### Task 7: Record it in the ledger

**Files:**
- Modify: `BACKEND-REVISIONS.md` — §1 (`verify-v2.mjs` row), §3 (WP1, WP2 bodies), §4 (new pass block), §2 notes, §6.3

- [ ] **Step 1:** §1 `verify-v2.mjs` row → `✅ 0 FAIL / <n> PASS (date, swagger-only)`, with `<n>` from the last run.
- [ ] **Step 2:** §4: add a block `### <date> — contract gate and two live breaks (WP0–WP2)` with one row per task: what changed and the `file:line`, in the style of the 2026-09-24 block. Link this plan.
- [ ] **Step 3:** §3: delete the WP1 body; in WP2 keep only the item this plan does **not** do — *"MISSING: admin owner location edit on `PUT /api/owners/{id}`…"* — and re-title it `WP2 — Owner location edit (remainder)`. Leave §6.3 as it is — this plan fixes none of those comments.
- [ ] **Step 4:** §2: `Absorbed to` does **not** move for `task-lifecycle`, `f-02-4`, `fnd-3`, `owner-location-model` or `onboarding-and-active-gate` — each still has other open packages. Change `task-lifecycle` State ❌ → ⚠ and `f-02-4` ❌ → ⚠ (their false claims are now true), and update the notes.
- [ ] **Step 5:** §4 2026-09-21 block cites `docs/superpowers/plans/2026-09-21-admin-f07-integration.md`, which does not exist in `docs/superpowers/plans/`. Replace the citation with `(plan file not in the repo)` — keep the claim that the work was done; only the pointer is wrong.
- [ ] **Step 6: Commit**

```bash
git add BACKEND-REVISIONS.md
git add -f docs/superpowers/plans/2026-09-25-contract-gate-and-live-breaks.md
git commit -m "docs(ledger): WP0-WP2 built — contract gate green, two live breaks fixed"
```

---

## Out of scope (stays in the ledger)

- **Admin owner location edit** (`PUT /api/owners/{id}` with `countryId`/`cityId`, three error codes) — a new form section, needs its own design. Ledger WP2 remainder.
- Owner last-seen filters/columns and owner server sort (WP14), exports (WP18).
- The stale comment `lib/tasks/dispatch-row.ts:8` (retired 3 h alert) — harmless, fixed with WP11.
- Live proof with an admin session (WP10).
