# Task Detail — review minors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the minor findings from the whole-branch review of the Task Detail page (merged `db332da`).

**Architecture:** Same layering as the feature. Where a fix is a decision, it goes into a pure function in
`lib/tasks/detail/`, with a test that fails first. Components only render it.

**Spec:** `docs/superpowers/specs/2026-10-05-admin-task-detail-design.md` (§4.4, §6, §8). The parent plan is
`docs/superpowers/plans/2026-10-05-admin-task-detail.md`.

**Branch:** `fix/task-detail-minors`, cut from `main`.

## Global Constraints

The parent plan's constraints all still apply. In short:
- tokens only, and en/de messages key-for-key identical;
- no enum is exhaustive;
- `npx vitest run <file>` for tests, plus `npx tsc --noEmit` and `npm run lint`.

Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Decisions on the seven minors

| # | Finding | Decision |
|---|---|---|
| 1 | "No actions — this day is closed" checks the day state, not the buttons this admin can see | **Fix.** Add a pure `visibleDayActions(actions, can)` filter. The panel renders the filtered list and shows the line when it is empty on a closed day |
| 2 | The supervisor box: an empty name shows blank; a supervisor missing from `workers` reads "Not yet…" | **Fix.** Add a pure `supervisorLabel(task)`: `workerLabel` when found, else the first 8 characters of the id; "not yet / none / –" only when there is no `supervisorWorkerId` |
| 3 | "every day" also shows under "Varies" and "–" | **Fix.** Add a pure `windowSubKey(win, single)`, which returns a key only when `win.kind === "same"` |
| 4 | "All 0 slots are filled" | **Fix.** Change the copy in en and de to an ICU `=0` branch. No logic change |
| 5 | The outcome dialog's choices use a clock that doesn't tick, while its button uses one that does | **Fix.** The page passes its live `now` into `DetailModals`, which drops `useClock()`. Both now read one clock |
| 6 | Each day click is `router.replace`, a server round trip | **Fix.** Use `window.history.replaceState` for the day click and for the pin. Next 16 syncs it with `useSearchParams` (`node_modules/next/dist/docs/01-app/02-guides/single-page-applications.md`, "Native History API") |
| 7 | English times show as 12-hour ("02:05 PM") | **Leave it.** About 15 other screens use the same `hour: "2-digit"` formatting. Forcing 24-hour here alone would make this page differ from its neighbours. If 24-hour is wanted, that is an app-wide change with its own plan |

## Review Focus

1. A day that the server reports as having a supervisor who is no longer in `workers` (someone unassigned
   after check-in) must show an identifier, never "Not yet". This is Task 2's test.
2. An admin who holds none of the day permissions, viewing a Done day, must see the "No actions" line rather
   than an empty space. This is Task 1's test.

---

### Task 1: Buttons the admin can actually see (#1)

**Files:** Modify `lib/tasks/detail/day-actions.ts`, `lib/tasks/detail/day-actions.test.ts`,
`components/tasks/detail/day-panel.tsx`.

**Produces:** `DAY_ACTION_PERMISSION: Record<DayActionKey, string | null>` and
`visibleDayActions(actions: DayActionKey[], can: (permission: string) => boolean): DayActionKey[]`.

- [ ] **Step 1 — failing test** (append to `day-actions.test.ts`):

```ts
describe("visibleDayActions", () => {
  it("keeps only the buttons the admin holds; open complaint needs none", () => {
    const none = () => false;
    expect(visibleDayActions(["rateTeam"], none)).toEqual([]);
    expect(visibleDayActions(["openComplaint"], none)).toEqual(["openComplaint"]);
    const only = (p: string) => p === "task:assign_worker_any";
    expect(visibleDayActions(["supervisor", "forceClose", "assign"], only)).toEqual(["assign"]);
  });
});
```

Run `npx vitest run lib/tasks/detail/day-actions.test.ts`. It should fail with `visibleDayActions is not a
function`.

- [ ] **Step 2 — implement** (in `day-actions.ts`):

```ts
/** The `<Can>` code behind each day button — `null` means the target page gates itself. */
export const DAY_ACTION_PERMISSION: Record<DayActionKey, string | null> = {
  supervisor: "task:supervisor_override_any",
  forceClose: "task:force_close_any",
  assign: "task:assign_worker_any",
  openComplaint: null,
  rateTeam: "task_worker:rate_any",
};

/**
 * The buttons this admin will actually see. "No actions" is decided on this
 * list — spec §6 says "no *visible* button".
 */
export function visibleDayActions(
  actions: DayActionKey[],
  can: (permission: string) => boolean,
): DayActionKey[] {
  return actions.filter((a) => {
    const p = DAY_ACTION_PERMISSION[a];
    return p === null || can(p);
  });
}
```

