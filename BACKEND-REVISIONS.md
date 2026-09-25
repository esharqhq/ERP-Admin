# Backend contract revisions — what this panel is current against

`MY_APP` for this repo is **`admin-panel`**. Backend checkout: **`$env:GERMANY_ERP`**
(`D:\Victus\Projects\Backend\Germany ERP` — quote it, the path has a space), on `main`.

This file is **data only**: watermarks, the per-guide table, open work, the pass log, and findings.
**The procedure lives in the `erp-backend-source` skill** (`.claude/skills/erp-backend-source/` in
this repo) — `SKILL.md` for the rules, `references/first-time.md` for a guide never absorbed,
`references/return-pass.md` for the catch-up pass. Two copies of a procedure is the same mistake as two
copies of a contract; where this file and the skill differ, the skill is right.

**Contents:** [1 Watermarks](#1-watermarks) · [2 Guides](#2-guides-this-panel-consumes) ·
[3 Open work](#3-open-work) · [4 Pass log](#4-pass-log--newest-first) ·
[5 Guide bugs to report upstream](#5-guide-bugs-to-report-upstream) ·
[6 Findings in this repo](#6-findings-in-this-repo)

---

## 1. Watermarks

⚠ **`CHANGELOG reviewed through` and `Actioned through` are two different claims.** Collapsing them is
what makes the *next* pass narrow its own delta until a breaking entry is never re-read. Move each one
only for what it says.

| | |
|---|---|
| **Last full pass** | 2026-09-24, backend `064ce64 → 38dd53d6` (127 commits) |
| **CHANGELOG reviewed through** | **2026-09-24** — every entry above 2026-09-21 ·3 read in full |
| **Actioned through** | **2026-09-21**, plus **the create-form halves only** of four 09-23/09-24 entries ([§4, 2026-09-24](#2026-09-24--f-07-create-forms-and-complaints)). Everything else read that pass is in [§3](#3-open-work). |
| **Oldest `Absorbed to`** | **2026-07-01** — a return pass starts reading the CHANGELOG here, not at the reviewed-through date |
| **Deployed?** | Yes, as of 2026-09-24 — live swagger has `/api/tasks/single`, `/admin/single`, `/admin/groups/{id}/clone`, `/complaints/{id}/decide`, `?staffing=`, `TaskStatus` `Rejected`, and `ownerProvidesTools`/`cityId` on `CreateTaskGroupRequest`. ⚠ Swagger's `required` is empty for the whole schema — required-ness comes from source, not swagger. |
| **Last HEAD check** | 2026-09-25, backend `692bd26` (37 commits past `38dd53d6`, in step with `origin/main` apart from one local `docs(mind)` commit). **No CHANGELOG entry newer than 2026-09-24** — nothing to review. Guide `Revision` column refreshed from README's *How they relate* table; no `Absorbed to` moved. |

---

## 2. Guides this panel consumes

Every guide whose `Consumers:` in `docs/handoff/README.md` → *How they relate* names `admin-panel`
(superseded stubs excluded). Two dates per row, and confusing them defeats the point of this file:

- **Revision** — the date the *guide* carries upstream. Copied from the catalog; refreshing it is safe.
- **Absorbed to** — the date *we* are current to. Moves **only** when the entries up to that date are
  actually built (or checked to need nothing). **`—` means never absorbed**: that guide gets a
  first-time read (`references/first-time.md`), not a changelog pass.

`State` is what we have verified **up to `Absorbed to`**, not what we assume. `Shape` matters: an
**extension** omits auth and the scope gate — read the guide it extends first.

### Tracked

| Guide | Shape | Revision | Absorbed to | State | Notes |
|---|---|---|---|---|---|
| `task-lifecycle.md` | companion set | 2026-09-24 | 2026-09-21 | ⚠ partly | **One living document for all thirteen F-07 slices** — do not expect one file per slice. Absorbed: **§0** (·0 — the two renamed day states and the deleted `TaskGroupDto.status`), **§0b** (·1 — the `InReview` attendance read), **§0c** (·4 — supervisor override, `supervisorWorkerId`, `workSummary`), **§0d** (·3 — force-close, `closed` counts, `closureReason`, the three-hour cancel window). The 09-23/09-24 create-form halves are built but the row stays at 09-21 — see §3. ⚠ **Not absorbed: §2 `canJoin`, §3 the day browse list, §4 join, §5 drop** — worker-app surfaces this panel has no screen for. ⚠ Its delta is read through CHANGELOG entries and **never** through the file's own diff. |
| `deleted-account-email-release.md` | companion set | 2026-09-08 | 2026-09-21 | ✅ yes | ⚠ **The Revision is older than the absorption date on purpose — that is the trap this row records.** The restore doors (`worker:restore` 80047, `owner:restore` 30006) shipped 2026-09-10 as `Kind: fix` and the guide's Revision was **deliberately not bumped**, because nothing an end-user client can see moved. Watching Revisions alone would never have surfaced them. Both are built (the two deleted-accounts screens). §6's two withdrawn agency instructions were checked and neither was ever encoded here — `lib/agencies/application-errors.ts` already links `existingAgencyId` unconditionally, which is what §6 now says to do. |
| `f-06-c-checkin-proof.md` | companion set | 2026-09-23 | 2026-09-08 | ✅ yes | All three admin halves verified. §4 the walk-in order's own `lat`/`long` (fixed 2026-09-08, [§4](#2026-09-08--the-walk-in-order-form-could-not-file-an-order)); §5 property coordinates, already sent and gated on `location !== null` by `property-create-dialog.tsx:117,129` and `property-edit-dialog.tsx:91,102`; §6 the four refusal fields, modelled in `lib/types/attendance.types.ts:30-55` and rendered as the workers matrix' `refused` chip (`lib/workers/matrix.ts:40-65`). ⚠ Nothing here can read a filed order's coordinates back — §4.2, upstream gap, not ours. |
| `f-02b-6-default-owner-walk-in-orders.md` | companion set | 2026-09-24 | 2026-08-12 | ✅ yes | The walk-in page (PR #21). At 08-12 its Revision had moved via F-02 #4's Owners-table changes, not the order flow. The 09-23/09-24 create-form halves are built but not absorbed — see §3. |
| `f-02-4-owner-table-filters.md` | companion set | 2026-09-07 | 2026-08-12 | ⚠ partly | All six filter params and all three columns were built **as the guide stood on 08-12** (`companyCityId`, `lastOrderedFrom`/`To`, `neverOrdered`, `taskCountMin`/`Max`; `companyCity`, `lastOrderedAt`, `taskCount`), gated in `verify-v2.mjs`. ⚠ The city pair has since been renamed — see §3.0. The **three sort keys and three export columns are not** built, and cannot be "absorbed" — see §3.5. |
| `fnd-3-table-query.md` | companion set | 2026-09-18 | 2026-08-12 | ⚠ partly | The owners/workers tables use it. Same split: filters in, sorting and export absent app-wide. `invalid_filter_value` went from 3 triggers to 6 — all six are refused client-side by `buildOwnerFilterQuery` before the request. |
| `contract-lifecycle.md` | companion set | 2026-09-04 | 2026-08-11 | ⚠ partly | §7.7 `ownerLegalName`/`workerLegalName` modelled and carried on `RegistryRow` as `partyLegalName`. **Nothing renders it yet** — the registry itself is unbuilt, so whoever builds it must show both names and render nothing when the legal one is null. |
| `onboarding-and-active-gate.md` | companion set | 2026-09-24 | 2026-08-11 | ⚠ partly | §10.3 `prefill.legalName` modelled. Our authoring flow has no contracting-party name field — the admin uploads a PDF — so there is currently nowhere to use it. |
| `f-02a-1-admin-task-list-filters.md` | standalone | 2026-09-17 | 2026-08-10 | ⚠ partly | The conditional row cap is understood and documented at the call site. **None of the four filters** (`propertyId`, `scheduledFrom`, `scheduledTo`, repeatable `status`) are built, so the dispatch page still sends no window and 500 is the live bound. |
| `f-02b-7-admin-owner-edit.md` | companion set | 2026-09-08 | 2026-08-10 | ✅ yes | Verified: `owner_has_open_tasks` handled, dead `boss_has_active_properties` documented as removed. |
| `f-03-1-structured-document-data.md` | companion set | 2026-09-04 | 2026-08-10 | ✅ yes | v2 phases. Gated by `verify-v2.mjs`. |
| `f-02c-property-rework.md` | companion set | 2026-09-23 | 2026-08-07 | ✅ yes | Verified: `category` FK object, no `docsStatus`, property entries in `verify-v2.mjs`. |
| `fnd-1-configurable-lookups.md` | companion set | 2026-09-23 | 2026-08-07 | ✅ yes | v2 phase 4. |
| `notification-bell.md` | companion set | 2026-09-22 | 2026-08-05 | ✅ yes | v2 phase 4. |
| `fnd-2-admin-initiated-ticket.md` | standalone | 2026-08-03 | 2026-08-03 | ✅ yes | Gated by `verify-v2.mjs` (`AdminOpenTicketRequest`). |
| `support-ticket-followup-fix.md` | standalone | 2026-07-01 | 2026-07-01 | ✅ assumed | Not re-verified. |
| `task-cancel-lifecycle-guards.md` | companion set | 2026-09-22 | 2026-07-01 | ✅ assumed | Not re-verified. |
| `worker-doc-approved-delete-guard.md` | standalone | 2026-07-01 | 2026-07-01 | ✅ assumed | Not re-verified. |

### Untracked — consumed, never recorded (found 2026-09-25)

These name `admin-panel` in `Consumers:` and were **missing from this table**, although several are
cited in code. `Absorbed to` is `—` on purpose: code that cites a guide is not evidence it was absorbed.
Each needs a first-time read before it gets a date.

| Guide | Shape | Revision | Absorbed to | Cited in code |
|---|---|---|---|---|
| `f-01-a-broadcast-core.md` | companion set | 2026-08-31 | — | `components/broadcasts/compose-form.tsx`, `hooks/use-broadcasts.ts`, `hooks/use-broadcast-audience-preview.ts`, `lib/types/broadcast.types.ts`, the broadcast pages |
| `f-04a-worker-location.md` | companion set | 2026-09-23 | — | nowhere |
| `f-04b-worker-availability.md` | companion set | 2026-09-16 | — | `lib/types/availability.types.ts`, `lib/types/skill-request.types.ts` |
| `f-04c-username-at-setup.md` | companion set | 2026-08-19 | — | nowhere |
| `f-05-0-agency-user-type.md` | companion set | 2026-09-08 | — | nowhere — ⚠ it is the **base** of the three `f-05-*` extensions below; read it first |
| `f-05-a-application-review.md` | extension of `f-05-0` | 2026-09-10 | — | `lib/types/agency.types.ts`, `components/agency-requests/review-history.tsx`, `components/docs-workspace/detail/file-viewer.tsx` |
| `f-05-b-agency-portal.md` | extension of `f-05-0` | 2026-09-20 | — | `lib/agencies/portal-impact.ts` (+ test) |
| `f-05-c-worker-agency-link.md` | extension of `f-05-0` | 2026-09-04 | — | `lib/types/agency.types.ts`, `lib/types/worker.types.ts`, `lib/workers/agency-link.ts` (+ test); the screen itself: `app/[locale]/dashboard/agency-links/page.tsx`, `lib/agencies/link-{actions,errors,query}.ts` (+ tests) |
| `f-06-a-skills-request.md` | companion set | 2026-09-04 | — | `lib/types/skill-request.types.ts` (comment claims rev 2026-09-04) |
| `owner-location-model.md` | companion set | 2026-09-23 | — | nowhere (but `useCountries`/`useCities` are wired — see §3 backlog) |
| `profession-fnd1-retrofit.md` | companion set | 2026-09-23 | — | `lib/types/profession.types.ts`, `lib/professions/*`, the professions and skill-requests pages, `BACKEND-ASKS.md` #36 |
| `register-merge.md` | companion set | 2026-09-08 | — | `lib/types/worker.types.ts`, `lib/types/availability.types.ts`, `components/workers/*`, `components/docs-workspace/queue-cells.tsx` |

Deliberately absent — their `Consumers:` do not include `admin-panel`: the four `worker-chat*` guides,
`admin-assigned-group-visibility.md` and `f-06-b-skill-based-task-visibility.md`. `f-04d-completeness-gate.md`,
`who-builds-what.md` and `worker-chat.md` are superseded stubs.

---

## 3. Open work

**This is the panel's backend task list.** Everything read and not built lives here and only here;
when an item is built, move it to the pass that built it in §4. Order: live breaks, then partly done,
then unbuilt, then the backlog nobody has read yet.

### 3.0 🔴 Suspected live break — the Owners-table city filter (found 2026-09-25)

**Guide-derived, not yet confirmed against a live response.** `owner-location-model` (2026-08-13)
renamed the Owners-table city filter `companyCityId` → **`cityId` + a new `countryId`**, and the row
fields `companyCity` → **`city` + `country`**. `f-02-4-owner-table-filters.md` §2: *"the original
`companyCityId` name is history, not something you can still send."* This panel still sends it and
reads it:

- `lib/owners/owner-filter-query.ts:17,34` — `companyCityId` in the key lists, and `countryId`
  deliberately **not** sent (the doc comment at `:8-10` says `companyCityId` is "the only city param
  the route accepts" — now false).
- `app/[locale]/dashboard/(owner)/owners/page.tsx:170` — the filter control's key.
- `lib/types/owner.types.ts:77,125` — `companyCity` row field and `companyCityId` filter type.

Expected symptom: picking a city returns the **unfiltered** table (an unknown query key is ignored, the
same failure class as `?onTask=` in 3.4), and the city column renders blank for everyone. **First step:**
one real `GET /api/admin/owners?companyCityId=<id>` vs `?cityId=<id>` to confirm. Then read the
2026-08-13/14 `owner-location-model` entries (inside the 3.6 backlog) and the guide in full.

### 3.1 Built but not yet proven against production

| Item | From | What is missing |
|---|---|---|
| The two admin create forms (description + tools, single vs group routing, walk-in `cityId`, deadline ≤ start) | 09-23 ·7 · ·12 · ·9b, 09-24 ·10 | Matches the guide and the live swagger request DTOs; **not yet filed against production**. Until one real order has gone through each of `/admin/single` and `/admin/groups`, do not call them confirmed live. |
| The complaint decide door, `Rejected` reads, `decide_the_complaint_first` | 09-21 ·5, 09-22 ·5 post-merge | Not yet exercised against a real complaint. |

### 3.2 Partly actioned — what is left

| Entry | Kind | Still open |
|---|---|---|
| 2026-09-24 F-07 ·10 clone + deadline | breaking | **Clone.** New `POST /api/tasks/admin/groups/{id}/clone` — the **only** way to repeat a walk-in order (send `cityId` for one filed before 09-23). The deadline half (`deadline_not_after_start` on deadline == start) is done. `buildOrder`'s doc comment (*"an earlier deadline … may mean next day"*) was false — night jobs are accepted and do not work. |
| 2026-09-23 F-07 ·9b same-city gate | breaking | **Property city fields on the property forms; `overrodeLocation` on the audit page.** `group_city_not_allowed` if `cityId` is sent for an ordinary property (so `buildOrder` must keep omitting it). Additive: `PropertyDto.country`/`city`, `TaskGroupDto.cityId`, audit 113 `overrodeLocation`. Admin assign is not gated. The walk-in `cityId` is done. |
| 2026-09-23 F-07 ·7 description + tools | breaking | **Reading `ownerProvidesTools`/`addOnNote` back on the order sheet** (typed on `TaskGroupDto`, not rendered). `Instructions` and `OwnerProvidesTools` are `[Required]` (`GermanyERP.Domain/Models/DTOs/Tasks/TaskDtos.cs:33,45`). The `PUT /api/tasks/groups/{id}` half does not apply — this panel calls no group PUT. The create half is done. |
| 2026-09-23 F-07 ·12 single task | breaking | **Rendering `kind`** — typed on `TaskGroupDto` only, not on `TaskItemDto`, not shown. Routing and `task_date_in_past` are done. |
| 2026-09-22 F-07 ·8 staffing ladder | breaking | **The critical list** — `?staffing=Warning\|Critical` on `GET /api/tasks/admin` is unbuilt. Kind 19 retired → 82/83; no break here (the bell routes by `entityType`, never by kind number) and 82/83 rows are clickable since 09-24. `lib/tasks/dispatch-row.ts:8` comment still names the retired 3-hour alert (comment only — no 3 h constant in code). |
| 2026-09-08 KYC queue paging + richer rows | breaking | Paging is done (`lib/services/kyc.service.ts`). The five new `KycProfileSummaryDto` fields are on the wire and unsurfaced — a product decision, not a break. |
| 2026-09-07 `?status=Deleted`, `deletedAt`/`deletedBy` | fix | ✅ Confirmed live 2026-09-22 (5 real rows, each with `deletedAt`/`deletedBy`). Both row DTOs carry the two fields. **Open: the export column counts it also moved** — untouched, since this app calls no export route. |

### 3.3 Read, not actioned

| Entry | Kind | State |
|---|---|---|
| 2026-09-16 ×2 (availability, one-day join) | breaking | `affects:` names `admin-panel`; neither was checked in any pass. |
| 2026-09-11 direct-upload `Content-Type` | fix | Worker/owner upload surface. Not checked against this panel's uploads. |
| 2026-09-11 chat `PUT` → `POST` | fix | `worker-chat-core.md` — not a guide this panel consumes. Nothing to do unless that changes. |
| 2026-09-10 upload-signature error shape | fix | Open. |
| 2026-09-10 non-Latin filenames | fix | Open. |

### 3.4 Intake pulled 2026-08-30 — read, not absorbed

Backend `08ab6d7 → f3a2334`. Three `affects: admin-panel` entries, in `Became false:` order. It is the
best write-up of these three; it is **not** everything outstanding — see 3.6.

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

### 3.5 New features, not migrations — sort keys and export columns

Several entries list **sort keys** and **export columns** among their changes. Neither can be absorbed,
because **neither surface exists anywhere in this app**:

- **No table sorts *server-side*.** No page sends `sortBy`/`dir`, and `DataTableColumn` is
  `{ label, className }` with no sort affordance. A `SortableTableHead` primitive **does** exist and the
  attendance screen uses it — but that sort is client-side over already-fetched rows
  (`useAttendanceTable` holds local `sortKey`/`sortDir`), which is not what a `sortBy` whitelist is for.
  So the primitive is reusable; the plumbing is what is missing.
- **No admin table exports.** Nothing calls any export route: no `?format=`, no `/export`. The only CSV
  in the app is the attendance screen's client-side one.

Each needs its own spec. Two rules to carry into them: the `sortBy` whitelist needs a **default branch**
(an unknown key must not fall through), and the export must be read **by header name, not column
position** — the owner export has gone 9 → 10 → 13 → 15 → 16 → 18 and the worker one
16 → 18 → 17 → 18-but-a-different-18 → 20 (it *shrank* once, and `register-merge` removed a 7th column,
shifting everything after it left by one), so an exact-column-count assertion has now broken five times.

### 3.6 The unread backlog — 27 entries, measured 2026-09-08

Counted at backend HEAD `fc20f9a` (2026-09-07) with an earlier version of the counter now in
`references/return-pass.md` (it used `d > since`; the current one uses `>=`, so a re-run counts
same-day entries too and will not reproduce 27 exactly):
**27** `affects: admin-panel` entries dated after `2026-08-12` — **13 breaking**, 11 additive, 2 fix,
1 removal. (An earlier estimate by inspection said ~19.) The breaking count is the one that matters: each
carries a `Became false:` quoting a sentence this app may have coded against.

Of the 27, one is absorbed (`f-06-c-checkin-proof.md`, [§4 2026-09-08](#2026-09-08--the-walk-in-order-form-could-not-file-an-order))
and the 09-07 `?status=Deleted` fix is partly done (3.2). The 2026-09-21 pass read 09-08 → 09-21 only,
so **this backlog is still open** — do not read a moved F-07 row as a finished backlog. Four entries
(F-05a, F-05b, F-05c, F-06a) named admin screens that did not exist here on 2026-09-08 — an **Agency
links** screen whose status filter is the dispute queue, and a **Skill Requests** queue. ⚠ Both have
been built since (`app/[locale]/dashboard/agency-links/page.tsx`, `d0404ee` 2026-09-09; the
`(worker)/skill-requests` page) — but against which guide revision is unverified, so their guides stay
`—` in §2 until a first-time read checks them.

Spot-checked, so the picture is genuinely mixed rather than uniformly stale:

- **Absorbed despite the column** — `owner-location-model` (2026-08-13/14): `useCountries`/`useCities` are
  wired and the owners filter bar has both pickers. ⚠ **Only half** — the pickers exist, but they send
  the pre-rename `companyCityId` (3.0).
- **Not absorbed** — last-seen recency (2026-08-13): `lastSeenAt` appears only in a doc comment at
  `components/ui/data-table/data-table.tsx:126`. Agency (F-05·0 through F-05c): only `lib/nav-items.ts`
  and `lib/http/files.ts` mention it. Worker availability (F-04b): only `components/detail/account-log.tsx`.

So the column is wrong in both directions and cannot be repaired by inspection. **Absorbing this backlog
needs its own pass**, entry by entry from 2026-08-13 downwards — and it overlaps the untracked guides in
§2, which is the natural way to split it.

---

## 4. Pass log — newest first

The record of what each pass **built**. What a pass read and did not build went to §3.

### 2026-09-24 — F-07 create forms and complaints

Backend `064ce64 → 38dd53d6` (127 commits). CHANGELOG reviewed through 2026-09-24.

| Entry | Half actioned | Where |
|---|---|---|
| F-07 ·7 | `instructions` required, `ownerProvidesTools` required with no default, optional `addOnNote` ≤ 2,000 — both forms | `lib/tasks/order.ts:143,146`; UI `components/tasks/order-extras-fields.tsx` (shared by both forms) |
| F-07 ·12 | one distinct date → `POST /api/tasks/admin/single` with `date`; two or more → `/admin/groups`; `task_date_in_past` refused client-side (UTC, as the server reads it) | `lib/tasks/order.ts:123,172`; `lib/services/task.service.ts:68` (`createAdminSingle`); `hooks/use-tasks.ts` (`useCreateTaskGroup` routes on `request.kind`) |
| F-07 ·9b | walk-in `cityId` (country + city selects, active rows only) | `lib/tasks/walk-in-order.ts:96`; `components/walk-in/walk-in-city-field.tsx` |
| F-07 ·10 | deadline ≤ start refused (the server refuses only equal; earlier is a night job that does not work — §0i·1) | `lib/tasks/order.ts:132` |
| F-07 ·5 | the decide door, complaint read, `Rejected` read in every day-state consumer, queue + page, `decide_the_complaint_first` on force-close | `lib/complaints/`, `hooks/use-complaints.ts`, `app/[locale]/dashboard/complaints/`, `lib/tasks/status-vocab.ts` |
| F-07 ·5 post-merge | admin `GET /api/tasks/{taskId}` for the complaint; `complaint: null` on lists honoured (queue reads per day) | `hooks/use-complaints.ts` (`useComplaintQueueRows`) |
| Bell `Task` rows | all ~15 kinds clickable: 79/81 → complaint page, the rest → `/dashboard/tasks/day/{id}` | `lib/notifications/route.ts` |
| — | `verify-v2.mjs` gates `POST /api/tasks/admin/single`, `CreateSingleTaskRequest`, and the four new `CreateTaskGroupRequest` fields | `scripts/verify-v2.mjs` |

What was live-broken before this pass, for the record: every admin create (·7 required fields), every
one-date order (`booking_needs_two_or_more_dates`), every walk-in order (`walkin_city_required`), and
every owner dispute (stranded in `Rejected` with no decide door; bell 79–83 `entityType: "Task"` routed
to `null`). When `rejected` was added, `canForceClose` stayed an allowlist and `decide_the_complaint_first`
(**400**) was mapped — it had been unreachable only **by accident**, because `status-vocab` did not know
`Rejected`. No hand-summed `days.*` totals were found, so `days.rejected` moving off 0 is safe.

### 2026-09-21 — F-07 ·0/·1/·3/·4 and the restore doors

Backend HEAD `064ce64`. CHANGELOG reviewed 2026-09-08 → 2026-09-21 in full; **only the F-07 entries and
the restore doors were actioned.** Plan: `docs/superpowers/plans/2026-09-21-admin-f07-integration.md`
(Tasks 1–7).

| Entry | Kind | What was done |
|---|---|---|
| 2026-09-21 F-07 ·3 | breaking | `closed` counts + `closureReason` modelled; force-close door built; the `204`-lies cancel reading; `completedAt` checked (one render site, no arithmetic — safe) |
| 2026-09-20 ·4 follow-ups | breaking | The bodiless-request problem-details trap is handled on every new door. The `rating` and `complete` halves are owner/worker surfaces — nothing here calls them. |
| 2026-09-19 F-07 ·4 | breaking | Supervisor override built; `supervisorWorkerId` / `workSummary` modelled and rendered |
| 2026-09-18 F-07 ·1 | breaking | `InReview` attendance read fixed — a live bug: a worker who never arrived on a handed-in day read `overdue` instead of `noshow` |
| 2026-09-17 F-07 ·0 | breaking | The two renamed day states, and `TaskGroupDto.status` → `days` |
| 2026-09-10 restore doors | fix | Both restore screens built |

### 2026-09-08 — the walk-in order form could not file an order

**What was broken.** `POST /api/tasks/admin/groups` against the Walk-in property returns
`400 walkin_location_required` unless the body carries `lat` and `long`. Shipped 2026-08-26 with F-06c
(`f-06-c-checkin-proof.md` §4); this app sent neither, so **every walk-in order was refused for
thirteen days** and nothing turned red — `verify-v2.mjs` did not gate this route.

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

⚠ Branch: made on **`feat/admin-tasks-register`** (an earlier note wrongly said
`feat/walk-in-job-management`), where `components/walk-in/` is already present.

### 2026-08-12 — guide table baseline

The guide table (§2) was first reviewed that day; `support-ticket-followup-fix`,
`task-cancel-lifecycle-guards` and `worker-doc-approved-delete-guard` were assumed, not re-verified.

---

## 5. Guide bugs to report upstream

Per precedence (**live response > guide > README/guidance**), a guide bug is an issue on
[esharqhq/Germany-ERP](https://github.com/esharqhq/Germany-ERP/issues), never a local workaround. Once
filed, record it in `BACKEND-ASKS.md` and delete it here.

### 5.1 `bossOwnerName` is missing from `f-02c-property-rework.md` — unreported, worth filing as is

`bossOwnerName` on `PropertyDto` exists only in `index/dtos/properties.md` (re-checked 2026-09-08; cite
the field, not the line — it moved from 156 to 179). `f-02c-property-rework.md` still shows a
`bossOwnerUserId`-only response and does not mention `bossOwnerName` anywhere.

### 5.2 An admin row filed under the owner route in `guidance.md` — unreported (found 2026-09-25)

`guidance.md` row **18 "Agency links screen + attach/confirm/reject on Worker Detail"** is admin-panel
content (two admin permissions, the dispute queue, the worker export), but it sits in the **§2 Owner
app** table (line 89), not §4. A client following its own section never sees it. Small, and worth
filing as is.

### 5.3 Revision dates that did not move — half-closed upstream, re-check before filing

**Original finding.** Four guides changed with client-visible, breaking content in the 2026-08-30 pull
and their `revision:` frontmatter **did not move**: `fnd-3-table-query.md` (still 2026-08-20),
`f-04b-worker-availability.md` (2026-08-19), `f-05-b-agency-portal.md` (2026-08-24),
`onboarding-and-active-gate.md` (2026-08-25). A stale `revision:` makes a breaking change invisible to
the catch-up loop.

**As of 2026-09-08**, `fnd-3-table-query.md` and `onboarding-and-active-gate.md` both carried
`revision: 2026-09-07`; `f-04b-worker-availability.md` (2026-08-19) and `f-05-b-agency-portal.md`
(2026-08-24) had not moved. **As of 2026-09-25** the catalog shows `f-04b` at **2026-09-16** and `f-05-b`
at **2026-09-20** — both have moved since, so this may now be fully closed.

**Do not file it as written** — it would report guides already fixed, and filing a closed bug costs the
credibility that makes the precedence rule work. Either re-verify that a specific guide took a
client-visible change after its stated date and file only that, or drop it.

---

## 6. Findings in this repo

### 6.1 `lib/http/on-forbidden.ts` does not exist (found 2026-09-08)

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

Not fixed on purpose: deciding between "write the interceptor" and "delete the claim" is a design call,
not a sweep. ⚠ Do not cite this file in a review or a spec.

### 6.2 Backend paths in code comments (fixed 2026-09-25)

Comments cited the backend as `../Backend/...` or `Backend/...` — a checkout path that does not exist on
this machine (the backend is `$env:GERMANY_ERP`). Swept to path-independent citations: a guide by file
name (`f-05-c-worker-agency-link.md §4.2`), an index file by its backend-relative path
(`index/dtos/notifications.md`). The plans and specs under `docs/superpowers/` still carry the old form;
they are historical and were left alone.
