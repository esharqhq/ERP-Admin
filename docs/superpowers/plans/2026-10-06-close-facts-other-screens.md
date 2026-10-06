# §0k on the other screens — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Carry the 2026-10-06 `day-close-cancel-facts` contract (`task-lifecycle.md` §0k) past Task Detail.
Fix the register's Owner filter, which §0k shows is wrong. Then add the two small gains: who decided a
complaint, and how a walk-in job ended.

**Source:** backend `origin/main` `767b3e6`. `task-lifecycle.md` §0k·1–3, and `f-02a-1-admin-task-list-filters.md` §7
("`ownerUserId` means properties this owner is **BOSS** of"). It is read-only and already absorbed, so there is no
new CHANGELOG entry.

**Branch:** `feat/close-facts-other-screens`, cut from `main` (`20e0205`).

## Findings this plan acts on

| # | Screen | Finding | Kind |
|---|---|---|---|
| 1 | Tasks register | The Owner filter keeps a row only when `row.ownerId === picked owner` (`lib/tasks/register/filters.ts:227`). §0k·3 says `ownerId` is **whoever booked** (a MANAGER on the owner doors). So filtering by a property's owner **hides every booking a manager made for that property**. The server's own owner filter means "properties this owner is BOSS of" (`f-02a-1` §7). The register already loads every property, and `PropertyDto.bossOwnerUserId` is the BOSS | **bug** (pre-existing; §0k made it visible) |
| 2 | Complaint page | A decided complaint shows the decision, time and note, but not **who** decided. The page already reads `GET /api/tasks/{id}`, which now carries `closedByAdminName` (admin tokens) | gain |
| 3 | Walk-in sheet | A finished or cancelled job row shows only a status chip. §0k gives the close time and road, and the cancel time and road. The header reads `group.tasks[0]?.propertyName`; the booking now has its own `propertyName` | gain |

**Not in this plan (YAGNI):**
- an Owner column in the register: the design moved Owner into the picker, so the register spec's design delta stands;
- close times in register rows;
- Owner Detail's weekly card: its server filter `?ownerUserId` already uses BOSS semantics;
- the property work tab.

## Global Constraints

As in the parent plans: tokens only, en/de key-for-key parity, no exhaustive enums, and nothing invented (a
`null` stays "–" or generic). Tests: `npx vitest run <file>`; checks: `tsc`, `lint`, `npm test`, `build`,
`verify:api`.

## Review Focus

1. **A property the admin cannot see.** The property list is gated, or the property was soft-deleted and is not
   in the list. The Owner filter must fall back to `row.ownerId` rather than drop the row. This is Task 1's test.
2. **The walk-in filter** reads the walk-in owner through the same match. The walk-in property's BOSS is the
   walk-in account, so it must still find every walk-in order. This is Task 1's test.
3. **A complaint decided before the backfill** (`closedByAdminName` null) reads exactly as today, with no "by"
   and no blank. This is Task 2's render rule.

---

### Task 1: The register's Owner filter matches the property's BOSS (#1)

**Files:** `lib/tasks/register/filters.ts`, `lib/tasks/register/filters.test.ts`, `hooks/use-task-register.ts`.

**Produces:**
- `RegisterLookups.bossByProperty: ReadonlyMap<string, string>` (propertyId → `bossOwnerUserId`);
- `rowOwnerId(row, lookups): string | null`, which is the property's BOSS when the property is known, else
  `row.ownerId`.

- [ ] **Step 1 — failing tests** (append to `filters.test.ts`; reuse that file's existing row and lookups
  builders, extending the lookups builder with `bossByProperty: new Map()`):

```ts
describe("Owner filter — the property's BOSS, not whoever booked (§0k·3, f-02a-1 §7)", () => {
  const boss = "boss-1";
  const manager = "manager-9";
  const lk = { ...lookups(), bossByProperty: new Map([["p-1", boss]]) };
  it("keeps a booking a manager made at the BOSS's property", () => {
    expect(matchesRegister(row({ propertyId: "p-1", ownerId: manager }), { owner: boss }, lk)).toBe(true);
  });
  it("drops it for the manager's own id — they own no property", () => {
    expect(matchesRegister(row({ propertyId: "p-1", ownerId: manager }), { owner: manager }, lk)).toBe(false);
  });
  it("falls back to ownerId when the property is not in the list", () => {
    expect(matchesRegister(row({ propertyId: "p-unknown", ownerId: boss }), { owner: boss }, lk)).toBe(true);
  });
  it("the walk-in filter uses the same match", () => {
    const wk = { ...lk, walkInOwnerId: boss };
    expect(matchesRegister(row({ propertyId: "p-1", ownerId: manager }), { walkIn: "true" }, wk)).toBe(true);
  });
});
```

  If `filters.test.ts` builds rows differently (it may build a `RegisterRow` from a task fixture), adapt the
  `row({...})` calls to its builder. They must set `task.propertyId` and `ownerId`. Run the tests: the first and
  last cases fail.
- [ ] **Step 2 — implement:**

```ts
export interface RegisterLookups {
  cityByProperty: ReadonlyMap<string, string>;
  /**
   * propertyId → its BOSS (\`PropertyDto.bossOwnerUserId\`). The Owner filter matches on this,
   * not on the booking's \`ownerId\`: that is whoever booked — a MANAGER on the owner doors
   * (\`task-lifecycle.md\` §0k·3) — while the server's own owner filter means "properties this
   * owner is BOSS of" (\`f-02a-1\` §7).
   */
  bossByProperty: ReadonlyMap<string, string>;
  walkInOwnerId: string | null | undefined;
}

/** The owner a row files under: its property's BOSS, else (property not listed) whoever booked. */
export function rowOwnerId(row: RegisterRow, lookups: RegisterLookups): string | null {
  return lookups.bossByProperty.get(row.task.propertyId) ?? row.ownerId;
}
```

  Then, in `matchesRegister`, both owner comparisons use `rowOwnerId(row, lookups)` instead of `row.ownerId`.
  In `use-task-register.ts`, build
  `bossByProperty: new Map((properties.data ?? []).map((p) => [p.id, p.bossOwnerUserId]))` next to
  `cityByProperty`.
