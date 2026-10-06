# Day close / cancel facts — return pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adopt the backend's 2026-10-06 `day-close-cancel-facts` entry, which answers all four of our asks,
on the Task Detail page. The page shows the close time, the closing admin and their note, the cancel time and
how the day was cancelled, and reads the booking header from the booking itself.

**Architecture:** Same layering as the feature. The DTO types gain the new fields. The decisions in
`lib/tasks/detail/` swap their estimates and extra reads for the server's facts, test first. The page drops
the property and owner reads.

**Source (binding):** backend `origin/main` `767b3e6`.
- CHANGELOG entry *2026-10-06 — A day says when and how it ended; a booking names its property*. Kind
  additive; affects admin-panel.
- `task-lifecycle.md` §0k.
- §0e row: `SidedWithWorker` → `DONE` + `ClosedForced`.

**Parent spec:** `docs/superpowers/specs/2026-10-05-admin-task-detail-design.md` (§2 gaps, §4.2–4.3, §5, §7, §8).

**Branch:** `feat/day-close-cancel-facts`, cut from `main` (`0ea6f23`).

## What the backend shipped (from §0k)

| Field | On | Who receives it | Replaces our… |
|---|---|---|---|
| `closedAt` | `TaskItemDto` | everyone | step-4 time estimate (`completedAt + 5 h`, `complaint.decidedAt`). ⚠ Owner-accepted days closed before 2026-10-06 keep `null` → "–". **Do not estimate** |
| `closedByAdminId`, `closureNote` | `TaskItemDto` | admin, owner (`null` for workers) | the unquoted "Force-closed by an admin" line; the complaint read for an upheld day's note |
| `closedByAdminName` | `TaskItemDto` | admin only | — (the name in "— D. Krüger, 13:05") |
| `cancelledAt`, `cancellationReason` (`DayCancelled` · `BookingCancelled` · `AutoCancelled`; set not closed) | `TaskItemDto` | everyone | "Day cancelled." with no date or way |
| `propertyName`, `propertyAddress`, `bossOwnerName` | `TaskGroupDto` | admin, owner (`propertyName`: everyone) | the `usePropertyById` + `useOwner` header reads. §0k·3: **do not fetch the property separately** |

**Became false** (from the entry):
- `propertyName` is `""` on nested days. Our `weekly-rows.ts:60` and `use-worker-shifts.ts:136` only fall
  back when it is empty, so they are harmless and stay.
- A booking whose property was deleted shows `days.total: 0`. We never coded against that.

**Two consequences of §0e that the page must respect:**
- A complaint decided **for the workers** closes the day `Done` + `ClosedForced`, with the decision as
  `closureNote`. A "force-closed" day may therefore be a ruling, so the alert title becomes neutral:
  **"Closed by an admin"**. The closure label "Force-closed by admin" stays, because it names the reason the
  server sends.
- `ownerId` is **whoever booked**, while `bossOwnerName` is the property's BOSS, so they can be different
  people. The header shows `bossOwnerName`, the owner of the property, which is what the design shows.

## Global Constraints

The parent plan's constraints apply in full: tokens only, en/de key parity, no exhaustive enums
(`cancellationReason` gets a default arm), `closureReason == null` ≠ accepted, and nothing invented. A
`null` from the server shows "–", or the generic wording.

Tests: `npx vitest run <file>`; checks: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`,
`npm run verify:api`.

## Review Focus

1. **An owner-accepted day closed before 2026-10-06** has `closedAt: null`. Step 4 must read "–", never an
   estimate. This is Task 2's test.
2. **A `ClosedForced` day from before the backfill**, or an old row with no note and no admin, must still
   read a sensible sentence with no "“null”" and no dangling "—". This is Task 3's test.
3. **An unknown `cancellationReason`** prints the generic cancelled wording. This is Task 3's test.
4. **A booking whose days were cancelled by different roads** (one `DayCancelled`, the rest with the booking):
   the "booking cancelled on" notice may claim only the booking-cancel date. This is Task 4's test.

---

### Task 1: Types and contract gate

**Files:** `lib/types/task.types.ts`, `scripts/verify-v2.mjs`.

- [ ] **Step 1.** In `TaskItemDto`, after `closureReason`, add these fields. Each gets a doc comment citing
  `task-lifecycle.md §0k`:

```ts
  /**
   * When the day became `Done`, on every road — `task-lifecycle.md` §0k·1 (2026-10-06). ⚠ Not
   * `completedAt` (the hand-in). ⚠ Owner-accepted days closed before 2026-10-06 stay `null` — show "–",
   * never an estimate.
   */
  closedAt?: string | null;
  /** The admin who closed it (force-close or a complaint decision either way). `null` when the owner or the 5-h timer did. */
  closedByAdminId?: string | null;
  /** That admin's name — admin tokens only. */
  closedByAdminName?: string | null;
  /** The admin's own words: the force-close reason or the complaint decision note (may be empty). */
  closureNote?: string | null;
  /** When the day was cancelled — §0k·2. */
  cancelledAt?: string | null;
  /**
   * How: `"DayCancelled"` · `"BookingCancelled"` · `"AutoCancelled"`. ⚠ Never the owner's typed reason.
   * Typed open — the set is not promised closed.
   */
  cancellationReason?: "DayCancelled" | "BookingCancelled" | "AutoCancelled" | (string & {}) | null;
