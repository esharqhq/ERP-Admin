# Backend contract revisions — what this panel is current against

`MY_APP` for this repo is **`admin-panel`**.

Every guide in `Germany-ERP/docs/handoff/` carries a `Revision:` date that moves **only on a
client-visible change**. This file records the date we last absorbed, per guide. Nothing pushes those
dates to us and the catch-up loop depends on them — "when we last pulled" is not a substitute,
because a pull moves on typo fixes too.

## The loop

⚠ **The procedure itself is no longer kept here.** It lives in the `erp-backend-source` skill —
`references/return-pass.md` for the catch-up pass and `SKILL.md` for the two source levels, the
`Extends` / `Companion of` relationship rule and precedence. Two copies of a procedure is the same
mistake as two copies of a contract, and this file's copy had already lost the relationship rule
entirely. **Follow the skill.** What stays below is the summary, so a reader of this file knows what
the dates are *for*; where they differ, the skill is right.

1. `git pull` in the backend checkout, open `docs/handoff/CHANGELOG.md` — newest first, append-only.
2. Read from the **oldest `Absorbed to` date in the table below** downwards.
3. Skip every entry whose `affects:` does not name `admin-panel`.
4. Act in order: **`Became false:`** (quotes a sentence we may have coded against — assume we did)
   → **`Gone:`** (delete that handling) → **`Replaced by:` / `Do this:`**.
   `Kind: additive` still needs its `Became false:` read — a **count or enumeration we hard-coded**
   (export columns, enum values, a trigger list) is the recurring trap.
5. Open only the guides that entry names, at the section it points to.
6. Update the table below, and add a line to `scripts/verify-v2.mjs` for anything new we now call.

