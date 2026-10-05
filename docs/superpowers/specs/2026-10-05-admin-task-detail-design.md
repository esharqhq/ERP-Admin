# Admin Task Detail — design

**Date:** 2026-10-05 · **Branch:** `feat/task-detail` · **Route:** `/dashboard/tasks/{groupId}`

**Design sources** (both under `../ERP-Admin-Assests/`):
- `Uyer Admin Task Detail.dc.html` is the screen: a header card, a day rail, a days list and the selected-day panel.
- `Uyer Admin Task Detail States.dc.html` has 13 day states, 5 page states and 2 variants. For each, it gives the DTO condition, the buttons and the "don't".

**Backend:** checked at `origin/main` `26f57e1` (2026-10-03). Since our last check (`9de945d9`), one CHANGELOG entry
landed: the 2026-10-03 demo seed. It is data only and changes no task contract. The rules this screen follows
come from `task-lifecycle.md`: §0c (supervisor, team rating), §0d (closure, timer, force-close), §0j (outcome
guard) and §0i (clone). `task-cancel-lifecycle-guards.md` covers the group-cancel `204`.

---

## 1. Goal and scope

Rebuild the existing booking page (`app/[locale]/dashboard/tasks/[id]/page.tsx`, 778 lines) onto the new
design. **This is a re-layout, not new behaviour.** Every action the design shows already exists, with its
dialog and guard:
- assign, unassign;
- rate a worker, change an outcome, rate the team;
- supervisor override, force close;
- copy order, cancel booking.

What is new:
- **The layout:** a header card with progress, a day rail and facts; a days list next to the selected-day
  panel, which has a 4-step timeline, one state alert, the supervisor and summary, and a workers table with
  open-slot rows.
- **The selected day lives in the URL**, as `?day={taskId}`. The bell's day link lands on that exact day.
- **Buttons are narrowed to what the server accepts** (§6). The current page offers some it refuses.
- **The decisions move into `lib/tasks/detail/`**, with tests. JSX no longer decides which buttons show.

**Out of scope:**
- the dashboard shell (sidebar and top bar in the design file);
- editing a day (`PATCH /api/tasks/{id}`);
- the complaint ruling itself, which stays on `/dashboard/complaints/{taskId}`;
- realtime refresh, since the page does not poll today.

## 2. What the backend cannot give us — and what we show instead

Three things in the design have no field. **We build without them and invent nothing.** Each one goes to
`BACKEND-ASKS.md` as an ask, and the UI will pick it up when the field ships.