```

- [ ] **Step 2.** In `TaskGroupDto`, after `cityId`, add the following. ⚠ `ownerId` is whoever booked and may
  differ from the BOSS.

```ts
  /** §0k·3 (2026-10-06). The property's name — every reader. */
  propertyName?: string | null;
  /** The property's address — admins and owner side. On a walk-in order it is the placeholder "Manual order — address per order". */
  propertyAddress?: string | null;
  /** The property's BOSS (as `PropertyDto.bossOwnerName`). ⚠ Not `ownerId`'s person: that is whoever booked. */
  bossOwnerName?: string | null;
```

- [ ] **Step 3.** In `scripts/verify-v2.mjs`:
  - append `"closedAt", "closedByAdminId", "closedByAdminName", "closureNote", "cancelledAt",
    "cancellationReason"` to the `TaskItemDto` list, with a `// day-close-cancel-facts (§0k, 2026-10-06)`
    comment;
  - append `"propertyName", "propertyAddress", "bossOwnerName"` to the `TaskGroupDto` list.
- [ ] **Step 4.** Run `npx tsc --noEmit && npm run verify:api`. Expected: tsc clean and `ALL PASS`. If the
  live swagger lacks a field, **stop**: the backend has not deployed what it documented. Record that in ledger
  §5 and do not build against it.
- [ ] **Step 5.** Commit `feat(tasks): day close/cancel facts and booking header fields on the task DTOs`.

### Task 2: The timeline reads the server's close and cancel times

**Files:** `lib/tasks/detail/day-view.ts`, `lib/tasks/detail/day-view.test.ts`,
`components/tasks/detail/day-timeline.tsx`.

**Changes:**
- `closedTime(task)` returns `atTime(task.closedAt)` for every reason. The `complaint` parameter goes away,
  and so do the `AutoAccepted` estimate and the `decidedAt` read.
- The cancelled day's step 2 becomes `atTime(task.cancelledAt)` when it is set, else the existing
  `startedAt` / `beforeStart` fallback.
- `daySteps(task)` loses its `complaint` parameter. Update `DayTimeline` to stop passing it.
- The `StepTime` `"about"` arm goes away, along with its render branch and the `steps.about` message key in en
  and de, because nothing produces it any more. `"auto"`, the in-review prediction, **stays**: it predicts a
  future event (§0d timer), not a close time.

- [ ] **Step 1 — tests first.** Replace the three step-4 tests in `day-view.test.ts` and add the cancel test:

```ts
  it("done: step 4 is the server's closedAt on every road", () => {
    for (const closureReason of ["AutoAccepted", "ClosedReplacement", "ClosedForced", "OwnerAccepted"]) {
      const s = daySteps(day({ status: "Done", closureReason, completedAt: "2026-09-30T11:40:00", closedAt: "2026-09-30T16:41:00" }));
      expect(s[3].time).toEqual({ kind: "at", at: at("2026-09-30T16:41:00") });
    }
  });
  it("done · owner-accepted before 2026-10-06 has closedAt null → no time, never an estimate", () => {
    const s = daySteps(day({ status: "Done", closureReason: "OwnerAccepted", completedAt: "2026-09-29T11:48:00", closedAt: null }));
    expect(s[3].time).toEqual({ kind: "none" });
  });
  it("cancelled: step 2 carries cancelledAt when the server has it", () => {
    const s = daySteps(day({ status: "Cancelled", cancelledAt: "2026-10-03T09:12:00" }));
    expect(s[1].time).toEqual({ kind: "at", at: at("2026-10-03T09:12:00") });
  });
```

  Delete the old "auto-accepted: 'about' hand-in + 5 h" and "upheld: the ruling time, only when the complaint
  is loaded" tests. Remove the second argument from every `daySteps(…, null)` call in the file. Run the tests:
  they fail (TypeScript arity aside, the closedAt assertions fail at runtime).