- [ ] **Step 3.** Run `npx vitest run lib/tasks/register && npx tsc --noEmit`. Expected: green, with every other
  `RegisterLookups` literal in tests and code given `bossByProperty`. Commit
  `fix(tasks): register Owner filter matches the property's BOSS, not whoever booked`.

### Task 2: A decided complaint names who decided (#2)

**Files:** `components/complaints/complaint-decision-card.tsx`, `messages/en.json`, `messages/de.json`
(`complaints.decision`).

- [ ] **Step 1.** Add `"decidedBy": "by {name}"` (de: `"von {name}"`) to `complaints.decision`.
- [ ] **Step 2.** In the decided branch, after the `decidedAt` fragment, append
  `{task.closedByAdminName?.trim() ? \` · ${t("decidedBy", { name: task.closedByAdminName.trim() })}\` : null}`.
  Add a comment citing §0k·1: admin tokens only, and `null` on a row the backfill did not reach.
- [ ] **Step 3.** Run `tsc`, lint and parity. No logic test: this renders a field as sent. Commit
  `feat(complaints): a decided complaint names the admin who decided it`.

### Task 3: How a walk-in job ended (#3)

**Files:** `lib/tasks/detail/day-view.ts`, `lib/tasks/detail/day-view.test.ts`,
`components/walk-in/walk-in-order-sheet.tsx`, `messages/en.json`, `messages/de.json` (`walkIn.detail`).

**Produces:**
`dayEnding(task): { kind: "closed"; label: Label; at: number | null } | { kind: "cancelled"; how: CancelHow | null; at: number | null } | null`.
It is `null` for any day still open or in an unknown state.

- [ ] **Step 1 — failing test** (in `day-view.test.ts`):

```ts
describe("dayEnding — a one-line ending for compact rows (§0k)", () => {
  it("a done day: its closure label and closedAt", () => {
    expect(dayEnding(day({ status: "Done", closureReason: "AutoAccepted", closedAt: "2026-09-30T16:41:00" })))
      .toEqual({ kind: "closed", label: { key: "AutoAccepted" }, at: at("2026-09-30T16:41:00") });
  });
  it("a legacy done day: 'closed', no time", () => {
    expect(dayEnding(day({ status: "Done" }))).toEqual({ kind: "closed", label: { key: "closed" }, at: null });
  });
  it("a cancelled day: the road and cancelledAt", () => {
    expect(dayEnding(day({ status: "Cancelled", cancellationReason: "BookingCancelled", cancelledAt: "2026-10-03T09:00:00" })))
      .toEqual({ kind: "cancelled", how: "booking", at: at("2026-10-03T09:00:00") });
  });
  it("an open or unknown day: null", () => {
    expect(dayEnding(day())).toBeNull();
    expect(dayEnding(day({ status: "Paused" }))).toBeNull();
  });
});
```

- [ ] **Step 2 — implement** in `day-view.ts`, reusing `closureLabel`, `cancelHow` and `instant`.
- [ ] **Step 3 — sheet.**
  - The header `dd` reads `group.propertyName || group.tasks[0]?.propertyName || "—"`. §0k·4: the nested name is
    now filled too, so this is a tidy, not a fix.
  - `JobRow` renders, under its top line and only when `dayEnding(task)` is non-null, one muted 11px line:
    - closed: `{label} · {HH:mm}`, or just `{label}` when `at` is null;
    - cancelled: `walkIn.detail.cancelledHow.{day|booking|auto}` with `{date}`, or the `…NoDate` form.
  - Labels reuse `tasks.detail.closure.*`, via `useTranslations("tasks.detail")`.
  - New keys in `walkIn.detail`:

    | Key | en | de |
    |---|---|---|
    | `cancelledDay` | `Cancelled · {date}` | `Storniert · {date}` |
    | `cancelledBooking` | `Cancelled with the order · {date}` | `Mit dem Auftrag storniert · {date}` |
    | `cancelledAuto` | `Cancelled itself · {date}` | `Selbst storniert · {date}` |

    Plus the three `…NoDate` variants without ` · {date}`.
  - Times use `formatHm`; dates use `toLocaleDateString(locale, { dateStyle: "medium" })`.
- [ ] **Step 4.** Run the tests, `tsc`, lint and parity. Commit
  `feat(walk-in): a finished or cancelled job says how and when it ended`.

### Task 4: Verify and ledger

- [ ] Run `npx tsc --noEmit && npm run lint && npm test && npm run build && npm run verify:api`, with the dev
  server stopped before the build.
- [ ] **Browser** (Chrome, SUPER_ADMIN, dev demo data):
  - Tasks register: Owner = "[DEMO] Hans Schmidt" keeps his properties' bookings, including any booked by a
    sub-account if the seed has one. Walk-in toggle unchanged.
  - Complaint page of the upheld Garden View day: "· by [DEMO] Demo Operations".
  - Walk-in sheet of a finished walk-in order: the ending line.
- [ ] **`BACKEND-REVISIONS.md`:**
  - §4: a pass block (what was built, with `file:line`);
  - §3: in the "§0k elsewhere" row, mark the register, complaint and walk-in items done and leave the rest;
  - no watermark moves, since the backend did not move.
- [ ] Commit `docs(tasks): §0k carried to the register, complaint page and walk-in sheet`.
