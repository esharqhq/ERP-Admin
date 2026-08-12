# Walk-in orders — filing a manual order under the Default Owner (design)

> **Date:** 2026-08-12 · **Status:** approved · **Backend:** F-02b·6, shipped
> ([handoff](../../../../Backend/docs/handoff/f-02b-6-default-owner-walk-in-orders.md), `main` @ `f0e941d`)

## 1. Why

Most clients in Germany and Austria are older people who will not install the owner app, and some order
through Instagram, WhatsApp or Telegram instead. In both cases an admin takes the order and files it by
hand.

The task engine refuses to create work without an owner and a property, so the backend seeded a single
permanent account — `"Walk-in / Manual Orders"` — with a single property, and gave admins a route to
create task groups on its behalf. That shipped on 2026-08-11. **The panel never wired it**: `task.service.ts`
reads the admin group list and cancels groups, and nothing anywhere calls `POST /api/tasks/admin/groups`.

This design is one page that closes that gap.

## 2. Scope

**In:** a page that shows the Default Owner and its property, creates one task group under it, and staffs
the resulting task with a worker — all without leaving the page.

**Out, and deliberately:**

- **Creating the owner or the property.** Exactly one of each exists. The owner is capped at one by the
  database, and delete / edit / contract / ticket against it are all refused with `owner_is_system`. There
  is nothing to create and no affordance for it.
- **Filing for a real owner's property.** The route accepts any property, but a real target brings five
  contract-derived refusals with it (`onboarding_incomplete`, `contract_expired`, `contract_not_yet_active`,
  `contract_expiring_imminently`, `task_date_beyond_contract`). Against the walk-in account those are
  unreachable by construction — that is the point of the feature — so this page never sends a target that
  could produce them, and writes no UI for them.
- **The five optional request fields** — `defaultDeadline`, `internalNote`, `ratingFloor`,
  `eligibleProfessionIds`, `allowNewWorkers`. All optional on the wire; none is needed to take a phone
  order. Adding one later is a field, not a redesign.

## 3. Route, navigation, permissions

| | |
|---|---|
| File | `app/[locale]/dashboard/(owner)/walk-in/page.tsx` |
| URL | `/dashboard/walk-in` |
| Nav | `lib/nav-items.ts`, `owner` group, directly after **Owners** |
| Nav/route gate | `permission: "owner:list"` |
| Create gate | `task_group:create_any` (110038) |

Not `/dashboard/owners/walk-in`: that would put a static segment inside the `[id]` folder, where it reads
as an owner id that isn't one.

`resolveRouteGate` matches the longest configured prefix, and `/dashboard/walk-in` is its own entry, so it
resolves directly to `owner:list` without inheriting anything.

**110038 is seeded to SUPER_ADMIN only — not MODERATOR** (backend registry, verified live: exactly one role
grant). So the gate split is deliberate: a MODERATOR reaches the page, sees the account and the order
history, and finds the form **disabled with a stated reason** rather than missing. Read through
`useHasPermission`, not `<Can>` — `<Can>` would unmount the form and leave a moderator wondering where it
went.

## 4. Page composition

1. **Header — one line, no card.** Account name, a "system account" badge, and the property's name. No
   `HeroCard`: it now reads the contract period, and an account that can never hold a contract would
   render "No contract" — true, and pure noise here. Its call/email buttons would also point at an account
   that cannot be reached.
2. **The order form** (§5) — the only new screen logic.
3. **Order history** — `WeeklyWorkCard ownerUserId={walkInId} properties={properties}`, unchanged. Kept
   beyond the letter of the request because a worker cannot hold two assignments on one date
   (`400 worker_has_overlapping_assignment`), and seeing what is already booked is how an admin avoids
   walking into that refusal.

### 4.1 Reads

| Hook | For |
|---|---|
| `useWalkInOwnerId()` | the account id — `?ownerType=Default&pageSize=1` |
| `useOwner(walkInId)` | its display name |
| `useOwnerProperties(walkInId)` | its property |
| `useOwnerTaskGroups(walkInId)` | the history, inside `WeeklyWorkCard` |

The last three take a `string` and are already `enabled: !!ownerUserId`, so the page passes `walkInId ?? ""`
while the first read settles and they stay idle rather than firing against an empty id.

### 4.2 The unseeded state is not an empty state

`useWalkInOwnerId()` resolves to `null` — it does not throw — when the environment has no walk-in row, and
it carries `retry: false`. `useOwnerProperties` can likewise come back empty. Either case means the
environment is not seeded, which is a system fact and not an owner fact, so the page says so plainly and
**renders no form**. An enabled form over a missing property would only produce
`400 property_not_found` after the admin had typed the whole order.

## 5. The form

Five fields, all in one column.

| Field | Wire | Notes |
|---|---|---|
| Title | `title` (required) | placeholder teaches the convention: `Phone order — Frau Weber, 3 rooms` |
| Date | `dates` (required) | month grid, §5.1 |
| Start time | `defaultStartTime` (required) | `<input type="time">` yields `HH:mm`; `:00` is appended to make `HH:mm:ss` |
| Workers | `defaultWorkerLimit` (required) | integer ≥ 1 |
| Instructions | `instructions` | worker-visible. Kept because on a phone order this is how the worker learns the address and the access — the backend handoff's own example is "Ring twice. Keys with the neighbour." |

`propertyId` is not a field. There is one property; it is displayed in the header and sent from there.