- [ ] **Step 2 — implement.** As listed under Changes above.
- [ ] **Step 3.** Run `npx vitest run lib/tasks/detail/day-view.test.ts && npx tsc --noEmit`, then the parity
  check from the parent plan's Task 6. All green. Commit
  `feat(tasks): detail timeline shows the server's close and cancel times — no estimates`.

### Task 3: The alert quotes who closed it, what they wrote, and how a day was cancelled

**Files:** `lib/tasks/detail/day-alert.ts`, `lib/tasks/detail/day-alert.test.ts`,
`components/tasks/detail/day-alert.tsx`, `messages/en.json`, `messages/de.json`.

**`DayAlert` changes:**

```ts
  | { kind: "forced"; tone: "neutral"; note: string | null; by: string | null; at: number | null }
  | { kind: "upheld"; tone: "critical"; note: string | null; by: string | null; at: number | null }
  | { kind: "autoAccepted"; tone: "neutral"; at: number | null }
  | { kind: "cancelled"; tone: "neutral"; how: "day" | "booking" | "auto" | null; at: number | null }
```

**Rules:**
- `forced` and `upheld` read `note: task.closureNote?.trim() || null`, `by: task.closedByAdminName?.trim() ||
  null` and `at: instant(task.closedAt)`.
- `upheld` falls back to `complaint?.decisionNote` and `complaint?.decidedAt` only when the server fields are
  `null`, for a row read before the backfill.
- `cancelled` maps `cancellationReason` to `how`; any other value is `null`. It also reads
  `at: instant(task.cancelledAt)`.

- [ ] **Step 1 — tests first** (replace the matching cases in `day-alert.test.ts`):

```ts
  it("closed by an admin: their words, their name and the time", () => {
    const t = day({ status: "Done", closureReason: "ClosedForced", closureNote: "Supervisor's phone died", closedByAdminName: "D. Krüger", closedAt: "2026-10-01T13:05:00" });
    expect(dayAlert(t, null, EARLY)).toEqual({ kind: "forced", tone: "neutral", note: "Supervisor's phone died", by: "D. Krüger", at: at("2026-10-01T13:05:00") });
  });
  it("an old ClosedForced row with nothing recorded still reads as forced, all nulls", () => {
    expect(dayAlert(day({ status: "Done", closureReason: "ClosedForced" }), null, EARLY)).toEqual({ kind: "forced", tone: "neutral", note: null, by: null, at: null });
  });
  it("upheld reads the server's note first, the complaint only as a fallback", () => {
    const t = day({ status: "Done", closureReason: "ClosedReplacement", closureNote: "Photos confirm it", closedByAdminName: "A. Admin", closedAt: "2026-10-02T15:10:00" });
    expect(dayAlert(t, complaint({ decisionNote: "older text" }), EARLY)).toEqual({ kind: "upheld", tone: "critical", note: "Photos confirm it", by: "A. Admin", at: at("2026-10-02T15:10:00") });
    const old = day({ status: "Done", closureReason: "ClosedReplacement" });
    expect(dayAlert(old, complaint({ decisionNote: "older text", decidedAt: "2026-10-02T15:10:00" }), EARLY)).toEqual({ kind: "upheld", tone: "critical", note: "older text", by: null, at: at("2026-10-02T15:10:00") });
  });
  it("cancelled says how and when; an unknown road is generic", () => {
    const c = (cancellationReason: string | null) => dayAlert(day({ status: "Cancelled", cancellationReason, cancelledAt: "2026-10-03T09:00:00" }), null, EARLY);
    expect(c("BookingCancelled")).toEqual({ kind: "cancelled", tone: "neutral", how: "booking", at: at("2026-10-03T09:00:00") });
    expect(c("AutoCancelled")).toMatchObject({ how: "auto" });
    expect(c("DayCancelled")).toMatchObject({ how: "day" });
    expect(c("SomethingNew")).toMatchObject({ how: null });
  });
```

  Also update the old `done(...)` loop expectations for `AutoAccepted`/`ClosedForced` to the new shapes. Run
  the tests; they fail.
