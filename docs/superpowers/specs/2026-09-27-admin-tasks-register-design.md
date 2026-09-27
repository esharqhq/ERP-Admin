# Admin Tasks screen — the register (list + calendar) after `Uyer Admin Tasks v2`

**Date:** 2026-09-27 · **Status:** design approved in chat (four sections), awaiting spec review
**Design source:** `../assets/Admin/Uyer Admin Tasks v2.dc.html` — sections 01 List, 02 Calendar, 04 Status &
staffing, 05 Filters, 06 Columns, 07 Notice states, 09 Below 768px. **Out of scope:** 03 Detail panel (next
phase) and 08 Create modal (the walk-in form and owner order dialog stay the create doors).
**Backend:** `../Backend` at `9de945d9`; no new route is called.

## 1 · Why

The Tasks screen today is a plain table of **bookings** (one row per task group) plus a group × day grid. The
v2 design is a register of **days**: every row is one day of work with its own schedule, staffing meter and
Assign, filtered by a date spine, drawn either as a list or as a week. Decided in chat:

- **One row = one day** (a `TaskItemDto`), not one booking. A multi-day booking shows as several rows with a
  repeat mark.
- **Scope = List + Calendar**, sharing one filter state ("same filters, same page, different drawing").
- **Data approach A**: the day window from `GET /api/tasks/admin?scheduledFrom&scheduledTo`, joined to the
  already-cached booking list for title, professions, kind and owner.
- **Dispatch stays as it is** — the fast "who goes where now" board. Tasks becomes the full register (any date,
  any state, full filters). Shared parts (pip meter, assign sheet, status visuals) are reused, not copied.

## 2 · Data