**Local validation before the POST**, matching `message-owner-dialog`'s reasoning: a missing `[Required]`
field returns ASP.NET **problem-details**, a different envelope from this API's `{error}` and more work to
render than to prevent. So the form refuses locally when the title is blank, no date is picked, the start
time is empty, or the worker count is below 1.

### 5.1 `components/tasks/month-date-picker.tsx`

Month header with prev/next, a 7-column grid starting **Monday** (matching `tasks-calendar.tsx`, which
renders `Mo Di Mi Do Fr Sa So`), selected days filled `bg-primary`. Interface: `value: string[]`,
`onChange(value: string[])`, `YYYY-MM-DD`.

Two decisions:

- **Keys come from `toLocalDateKey`** (`lib/tasks/weekly-rows`), never `toISOString()`. An evening in
  Germany is already the next day in UTC, so an ISO-derived key would file the order one day late.
- **Past days are disabled.** Nothing server-side refuses a past date; this is our rule, because work that
  has already been and gone cannot be usefully staffed. One line to relax.

**The component is built single-select**: clicking a day replaces the selection. `value` is nonetheless an
array, because the wire field is one and because that makes multi-select a change of the selection handler
rather than of the interface — one order, one date, until someone needs otherwise.

### 5.2 Not creating the same order twice

The route is `[Idempotent]`: a repeat with the same `X-Idempotency-Key` replays the cached `201` for 24 h
**without creating a second group**. The key is minted once per form (a `useRef`), reused verbatim on
retry, and replaced only after a success — the pattern the owner-documents page already uses for contract
renewal.

`newIdempotencyKey()` exists but lives inside `contract.service.ts`. It moves to `lib/http/idempotency.ts`
with its `idempotent()` header helper; the contract service and the owner-documents page import from the
new home. A second consumer is what makes it general, and importing a contract-domain helper into an order
form would be the wrong dependency.

### 5.3 After the create — staffing, in place

The `201` body is a full `TaskGroupDto` and already contains `tasks[]`, one per date, each with its `id`.
So no re-fetch: the form is replaced by a success panel listing the created task(s), each with an **Assign
worker** button that opens the existing `AssignWorkerDialog` and `useAssignWorker`. That is where "create
the order and staff it without leaving the page" is delivered.

Two fields of that response are meaningless on this route and must not be rendered: `propertyName` is
`""` (read the name from our own property lookup) and `isEnrolled` is `true` (a worker-oriented flag). The
`Location` header points at `GET /api/tasks/groups/{id}`, which is PROPERTY-scoped and 403s for an admin —
do not follow it.

## 6. Data flow and a cache bug this fixes

New wire code:

- `taskService.createAdminGroup(body, idempotencyKey)` → `POST /api/tasks/admin/groups`
- `CreateTaskGroupRequest` in `lib/types/task.types.ts` (`TaskGroupDto` and `TaskItemDto` are already there)
- `useCreateTaskGroup()` in `hooks/use-tasks.ts`, invalidating through `useInvalidateTasks()`

**`useInvalidateTasks()` misses the key this page reads.** It invalidates `["admin-task-groups"]`,
`["admin-tasks"]` and `["task-group", id]`, while `useOwnerTaskGroups` — and therefore `WeeklyWorkCard` —
reads `["owner-task-groups", ownerUserId]`. Left alone, creating an order or assigning a worker would
leave the history card showing stale data.

Adding `["owner-task-groups"]` to `useInvalidateTasks` fixes it for this page **and** for a pre-existing,
unnoticed instance of the same bug: assigning a worker from Dispatching does not currently refresh the
owner detail page's weekly work card either.

## 7. Errors

Reachable on this page:

| Condition | Shape | Handling |
|---|---|---|
| Missing required field | ASP.NET problem-details | prevented locally (§5) |
| No `task_group:create_any` | `403`, **empty body** | prevented by the disabled form; a generic message if it arrives anyway |
| `property_not_found` | `{error}` | the property vanished between page load and submit — refetch and return to the unseeded state |
| `dates_required` | `{error}` | prevented locally |
| `worker_limit_required` | `{error}` | prevented locally |

Not reachable, and no UI is written for them: the five contract refusals (§2), `rating_floor_out_of_range`
and `invalid_profession_ids` (those two fields are not sent), and `task_property_id_mismatch` (an internal
invariant the backend documents as unreachable).

Worker assignment keeps its existing error handling, including `400 worker_has_overlapping_assignment` —
one worker cannot hold two assignments on the same date, and the fix is a different worker, not a
different time.

## 8. Testing

The suite is `vitest` over `lib/` and `hooks/`; no component renders in it, so the tests go where the logic
is:

- **`month-date-picker`'s date maths** extracted as pure helpers in `lib/tasks/month-grid.ts` — which days a
  month grid holds for a given month, Monday-first, and which are in the past. Tested directly. The
  component stays a renderer over them.
- **The request builder** — form state → `CreateTaskGroupRequest` — as a pure function in
  `lib/tasks/walk-in-order.ts`: `HH:mm` → `HH:mm:ss`, a blank instruction omitted rather than sent as `""`,
  and the local validation rules. Tested directly.

Not covered by any gate, and stated as such: the page's layout, the disabled-form state for a MODERATOR,
and the unseeded state.

## 9. i18n

A new `walkIn` namespace in `messages/en.json` and `messages/de.json` — page title and subtitle, the
system-account badge, the five field labels and the title placeholder, the create button, the local
validation messages, the success panel, the assign button, the MODERATOR reason, and the unseeded message.
Both locales in the same commit; a missing key throws at render.