- [ ] **Step 2 — implement** in `day-alert.ts` as described above.
- [ ] **Step 3 — words.** Replace these keys in **both** message files. de translations are in the same commit.

| Key | en |
|---|---|
| `alerts.forced.title` | `Closed by an admin` |
| `alerts.forced.text` | `{note, select, none {No reason was recorded.} other {Reason: “{note}”.}} {by, select, none {} other {— {by}}}{time, select, none {} other {, {time}}}. Workers and the owner were notified.` |
| `alerts.upheld.decided` | `Decided {date}{by, select, none {} other { by {by}}}: “{note}”` |
| `alerts.upheld.decidedNoNote` | `Decided {date}{by, select, none {} other { by {by}}}.` |
| `alerts.autoAccepted.text` | `The owner didn't review within 5 hours, so the day closed by itself{time, select, none {} other { at {time}}}.` |
| `alerts.cancelled.text` | `{how, select, day {This day was cancelled{date, select, none {} other { on {date}}}.} booking {Cancelled with the whole booking{date, select, none {} other { on {date}}}.} auto {Nobody started it within its work window, so it cancelled itself{date, select, none {} other { on {date}}}.} other {This day was cancelled.}} Assigned workers were released.` |

  The component passes `"none"` for a missing value, so ICU `select` picks the empty branch. ⚠ The forced
  text has to be written with care, so it never shows "— ," with nothing either side.
  - **Simpler, preferred:** build the "— {by}, {time}" tail in the component from two small keys:
    `alerts.byAt: "— {by}, {time}"`, `alerts.by: "— {by}"`, `alerts.at: "{time}"`.
  - The executor picks whichever reads cleanly in both languages and records the choice as a ruling.

  de, same structure:
  - `alerts.forced.title` = `Von einem Admin abgeschlossen`
  - reason = `Grund: „{note}“` / `Kein Grund erfasst.`
  - autoAccepted tail = `… um {time}`
  - cancelled: `Dieser Tag wurde am {date} storniert.` / `Mit der ganzen Buchung am {date} storniert.` /
    `Niemand hat ihn im Arbeitsfenster begonnen, daher hat er sich am {date} selbst storniert.` /
    `Dieser Tag wurde storniert.`, then `Zugewiesene Kräfte wurden freigegeben.`
- [ ] **Step 4 — component.** `day-alert.tsx` formats `at` with the existing `dt()`, and passes `"none"`
  (or uses the tail keys) for null.
- [ ] **Step 5.** Run the tests, `tsc`, lint and the parity check. Commit
  `feat(tasks): detail alert quotes the closing admin and says how a day was cancelled`.

### Task 4: "Booking cancelled on …" from the days, and the cancelled day's note

**Files:** `lib/tasks/detail/booking-facts.ts`, `lib/tasks/detail/booking-facts.test.ts`,
`lib/tasks/detail/day-view.ts`, `lib/tasks/detail/day-view.test.ts`, `app/[locale]/dashboard/tasks/[id]/page.tsx`,
`components/tasks/detail/days-list.tsx`, messages.

- [ ] **Step 1 — tests first.**

```ts
describe("bookingCancelledAt — §0k·2, read from the days", () => {
  it("is the latest cancelledAt among BookingCancelled days", () => {
    expect(bookingCancelledAt([
      day({ id: "a", status: "Cancelled", cancellationReason: "BookingCancelled", cancelledAt: "2026-10-03T09:00:00" }),
      day({ id: "b", status: "Cancelled", cancellationReason: "DayCancelled", cancelledAt: "2026-10-04T09:00:00" }),
      day({ id: "c", status: "Done" }),
    ])).toBe(at("2026-10-03T09:00:00"));
  });
  it("is null when no day went with the booking", () => {
    expect(bookingCancelledAt([day({ status: "Cancelled", cancellationReason: "AutoCancelled", cancelledAt: "2026-10-03T09:00:00" })])).toBeNull();
  });
});
```

  And in `day-view.test.ts`, check that `dayNote` on a cancelled day returns `{ key: "cancelled", how:
  "booking" }` for `BookingCancelled`, `"auto"`/`"day"` likewise, and `how: null` for anything else.
- [ ] **Step 2 — implement.**
  - `bookingCancelledAt(tasks): number | null` goes in `booking-facts.ts`.
  - `DayNote` gains `how?: "day" | "booking" | "auto" | null`.
  - Share one `cancelHow(reason)` mapper, exported from `day-view.ts` and used by `day-alert.ts` too.