| # | Design element | Missing | Shown until it ships |
|---|---|---|---|
| 1 | Force-closed alert: *"Reason: '…' — D. Krüger, 13:05"* | The `reason` is required on `POST /api/tasks/{taskId}/force-close` and sent in the notification, but **no DTO returns it**, the detail `GET /api/tasks/{id}` included. Nothing names the admin either | *"An admin force-closed this day. Workers and the owner were notified with the reason."* No quote, no name |
| 2 | Timeline step 4 time *"Closed · 12:30"* | No `closedAt` on `TaskItemDto`. `completedAt` is the **hand-in** time (§0d) | `AutoAccepted`: *"about {completedAt + 5 h}"*. `ClosedReplacement`: `complaint.decidedAt` (only when the day's complaint is loaded, §5). `OwnerAccepted` / `ClosedForced` / `null`: `–` |
| 3 | *"This booking was cancelled **on 3 Oct 2026**"*, *"Cancelled with the whole booking on …"*, *"Cancelled **by the owner**"* | No `cancelledAt` on `TaskGroupDto` or `TaskItemDto`, and nothing says **who or what** cancelled a day: the owner, the group cancel, or the self-cancel at window end (§0d) | *"This booking was cancelled."* and *"Day cancelled. Assigned workers were released."* No date, no actor |

Proposed asks:
- `TaskItemDto.closureNote` and `closedByAdminName` (set on `ClosedForced`);
- `TaskItemDto.closedAt`;
- `TaskItemDto.cancelledAt` and `cancelReason` (a sibling of `closureReason`);
- optionally `TaskGroupDto.cancelledAt`.

**Owner name and address are not a gap.** They come from two reads we already have (§5).

## 3. Route and selection

- **URL:** `/dashboard/tasks/{groupId}?day={taskId}`. Choosing a day writes `?day=` with `router.replace`
  (no history entry per click), so a refresh or a shared link keeps the day open.
- **The bell resolver** `/dashboard/tasks/day/{taskId}` now replaces to
  `/dashboard/tasks/{groupId}?day={taskId}` instead of opening the booking with no day.
- **Default day** (`pickDefaultDay(tasks, now)`, pure). It is used when `?day` is missing or names a day not in
  the booking. Tasks are sorted by `scheduledDate`; the first match wins:
  1. a `Rejected` day (needs a ruling) — the earliest if there are several;
  2. a `CheckedIn` day with a late worker (§4, 2a), then any `InReview` day;
  3. today's day (local date = `scheduledDate`);
  4. the next upcoming day (`scheduledDate` > today);
  5. the last day.
- **Single task** (`kind === "SingleTask"`, or a booking with exactly one task): the one day is always
  selected, and there is no rail or days list.

## 4. Day states — what each one shows

The day's state is read through `canonicalTaskStatus`. "Active workers" means `activeWorkers(task)`, which
leaves out NoShow, Removed and Cancelled. `req` is `task.requiredWorkerCount`. "Late" means
`now > scheduledAt` and at least one active worker has `checkinAt == null`.

**Times.** Responses carry UTC instants (`…Z`, `guidance.md`), and the app already renders them in the
**viewer's local zone** (the register, Dispatch, broadcasts). This page does the same. ⚠ The group's
`defaultStartTime`/`defaultDeadline` are wall-clock strings with no zone, so for a viewer outside Berlin they
would disagree with the day instants (08:00 against 11:00). **The page therefore never prints the two
wall-clock strings.** Every time on screen, the header's time window included (§8), comes from the
`scheduledAt`/`deadline`/`startedAt`/`completedAt` instants.

### 4.1 Chip, rail colour and days-list note

There is one chip per day row. The detail page gets its own tones that follow the design. `TaskStatusBadge`
is left as it is, because four other screens use it.

| State | Chip label | Tone (tokens) | Days-list note | Note tone |
|---|---|---|---|---|
| `pending` | Pending | neutral (muted) | `n slots unfilled` · `Fully staffed` · ⚠ `Start passed — nobody in` when `now > scheduledAt` | 0 active → danger; short → warning; else muted |
| `checkedIn` | Checked in | positive (fresh) | `{k} worker(s) late` · `On site since {startedAt}` | late → warning |
| `inReview` | In review | warning | `Waiting for owner` | muted |
| `rejected` | Disputed | critical | `Owner complaint — needs ruling` | danger |
| `done` | Done | positive (forest) | the closure label, or `Closed · no reason saved` when `closureReason == null` | muted |
| `cancelled` | Cancelled | muted, striped rail | `Cancelled` | muted |
| unknown (`null`) | the raw word, verbatim | outline | `–` | muted |

Staffing on a row: `{active}/{req}` in mono. A cancelled day shows `–`. 0 → danger, short → warning.

### 4.2 Timeline (Scheduled → Checked in → Handed in → Closed)

Step times are local `HH:mm` in mono.

| State | Steps | Times |
|---|---|---|
| pending | current · todo · todo · todo | `scheduledAt` · – · – · – |
| checkedIn | ok · current · todo · todo | `scheduledAt` · `startedAt` · – · – |
| inReview | ok · ok · current · todo | … · `completedAt` · *"auto ≈ {completedAt + 5 h}"* |
| rejected | ok · ok · **bad** ("Handed in · disputed") · **bad-open** ("Awaiting ruling") | … · `completedAt` · – |
| done | ok · ok · (`completedAt` ? ok : **skipped**) · ok, labelled with the closure reason, or "Closed" when `null` | step 4 time per §2 #2 |
| cancelled | ok · **cancelled** ("Cancelled") · off · off | `scheduledAt` · "before start" when `startedAt == null` · – · – |
| unknown | all todo | – |

### 4.3 The alert (at most one per day, in this order)

| When | Tone | Title → text |
|---|---|---|
| rejected | critical | *Owner complaint — open* → `complaint.reason`, `{photos.length} photos · raised {raisedAt}`. Before the complaint loads, or if the read fails: *"The owner disputed this day. Open the complaint to see it and rule."* |
| checkedIn and late | warning | *Late arrival* → *"{names} not checked in — {m} min past start."* Never auto-marked No-show |
| pending and `now > scheduledAt` (**not in the design** — the §0d timer state) | warning | *Start time passed* → *"Nobody has checked in. If no one starts by {window end}, the day cancels itself."* The window end is `deadline` ?? `scheduledAt + 8 h` |
| inReview | warning | *Waiting for the owner* → *"Handed in at {completedAt}. If the owner doesn't accept or complain within 5 hours, it accepts itself around {+5 h}."* |
| done · `ClosedReplacement` | critical | *Complaint upheld* → the complaint's `decisionNote` and `decidedAt` (when loaded); *"A replacement visit is owed — plan it as a new order."* |
| done · `ClosedForced` | neutral | *Force-closed by an admin* → the §2 #1 interim text |
| done · `AutoAccepted` | neutral | *Auto-accepted* → *"The owner didn't review within 5 hours, so the day closed by itself."* Never worded as "owner accepted" |
| done · `null` | neutral | *Closed* → *"This day closed before 21 Sep 2026, when reasons started being saved."* Never guessed as "Accepted" |
| done · unknown reason | neutral | the raw reason word → no text |
| pending, 0 active | critical | *No workers assigned* → *"{req} of {req} slots still open. The day starts at {HH:mm}."* |
| pending, 0 < active < req | warning | *Understaffed* → *"{req−n} of {req} slots still open. …"* |
| pending, active ≥ req | positive | *Ready* → *"All {req} slots are filled. Nothing to do until workers check in."* |
| cancelled | neutral | *Day cancelled* → §2 #3 interim text |

`OwnerAccepted` has no alert.

### 4.4 Supervisor and summary

- **Supervisor:** the supervisor's `workerName` (looked up from `supervisorWorkerId` in `workers`). If there is
  none: *"Not yet — the first worker to check in"* on pending or checkedIn days, `–` on cancelled days, and
  *"None recorded"* otherwise.
- **Summary:** `workSummary` if set. Otherwise: *"Written by the supervisor at hand-in."* on pending or
  checkedIn days, `–` on cancelled days, and *"No summary was written."* otherwise (muted).

### 4.5 Workers table

**Columns:** Worker (initials avatar, name, *Supervisor* tag), Outcome chip, Check-in (time with the
`CheckinDoorLabel` under it), Check-out, Rating (★ + `starRating` or `–`), Actions.

**Row rules:**
- The Outcome chip is the row's one badge; the Supervisor tag is plain text.
- A No-show row has its name in danger and a faint danger row tint.
- A checked-in day that is late shows the missing check-in `–` in danger.
- A Cancelled outcome is muted.
- The header shows `Workers {active}/{req}` and `{k} open` · `fully staffed` (`released` on a cancelled day).

**Open-slot rows** (pending and checkedIn only): one row per `req − active` reading *"Open slot {n}"*, with an
**Assign** button when the admin holds the permission (§6).

**Empty:** with no rows and no slots, show *"Nobody was on this day."*

## 5. Data flow

| Read | Hook | When | Use |
|---|---|---|---|
| `GET /api/tasks/groups/{id}` | `useTaskGroup` (unchanged) | always | everything |
| `GET /api/properties/{propertyId}` | `usePropertyById` | `property:list` held and not a walk-in order | the address line (`address`, `city`) |
| `GET /api/owners/{ownerId}` | `useOwner` | `owner:list` held | the owner name (`fullName`) |
| `GET /api/tasks/{taskId}` | `useQuery(complaintKeys.task(id))`, the key already shared with the resolver and the complaint page | the **selected** day is `rejected`, or `done` with `ClosedReplacement` | `complaint` (§4.3, §2 #2) |

- **Header line** = `{owner name} · {place}`. The owner name is dropped when its read is not allowed, fails or
  is still loading. `{place}` is the property's `address` (with the city name in the current locale), falling
  back to the day's `propertyName`, then to `–`. Also:
  - a walk-in order (`isWalkInSource`) reads *"Walk-in order"*, because its own address cannot be read back
    (`f-02b-6` §4.2).

  The permission check uses `useCurrentPermissions`, and `null` (not known yet) means don't fetch.
- **Mutations and invalidation are unchanged.** The existing hooks already invalidate `["task-group", id]` and
  the register family.
- **The complaint read is per day and cached.** Switching days doesn't refetch a day already read.

## 6. Actions — who sees what

**Page level** (top right):

| Button | Shown when | Gate |
|---|---|---|
| Copy order | the walk-in lookup has answered (`isWalkInSource !== null`), any state | `task_group:create_any` |
| Cancel booking / **Cancel task** (single) | `isGroupActive(group)` and not booking-cancelled | `task_group:cancel_any` |

**Day level** (panel header):

| Button | Shown when | Gate |
|---|---|---|
| Assign worker (primary) | state ∈ {pending, checkedIn}. **The current page also shows it on InReview — dropped**, per the design. ⚠ **This is our rule, not the server's.** `POST …/admin-assign` has **no** day-state or date guard (`index/controllers/tasks.md`, gap `GT_AdminFillHasNoDateOrStatusGuard`), so it would fill an InReview, Done or Cancelled day. The client is the only guard, which is why it lives in `dayActions` with a test | `task:assign_worker_any` |
| Change supervisor | `canOverrideSupervisor(task)` (existing) | `task:supervisor_override_any` (SUPER_ADMIN) |
| Force close (danger outline) | `canForceClose(task)` (existing) | `task:force_close_any` (SUPER_ADMIN) |
| Open complaint (primary) | state = rejected; links to `/dashboard/complaints/{taskId}` | none (the complaint page gates itself) |
| Rate team (primary) | `canRateTeam(task)` (existing: Done and ≥ 1 Completed) | `task_worker:rate_any` |

With no visible day-level button, show *"No actions — this day is closed"* on done or cancelled days, and
nothing on other days.

**Row level:**

| Icon | Shown when | Gate | Why narrowed |
|---|---|---|---|
| ★ Rate | outcome = `Completed` | `task_worker:rate_any` | Any other outcome is refused with `task_worker_not_completed` |
| ↻ Change outcome | `outcomeChoices(task, outcome, now).length > 0` (existing, §0j) | `task_worker:mark_outcome_any` | unchanged |
| ⊖ Unassign | state ∈ {pending, checkedIn} and the worker is active | `task:unassign_worker_any` | Refused with `task_not_unassignable` on Review, Done and Cancelled (`lib/tasks/assign-errors.ts`) |

**Implementation.** The visibility rules are one pure function, `dayActions(task, now)`, which returns the
list of keys. Permissions stay in `<Can>` in the components, because they are not data. Every dialog is
reused unchanged: `AssignWorkerDialog`, `ConfirmDialog`, `RateWorkerDialog`, `RateTeamDialog`,
`OutcomeDialog`, `SupervisorOverrideDialog`, `ForceCloseDialog` and `CloneOrderDialog`.

## 7. Page states

| State | Condition | Shows |
|---|---|---|
| Loading | `useTaskGroup.isLoading` | Back, plus a skeleton at the final size: a 260px header and a 300px + fluid two-column body (single column for a single task, once the kind is known — before that, the booking layout) |
| Error | 5xx or network | an icon tile, *"Couldn't load this booking"*, *"The server didn't answer. Your data is safe — try again."*, and **Try again** (`refetch`) |
| Not found | `404` | *"Booking not found"*, *"It may have been deleted, or the link is wrong."*, and **Back to tasks**. ⚠ Not verified live (see below) |
| No permission | `403` with an empty body (`isPermissionDenied`) | *"You can't open this booking"*, with the role explanation and no error code, and **Back to tasks** |
| Nothing left to run (the design's "Booking cancelled") | `days.cancelled > 0` and `pending == 0`, `checkedIn == 0`, `inReview == 0`, `rejected == 0` | a neutral notice above the header: *"No days left to run — {cancelled} of {total} days were cancelled. Finished days keep their status. You can still copy it as a new order."* Copy only. ⚠ **The design's assertive wording (*"This booking was cancelled … the remaining days were cancelled"*) is not used.** The same counts come from six Done days plus one day the owner cancelled, or one that cancelled itself at window end, and nothing says which (§2 #3). The design's condition also leaves out `rejected`; a booking with an open dispute is not finished, so we add it |

`classifyGroupLoad(error)` turns the error into one of `error`, `notFound` or `forbidden`. It is pure and
tested. Rule order: permission, then 404, then generic.

⚠ **Two things to check live, which may change this table:**
- **An unknown id.** `GET /api/tasks/groups/{id}` has no `[RequirePermission]` filter. It checks in the action:
  `task_group:read_any` (Global) **or** `task_group:read` on the group's property (`index/controllers/tasks.md`).
  What it answers for an unknown id is **not documented**. Its clone sibling's owner route answers an unknown
  id with an **empty `403`**, because the filter cannot resolve a property. If this read does the same, a
  deleted booking would show the No-permission state. The plan includes a live probe. If it does answer
  `403`, the forbidden copy changes to *"You can't open this booking — your role may not include booking
  details, or the link may be wrong."*, since the two can't be told apart.
- **Which permission the read needs.** The read needs `task_group:read_any`, but the Tasks nav and route gate
  use `task:list_any`. A custom role can hold the second without the first and land on No-permission from the
  list. That is the state working as intended, not a bug.

## 8. Header card

- **Kind chip** (`overline-label`): `BOOKING · {n} DAYS` or `SINGLE TASK`. An unknown `kind` prints verbatim.
  Next to it, `Created {createdAt}`.
- **Title:** `group.title`, or `–`. Below it, the header line (§5).
- **Progress** (right): `{days.done} / {days.total} days done`, or `/ 1 day` for a single task. In mono.
- **Day rail** (booking only): one bar per day in `repeat(7, 1fr)` rows, so a long booking wraps every 7 bars.
  The days don't have to be consecutive, so a row is not a calendar week. Each
  bar has a mono `Wkd dd` label; the selected bar gets a ring; clicking selects the day.
- **Legend:** the six states, each with a count of the **tasks by state** (the same source as the rail, so the
  two always agree). An unknown state is counted under none.
- **Facts** (6 columns, 3 below 1024px, 2 below 768px). `booking-facts.ts`, pure:

  | Fact | Value | Sub-line |
  |---|---|---|
  | Time window | the local `HH:mm` of `scheduledAt – deadline` on the non-cancelled days (all days if every one is cancelled). *"Varies"* when the days don't share one window | `every day` / `one day`. With no deadline: *"from {start}"*, sub-line *"8 h window"* |
  | Workers / day | `requiredWorkerCount`, or `min–max` when the days differ | `required` |
  | Rating floor | `ratingFloor ★`, or *"Any"* at 0 | `minimum to join` |
  | New workers | `Allowed` / `Not allowed` | — |
  | Cleaning tools | `toolsAnswerKey` (existing). `null` → *"Not specified"* in muted, never "No" | `on site` |
  | Date(s) | first – last `scheduledDate`, or the one date | `{n} days` / `one day` |

- **Notes:** *Instructions for workers* (`instructions`) and *Add-on note* (`addOnNote`). Each box is hidden
  when it is empty; when only one shows, it spans the width.
- **Closure tally** (booking only, under the days-list title): the existing `closureTally` as one line:
  `Closed: {a} accepted · {b} auto · {c} forced · {d} upheld · {e} no reason`. "No reason" appears only when
  it is above 0, and the difference is never shown as an error.

## 9. Layout and responsiveness

- **≥ 1024px:** the header card at full width. Below it, a booking gets the days list (300px) and the panel
  (fluid); a single task gets the panel alone.
- **768–1023px:** the days list sits above the panel at full width, as the same rows in a 2-column grid.
- **< 768px:**
  - the rail stays and wraps by week;
  - the days list becomes stacked rows;
  - the panel's day-level buttons wrap under the title;
  - the timeline goes vertical;
  - worker rows become cards: name, outcome and actions on top, then check-in, check-out and rating as a
    label/value list;
  - no horizontal scroll anywhere.
- **Design-system fidelity:** the design file's inline hex values map to tokens (`bg-status-*-tint`,
  `text-status-*-deep`, `text-primary`, `bg-muted`…). The cards are `Card` with the neighbouring screens'
  radius and padding. Times, counts and IDs use `font-mono tabular-nums`. Icons are Lucide; the alert icon
  sits in a tinted tile. There is no solid status fill; solid forest is used only for each section's one
  primary action.

## 10. Units

**`lib/tasks/detail/`** — pure, each with a `.test.ts` next to it:

| File | Exports | Purpose |
|---|---|---|
| `select-day.ts` | `pickDefaultDay(tasks, now)`, `resolveSelectedDay(tasks, dayParam, now)` | §3 |
| `day-view.ts` | `dayChip(task)`, `dayNote(task, now)`, `daySteps(task, complaint, now)`, `dayAlert(task, complaint, now)`, `lateWorkers(task, now)` | §4. Each returns message keys, values and tones, never strings |
| `day-actions.ts` | `dayActions(task, now)`, `rowActions(task, worker, now)`, `openSlots(task)` | §6 visibility and §4.5 slots |
| `booking-facts.ts` | `bookingFacts(group)`, `legendCounts(tasks)`, `isBookingCancelled(group)`, `headerLineParts(…)` | §7 and §8 |
| `page-state.ts` | `classifyGroupLoad(error)` | §7 |

**`components/tasks/detail/`:**
- `detail-header-card.tsx`, `day-rail.tsx`, `days-list.tsx`;
- `day-panel.tsx`, `day-timeline.tsx`, `day-alert.tsx`, `day-workers.tsx` (table at ≥ 768px, cards below);
- `detail-page-state.tsx` (skeleton, error, not found, forbidden);
- `detail-modals.tsx`: the modal switch, moved out of the page as is;
- `day-state-chip.tsx`: the dot-plus-tint chip used by the rail, list and panel.

**Pages:**
- `app/[locale]/dashboard/tasks/[id]/page.tsx` becomes thin: reads, selection, layout.
- `…/tasks/day/[taskId]/page.tsx` changes one line: the redirect gains `?day=`.

**Messages:** new keys under `tasks.detail.*` in **both** `messages/en.json` and `messages/de.json`. Keys used
only by the old page are removed from both.

## 11. Testing and verification

- **vitest** for every `lib/tasks/detail/*.ts`. Fixtures cover the 13 design states, plus pending-past-start, an
  unknown day state, an unknown closure reason, a legacy `null` reason, an unknown kind, `ownerProvidesTools:
  null`, mixed `requiredWorkerCount`, and `rejected` both with and without a loaded complaint.
- **Regression:** `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- **`verify:api`:** add the fields this screen newly reads, as a contract line in `scripts/verify-v2.mjs` (the
  CLAUDE.md rule): `TaskItemDto` (`closureReason`, `supervisorWorkerId`, `workSummary`, `checkinDoor` on the
  worker), `TaskGroupDto` (`days`, `closed`, `kind`, `ownerProvidesTools`, `addOnNote`), and `PropertyDto`
  (`address`, `city`).
- **Browser:** open every reachable state on the dev demo world (it seeds "bookings and single tasks in every
  day state", 2026-10-03), at 1440 / 900 / 390px. Compare against the design and against Owner Detail next
  to it.

## 12. Ledger

- `BACKEND-ASKS.md`: the §2 asks.
- `BACKEND-REVISIONS.md`:
  - §1 — the HEAD check moves to `26f57e1`, and *CHANGELOG reviewed through* moves to 2026-10-03 (the demo-seed
    entry was read, and it needs nothing on this screen);
  - §4 — a pass entry for the Task Detail;
  - `task-lifecycle.md`'s `Absorbed to` does **not** move, because WP6 and WP11 stay open.

## 13. Decisions taken (for the record)

- The missing data is left out and asked for (§2), not blocked on and not faked.
- The default day is needs-attention first (§3).
- Assign is dropped on InReview, the per-row star is narrowed to Completed rows, and unassign is narrowed to
  open days (§6). The first follows the design; the other two avoid offering refusals.
- One addition the design doesn't have: the pending-past-start alert (§4.3).
- `TaskStatusBadge` is not recoloured: it has four other users, and the detail page uses its own chip (§4.1).
- Every time comes from the UTC instants, in the viewer's zone. The group's wall-clock defaults are never
  printed (§4).
- The design's cancelled-booking wording is replaced with a neutral "nothing left to run" (§7).

## 14. Notes for the plan

- `?day=` is read with `useSearchParams`. Under Next 16 that may need a `<Suspense>` boundary around the client
  part. Read `node_modules/next/dist/docs/` on `useSearchParams` before writing the page (AGENTS.md).
- Live probes, once someone has an admin session: an unknown group id (§7), and a MODERATOR token on the read.