| Need | Source | Notes |
|---|---|---|
| Days in the window | `taskService.getAdminTasksInRange(from, to)` → `GET /api/tasks/admin?scheduledFrom&scheduledTo` | `task:list_any`. Both bounds → the 5,000-row ceiling (`f-02a-1` §8). Key `["admin-tasks-range", from, to]`, the family `invalidateTasks` already clears, so an Assign anywhere refreshes the register. ⚠ `scheduledTo` is inclusive against a timestamp — send the last millisecond of the last local day (`dispatch-window.ts` pattern) |
| Title, professions, kind, owner, rating floor, created | `useAdminTaskGroups()` → `GET /api/tasks/admin/groups` (cached, unbounded, already loaded by today's page) | Joined by `task.groupId`. A day whose group is missing still renders (title `–`) |
| Property city (filter) | `useProperties()` → `PropertyDto.city` (·9b) | Joined by `task.propertyId`; unknown → not matched by a city filter |
| Profession names | `useProfessions()` | |
| Strip counts | `useDispatchQueue()` (−2 … +14 days) | Same cache as Dispatch, so the two screens show the same numbers and no extra request is made |

Not available, so not drawn (design deltas): **Updated** column (no `updatedAt` on any task DTO), **Owner** and
**City** columns (not on `TaskItemDto`; the design itself moved Owner to the picker), **Owner type** filter (no
such concept — replaced by a **Walk-in** toggle), server sort (the route has none; the window is bounded, so
sorting is client-side), **Export** and **New task** buttons (no task export route; create is 08).

## 3 · List (design 01, 04, 06)

Top to bottom:

1. **Header** — "Tasks" + one-line subtitle.
2. **Strip** — `SummaryStrip` + four `SummaryTile`s, counted from the Dispatch window, independent of filters:
   *Unstaffed today* (critical — starts today, nobody on it), *Short of a body* (warning — next 7 days, some but
   not enough), *Overdue* (neutral — deadline passed, not Done/Cancelled), *Next 7 days* (neutral — planned).
   A tile click turns on the matching saved view.
3. **Toolbar** — List/Calendar switch; saved views as `StageTabs` (*Unstaffed today · Short of a body · Today ·
   This week* — each a preset of filters); search (property name, short id); Filters button with the active
   count; Columns (`ColumnPicker`, prefs in localStorage as elsewhere).
4. **Filter band** — `FilterBar` sections, see §4.
5. **Table** — `DataTable` in **client** mode over the joined rows. Default columns:

| Column | Render | Sort |
|---|---|---|
| Task | title + repeat mark (⟳ when the group is a Booking); second line: property dot (`propertyHue`) · property name · short id (mono) | – |
| Status | `deriveTaskStatus` as dot + word; fill only for Running / Unstaffed / Overdue; a left rail only on "unstaffed and starts today" (`rowClassName`); Cancelled/Done fade | yes |
| Schedule | day label; mono window `HH:mm–HH:mm` beneath; red within 4 h of start | yes (default, soonest first) |
| Staffing | `StaffingPipMeter` + `filled/required` + shortfall words ("one short", "fully staffed", "+1 over") | yes |
| Professions | dot chips (hue shared with the Workers table) + `+n` | – |
| Action | **Assign** — solid on a day starting today, outline otherwise, hidden when full / Done / Cancelled; opens the existing `AssignWorkerSheet` | – |

   In the picker, off by default: **Deadline** (mono), **Rating floor** (mono `≥ n ★`), **Created** (group
   `createdAt`, mono), **Task id** (mono, full).
6. **Row click** → `/dashboard/tasks/{groupId}` (the detail panel is the next phase).
7. **Footer** — "1–25 of N" + page size 25/50/100 (the shell's pagination).
8. **Below 768 px** — `mobileCard`: title, property · id, status, schedule, meter, Assign. No horizontal scroll.
9. **Keyboard** — `/` focus search, `J`/`K` move the row focus, `Enter` open, `A` assign the focused row, `N`
   jump to the next unstaffed row. Ignored while typing in an input or while a dialog is open.

## 4 · Filters (design 05)

All state lives in the URL (`useTableUrlState` with `filterKeys`), applied live, no Apply. Chips for active
filters, "Clear all", "Copy link". Only the date goes to the server; the rest narrow the loaded window in the
browser (bounded, and most are derived values the server does not know).

| Section | Filter | URL param | Where |
|---|---|---|---|
| When | Date range (presets Today · This week · Next 7 days; default **This week**) | `from`, `to` | **server** window |
| | Time of day | `startAfter`, `startBefore` | client |
| | Deadline passed | `overdue` | client |
| | Repeating (member of a multi-day booking) | `repeating` | client |
| State | Status (multi: Open, Scheduled, Running, Review, Disputed, Done, Unstaffed, Overdue, Cancelled) | `status` | client |
| | Staffing (none, short, full, over) | `staffing` | client |
| | Has a check-in | `checkedIn` | client |
| Where & who | Property (multi) | `property` | client |
| | City | `city` | client (via property) |
| | Owner | `owner` | client (via group `ownerId`) |
| | Walk-in only | `walkIn` | client |
| What it needs | Profession (multi) | `profession` | client |
| | Workers required (min/max) | `reqMin`, `reqMax` | client |
| | Rating floor (min) | `ratingMin` | client |

A window that returns exactly 5,000 rows shows a quiet "showing the first 5,000 — narrow the dates" notice.

**Notice states (design 07):** loading — 6 skeleton rows; nothing matched — `TableNoMatch` with Clear filters;
nothing in the window — `TableEmpty` ("No tasks between …"); error — `TableError` with retry; forbidden —
`TableForbidden`.

## 5 · Calendar (design 02, 09)

Same rows, same filters; the week navigation (‹ · This week · ›) **drives the date range** while Calendar is on,
and List keeps that range when switched back.

- Seven day columns Mon–Sun; today's column tinted (`bg-accent`).
- Day header: weekday + date, "N tasks", and a chip — "M short" (warning) or "all covered" (positive).
- One card per day of work, sorted by start: mono time, "title · duration", property dot + name, `filled/required`.
- Card tone by derived status (tokens): Running green tint · Scheduled light green · Open neutral · Unstaffed
  red tint · Overdue white with red ring · Cancelled/Done white with grey ring, faded.
- Header line "N tasks in view · M short"; legend of the tones below the grid.
- Card click → the booking page.
- Below 768 px: one day at a time with ‹ › and "Tue 01 Sep · 6 tasks · 4 short", cards stacked.
- Not drawn: the "+ New task" ghost (08) and "Group: property".
- The old `TasksCalendar` (group × day grid) stays for Owner Detail until the Detail phase.

## 6 · Units

**Pure logic, test-first (`lib/tasks/register/`):**
- `rows.ts` — `buildRegisterRows(tasks, groupsById, now)` → `RegisterRow` (task, group, title, repeating,
  status, staffing, professions, window, `unstaffedToday`, `startsWithin4h`, `isWalkIn`).
- `filters.ts` — URL values ↔ `RegisterFilters`; `matchesRegister(row, filters, lookups)`; date presets →
  server window; the four saved views as filter patches.
- `sort.ts` — compare functions for Schedule, Status, Staffing.
- `summary.ts` — the four strip counts from the Dispatch window.
- `week.ts` — week days, per-day `{count, short}`, card tone.
- `keyboard.ts` — focus index reducer for J/K/N.
- `lib/workers/profession-hue.ts` — moved out of `components/workers/worker-columns.tsx`; both use it.

**Data:** `hooks/use-task-register.ts` (window query + group/property joins).

**UI (`components/tasks/register/`):** `register-strip`, `register-toolbar`, `register-filters` (FilterBar
fields), `register-columns` (DataColumns), `register-row-card`, `register-calendar`, `calendar-card`,
`calendar-legend`. `app/[locale]/dashboard/tasks/page.tsx` becomes a thin composition.

**Copy:** `tasks.register.*` in en + de.

## 7 · Verification

`lib/` unit tests; `tsc`, lint, full suite and `npm run build` per phase; each phase opened in the browser next
to the design file at desktop and phone width (the Chrome extension must be reconnected). No new route, so
`verify-v2.mjs` gains nothing beyond confirming `scheduledFrom`/`scheduledTo` (already gated).