- [ ] **Step 3 — wire it.** In `day-panel.tsx`:
  - read `const { permissions } = useCurrentPermissions();` (`hooks/use-current-permissions.ts`);
  - compute `const actions = visibleDayActions(dayActions(task), (p) => permissions?.has(p) ?? false);`, where
    `null` means unknown, so the filter fails closed and the button stays hidden;
  - drop the five `<Can>` wrappers around the day buttons, since the list is already filtered;
  - keep `{actions.length === 0 && isClosedDay(task) ? …noActions… : null}`.
- [ ] **Step 4.** Run `npx vitest run lib/tasks/detail/day-actions.test.ts && npx tsc --noEmit`. Both pass.
  Commit `fix(tasks): detail "No actions" counts only the buttons the admin can see`.

### Task 2: Supervisor label (#2)

**Files:** Modify `lib/tasks/detail/day-view.ts`, `lib/tasks/detail/day-view.test.ts`,
`components/tasks/detail/day-panel.tsx`.

**Produces:** `type SupervisorLabel = { kind: "name"; text: string } | { kind: "notYet" } | { kind: "none" } | { kind: "dash" }` and
`supervisorLabel(task: TaskItemDto): SupervisorLabel`.

- [ ] **Step 1 — failing test** (append to `day-view.test.ts`, importing `supervisorLabel`):

```ts
describe("supervisorLabel — spec §4.4", () => {
  const sup = worker({ workerId: "sup-123456789", workerName: "  " });
  it("uses workerLabel, so a blank name falls back to the id", () => {
    expect(supervisorLabel(day({ status: "CheckedIn", supervisorWorkerId: "sup-123456789", workers: [sup] })))
      .toEqual({ kind: "name", text: "sup-1234" });
  });
  it("a supervisor no longer in workers still shows an id, never 'not yet'", () => {
    expect(supervisorLabel(day({ status: "CheckedIn", supervisorWorkerId: "gone-987654321", workers: [] })))
      .toEqual({ kind: "name", text: "gone-987" });
  });
  it("no supervisor: not yet on open days, a dash when cancelled, none otherwise", () => {
    expect(supervisorLabel(day())).toEqual({ kind: "notYet" });
    expect(supervisorLabel(day({ status: "Cancelled" }))).toEqual({ kind: "dash" });
    expect(supervisorLabel(day({ status: "Done" }))).toEqual({ kind: "none" });
  });
});
```

Run it. It should fail with `supervisorLabel is not a function`.

- [ ] **Step 2 — implement** (in `day-view.ts`, importing `workerLabel` from `day-time`):

```ts
export type SupervisorLabel =
  | { kind: "name"; text: string }
  | { kind: "notYet" }
  | { kind: "none" }
  | { kind: "dash" };

/**
 * The supervisor box — spec §4.4. A set `supervisorWorkerId` always shows an
 * identifier, even when that worker has since left `workers`; "not yet" is
 * only for a day nobody has checked in on.
 */
export function supervisorLabel(task: TaskItemDto): SupervisorLabel {
  const id = task.supervisorWorkerId;
  if (id) {
    const w = (task.workers ?? []).find((x) => x.workerId === id);
    return { kind: "name", text: w ? workerLabel(w) : id.slice(0, 8) };
  }
  const state = canonicalTaskStatus(task.status);
  if (state === "pending" || state === "checkedIn") return { kind: "notYet" };
  if (state === "cancelled") return { kind: "dash" };
  return { kind: "none" };
}
```

- [ ] **Step 3 — wire it.** In `day-panel.tsx`, replace `supervisor`/`supervisorText` with:

```ts
const sup = supervisorLabel(task);
const supervisorText =
  sup.kind === "name" ? sup.text : sup.kind === "notYet" ? t("supervisorNotYet") : sup.kind === "dash" ? "–" : t("supervisorNone");
```

- [ ] **Step 4.** Tests and `tsc` pass. Commit `fix(tasks): detail supervisor box never says "not yet" for a set supervisor`.

### Task 3: Time-window sub-line (#3)

**Files:** Modify `lib/tasks/detail/booking-facts.ts`, `lib/tasks/detail/booking-facts.test.ts`,
`components/tasks/detail/detail-header-card.tsx`.