- [ ] **Step 3 — notice.** The page's "nothing left" notice uses `bookingCancelledAt(days)`:
  - when it is set, the design's own sentence: *"This booking was cancelled on {date}. Finished days keep their
    status; the remaining days were cancelled. You can still copy it as a new order."* (new key
    `detail.bookingCancelled`, en + de);
  - otherwise the existing neutral `detail.nothingLeft`.
- [ ] **Step 4 — days-list note.** A cancelled day's note reads `notes.cancelledBooking` ("With the booking"),
  `notes.cancelledAuto` ("Cancelled itself") or `notes.cancelledDay` ("Cancelled"), and `notes.cancelled` for
  anything else. Add the keys in en and de.
- [ ] **Step 5.** Run the tests, `tsc` and parity. Commit
  `feat(tasks): detail says when a booking was cancelled, read from its days`.

### Task 5: The header reads the booking, not two extra requests

**Files:** `app/[locale]/dashboard/tasks/[id]/page.tsx`, `lib/tasks/detail/booking-facts.ts`,
`lib/tasks/detail/booking-facts.test.ts`.

- [ ] **Step 1 — test first.** `headerPlace` gains no new input. The page now passes
  `address: group.propertyAddress` and `propertyName: group.propertyName ?? days[0]?.propertyName`. Add one
  test: a walk-in with the placeholder address (`"Manual order — address per order"`) and `isWalkIn: true` →
  `{ kind: "walkIn" }`, never the placeholder. This already passes with today's code: it pins existing
  behaviour against the new input, and is recorded as such.
- [ ] **Step 2 — page.**
  - Remove `usePropertyById`, `useOwner`, `canReadProperty`, `canReadOwner` and the `cityName` / `cityNames`
    block.
  - `ownerName = group.bossOwnerName?.trim() || null`.
  - `place = headerPlace({ isWalkIn: sourceIsWalkIn, address: group.propertyAddress, propertyName:
    group.propertyName ?? days[0]?.propertyName })`.
  - Comment: §0k·3 says not to fetch the property for the header. `ownerId` is whoever booked; the header
    names the BOSS.
- [ ] **Step 3 — complaint read narrowed.** `needsComplaint` is now `selectedState === "rejected"` only. An
  upheld day reads its note from `closureNote` (Task 3), with the complaint as a fallback only when that is
  `null`. Keep the read for `ClosedReplacement` days **only when** `selected.closureNote == null &&
  selected.closedAt == null`, which are pre-backfill rows.
- [ ] **Step 4.** Run `tsc`, lint and the full `npm test`. Commit
  `refactor(tasks): detail header from the booking (§0k·3); complaint read only where still needed`.

### Task 6: Ledger, asks, verification

- [ ] **`BACKEND-ASKS.md`:** mark the 2026-10-05 section *"three things the Task Detail design shows"*
  **✅ shipped 2026-10-06 (`day-close-cancel-facts`, §0k)**, plus the fourth (property header). Edit only that
  section; the user is working on the others.
- [ ] **`BACKEND-REVISIONS.md`:**
  - §1: HEAD `767b3e6`, reviewed through **2026-10-06**.
  - §2: `task-lifecycle.md` Revision → 2026-10-06 (`Absorbed to` stays, because WP6 and WP11 are still open);
    `f-02b-6` Revision → 2026-10-06, and its §3.2 quirk is now false. Nothing in our code depended on it.
  - §4: a pass block listing what was built, with `file:line`.
- [ ] **Checks:** `npx tsc --noEmit && npm run lint && npm test && npm run build && npm run verify:api`.
- [ ] **Browser** (Chrome, already connected):
  - the Garden View booking: forced day → note, admin and time; auto-accepted day → time; cancelled day → how
    and when; notice wording;
  - the upheld single task → note and admin, with no complaint request in the network tab;
  - the Harbour booking header → `bossOwnerName` and `propertyAddress`, with **no** `/api/properties/` or
    `/api/owners/` request.
- [ ] Commit `docs(tasks): return pass — day-close-cancel-facts absorbed on Task Detail`.

## Not in this plan

- Other screens that could show the new facts: the Tasks register, the complaint page and the walk-in sheet.
  Each one is its own small change, recorded in §3 Open work as available, not owed.
- A MODERATOR check (no token).