Precedence: **live response > guide > `README.md`/`guidance.md`**. Never read the C# to answer a
question a guide answers — if a guided surface forces you into `index/`, the guide has a bug, so
[open an issue](https://github.com/esharqhq/Germany-ERP/issues) rather than working around it.

## Guides this panel consumes

Reviewed 2026-08-12. Two separate dates, and confusing them defeats the point of the file:

- **Revision** — the date the *guide* carries upstream. Copied from the backend's catalog table.
- **Absorbed to** — the date *we* are current to. Start the CHANGELOG read from the oldest of these.

`State` is what we have actually verified, not what we assume.

| Guide | Revision | Absorbed to | State | Notes |
|---|---|---|---|---|
| `f-06-c-checkin-proof.md` | 2026-08-26 | 2026-09-08 | ✅ yes | All three admin halves verified today. §4 the walk-in order's own `lat`/`long` (fixed 2026-09-08 — see the section below); §5 property coordinates, already sent and already gated on `location !== null` by `property-create-dialog.tsx:117,129` and `property-edit-dialog.tsx:91,102`; §6 the four refusal fields, modelled in `lib/types/attendance.types.ts:30-55` and rendered as the workers matrix' `refused` chip (`lib/workers/matrix.ts:40-65`). ⚠ Nothing here can read a filed order's coordinates back — §4.2, upstream gap, not ours. |
| `f-02-4-owner-table-filters.md` | 2026-08-12 | 2026-08-12 | ⚠ partly | **All six filter params and all three columns are in** (`companyCityId`, `lastOrderedFrom`/`To`, `neverOrdered`, `taskCountMin`/`Max`; `companyCity`, `lastOrderedAt`, `taskCount`), gated in `verify-v2.mjs`. The **three sort keys and three export columns are not**, and cannot be "absorbed" — see the note below the table. |
| `fnd-3-table-query.md` | 2026-08-12 | 2026-08-12 | ⚠ partly | The owners/workers tables use it. Same split: filters in, sorting and export absent app-wide. `invalid_filter_value` went from 3 triggers to 6 — all six are refused client-side by `buildOwnerFilterQuery` before the request. |
| `f-02b-6-default-owner-walk-in-orders.md` | 2026-08-12 | 2026-08-12 | ✅ yes | The walk-in page (PR #21). Its Revision moved to 08-12 via F-02 #4's Owners-table changes, not via anything in the order-filing flow. |
| `contract-lifecycle.md` | 2026-08-11 | 2026-08-11 | ⚠ partly | §7.7 `ownerLegalName`/`workerLegalName` modelled and carried on `RegistryRow` as `partyLegalName`. **Nothing renders it yet** — the registry itself is unbuilt, so whoever builds it must show both names and render nothing when the legal one is null. |
| `onboarding-and-active-gate.md` | 2026-08-11 | 2026-08-11 | ⚠ partly | §10.3 `prefill.legalName` modelled. Our authoring flow has no contracting-party name field — the admin uploads a PDF — so there is currently nowhere to use it. |
| `f-02a-1-admin-task-list-filters.md` | 2026-08-10 | 2026-08-10 | ⚠ partly | The conditional row cap is understood and documented at the call site. **None of the four filters** (`propertyId`, `scheduledFrom`, `scheduledTo`, repeatable `status`) are built, so the dispatch page still sends no window and 500 is the live bound. |
| `f-02b-7-admin-owner-edit.md` | 2026-08-10 | 2026-08-10 | ✅ yes | Verified: `owner_has_open_tasks` handled, dead `boss_has_active_properties` documented as removed. |
| `f-03-1-structured-document-data.md` | 2026-08-10 | 2026-08-10 | ✅ yes | v2 phases. Gated by `verify-v2.mjs`. |
| `f-02c-property-rework.md` | 2026-08-07 | 2026-08-07 | ✅ yes | Verified: `category` FK object, no `docsStatus`, property entries in `verify-v2.mjs`. |
| `fnd-1-configurable-lookups.md` | 2026-08-07 | 2026-08-07 | ✅ yes | v2 phase 4. |
| `notification-bell.md` | 2026-08-05 | 2026-08-05 | ✅ yes | v2 phase 4. |
| `fnd-2-admin-initiated-ticket.md` | 2026-08-03 | 2026-08-03 | ✅ yes | Gated by `verify-v2.mjs` (`AdminOpenTicketRequest`). |
| `support-ticket-followup-fix.md` | 2026-07-01 | 2026-07-01 | ✅ assumed | Not re-verified today. |
| `task-cancel-lifecycle-guards.md` | 2026-07-01 | 2026-07-01 | ✅ assumed | Not re-verified today. |
| `worker-doc-approved-delete-guard.md` | 2026-07-01 | 2026-07-01 | ✅ assumed | Not re-verified today. |

Guides whose `Consumers:` do not include `admin-panel` are deliberately absent: the four
`worker-chat*` guides and `admin-assigned-group-visibility.md`. `who-builds-what.md` and
`worker-chat.md` are superseded stubs.

## Two things no changelog entry can be absorbed into

Several entries list **sort keys** and **export columns** among their changes. Neither can be absorbed
here, because **neither surface exists anywhere in this app**:

- **No table sorts *server-side*.** No page sends `sortBy`/`dir`, and `DataTableColumn` is
  `{ label, className }` with no sort affordance. A `SortableTableHead` primitive **does** exist and the
  attendance screen uses it — but that sort is client-side over already-fetched rows
  (`useAttendanceTable` holds local `sortKey`/`sortDir`), which is not what a `sortBy` whitelist is for.
  So the primitive is reusable; the plumbing is what is missing.
- **No admin table exports.** Nothing calls any export route: no `?format=`, no `/export`. The only CSV
  in the app is the attendance screen's client-side one.

So they are **new features, not migrations**, and each needs its own spec. Two rules to carry into them:
the `sortBy` whitelist needs a **default branch** (an unknown key must not fall through), and the export
must be read **by header name, not column position** — the owner export has gone
9 → 10 → 13 → 15 → 16 → 18 and the worker one 16 → 18 → 17 → 18-but-a-different-18 → 20 (it *shrank*
once, and `register-merge` removed a 7th column, shifting everything after it left by one), so an
exact-column-count assertion has now broken five times.

## Known guide bug, unreported

`bossOwnerName` on `PropertyDto` exists only in `index/dtos/properties.md:179` (re-checked 2026-09-08;
the line was 156 when this was written — cite the field, not the line);
`f-02c-property-rework.md` still shows a `bossOwnerUserId`-only response and does not mention
`bossOwnerName` anywhere. **Still open** — per the precedence rule this is an issue to open on the
backend repo, not something to work around here. Unlike bug #2 below, this one is worth filing as is.

## Open intake — pulled 2026-08-30, NOT absorbed

⚠ **This pull is itself out of date** — backend HEAD is `fc20f9a` (2026-09-07) and carries entries
this section never saw. It is still the best write-up of the three entries it *does* cover; do not
read it as "everything outstanding". See *The real gap is 27 entries* below.

Backend `08ab6d7 → f3a2334`, 53 commits. Nothing below is acted on yet; the `Absorbed to` column above
is deliberately unchanged. Three new `affects: admin-panel` entries, in `Became false:` order.

**1. `onTask` → `booked` (CHANGELOG 2026-08-27, F-06d) — breaking, and it fails SILENTLY.**
`?onTask=` is now an unknown query key, so it is ignored and the request returns the **whole unfiltered
table**. The rule behind the filter did not change. Row field `onTask` → `booked`; the export's
`Task status` values `On task`/`Free` → `Booked`/`Free`. Our sites:
`lib/workers/worker-filter-query.ts:35,48`, `lib/workers/worker-filter-query.test.ts:33-35`,
`lib/types/worker.types.ts:57,82`. **`buildWorkerFilterQuery` has no consumer today** — the workers page
still filters client-side over one page — so this is a rename in unwired code, not a live regression.

**2. `Blocked` → `Lapsed`, and a real `Blocked` (CHANGELOG 2026-08-28) — breaking on both tables.**
Same numeric code, same rows, new word. Worker table takes `Lapsed` **and** a new `Blocked` (an admin
sanction, stored not derived). Owner table takes the **rename only** — `?status=Blocked` there is now
`400 status_not_supported_for_owners` on the list *and* the export. The buckets now partition:
`Active`/`Pending`/`Lapsed` all exclude blocked workers. Our sites: `lib/types/onboarding.types.ts:46-51`
(`ACCOUNT_STATUS_FILTERS`), and the doc comments at `lib/types/worker.types.ts:43` and
`lib/types/owner.types.ts:43`. **No live 400 risk today** — `status` is in `OWNER_FILTER_KEYS` and
`WORKER_FILTER_KEYS` but no filter control populates it, and the owners/workers pages drive their tabs
off `onboardingStatus`, whose six filter values this entry does not touch.

**3. "Do NOT build an edit-required-skills control" is WITHDRAWN (CHANGELOG 2026-08-27, F-06 tail).**
`PUT /api/tasks/groups/{id}` now accepts a non-empty `eligibleProfessionIds`; re-sending the same set is
a real no-op, so a plain Save is safe. The eligibility **freeze** is unchanged — once any child task
leaves `Pending` it refuses `task_group_eligibility_frozen`, so **disable** the control on a started
booking rather than letting the save fail.

Newly available and unbuilt (no `Became false:`, so none of it is urgent): `POST /api/admin/workers/{id}/block`
and `/unblock` (`worker:block` 80046, SUPER_ADMIN, reason mandatory both ways; `blockedAt`/`blockedReason`
on worker detail); worker-table filters `?startingSoon=`, `?idleWeek=`, `?availableOn=YYYY-MM-DD`,
`?agencySource=Independent|ViaAgency`; support-ticket filters `?requesterUserId=`, `?requesterUserType=`,
`?search=` on `GET /api/support-tickets/admin/all` — that trio is what a Worker Detail → Tickets tab calls.

⚠ `verify-v2.mjs` stays green through all of this. It only gates the v2-migration surface.

## ✅ FIXED 2026-09-08 — the walk-in order form could not file an order

**What was broken.** `POST /api/tasks/admin/groups` against the Walk-in property returns
`400 walkin_location_required` unless the body carries `lat` and `long`. Shipped 2026-08-26 with F-06c
(`f-06-c-checkin-proof.md` §4); this app sent neither, so **every walk-in order was refused for
thirteen days** and nothing turned red — `verify-v2.mjs` does not gate this route.

**What shipped.** The refusal lives in `buildWalkInOrder` (`lib/tasks/walk-in-order.ts`), not in a
disabled submit button, so the suite proves it. Four details worth keeping:

- The draft carries **one nullable `{ lat, long }` pair, never two fields.** `lat` without `long` is
  refused as `walkin_location_required`, so a half-filled pair is made unrepresentable rather than
  validated. Splitting it re-introduces the failure.
- `lat`/`long` are **optional on `CreateTaskGroupRequest`** because the requirement is keyed on the
  *property*: required for the walk-in one, `400 group_location_not_allowed` for any other. So the
  shared `buildOrder` (owner detail's dialog, ordinary properties) must never send them — there is a
  test in `order.test.ts` asserting it omits both.
- The field is **`long`, not `lng`.** The check-in doors use `lng`; the group and property doors use
  `long`. Tested, because the wrong one is a silent 400.
- A map picker, not two number inputs (§4's explicit instruction): a coordinate that is merely
  *wrong* rather than out of range is accepted and then refuses every check-in at the job with
  `outside_geofence`. Reuses `components/properties/location-picker.tsx`, which gained optional
  `label`/`hint` props so the wording can name the order's address instead of "the property".

Also fixed while here: the form had **no problem-details path at all** — an out-of-range coordinate
is a `400` in problem-details shape (§5.2) carrying no `error` field, so `getApiErrorCode` returns
`null` and the generic message swallowed the server's own wording. Now reads code →
`getValidationMessage` → generic. And `walkIn.form.instructionsHint` claimed *"this account's
property is a placeholder and carries no location"*, false since F-06c; swept in both locales.

⚠ **The upstream gap is unchanged and shapes the UI.** §4.2: `TaskGroupDto` does not return the
coordinates and `PUT /api/tasks/groups/{id}` cannot change them
(`G_WalkInGroupLocationNotReadableOrEditable`), so a wrong address can only be cancelled and
re-filed, with every check-in refused until then. That is why the form warns before submit — there
is no second chance in any surface.

⚠ **Branch.** This note previously said the fix "lands on `feat/walk-in-job-management`". It was made
on **`feat/admin-tasks-register`**, where `components/walk-in/` is already present.

## The real gap is 27 entries, not 19 — measured 2026-09-08

**Superseded count.** This section said "~19", by inspection. Counted instead, at backend HEAD
`fc20f9a` (2026-09-07), from `docs/handoff/CHANGELOG.md`:

```
awk '/^## 2026-/{d=$2; k=""} /^- Kind:/{k=$3} /affects:/{if (d>"2026-08-12" && /admin-panel/) print d" "k}' \
  docs/handoff/CHANGELOG.md
```

**27** `affects: admin-panel` entries dated after `2026-08-12` — **13 breaking**, 11 additive, 2 fix,
1 removal. The estimate was low by eight, and the breaking count is the number that matters: each one
carries a `Became false:` quoting a sentence this app may have coded against.

⚠ **The intake section above is itself behind now.** It was pulled 2026-08-30; the CHANGELOG carries
entries through **2026-09-07** that it never saw, including a `fix` that re-enabled `?status=Deleted`
on both admin tables (it was accepted and always answered `total: 0`), added `deletedAt`/`deletedBy`
to both table rows *and* both detail responses, and moved the export column counts again — worker
**18 → 20**, owner **16 → 18**, both appends. Read by header name.

Of the 27, one is now absorbed (`f-06-c-checkin-proof.md`, the section above). The rest stand. Four of them (F-05a, F-05b, F-05c, F-06a)
name admin screens that do not exist here at all — an **Agency links** screen whose status filter is the
dispute queue, and a **Skill Requests** queue.

Spot-checked, so the picture is genuinely mixed rather than uniformly stale:

- **Absorbed despite the column** — `owner-location-model` (2026-08-13/14): `useCountries`/`useCities` are
  wired and the owners filter bar has both pickers.
- **Not absorbed** — last-seen recency (2026-08-13): `lastSeenAt` appears only in a doc comment at
  `components/ui/data-table/data-table.tsx:126`. Agency (F-05·0 through F-05c): only `lib/nav-items.ts`
  and `lib/http/files.ts` mention it. Worker availability (F-04b): only `components/detail/account-log.tsx`.

So the column is wrong in both directions and cannot be repaired by inspection. **Absorbing this backlog
needs its own pass**, entry by entry from 2026-08-13 downwards, which is a separate piece of work from the
three items above.

## Known guide bug #2 — HALF-CLOSED UPSTREAM, re-check before filing (checked 2026-09-08)

Two of the four have since moved: `fnd-3-table-query.md` and `onboarding-and-active-gate.md` both now
carry `revision: 2026-09-07`. Two have not: `f-04b-worker-availability.md` (still 2026-08-19) and
`f-05-b-agency-portal.md` (still 2026-08-24).

So **do not file this as written** — it would report two guides that were already fixed. Either
re-verify that those remaining two really did take client-visible changes after their stated dates
and file only those, or drop it. Filing a closed bug costs credibility with the backend team, which
is the thing that makes the precedence rule work at all.

The original finding, kept as the record:

### Original — the Revision dates did not move

Four guides changed with client-visible, breaking content in this pull and their `revision:` frontmatter
**did not move**: `fnd-3-table-query.md` (still 2026-08-20), `f-04b-worker-availability.md` (2026-08-19),
`f-05-b-agency-portal.md` (2026-08-24), `onboarding-and-active-gate.md` (2026-08-25). The catch-up loop
at the top of this file reads those dates to decide what to re-read, so a stale `revision:` makes a
breaking change invisible to it. Same handling as the bug above: an issue on the backend repo, not a
workaround here.

## Repo-side finding — `lib/http/on-forbidden.ts` does not exist (found 2026-09-08)

Four doc comments assert a shared behaviour that is not in this repo: that any API `403` triggers an
immediate refetch of the current admin's permissions, in `lib/http/on-forbidden.ts`.

- `hooks/use-owners.ts:23`, `:41`, `:59`
- `hooks/use-contracts.ts:42`
- `hooks/use-current-permissions.ts:45`

There is no such file (`ls lib/http/` → `api-error.ts`, `client.ts`, `files.ts`, `idempotency.ts`,
plus tests), `git log -- lib/http/on-forbidden.ts` returns nothing — it was **never** committed — and
no interceptor anywhere does a 403-keyed invalidate (`lib/http/client.ts` has no `403` branch).

**Why it matters more than a stale comment.** Two of the five sites use it to justify a *design
decision*: supporting reads are gated on their permission "because an API 403 also forces a
permission refetch — see `lib/http/on-forbidden.ts`", i.e. to avoid a cost nothing incurs. The gating
is still right on its own merits (a custom-role admin should see a dash in a joined column, not a 403
on page load), but the stated reason is fictional, so anyone reasoning from it will over-weight 403
avoidance in the next design.

Not fixed here on purpose: this is prose describing behaviour that may have been *intended*, and
deciding between "write the interceptor" and "delete the claim" is a design call, not a sweep. Left
as a finding. ⚠ Do not cite this file in a review or a spec.

## This ledger's own location disagrees with the skill (2026-09-08)

The `erp-backend-source` skill says each client keeps its ledger at
`<App>/docs/backend-handoff-revisions.md`, and names `Owner/` and `Worker/`. This app's is
`BACKEND-REVISIONS.md` in the repo root — so an agent following the skill looks in the wrong place,
finds nothing, and can conclude this panel has no watermark at all.

A `git mv BACKEND-REVISIONS.md docs/backend-handoff-revisions.md` plus a sweep of the references to
it (`AGENTS.md`, the skill's own per-app list, `docs/handoff/notifications.md`) closes it. Not done
unasked — it is a repo restructure, and the skill is edited from outside this repo.