**Produces:** `windowSubKey(win: WindowFact, single: boolean): "eightHours" | "oneDay" | "everyDay" | null`.

- [ ] **Step 1 — failing test:**

```ts
describe("windowSubKey", () => {
  it("only a shared window gets a sub-line", () => {
    expect(windowSubKey({ kind: "varies" }, false)).toBeNull();
    expect(windowSubKey({ kind: "none" }, false)).toBeNull();
    expect(windowSubKey({ kind: "same", start: 1, end: 2 }, false)).toBe("everyDay");
    expect(windowSubKey({ kind: "same", start: 1, end: 2 }, true)).toBe("oneDay");
    expect(windowSubKey({ kind: "same", start: 1, end: null }, false)).toBe("eightHours");
  });
});
```

- [ ] **Step 2 — implement:**

```ts
/** The time-window fact's sub-line key — none unless every live day shares one window. */
export function windowSubKey(win: WindowFact, single: boolean): "eightHours" | "oneDay" | "everyDay" | null {
  if (win.kind !== "same") return null;
  if (win.end === null) return "eightHours";
  return single ? "oneDay" : "everyDay";
}
```

- [ ] **Step 3 — wire it.** In the header card, change the window fact's `sub` to
  `(() => { const k = windowSubKey(win, single); return k ? t(\`facts.${k}\`) : undefined; })()`, or a const
  computed above `facts`.
- [ ] **Step 4.** Tests and `tsc` pass. Commit `fix(tasks): detail time-window sub-line only under a shared window`.

### Task 4: "Ready" copy at a limit of 0 (#4)

**Files:** Modify `messages/en.json`, `messages/de.json` (`tasks.detail.alerts.ready.text`).

- [ ] **Step 1.** en: `"{required, plural, =0 {No workers are required for this day.} other {All # slots are filled. Nothing to do until workers check in.}}"`
- [ ] **Step 2.** de: `"{required, plural, =0 {Für diesen Tag werden keine Kräfte benötigt.} other {Alle # Plätze sind besetzt. Nichts zu tun, bis die Kräfte einchecken.}}"`
- [ ] **Step 3.** Check parity with the parent plan's Task 6 Step 4 key check: same counts and `[] []`.
  Commit `fix(tasks): detail Ready copy at a limit of 0`.

### Task 5: One clock for the outcome button and its dialog (#5)

**Files:** Modify `components/tasks/detail/detail-modals.tsx`, `app/[locale]/dashboard/tasks/[id]/page.tsx`.

- [ ] **Step 1.** `DetailModals` takes a `now: number` prop and drops `useClock()` and its import.
  `choices={outcomeChoices(modal.task, modal.tw.outcome, now)}`.
- [ ] **Step 2.** The page passes `now={now}`, the same `useLiveClock()` value the row icons use.
- [ ] **Step 3.** `npx tsc --noEmit` passes. There is no new test: `outcomeChoices` is already tested, and this
  only changes which clock is fed to it. Commit `fix(tasks): detail outcome dialog reads the same live clock as its button`.

### Task 6: Day clicks without a server round trip (#6)

**Files:** Modify `app/[locale]/dashboard/tasks/[id]/page.tsx`.

- [ ] **Step 1.** Replace both `router.replace(\`?day=${…}\`, { scroll: false })` calls, the pin effect and
  `selectDay`, with a local helper:

```ts
// Next 16 syncs `history.replaceState` with `useSearchParams` (docs: single-page-applications.md →
// "Native History API"), so the panel switches without refetching the route.
const writeDay = (taskId: string) => window.history.replaceState(null, "", `?day=${taskId}`);
```

- [ ] **Step 2.** Remove the now-unused `useRouter` import if nothing else uses it.
- [ ] **Step 3.** Run `npx tsc --noEmit && npm run lint && npm test`, all green, and
  `npm run build`, which should succeed. Commit `perf(tasks): detail day switch stays client-side (history.replaceState)`.

### Task 7: Ledger

- [ ] Add one line under the 2026-10-05 Task Detail pass entry in `BACKEND-REVISIONS.md` §4:
  *"Follow-up `fix/task-detail-minors`: review minors 1–6 fixed; 12-hour `en` times left as the app-wide
  convention."* Commit with the last task, or as `docs(tasks): …`.

## Not in this plan

The Chrome verification pass (1440 / 900 / 390px), and the two live probes (unknown group id → 404 or empty
403; a MODERATOR token on the read). They run once the extension is connected, after this lands.
