# Backend contract revisions — what this panel is current against

`MY_APP` for this repo is **`admin-panel`**. Backend checkout: **`$env:GERMANY_ERP`**
(`D:\Victus\Projects\Backend\Germany ERP` — quote it, the path has a space). **Read it only from the
pushed `origin/main`** (`git show origin/main:<path>`): other agents work in that checkout, so its working
tree is not the contract. Never pull, checkout or write there.

This file is **data only**: watermarks, the per-guide table, open work, the pass log, and findings.
**The procedure lives in the `erp-backend-source` skill** (`.claude/skills/erp-backend-source/` in
this repo) — `SKILL.md` for the rules, `references/first-time.md` for a guide never absorbed,
`references/return-pass.md` for the catch-up pass. Two copies of a procedure is the same mistake as two
copies of a contract; where this file and the skill differ, the skill is right.

**Contents:** [1 Watermarks](#1-watermarks) · [2 Guides](#2-guides-this-panel-consumes) ·
[3 Open work](#3-open-work--the-backend-task-list) · [4 Pass log](#4-pass-log--newest-first) ·
[5 Guide bugs to report upstream](#5-guide-bugs-to-report-upstream) ·
[6 Findings in this repo](#6-findings-in-this-repo)

---

## 1. Watermarks

⚠ **`CHANGELOG reviewed through` and `Actioned through` are two different claims.** Collapsing them is
what makes the *next* pass narrow its own delta until a breaking entry is never re-read. Move each one
only for what it says.

| | |
|---|---|
| **Last full pass** | **2026-09-25 — full audit**, every admin-panel guide and every CHANGELOG entry naming one, read at `origin/main` **`692bd26`** ([§4](#2026-09-25--full-audit-of-every-admin-panel-guide)) |
| **CHANGELOG reviewed through** | **2026-09-25** — the rating-card entry (read and actioned, [§4](#2026-09-26--rating-card-the-change-result-button-is-state-guarded)); nothing newer at `9de945d9` |
| **Actioned through** | **Per guide, in §2.** A single date would lie: ten guides are fully absorbed (as of 2026-09-25, after WP0–WP2), the rest carry open packages in §3. |
| **Oldest `Absorbed to`** | **2026-07-01** (`support-ticket-followup-fix`, `worker-doc-approved-delete-guard` — both verified, nothing to build). A return pass starts reading the CHANGELOG here. |
| **Deployed?** | Yes. The live swagger (`api.uyer.app`, 2026-09-25) matches the guides: `GET /api/admin/owners` takes `CityId`/`CountryId` (no `companyCityId`); `OwnerRowDto` has no `companyCity`; `OwnerCompanyDto` has no city/country names; `AccountStatusFilter` = `Active,Pending,Deleted,Lapsed,Blocked`. ⚠ Swagger's `required` is empty for the whole schema — required-ness comes from source, not swagger. |
| **Last HEAD check** | 2026-09-26, `origin/main` `9de945d9`. One commit touching `docs/handoff` or `index/` since `692bd26`: `bbf30cb8`, the rating card (both folders). |
| **`verify-v2.mjs`** | ✅ **0 FAIL / 116 PASS (2026-09-25, swagger-only, after WP0–WP2).** It was 5 FAIL / 96 PASS before WP0: three were the script's own stale expectations, two were real app bugs (fixed in WP2). The logged-in half needs `ERP_ADMIN_EMAIL`/`ERP_ADMIN_PASSWORD` (WP10). |

---

## 2. Guides this panel consumes

Every guide whose `Consumers:` in `docs/handoff/README.md` → *How they relate* names `admin-panel`
(superseded stubs excluded). Two dates per row, and confusing them defeats the point of this file:

- **Revision** — the date the *guide* carries upstream. Copied from the catalog; refreshing it is safe.
- **Absorbed to** — the date *we* are current to. Moves **only** when every admin-panel obligation up to
  that date is built or checked to need nothing. **`—`** means never absorbed.

**`State`** is the 2026-09-25 audit verdict: ✅ absorbed · ⚠ open work (packages in §3) · ❌ an
`Absorbed to` claim the audit found **false** — the date is kept so the history stays readable, but the
guide is not current to it. Every row was audited; `—` no longer means "never read".
`Shape` matters: an **extension** omits auth and the scope gate — read the guide it extends first.

| Guide | Shape | Revision | Absorbed to | State | Open packages / note |
|---|---|---|---|---|---|
| `task-lifecycle.md` | companion set | 2026-09-25 | 2026-09-21 | ⚠ | WP6, WP11, WP10. The ·0 day-state rename was completed 2026-09-25 (WP1, §4). One living document for all thirteen F-07 slices; read its delta through CHANGELOG entries, never its own diff. §2 `canJoin`, §3 browse, §4 join, §5 drop are worker-app only. |
| `task-cancel-lifecycle-guards.md` | companion set | 2026-09-22 | 2026-07-01 | ⚠ | WP6 (group-cancel 409s unhandled). The `204` re-fetch is verified. |
| `notification-bell.md` | companion set | 2026-09-22 | 2026-08-05 | ❌ | **WP3** — the 08-05 core rule (upsert by `id`) was never met. |
| `f-02b-6-default-owner-walk-in-orders.md` | companion set | 2026-09-24 | 2026-08-12 | ⚠ | WP11 (clone). Everything else in the order form is verified. |
| `f-02a-1-admin-task-list-filters.md` | standalone | 2026-09-17 | 2026-08-10 | ⚠ | WP9 (no 500/5,000 cap signal). `scheduledFrom`/`scheduledTo`/`status` **are** sent; only `propertyId` and repeatable `status` are unbuilt (no consumer needs them). |
| `f-06-c-checkin-proof.md` | companion set | 2026-09-23 | 2026-09-08 | ⚠ | WP6 (property dialogs skip problem-details — minor). Nothing can read a filed order's coordinates back — §4.2, upstream gap. |
| `f-02c-property-rework.md` | companion set | 2026-09-23 | 2026-08-07 | ⚠ | **WP12** (09-23 ·9b property `countryId`/`cityId`). |
| `fnd-1-configurable-lookups.md` | companion set | 2026-09-23 | 2026-08-07 | ❌ | WP15 — Country/City admin CRUD (in the guide since 08-03) was never built. Category CRUD verified. |
| `fnd-3-table-query.md` | companion set | 2026-09-18 | 2026-08-12 | ⚠ | WP13 (block), WP14 (owner last-seen + sort), WP18 (exports). Owner city/country filter + column fixed 2026-09-25 (WP2, §4). Worker table: every filter and six sort keys verified. |
| `f-02-4-owner-table-filters.md` | companion set | 2026-09-07 | 2026-08-12 | ⚠ | WP14 (sort), WP18 (export). The city filter, column and hint were fixed 2026-09-25 (WP2, §4). lastOrdered/neverOrdered/taskCount verified. |
| `owner-location-model.md` | companion set | 2026-09-23 | — | ⚠ | **WP2 remainder** (admin location edit). Filter, columns and KYC address fixed 2026-09-25 (§4). |
| `f-02b-7-admin-owner-edit.md` | companion set | 2026-09-08 | **2026-09-08** | ✅ | Name lock, reason, codes, SUPER_ADMIN gates verified. Its location fields belong to `owner-location-model` (WP2). |
| `onboarding-and-active-gate.md` | companion set | 2026-09-24 | 2026-08-11 | ⚠ | WP6 (doc reject ≥ 3 chars), WP9 (KYC picker cap), WP11 (clone). `registrationAddress` and `RepresentativeAuthorization` fixed 2026-09-25 (§4). `prefill.legalName` is N/A (PDF authoring). |
| `f-04a-worker-location.md` | companion set | 2026-09-23 | — | ⚠ | WP13 (admin edit form, location on detail). Filters and row names verified. |
| `f-04b-worker-availability.md` | companion set | 2026-09-16 | — | ⚠ | WP13 (the five writes, reset, Worker Detail). Read-only matrix view verified. |
| `f-04c-username-at-setup.md` | companion set | 2026-08-19 | — | ⚠ | WP13 (username on detail). |
| `register-merge.md` | companion set | 2026-09-08 | **2026-09-08** | ✅ | `employeeType`/`address` removed, rows keyed on id. Export half N/A (no export). |
| `deleted-account-email-release.md` | companion set | 2026-09-08 | 2026-09-21 | ✅ | ⚠ **Revision older than absorption on purpose:** the restore doors shipped 2026-09-10 as `Kind: fix` without a Revision bump — watching Revisions alone would never have surfaced them. Both built and gated. |
| `worker-doc-approved-delete-guard.md` | standalone | 2026-07-01 | 2026-07-01 | ✅ | Verified (was "assumed"): the bell row is non-navigable. |
| `f-05-0-agency-user-type.md` | companion set | 2026-09-08 | **2026-09-08** | ✅ | Base of the three extensions below. |
| `f-05-a-application-review.md` | extension of `f-05-0` | 2026-09-10 | — | ⚠ | WP16 (expired PDF preview), WP6 (upload refusal codes), WP10 (both reason fields). |
| `f-05-b-agency-portal.md` | extension of `f-05-0` | 2026-09-20 | **2026-09-20** | ✅ | Both admin levers (confirm before PUT ends access; reject warns of portal loss). |
| `f-05-c-worker-agency-link.md` | extension of `f-05-0` | 2026-09-04 | **2026-09-04** | ✅ | Dispute queue, overrule, mutual exclusion, reject-then-attach, detail block. |
| `profession-fnd1-retrofit.md` | companion set | 2026-09-23 | **2026-09-23** | ✅ | `nameEn`/`nameDe`, deactivate-only, `includeInactive`, GENERAL guard. |
| `f-06-a-skills-request.md` | companion set | 2026-09-04 | — | ⚠ | WP17 (certificate preview), WP9 (history cap), WP10 (`history.rating` null). |
| `contract-lifecycle.md` | companion set | 2026-09-04 | 2026-08-11 | ⚠ | **WP7** (terms read-back, clearing, write gates). |
| `f-03-1-structured-document-data.md` | companion set | 2026-09-04 | **2026-09-04** | ✅ | §7 verified by the audit; its last open item, the shared 09-01 `RepresentativeAuthorization` label, was fixed 2026-09-25 (§4). |
| `f-01-a-broadcast-core.md` | companion set | 2026-08-31 | — | ⚠ | **WP8** (send-now polling, unknown-status crash, selection errors). |
| `fnd-2-admin-initiated-ticket.md` | standalone | 2026-08-03 | 2026-08-03 | ❌ | **WP5** — `[Idempotent]` door called without the key. |
| `support-ticket-followup-fix.md` | standalone | 2026-07-01 | 2026-07-01 | ✅ | Verified: no client change required. |

Deliberately absent — their `Consumers:` do not include `admin-panel`: the four `worker-chat*` guides,
`admin-assigned-group-visibility.md` and `f-06-b-skill-based-task-visibility.md`. `f-04d-completeness-gate.md`,
`who-builds-what.md` and `worker-chat.md` are superseded stubs. Surfaces with **no guide** (admin users,
roles, permissions, audit log, `me/permissions`) are checked against `index/` — WP4, WP5.

---

## 3. Open work — the backend task list

**Everything the 2026-09-25 audit found open lives here, and only here**, grouped into packages by the
files they touch. When a package is built, move it to §4 as a pass and move its guides' `Absorbed to`.

### How the order was chosen (backend-derived)

1. **WP0 first** — it is the regression gate every later package is verified by. ✅ Green since 2026-09-25.
2. **Live now, silent** — wrong today and nothing tells the admin (WP1–WP5).
3. **Live now, loud or data-losing** — a visible error or a write that loses data (WP6, WP7).
4. **Latent** — breaks only on a future backend change or a rare race (WP8).
5. **Silent truncation** (WP9) and **built but unproven live** (WP10, needs a session).
6. **Shipped contract not yet built** (WP11–WP17), then **new features** (WP18).

Status words: BROKEN · PARTIAL · MISSING · NEEDS-LIVE. Evidence is `file:line` at audit time.

**WP0, WP1 and WP2 (except the edit form below) were built 2026-09-25 — see [§4](#2026-09-25--contract-gate-and-two-live-breaks-wp0wp2).**

### WP0 remainder — contract-gate coverage (ongoing)

`scripts/verify-v2.mjs` is green, but it still does not gate: admin users/roles/permissions/audit-log/
me-permissions, broadcasts, agencies + applications + links, skill requests, professions, support tickets,
clone, and `kind`/`cityId` on the task DTOs. Add each one's routes and fields as its package lands.

### WP1/WP2 follow-ups — from the 2026-09-25 final review (minor, deferred)

- `lib/workers/matrix.ts:159` `DEAD_TASK = {"cancelled","completed"}` — `completed` is not a task state,
  so a **Done** day is never treated as dead in the workers matrix. Pre-existing; the last wrong-word
  comparison found. Use `canonicalTaskStatus`.
- `hooks/use-worker-shifts.ts:181-185`: a past day in an **unknown** state with no check-in reads
  *missed* (a no-show on a word the panel does not know). Return `"scheduled"` for `null`.
- `lib/types/task.types.ts:5-10` `TaskItemStatusName` still lists `Active`/`Review` (unused) — update or delete.
- A bookmarked Owners URL with `?companyCityId=` keeps the dead key in the address; map it to `cityId` on
  load and drop it.
- Owners Location cell: a country with no city renders "—" over the country; render the country alone.
- `scripts/verify-v2.mjs` "gone" list for `OwnerCompanyDto` omits `cityNameDe`/`countryNameDe`.
- `facts-rail.tsx`: "Registered in" + a street address reads better as "Registered address".

### WP2 remainder — Owner location edit · `owner-location-model` §3

MISSING: admin owner location edit on `PUT /api/owners/{id}` (`countryId`/`cityId`, pickers
pre-selected, `city_country_mismatch`/`country_not_found`/`city_not_found`) — `lib/owners/detail-actions.ts:31-35`.
A new form section; needs its own design.

### WP3 — Notification bell · ✅ done 2026-09-26 ([§4](#2026-09-26--wp3-the-bell-upserts-by-id-dedupes-pages-and-can-delete))

- ✅ Upsert by `id`, count only a real unread change; pages deduped by `id`; `DELETE /api/notifications/{id}` wired.
- ⚠ `lib/notifications/route.ts` branches on `type`, not only `entityType`; 82/83 routing is NEEDS-LIVE (WP10).

### WP4 — Audit log · ✅ done 2026-09-26 ([§4](#2026-09-26--wp4-the-audit-log-filters-on-the-server))

- ✅ `?action=` (C# member name) and a date range sent to the server; capped answers say so; dead `PROPERTY_DOCS_*`
  options removed.

### WP5 — Write safety: idempotency and retry · ✅ done 2026-09-26 ([§4](#2026-09-26--wp5-one-idempotency-key-per-user-intent))

- ✅ One key per intent on every `[Idempotent]` door the panel calls, except group cancel (204, see §4).
- Nothing re-reads after a `500` before a retry — a held key replays a cached 2xx, but a write that committed and then
  answered 500 is not cached and would run again (backend limit, filed).

### WP6 — Errors that are swallowed or generic · live, silent/loud

- **Silent:** per-worker rating `409 task_worker_not_completed` — `app/[locale]/dashboard/tasks/[id]/page.tsx:557-560`
  has `onSuccess` only. Group-cancel 409s — `page.tsx:522-529` (race only).
- **Generic:** `worker_already_assigned_to_task` (09-16 one-day join) missing from `lib/tasks/assign-errors.ts:8-41`;
  upload refusals `raw_body_expected` / `invalid_or_expired_signature` / `unsafe_storage_key` (09-10);
  property dialogs never call `getValidationMessage`, and `city_required` / `country_inactive` are unmapped
  (`lib/onboarding/errors.ts:82-83,156`); 15 callers read only `getApiErrorCode` (settings/professions,
  property-categories, admins, presets, `property-actions.tsx:34`, `leave-decision-pane.tsx:105`,
  `ticket-detail-pane.tsx:155`, …).
- Worker doc reject allows 1–2 characters; the server needs ≥ 3 (`reject-dialog.tsx:61,86`).

### WP7 — Contract edit · live, data loss · `contract-lifecycle` 09-03

- The edit form **starts blank** (`components/docs-workspace/contract-panel.tsx:50-57` `EMPTY`; summary has
  no terms `:34-45`) instead of the stored `generalTerms`/`extraClauses` — render them as form fields.
- Three-state PUT: `""` (clear) is never sent (`owner-documents/[ownerProfileId]/page.tsx:244-245`), so an
  admin cannot clear a term.
- Save / send / recall / renew are **not permission-gated** (only the read is, `use-contracts.ts:79`).
- NEEDS-LIVE: draft edit without a new file sends `fileUrl:""`/`fileName:""` (`page.tsx:238,242`);
  `file_not_found` unmapped.

### WP8 — Broadcasts · latent crash + silent · `f-01-a`

- **Latent crash:** `components/broadcasts/broadcast-detail-rail.tsx:84` switch has five cases and no
  default → `rows` undefined → `rows.map` (`:185`) throws on any new status.
  `broadcast-detail-header.tsx:90`, `broadcast-detail-panels.tsx:149` have no default either.
- **Silent:** send-now sits at `Scheduled` — `hooks/use-broadcasts.ts:40-41` polls only while `Sending`.
- Selection errors (`selection_required`/`too_large`/`recipient_unknown`/`not_allowed`) fall to generic and
  `detail` is never shown (`compose-form.tsx:305-318`); preview maps only `too_large`.

### WP9 — Silent truncation

- Skill-request history: 100 rows per status (`hooks/use-skill-requests.ts:399`; `BACKEND-ASKS.md` #35).
- KYC owner picker capped at 100 with no signal (`lib/services/owner.service.ts:28-36`).
- Deleted-accounts bucket: one page of 100, no signal; null `deletedBy` renders "—" not "unknown"
  (`deleted-accounts-table.tsx:162-165`).
- Admin task list: nothing warns at exactly 500 / 5,000 rows (`f-02a-1` §8).
- Audit log 200 — WP4.

### WP10 — Prove it live (needs an admin session)

Built to the guide, never exercised against production:
- Both create routes (`/admin/single`, `/admin/groups`) with one real order each; the complaint decide door.
- Bell kinds 82/83 carry `entityType: "Task"`; `GET /api/admin/me/permissions` returns the code strings the
  gates compare (app-wide).
- `f-06-a` `history.rating` can be `null` → `worker-panel.tsx:66` `.toFixed` would throw.
- `f-05-a` `review-history.tsx` renders both `infoRequestNote` and `decisionReason`.
- `/api/admin/conversations` excludes worker Contact/Group chat (guidance §5).
- Weekly work card on a sub-account owner: `200 []` shown as "none" (`weekly-work-card.tsx:120`).

### WP11 — F-07 remainder · `task-lifecycle`, `f-02b-6` · ✅ done 2026-09-26

- ✅ BUILT 2026-09-26: **clone** `POST /api/tasks/admin/groups/{id}/clone` — booking page + walk-in sheet ([§4](#2026-09-26--f-07-10-copy-as-new-order)).
- ✅ BUILT 2026-09-26: `kind` label — booking header + walk-in sheet ([§4](#2026-09-26--wp11-an-order-shows-what-it-carries)).
- ✅ BUILT 2026-09-26: `ownerProvidesTools` (null → "Not specified") and `addOnNote` read back ([§4](#2026-09-26--wp11-an-order-shows-what-it-carries)). Walk-in city name **not** shown: no lookup resolves one city by id and the order carries no `countryId`.
- ✅ BUILT 2026-09-26: `closed` counts on the booking page ([§4](#2026-09-26--wp11-an-order-shows-what-it-carries)).
- ✅ BUILT 2026-09-26: team rating `PUT /api/tasks/{taskId}/rating` — "Rate the team" on a Done day ([§4](#2026-09-26--f-07-4-rate-the-whole-team)).
- ✅ BUILT 2026-09-26: the critical staffing list, `?staffing=Warning|Critical` — home-page card ([§4](#2026-09-26--f-07-8-the-short-handed-card-and-the-staffing-rungs-in-the-bell)).

### WP12 — Property location · `f-02c` §4.1a, 09-23 ·9b

✅ BUILT 2026-09-26 ([§4](#2026-09-26--f-07-9b-property-country-and-city)): optional `countryId`/`cityId` on property
create/edit, `PropertyDto.country`/`city` on the detail page, the six location codes mapped.

### WP13 — Worker Detail completion · `f-04a`, `f-04b`, `f-04c`, `fnd-3`

- MISSING: admin worker edit `PUT /api/admin/workers/{id}` (SUPER_ADMIN, `reason` mandatory, both ids when
  the country changes; `worker.service.ts:12-82` has no PUT) and location on detail (`WorkerDetailDto`
  `worker.types.ts:224-261`).
- MISSING: availability writes — base, day, day reset (`DELETE` with `{reason}` body), exception PUT/DELETE;
  `source` badge and reset on Worker Detail; error mapping. Read-only matrix exists (`matrix-row.tsx`).
- MISSING: `username` read-only on detail (`f-04c` §6).
- MISSING: block/unblock (`worker:block` 80046, SUPER_ADMIN, reason both ways; `blockedAt`/`blockedReason`).
- PARTIAL: Worker Detail → Tickets filters by requester client-side (`use-subject-tickets.ts:45-54`) —
  send `?requesterUserId=` (08-27); the comment at `:26-30` calling it an open ask is stale.
- Copy: `messages/en.json:940` "it does not gate" misleads since 09-16 — the filter still recommends, but
  availability now gates worker joins. `availability.types.ts:9-13` comment false since 09-16.

### WP14 — Owners table completion · `fnd-3`, `f-02-4`

MISSING: owner `lastSeenFrom`/`lastSeenTo`/`neverLoggedIn` + `lastSeenAt`/`lastLoginAt` columns
(`owner.types.ts:85` still says "no login-recency data"); owner server sort, seven keys — reuse
`lib/ui/server-sort.ts` (default branch already there).

### WP15 — Country/City management · `fnd-1` §6.3-6.5

MISSING: admin CRUD for countries and cities (`lib/services/lookup.service.ts:61-77` is read-only).

### WP16 — Document previews · `f-05-a` §6.2

PARTIAL: an expired `previewUrl` (~5 min) in a PDF iframe shows the browser's error with no reload
(`components/docs-workspace/detail/file-viewer.tsx:238-249`; images already detect it at `:230`). Shared
by every document viewer.

### WP17 — Smaller shipped surfaces

- `f-06-a` §8: certificate preview on the skill claim (`claim-panel.tsx:20` deliberately unrendered).
- 08-27 F-06 tail: edit-required-skills control on a booking (disable once a day leaves `Pending`,
  `task_group_eligibility_frozen`) — no group PUT exists in this app.
- Render fallbacks: `signatureMethod` is a closed type with no i18n fallback (`contract.types.ts:49`,
  `contract-panel.tsx:329`); a property whose owner was deleted shows blank initials (`properties/page.tsx:351`).

### WP18 — New features (need a spec each)

- **Exports** for the Owners and Workers tables — nothing calls an export route; the workers button is
  disabled and not permission-gated (`workers/page.tsx:574`). Read **by header name, never position**: the
  owner export went 9 → 10 → 13 → 15 → 16 → 18, the worker one 16 → 18 → 17 → 18-but-different → 20.
- Contract registry with `partyLegalName` (render nothing when null) — `lib/contracts/registry-row.ts:53,73`.
- The five new `KycProfileSummaryDto` fields (09-08) — a product decision.

---

## 4. Pass log — newest first

The record of what each pass **built** or **established**. What a pass read and did not build is in §3.

### 2026-09-26 — WP4: the audit log filters on the server

`GET /api/admin/audit-log` (newest first, capped at 200, no total). Filtering the newest 200 in the browser made an
older action read "no entries".

| What changed | Where |
|---|---|
| `toActionMember` (UPPER_SNAKE → the C# member name the route takes; `KYC_APPROVED` is a problem-details 400), `buildAuditQuery` (local day bounds → ISO; `toUtc` is the last millisecond — the server compares `CreatedAt <= toUtc`), `isCapped`, the offered list checked against a frozen copy of the 88 members; `auditErrorKey` | `lib/audit/filters.ts`, `errors.ts` (+ tests) |
| Action select and a new date range are server params; a capped answer says "showing the newest 200 — narrow by action or date"; filtered-empty vs never-any are worded apart; validation / forbidden / error states (a 403 used to read "no activity"); `PROPERTY_DOCS_*` no longer offered (labels kept for history rows) | `settings/audit/page.tsx` |
| Gate: `action`, `fromUtc`, `toUtc` on the route | `scripts/verify-v2.mjs` |

Client-side text search still searches only the returned rows (placeholder says so). Not checked in a browser (the
extension was disconnected).

### 2026-09-26 — WP5: one idempotency key per user intent

CLAUDE.md → Idempotency; `IdempotentAttribute.cs` (caches a 2xx `ObjectResult` per user + key).

| Door | Before | Now |
|---|---|---|
| `POST /api/support-tickets/admin/for-user` | no key | key per Message-dialog draft (owner + worker actions) |
| `POST /api/admin/users/{id}/role` | fresh key per call | held across the whole save, scoped by role code |
| `POST /api/admin/users/{id}/deactivate` | no key | scoped by admin id (list + detail) — ⚠ answers 204, which the attribute never caches |
| `POST /api/admin/roles` | fresh key per call | presets: per form; custom-role flows: scoped by name + permission set, held until the whole create→assign flow succeeds, so a failed second step replays the role instead of orphaning it |
| `POST /api/admin/properties` | fresh key per call | per create dialog (properties page, owner actions) |
| `PUT /api/system/settings` | no key | scoped by the body |
| broadcasts create, skill-request approve | silent per-call fallback | key parameter required (callers already held one) |

`holdKey(ref, scope)` in `lib/http/idempotency.ts` (+ tests); the services take `idempotencyKey`; two readers of
`mutation.variables` moved to `.variables.body`. Still open: `POST /api/tasks/admin/groups/{id}/cancel` sends no key
(also a 204). Backend limits filed in `BACKEND-ASKS.md` (2026-09-26): 204s are never cached, and there is no lock, so
a truly concurrent double-click can still write twice — the disabled-while-pending buttons are what stop that. Not
checked in a browser (the extension was disconnected).

### 2026-09-26 — WP3: the bell upserts by id, dedupes pages, and can delete

`notification-bell.md` §10–§11.

| What changed | Where |
|---|---|
| `upsertNotification` (a known id is replaced **where it stands** — §11.1 keeps `createdAt`; the unread count moves only when the unread state does), `dedupePages` (§11.4), `removeNotification`; `isAlreadyGone` (bodyless 404, §11.5/§11.6) | `lib/notifications/cache.ts`, `notification-errors.ts` (+ tests, + a `QueryClient` hook test) |
| Socket handler upserts instead of prepending (+1 on every event made the badge drift and duplicated rewritten rows); the list dedupes through `select`; the count refetches on every focus (§11.2) | `hooks/use-notifications.ts`, `providers/notification-provider.tsx` |
| `DELETE /api/notifications/{id}` wired: a delete button per row on the notifications page, optimistic, 404 = already gone, rollback on a real error; the list is re-read after a delete so a 19-row last page does not hide "Load more" | `notifications/page.tsx`, `use-notifications.ts` |

Not in the bell dropdown (a button inside a base-ui menu item breaks its keyboard handling). Known gap: a rewrite of a
row not yet paged in looks new and over-counts by one until the next count refetch. Not checked in a browser (the
extension was disconnected).

### 2026-09-26 — WP11: an order shows what it carries

`TaskGroupDto.kind` (·12), `ownerProvidesTools` / `addOnNote` (·7), `closed` (·3/·5).

| What changed | Where |
|---|---|
| `toolsAnswerKey` (`null`/absent → `unspecified`, never "no"), `kindKey` (unknown → null, printed verbatim), `closureTally` (four reasons in fixed order, zeros kept, `unexplained = done − sum` = days closed before 2026-09-21) | `lib/tasks/order-facts.ts` (+ 12 tests) |
| Booking page: kind as muted text beside the days badge (that badge is the row's one badge), "Cleaning tools" row, add-on note when present, a "Closed as" caption row with counts (captions, not `SummaryStrip`: it truncates the reason labels and offers a narrowing there is nothing to narrow) | `tasks/[id]/page.tsx` |
| Walk-in sheet: order type, tools, add-on note | `walk-in-order-sheet.tsx` |
| Gate: `kind`, `addOnNote` on `TaskGroupDto` | `scripts/verify-v2.mjs` |

Checked in the browser (booking page). Walk-in city name skipped — see WP11.

### 2026-09-26 — F-07 ·4: rate the whole team

`task-lifecycle.md` §0c·8. `PUT /api/tasks/{taskId}/rating` (`task_worker:rate_any`) scores every **Completed**
worker, overwriting each one's star; not atomic.

| What changed | Where |
|---|---|
| `teamRatingTargets`, `canRateTeam` (a `done` day with ≥1 Completed worker), `ratingErrorKey` (shared with the per-worker route, whose codes are a subset) | `lib/tasks/team-rating.ts` (+ 12 tests) |
| `rateTeam` + `useRateTeam` — refreshes the booking and each worker's cached rating on **settle**, since a failure part-way leaves some scored | `task.service.ts`, `use-tasks.ts` |
| "Rate the team" in each Done day card; dialog names the Completed workers, says it replaces their scores and skips no-shows/removed; per-worker star dialog gained an error line (it swallowed errors) | `rate-team-dialog.tsx`, `rate-worker-dialog.tsx`, `tasks/[id]/page.tsx` |
| Star colour: raw amber → `status-pending` token (booking table, dialogs, home Top workers) | same + `dashboard/page.tsx` |
| Gate: the route | `scripts/verify-v2.mjs` |

Checked in the browser (button only on the Completed day, dialog); no score was sent.

### 2026-09-26 — audit log: each entry says what it is about (F-07 ·9a/·9b/·10 metadata)

`GET /api/admin/audit-log` — `metadata` is a JSON **string** (`"{}"` when empty), parsed defensively.

| What changed | Where |
|---|---|
| `parseAuditMetadata` (plain objects only), `auditDetails`: 113 `WorkerTaskAssigned` → one warning chip for `overrodeAvailability`/`overrodeLocation` (only when `true`; one badge per row), the day, "Open day"; 65 `TaskGroupCreatedByAdmin` → "Open order" and, when `clonedFromTaskGroupId` is set (it is on every 65 row, `null` if not a clone), "Copied from order" | `lib/audit/metadata.ts` (+ 17 tests) |
| Row second line: `targetEntity` + short `targetId` in mono, then the facts; search also matches `targetId`; the two actions added to the filter; `TONE_STYLES` moved from raw emerald/amber to status tokens | `settings/audit/page.tsx` |
| Gate: `AuditLogEntryDto` | `scripts/verify-v2.mjs` |

Checked in the browser. No 113 row is inside the 200-row window, so the override chip was not seen on real data —
that window is WP4, still open.

### 2026-09-26 — F-07 ·2: how each worker checked in

No guide section and no CHANGELOG entry (filed, `BACKEND-ASKS.md` 2026-09-24 item 2); read from C#
(`TaskEnums.cs:132-142`, `TaskDtos.cs:519`, `AttendanceRowDto.cs:79`). `checkinDoor` is PascalCase on the wire
(`WorkerTapped` · `WorkerScannedDisplay` · `OwnerScannedWorker` · null) — `index/` spells it `WORKER_TAPPED`, which
is wrong for a client.

| What changed | Where |
|---|---|
| `checkinDoorKind` (unknown → null, never crashes), `coordsAreScanners` | `lib/attendance/checkin-door.ts` (+ tests) |
| `CheckinDoorLabel` — a muted caption with a Lucide icon, not a badge (a method, not a status); nothing for null, which means "never checked in" **or** "before 2026-09-22" | `components/attendance/checkin-door-label.tsx` |
| Shown in the attendance cell (+ the map pin says the location is the scanner's phone on a staff scan), detail sheet field + coordinates caveat + timeline, mobile cards, CSV column, booking `WorkersTable`, complaint team card | `components/attendance/*`, `attendance/page.tsx`, `tasks/[id]/page.tsx`, `complaint-team-card.tsx` |
| Types + gate (`TaskWorkerDto.checkinDoor`) | `attendance.types.ts`, `task.types.ts`, `scripts/verify-v2.mjs` |

Also fixed on the way: the attendance forbidden panel's link-button lacked `nativeButton={false}` (Base UI
console error). Checked in the browser; every row in the data predates the field, so the caption itself was not
seen on real data.

### 2026-09-26 — F-07 ·9b: property country and city

`f-02c-property-rework.md` §4.1a; CHANGELOG 2026-09-23 (·9b). Create `POST /api/admin/properties`, edit
`PUT /api/properties/{id}` (the admin has no edit route of its own).

| What changed | Where |
|---|---|
| `buildCreateLocation` (both blank → neither sent, server defaults to the BOSS's pair; country without city refused), `buildEditLocation` (unchanged → neither sent, so a city deactivated since keeps; blanking a stored pair refused — an omitted pair means "keep"), `propertyLocationErrorKey` worded by whether a pair was sent | `lib/properties/location-fields.ts` (+ 23 tests) |
| Shared `CountryCityField` (labels/hint props, `keep` for a deactivated stored pair, optional clear); walk-in field is now a thin wrapper, unchanged for its callers | `components/location/country-city-field.tsx`, `walk-in-city-field.tsx` |
| Create/edit dialogs; the three create/edit error mappers learn the codes (edit's also problem-details + empty 403, which it lacked) | `property-create-dialog.tsx`, `property-edit-dialog.tsx`, `properties/page.tsx`, `owner-actions.tsx`, `property-actions.tsx` |
| Detail page address line: "address · City, Country" (DS has four fact tiles — no fifth) | `property-identity.tsx` |
| Types (`LocationRefDto`, `bossOwnerName`) and the gate | `property.types.ts`, `scripts/verify-v2.mjs` |

Checked in the browser (detail page, edit dialog prefilled); nothing saved. Left open: the walk-in placeholder
property's edit dialog still offers the picker (§4.1a says it stays city-less; nothing says `PUT` refuses one);
`createAdminProperty` mints a key per request, not per intent (WP5).

### 2026-09-26 — F-07 ·10: copy as new order

`task-lifecycle.md` §0i. `POST /api/tasks/admin/groups/{id}/clone` (`task_group:create_any`, `[Idempotent]`).

| What changed | Where |
|---|---|
| `buildCloneOrder` — dates required, UTC past-start (shared `startsAtOrBefore`), a changed deadline must follow the start, an untouched copied one the new start passes is omitted (server falls back to 8 h, said in the dialog); gap-fill `title`/`instructions`/`ownerProvidesTools` sent **only** when the source lacks them and then required; walk-in `cityId` required when the source has none; `lat`/`long` as a pair. `classifyCloneError` maps the 16 codes | `lib/tasks/clone-order.ts` (+ 45 tests) |
| `cloneAdminGroup` + `useCloneTaskGroup` (key per clone intent, cleared on success) | `lib/services/task.service.ts`, `hooks/use-tasks.ts` |
| Dialog: read-only "copying from" summary, dates, times, "missing on the original" answers, walk-in city/address, "cannot be edited afterwards" warning | `components/tasks/clone-order-dialog.tsx` |
| Entry points, any state: booking header (walk-in told apart by `cityId` or the walk-in owner id; hidden while unknown), walk-in sheet footer | `tasks/[id]/page.tsx`, `walk-in-order-sheet.tsx` |
| Gate: the route and `CloneTaskGroupRequest` fields | `scripts/verify-v2.mjs` |

⚠ The admin cannot edit the clone afterwards — `PUT /api/tasks/groups/{id}` is owner-only; filed in
`BACKEND-ASKS.md` (2026-09-26). Checked in the browser (dialog and both entry points); no clone was submitted.

### 2026-09-26 — F-07 ·8: the short-handed card and the staffing rungs in the bell

CHANGELOG 2026-09-22 (·8, `affects: [admin-panel, owner-app]`, breaking). Kind 19 was never switched on here,
so nothing went silent; 82/83 were already clickable (·5 bell routing → the day's booking).

| What changed | Where |
|---|---|
| `staffingAlert(warning, critical, limit)` — counts from the two server answers, soonest first, a critical row the 24 h answer lacks is merged in (the reads are not atomic) | `lib/tasks/staffing-alert.ts` (+ test) |
| `getStaffingList(level)` + `useStaffingList` — key `["admin-tasks","staffing",level]`, so `invalidateTasks` reaches it; refetch every 60 s | `lib/services/task.service.ts`, `hooks/use-staffing.ts` |
| Home card: under-6 h and 6–24 h counts (a band, not the nested total — side by side the nested pair reads as additive), five soonest rows → the booking, and a "See all on Dispatch" link shown only with `task:assign_worker_any`. Gated on `task:list_any` alone (shown even without analytics permission) | `components/dashboard/staffing-alert-card.tsx`, `dashboard/page.tsx` — in the slot of the removed "Revenue — coming soon" placeholder, beside Top workers |
| Bell + notifications page: 83 critical, 82 and retired 19 warning — `notificationTone` | `lib/notifications/tone.ts` (+ test), `components/layout/notification-tone-mark.tsx` |
| Gate: `GET /api/tasks/admin` takes `?staffing` | `scripts/verify-v2.mjs` |
| Stale "alert fires 3 h before" comments | `lib/tasks/dispatch-row.ts`, `lib/tasks/dispatch-window.ts` |

⚠ Deliberately **not** on Dispatch: it already loads a fortnight and counts the gap itself — including days
already started, which `?staffing=` drops (`ScheduledAt > now`). The card says so. Not verified live (needs an
admin session and a short-handed day inside 24 h).

### 2026-09-26 — rating card: the change-result button is state-guarded

CHANGELOG 2026-09-25 (`affects: [owner-app, admin-panel, worker-app]`, breaking), `task-lifecycle.md` §0j.
`PATCH /api/tasks/{taskId}/workers/{workerId}/outcome` now accepts a change on a `Done` day
(`Completed`/`NoShow`/`Removed`) and on a not-yet-started `Pending` day (`Removed` only); `Cancelled` is refused
everywhere. The admin dialog offered every outcome word on every day, pre-selected `Pending` (always refused), and
had no `onError` — every refusal was silent.

| What changed | Where |
|---|---|
| `outcomeChoices(task, current, now)` — the §0j table, minus the result already held; empty hides the button. `outcomeErrorKey` maps the six codes + empty-bodied 403 | `lib/tasks/outcome-override.ts` (+ test) |
| Request type narrowed to `Completed \| NoShow \| Removed`, so `tsc` refuses `Pending`/`Cancelled` | `lib/types/task.types.ts` |
| Dialog: DS `ChoiceGroup`, nothing pre-selected, i18n labels, inline error by `error` string; a not-started day says the removal counts against the rating | `components/tasks/outcome-dialog.tsx`, messages en/de `tasks.outcomeDialog` |
| Button gated per worker | `app/[locale]/dashboard/tasks/[id]/page.tsx` |
| Ratings are current on return (§0j·2) — rate and outcome also invalidate `["worker-rating", workerId]` | `hooks/use-tasks.ts` |

⚠ Not claimed: whether admin Unassign (`DELETE /api/tasks/{taskId}/admin-assign/{workerId}`) affects the rating —
§0j names only the booking-level `DELETE /api/tasks/groups/{id}/workers/{workerId}`. `complaint_already_decided`
binds the owner only, so the admin keeps the button on a decided-complaint day. No swagger-visible change, so
`verify-v2.mjs` is unchanged. Not verified live (needs a real `Done` day).

### 2026-09-25 — contract gate and two live breaks (WP0–WP2)

Plan: `docs/superpowers/plans/2026-09-25-contract-gate-and-live-breaks.md`. Branch
`fix/contract-gate-and-live-breaks`, test-first per task. Suite 1198 → 1210 tests, `tsc` clean, lint
unchanged (1 existing warning). Contract gate 5 FAIL / 96 PASS → **0 FAIL / 116 PASS**.

| Package | What changed | Where |
|---|---|---|
| WP0 | Gate asserts the shipped contract: `AccountStatusFilter` (+`Lapsed`), `OwnerKYCDocType` (+`RepresentativeAuthorization`), `TaskStatus` enum, `WorkerRowDto` fields, removed fields asserted gone, `GET /api/tasks/admin` window params, owners `CityId`/`CountryId`, paged KYC | `scripts/verify-v2.mjs` (`00584aa`, `4be6828`, `97053e9`) |
| WP1 | A checked-in day is open again — `isOpen` reads `canonicalTaskStatus` against an allowlist (`pending`, `checkedIn`); unknown states read closed. Chart + Dispatch pill colours learn the new words | `lib/tasks/staffing.ts`, `components/dashboard/dashboard-charts.tsx`, `components/dispatch/dispatch-task-row.tsx` (`c699bd2`) |
| WP1 | Shift grid: a past `InReview`/`Rejected` day the worker never clocked into reads **done**, not missed | `hooks/use-worker-shifts.ts` (`80f80ac`) |
| WP2 | Owners filter sends `cityId` + `countryId` (country is now a real filter); hints rewritten en/de | `lib/owners/owner-filter-query.ts`, `owners/page.tsx`, `lib/types/owner.types.ts` (`2cccd42`) |
| WP2 | Owners table shows the owner's own city + country (column id `location`), blanks kept | `owners/page.tsx`, `OwnerRowDto` (`4be6828`) |
| WP2 | KYC "Registered in" reads `registrationAddress` | `components/docs-workspace/detail/facts-rail.tsx`, `OwnerCompanyDto` (`97053e9`) |
| WP2 | `RepresentativeAuthorization` grouped with company documents, labelled en/de in **both** label maps (owner card `onboarding.docType` and the review workspace `docsWorkspace.detail.type`, the second found by the final review); required set unchanged | `lib/onboarding/doc-set.ts`, messages (`50895f0`, fix pass) |

Visible effect in production once shipped: checked-in days get their fill buttons back, and the
under-staffing and owner-attention counts rise to their true values. Choosing only a country now filters
the Owners table.

### 2026-09-25 — full audit of every admin-panel guide

Seven read-only audits, one owner per guide, against `origin/main` `692bd26`; every CHANGELOG entry whose
`Guides:` names an admin-panel guide, from the start of each guide's history. Evidence bar: code that
shows the behaviour, not a type or a comment. Every BROKEN row was re-checked by hand before it went into
§3, and the owner-location rows were confirmed against the live swagger.

**Absorbed as a result** (every obligation DONE or N/A): `register-merge` → 09-08, `f-05-0` → 09-08,
`f-05-b` → 09-20, `f-05-c` → 09-04, `profession-fnd1-retrofit` → 09-23, `f-02b-7` → 09-08;
`worker-doc-approved-delete-guard` and `support-ticket-followup-fix` verified at 07-01.

**Ledger claims the audit found wrong** (all corrected above):

- *"The two renamed day states" done (09-21)* — not complete; WP1.
- *`notification-bell` ✅ 08-05*, *`fnd-1` ✅ 08-07*, *`fnd-2` ✅ 08-03* — core obligations never met.
- *"No table sorts server-side"* — the Workers table sorts on six keys (`workers/page.tsx:160`), and the
  agency queues send `sortBy` (`application-query.ts:82`, `link-query.ts:77`). Only Owners lacks it.
- *"`buildWorkerFilterQuery` has no consumer"* — it drives the Workers page (`page.tsx:147-148`);
  `onTask` → `booked` and `Blocked` → `Lapsed` were already absorbed.
- *"Newly available and unbuilt: `?startingSoon=`, `?idleWeek=`, `?availableOn=`, `?agencySource=`"* — all
  four built (`worker-filter-query.ts:39-46,59-63`).
- *`f-02a-1` "none of the four filters built"* — `scheduledFrom`/`scheduledTo`/`status` are sent.
- *Agency, availability and last-seen "only mentioned in a comment"* (09-08 spot-checks) — agency is three
  pages and ~40 modules; availability has a service and the matrix view since 09-02/09-05; worker
  `lastSeenAt` is rendered (true only for owners).
- *"`verify-v2.mjs` stays green"* — red; WP0.
- *"The rating halves are owner/worker surfaces"* — the admin calls the per-worker route and has a team
  route to build (WP6, WP11).
- *`overrodeLocation` on the audit page open* — N/A: the page renders no metadata.
- *"The bell routes by `entityType`, never by kind"* — `route.ts:94` branches on `type`.
- *The 27-entry backlog (09-08)* — superseded: this audit read every entry by its `Guides:` field.

⚠ Process: before the "`origin/main` only" rule reached them, three audits read the backend working tree;
`docs/handoff` and `index/` were identical to `origin/main` at that time. One ran a read-only
`git diff --quiet` on the handoff folder; nothing from it was used.

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
the restore doors were actioned.** (Plan file not in the repo — an earlier version of this ledger cited
`docs/superpowers/plans/2026-09-21-admin-f07-integration.md`, which does not exist.) ⚠ The ·0 row below was found incomplete on 2026-09-25 (WP1).

| Entry | Kind | What was done |
|---|---|---|
| 2026-09-21 F-07 ·3 | breaking | `closed` counts + `closureReason` modelled; force-close door built; the `204`-lies cancel reading; `completedAt` checked (one render site, no arithmetic — safe) |
| 2026-09-20 ·4 follow-ups | breaking | The bodiless-request problem-details trap is handled on every new door. |
| 2026-09-19 F-07 ·4 | breaking | Supervisor override built; `supervisorWorkerId` / `workSummary` modelled and rendered |
| 2026-09-18 F-07 ·1 | breaking | `InReview` attendance read fixed — a live bug: a worker who never arrived on a handed-in day read `overdue` instead of `noshow` |
| 2026-09-17 F-07 ·0 | breaking | The two renamed day states (**incomplete — WP1**), and `TaskGroupDto.status` → `days` |
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
re-filed — or, since 09-24, cloned (WP11) — with every check-in refused until then. That is why the form
warns before submit.

⚠ Branch: made on **`feat/admin-tasks-register`** (an earlier note wrongly said
`feat/walk-in-job-management`), where `components/walk-in/` is already present.

### 2026-08-12 — guide table baseline

The guide table (§2) was first reviewed that day; `support-ticket-followup-fix`,
`task-cancel-lifecycle-guards` and `worker-doc-approved-delete-guard` were assumed, not re-verified.

---

## 5. Guide bugs to report upstream

Per precedence (**live response > guide > README/guidance**), a guide bug is an issue on
[esharqhq/Germany-ERP](https://github.com/esharqhq/Germany-ERP/issues), never a local workaround. File
**one issue per guide**, not one per line, and ask before filing — it is outward-facing. Once filed,
record it in `BACKEND-ASKS.md` and delete the row here. ⚑ = changes client behaviour; file those first.

| Guide | Bug (at `origin/main` `692bd26`) |
|---|---|
| ⚑ `CHANGELOG.md` | The 2026-08-28 entry (`Blocked` → `Lapsed`) has **no `Kind:` and no `affects:` line** — any `affects:` filter (ours included) misses a breaking change. |
| ⚑ `task-cancel-lifecycle-guards.md` | The 3-hour cancel rule (§1, §9) is contradicted by **"1h"** in four places (§1 UI implications, §3 note, §7 `too_close_to_start`, §7 guard-order). §4/§5 still "recompute/re-render the booking's status" — a booking has no status. |
| ⚑ `f-01-a-broadcast-core.md` | §5.1b presign route `/api/file-uploads/presign`; five other guides and the app use `/api/files/presign`. Also "five admin routes" lists six; §5.2 key lists omit `namedCount`. |
| ⚑ `f-05-c-worker-agency-link.md` | Never names the admin permissions (`agency_link:read_any` / `manage_any`) or MODERATOR read-only; only `guidance.md` row 18 does. |
| ⚑ `guidance.md` | Row **18 "Agency links screen"** is admin content filed under **§2 Owner app** (line 89). §6 item still says `Active`/`Review`. Owner export 16 (rows 11-13) vs 18 (§6). Row 13(b) says `PUT /api/profile` gained location fields; removed 08-18. Lines 322-323 "no agency-facing screen" vs F-05b. Header "Last reviewed 2026-08-19". §7 doesn't point to `index/controllers/admin.md` for the audit `?action=` trap. |
| `f-02c-property-rework.md` | `bossOwnerName` on `PropertyDto` exists only in `index/dtos/properties.md`; the guide shows `bossOwnerUserId` only. §1/§11 still call F-02a·1 and F-02b·6 outstanding. |
| `task-lifecycle.md` | §0d says photo endpoints still work on a finished day; §0e says three evidence doors refuse `task_media_locked` unless PENDING/CHECKED_IN. §0d supervisor refusal lists DONE/CANCELLED; source also refuses `Rejected` (`TaskService.cs:3854-3857`). |
| `notification-bell.md` | Type counts disagree (83 / 69 / 61 / "11 values" / 15 destinations); §8 table has 14 rows and lacks `Broadcast`; types 62–78 never listed. |
| `f-04b-worker-availability.md` | §8 "nothing compares a schedule against a task at any door" vs its own summary/§8.1 and CHANGELOG 09-16 (it gates). §3 `isSet: false` "every existing worker" is unreachable per §1/§9. |
| `f-04a-worker-location.md` / `profession-fnd1-retrofit.md` / `fnd-3-table-query.md` | Worker export column count: 17 (f-04a summary, profession §8) / 18 (f-04a §8.3, guidance) / "still 18" next to a 20-column list (fnd-3 §6.2) / 20 (CHANGELOG 09-07). |
| `register-merge.md` | §9 "availability and location are recorded, not enforced" — false since 09-16 and 09-23 ·9b, though it is in the 09-16 entry's `Guides:`. |
| `profession-fnd1-retrofit.md` | Summary, §2, §8, §9 say no door assigns a skill; §1 and `f-06-a` say F-06a does. `BACKEND-ASKS.md` #36 cites §9 only. |
| `f-06-a-skills-request.md` | §4.3 "send `publicUrl`, not `storageKey`" vs its §11 (either) and `contract-lifecycle` §7.1 (the reverse). "Three decision verbs" vs four; "three refusals" lists four. |
| `f-05-0-agency-user-type.md` | §7 "only two agency permission codes" vs its own table of three (170001/2/7). §1 "None of that exists yet" contradicts the sentence before it. |
| `f-05-a-application-review.md` | §7.3 says link `existingAgencyId`, but no guide defines an agency detail screen to link to. |
| `f-02b-6-default-owner-walk-in-orders.md` | §4.5 "18 columns" lists 16; §3.3 "four" lists five; §3.4 "no new codes" vs six new on 09-23. |
| `f-02a-1-admin-task-list-filters.md` | §4 omitted status = "all five" vs `?status=Rejected` binding; §13 "no task guide yet" and cites `docs/mind/`; §5 defers `TaskItemDto` to `index/`. |
| `f-06-c-checkin-proof.md` | §3.1 example `"status": "Active"` (renamed 09-17); §4.2/§10 "cancel and re-file is the only correction" vs clone (09-24). |
| `fnd-1-configurable-lookups.md` | §1/§3 "every endpoint requires `[Authorize]`" vs §5 (public); §9 "no consumer endpoint" vs §10; §9.1 lists removed `PUT /api/profile`; §10 `OFFICE` exception vs `f-06-c` §9 (declined). |
| `fnd-3-table-query.md` | §5.1 note 2 `?status=Blocked` "does not return the walk-in" vs a 400; §6.1 omits `agencyId`/`agencySource`; §5.2 "grown four times" lists five. |
| `f-02-4-owner-table-filters.md` | "Six" sort values / "six query params" above lists of seven. |
| `f-02b-7-admin-owner-edit.md` | §3/§7 omit the `countryId`/`cityId` fields and three codes `owner-location-model` adds to the same route; `related:` lacks it. |
| `onboarding-and-active-gate.md` | §14.4 "no admin correction endpoint" vs `f-02b-7`; §13.1 3-char minimum ambiguous for the owner per-doc route. |
| `f-03-1-structured-document-data.md` / `contract-lifecycle.md` | §11 / §9.4 tables split by an inline paragraph, so the rows after it don't render. |

**Revision dates that did not move (from 2026-08-30).** Four guides took breaking changes without a
`revision:` bump. As of 2026-09-25 all four have moved (`fnd-3` 09-18, `onboarding` 09-24, `f-04b` 09-16,
`f-05-b` 09-20). Likely closed — **do not file** unless a specific guide is re-verified as still stale.

---

## 6. Findings in this repo

### 6.1 `lib/http/on-forbidden.ts` does not exist (found 2026-09-08)

Five doc comments assert a shared behaviour that is not in this repo: that any API `403` triggers an
immediate refetch of the current admin's permissions, in `lib/http/on-forbidden.ts`.

- `hooks/use-owners.ts:33`, `:51`, `:69`
- `hooks/use-contracts.ts:42`
- `hooks/use-current-permissions.ts:45`

There is no such file (`lib/http/` holds `api-error.ts`, `auth-endpoint.ts`, `client.ts`, `files.ts`,
`idempotency.ts`, plus tests), `git log -- lib/http/on-forbidden.ts` returns nothing — it was **never**
committed — and no interceptor does a 403-keyed invalidate (`lib/http/client.ts` has no `403` branch).

**Why it matters more than a stale comment.** Two sites use it to justify a *design decision*:
supporting reads are gated on their permission "because an API 403 also forces a permission refetch", i.e.
to avoid a cost nothing incurs. The gating is still right on its own merits, but the stated reason is
fictional. Not fixed on purpose: "write the interceptor" vs "delete the claim" is a design call.
⚠ Do not cite this file in a review or a spec.

### 6.2 Backend paths in code comments (fixed 2026-09-25)

Comments cited the backend as `../Backend/...` or `Backend/...` — a checkout path that does not exist on
this machine. Swept to path-independent citations: a guide by file name, an index file by its
backend-relative path. The plans and specs under `docs/superpowers/` still carry the old form; they are
historical and were left alone.

### 6.3 Stale comments found by the 2026-09-25 audit

Fix alongside the package that touches the file: `lib/tasks/dispatch-row.ts:8` (retired 3 h alert, WP1);
`lib/types/availability.types.ts:9-13` (WP13); `hooks/use-subject-tickets.ts:26-30` (WP13);
`lib/types/owner.types.ts:85` (WP14); `settings/audit/page.tsx` "casing" rationale (WP4);
`lib/types/contract.types.ts:87` "else 500".
