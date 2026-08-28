# Backend Asks — ERP-Admin Panel

These are the backend changes required to unblock ERP-Admin (Next.js super-admin panel) features.

> ⚠ **Items #1–6 and (a)–(f) below all shipped** and were wired in commit `9d36d4b` — see
> `FRONTEND-HANDOFF.md`, which is the live contract for them. They are kept here as the record of what
> was asked and why. **The two sections at the bottom are open — 2026-08-07 (#7, #8) and 2026-08-12
> (#9, the only ask in this document that hard-blocks a feature).**

Backend repo: `D:\Victus\Projects\Backend\Germany ERP` (.NET 10). Two admin roles: `SUPER_ADMIN`, `MODERATOR`.

Status as of 2026-06-10. Grouped into **feature-enabling endpoints** (#1–5), **a real-time fix** (#6), and **smaller gaps found during the build** (a–e).

---

## Feature-enabling endpoints

### 1. Admin analytics endpoint — *unblocks the real Dashboard*
- **FE today:** the `/dashboard` Overview is a static placeholder (no nav-driving data).
- **Need:** a system-wide KPI aggregate endpoint — totals (workers / owners / properties / active tasks), **revenue**, and time-series (trend / status breakdown / top workers). The only analytics endpoint today is owner-scoped (`api/analytics/owner/home`).
- **Suggested:** `GET /api/admin/analytics/home` → `{ totals, revenueSeries, statusBreakdown, topWorkers, … }`, gated by a new `system:analytics:read` permission.

### 2. Attendance report endpoint — *optional*
- **FE today:** no attendance page (nav item hidden for v1).
- **Need:** who checked in/out today across tasks. Could be derived client-side from task data if not built, but a dedicated endpoint is cleaner.
- **Suggested:** `GET /api/admin/attendance?date=` → per-worker check-in/out rows.

### 3. List-conversations endpoint — *unblocks a standalone chat inbox*
- **FE today:** messaging exists **only inside Support tickets**; there is no general chat inbox.
- **Need:** a way to list conversations for an admin (no list-conversations endpoint exists today — the conversation is only reachable via its ticket).
- **Suggested:** `GET /api/admin/conversations?status=&assignedAdminId=` → conversation summaries.

### 4. `?includeDeleted` on `GET /api/properties` — *unblocks property restore UI*
- **FE today:** `POST /api/properties/{id}/restore` exists and `SUPER_ADMIN` holds `property:restore`, **but there is no way to surface a soft-deleted property** — `ListForUserAsync` hard-filters `!IsDeleted` with no override, so the FE has no deleted id to restore from.
- **Need:** add `?includeDeleted=true` to `GET /api/properties` (or a dedicated deleted-list endpoint). After that the FE can show a deleted-properties view with a Restore action.

### 5. Current-admin effective-permissions source — *unblocks faithful gating for MODERATOR / custom-role admins*
- **FE today:** the JWT carries only the **role code**, not permission claims. The permission catalog (`GET /api/admin/permissions`) requires `system:permission:read`, which MODERATOR lacks → the FE **fails open** (shows actions a moderator may then 403 on).
- **Need:** an effective-permissions source for the *current* admin, any of:
  - permission claims embedded in the JWT, **or**
  - `permissions: string[]` on `AdminProfileDto` (`GET /api/profile`), **or**
  - a dedicated `GET /api/admin/me/permissions`.
- **Impact:** lets the FE gate every action precisely for moderators and `custom_<uuid>`-role admins without granting them `system:permission:read`.

---

## Real-time fix

### 6. SignalR real-time push for admins — *2 one-line server fixes*
The live conversation push in the Support ticket thread is **built** (`hooks/use-conversation-hub.ts`) but currently **dead for admins**; the FE degrades to a 15-second poll. To light it up (the hook needs no change):
- **(a)** Add `JwtBearerEvents.OnMessageReceived` in `ServiceExtensions.cs` to read `access_token` from the **query string** for `/hubs/*` paths. Browsers can't set the `Authorization` header on WebSocket/SSE — only LongPolling authenticates today.
- **(b)** Fix `ChatHub.JoinConversation` casing — it checks `userType == "ADMIN"` but the admin role claim is `"Admin"`, so admin joins throw `not_a_participant`.

---

## Smaller gaps found during the build

### (a) Localized permission metadata
`GET /api/admin/permissions` descriptions are **null/English-only** in seed data, so the role permission-catalog grid shows raw permission codes (or English) even in the DE locale. Needs localized `description` (or a name/description-by-locale map).

### (b) Role-delete endpoint
The custom-override admin-create flow mints a `custom_<uuid>` role **before** `createAdmin`/`assignRole`. If that 2nd step fails (e.g. `admin_email_exists`), the role is **orphaned** with no delete endpoint to clean it up. Needs `DELETE /api/admin/roles/{id}` (with an in-use guard).

### (c) Admin create-property-on-behalf-of-owner endpoint
Admins **cannot create properties**: `POST /api/properties` requires `property:create` (no admin role holds it) **and** `CreateAsync` makes the *caller* the BOSS owner (`caller_must_be_boss`). The panel needs an `api/admin/properties` POST that takes an `ownerUserId` and creates the property under that owner. (Admin **edit + soft-delete** already work via the controller's `property:list` branch — only create is blocked.)

### (d) Admin self-edit profile
`PUT /api/profile` hard-returns `400 admin_profile_update_not_supported` for Admin (only Worker/Owner have update logic). Admins can't change their own name/email/avatar. The FE profile page only offers **change-password** (which does work). Needs an Admin branch in `ProfileService.UpdateProfileAsync`.

### (f) Admin single-task-group read endpoint
There is **no admin endpoint to read one task group by id**. The owner route `GET /api/tasks/groups/{id}` is PROPERTY-scoped (`task_group:read`) and **403s for admins** (verified live 2026-06-10 — the Tasks detail page errored on every "View"). No `GET /api/tasks/admin/groups/{id}` exists. **FE workaround shipped:** the detail page now derives the group from `GET /api/tasks/admin/groups` (the list returns each group fully nested — dates/tasks/workers). This assumes that list stays **unpaginated**; if it ever caps, deep-linking to a group beyond the cap will 404 in-app. Needs a real `GET /api/tasks/admin/groups/{id}` (gated by `task_group:read_any`, 110031).

### (e) Per-doc worker-document status
`WorkerDocument` has **no status field**; `AdminWorkerDocsController` approve/reject are **audit-log-only** and the list DTO returns identical data after a decision. So the admin UI can't show which docs were already approved/rejected (a reviewer re-sees the same Approve/Reject buttons after deciding). Needs a status/decision column on `WorkerDocument` surfaced in `WorkerDocumentDto`. *(Note: property-docs already persist `DocsStatus` correctly — this gap is worker-docs only.)*

---

*Generated from the master gap-analysis plan + per-domain build findings.*

---

# Open — raised 2026-08-07

## 7. `profilePictureUrl` on the two admin list row DTOs — *unblocks the avatar column in the Docs queue*

The Docs queue tables show a person per row, and a picture is the fastest way an operator recognises
one. Both list DTOs omit it while both **detail** DTOs carry it:

| | Has a picture? |
|---|---|
| `KycProfileSummaryDto` — `GermanyERP.Domain/Models/DTOs/Kyc/KycDtos.cs:42-50` | ❌ |
| `WorkerRowDto` — `.../Workers/WorkerDtos.cs:48-67` | ❌ |
| `OwnerRowDto` (FND-3 paged owners) — `.../Owners/OwnerDtos.cs:37-50` | ❌ |
| `WorkerDetailDto` — `.../Workers/WorkerDtos.cs:74` | ✅ `ProfilePictureUrl` |
| owner detail — `.../Owners/OwnerDtos.cs:83` | ✅ `ProfilePictureUrl` |

**Need:** `profilePictureUrl` (nullable string) added to `KycProfileSummaryDto`, `WorkerRowDto` and
`OwnerRowDto`. The data is already on the entity — this is a projection change, not a schema one.

**Does it block?** **No.** The FE renders an initials monogram in the meantime, and
`SubjectRow.avatarUrl` (`lib/onboarding/subject-row.ts`) already exists and is wired into
`<AvatarImage>` — the day the field appears, mapping it in the two adapters is the only change. One
detail request per row was rejected as an N+1 a table must not do.

## 8. Contract period on the two admin list row DTOs — *would remove a client-side join*

The Docs queue also shows each subject's cover period, which no list endpoint returns. The FE joins
`GET /api/contracts/admin/{side}` — unpaginated, every subject's rows — once per screen and indexes it
by subject id.

**This works and is not a blocker.** Raising it only because that list has no ceiling: it grows with
every contract ever authored, on both sides, and every Docs screen open pays for all of it. If it is
ever paginated, the join breaks silently — rows would simply stop showing cover dates. Either
`eligibleFrom`/`eligibleTo`/`phase` of the governing contract on the row DTOs, or a commitment that
the admin contract list stays unpaginated, closes it.

---

# Open — raised 2026-08-12

## 9. Admin create-owner endpoint — *the panel cannot create an owner at all*

**Does it block?** **Yes** — and unlike #7 and #8, there is no degraded path. The panel has no way to
create an owner account, and no UI for it exists because there is nothing to call.

### What exists today

| Path | Why an admin cannot use it |
|---|---|
| `POST /api/auth/register/owner` | Anonymous self-signup. Usable in the literal sense — see the four defects below — but it is not an admin surface |
| `POST /api/owners/sub-accounts` (`owner:sub_account:create`, 30010) | Resolves the subject from the caller's `baseRole`, and *"a caller resolving to **no** BOSS is refused, not passed"*. An admin has no BOSS, so this refuses them by construction. It also creates MANAGER / PROPERTY_ADMIN sub-accounts under an existing boss — never a BOSS |
| `GET`/`PUT`/`DELETE /api/owners/{id}`, `GET /api/admin/owners` | Read, edit and soft-delete are all admin-side and all work. **Create is the only hole in the CRUD set** |

There is no `owner:create` / `owner:create_any` anywhere in the 30000s owner block — the codes in use
are `owner:list` (30001), `owner:read` (30002), `owner:soft_delete` (30003), `owner:export` (30004),
`owner:profile:update_any` (30005) and `owner:sub_account:*` (30010–30013).

### Why the anonymous endpoint is not the answer

`AuthService.RegisterOwnerAsync` does create a complete, correct owner — `OwnerUser` with the BOSS base
role, an `OwnerProfile` row, `OnboardingStatus` at `Kyc`. Four things make it wrong for the panel:

1. **The admin has to choose the owner's password.** `RegisterOwnerDto.password` is required, so an
   admin who creates an account knows the credentials to it. Every other admin owner mutation is
   designed so the admin acts *on* the account without holding it.
2. **No audit row.** The endpoint is anonymous, so there is no caller to attribute and nothing is
   written. Admin owner edits write `OWNER_PROFILE_MODIFIED` (27), deletes write `OWNER_DEACTIVATED`,
   even a table export writes `OWNER_TABLE_EXPORTED`. Creating an account would be the only
   unattributed admin owner action.
3. **No id comes back.** The response is `{ message }`, so the panel cannot navigate to what it just
   created — it would have to re-list the owners table and match on email.
4. **The owner is locked behind an OTP mailed to them.** `IsVerified = false` and a verification code
   goes to the owner's inbox; until they enter it, login returns `401 email_not_verified`. An admin
   creating an account on the phone with a client cannot finish the job.

### Need

`POST /api/admin/owners` — or `POST /api/owners` on the admin controller — taking full name, email and
phone, creating a **BOSS** `OwnerUser` plus its `OwnerProfile` row exactly as registration does, gated
by a new permission in the owner block (**next free code in the 30000s** — this document deliberately
does not assign one) **seeded for `SUPER_ADMIN`**, returning `OwnerSummaryDto` (201) so the panel can
route straight to the new owner's detail page, and writing an audit row alongside the existing owner
audit actions. `409` on a duplicate email or phone, matching the shape `POST /api/owners/sub-accounts`
already returns.

### The one open question — password or invite

Two shapes, and the choice is a product/security call rather than an engineering one:

- **Invite link (preferred).** The endpoint sets no password and mints a set-password token, reusing the
  existing `password-reset` machinery; the owner sets their own credentials and verifies in one step.
  The admin never holds the account. Costs one email template and a token purpose.
- **Admin-set password.** Cheaper — it is `RegisterOwnerAsync` with a permission, an audit row and a
  returned id — but it keeps defect 1 above, and defect 4 unless the endpoint also marks the account
  verified (which is its own decision: an admin asserting an email address is not the same evidence as
  the owner clicking a code).

**Default if nobody rules:** invite link. Whatever is chosen, the panel's UI is the same form.

### Precedent

This is the same problem as **(c)** above, one entity over. `POST /api/properties` required
`property:create` that no admin role held *and* made the caller the BOSS, so admins could not create
properties either. It shipped as an admin branch with `property:create_any`, an
`AdminCreatePropertyRequest` carrying the target `ownerUserId`, and `201 PropertyDto`. The owner ask
is strictly simpler — there is no target owner to name, because the new account *is* the owner.

## Add `internalNote` to `TaskGroupDto`

`internalNote` is accepted by `CreateTaskGroupRequest` and `UpdateTaskGroupRequest`
(`index/dtos/tasks.md:47`, `:117`) and exists as a column
(`index/schemas/tasks.md:35` — "admin/owner internal note; not shown to workers").
It appears in **no response DTO**: `TaskGroupDto` (`index/dtos/tasks.md:173-189`)
does not carry it, so no read endpoint returns it.

For an admin it is therefore write-once and unreadable — the only route that accepts
it after creation, `PUT /api/tasks/groups/{id}`, is PROPERTY-scoped
(`task_group:update`, 110004) and an admin holds no `PropertyMembership`.

**Ask:** add `internalNote` to `TaskGroupDto`. It is the natural home for a walk-in
order's customer contact details, which currently have to go in `title` (worker-visible)
to be visible to the admin at all.

Found 2026-08-13 while planning the Walk-In orders list.

---

# Open — raised 2026-08-26

Found while implementing the admin **system pages** (`Uyer-Admin-System-Pages.dc.html`:
sign-in, 404, 403, 500, 503, offline). Each of these is a place where the design asks
the console to state a fact it has no way to know. The pages ship without the affected
element rather than with a fabricated one, so every item below is a visible gap that
closes the moment the endpoint or field exists.

## 10. Health endpoint for the sign-in status indicator

The design's brand panel ends with a green dot and "All systems normal". The spec's own
rationale is *"so a failing console is visible before the operator even types"* — which a
hardcoded dot inverts: it would read NORMAL loudest during the outage it exists to reveal.

A plain reachability ping does not solve it either. An API answering 500 on every route
still responds, so the dot would go green through a total outage.

**Ask:** `GET /api/health` (unauthenticated, no DB write) → `{ status: "ok" | "degraded", … }`.

**FE today:** `components/system/deploy-status.tsx` takes a `healthUrl` prop, read by the
server from `HEALTH_URL`. Unset, the strip is version (and region) only. Point that
variable at the endpoint and the indicator appears with no further FE work.

## 11. Correlation id on 5xx responses

The 500 page shows a copyable trace id, and the spec files it as needing a decision:
*"assumes the API returns a correlation id on 5xx. If it does not, both come off the page."*
It does not, so both are off.

**Ask:** return a correlation id on 5xx — response header (`X-Correlation-Id`) or body
field — and log it server-side so support can search it.

**FE today:** `app/[locale]/error.tsx` prints Next's own `digest`, which identifies the
*render* failure only and means nothing to the backend. No error-reporting SDK is
installed either, so the design's "Engineering already has the report" is also absent.

## 12. Staff password reset

The sign-in design links "Forgot password?" and the DS ships two follow-on screens
(reset-link-sent, set-new-password). Neither can be built: `POST /api/profile/password`
requires an authenticated session **and** the current password, which is a change-password
flow, not a reset.

**Ask:** the usual pair — `POST /api/Auth/password/forgot` (email, always 202 so it never
discloses whether an address is a staff account) and `POST /api/Auth/password/reset`
(token + new password).

**FE today:** the link reveals the one true answer instead — a staff password is reset by
an owner-admin. It becomes a real link when these land.

## 13. Access-request route for 403

The 403 design's primary action is "Request access", and the spec flags it: *"There is no
route for it yet — either add one or make the button open support."* Neither exists.

**Ask:** `POST /api/admin/access-requests` `{ permission, path }` → notifies an owner-admin.

**FE today:** `app/[locale]/forbidden/page.tsx` names the missing permission (from
`?permission=`) and offers back / dashboard. The page is otherwise complete.

## 14. Offline mutation queue — *frontend gap, noted here for the record*

The offline design shows "Queued actions 3" and "Last synced 4 min ago". This console has
no offline mutation queue, so a count would promise that work was saved when it was not.

Unlike #10–13 this needs **no backend work** — it is a frontend capability (an outbox that
replays mutations on reconnect). Logged so the missing rows are not mistaken for a design
omission. `components/system/offline-overlay.tsx` currently states only what is true.

## 15. Deploy region for the sign-in strip — *ops config, not an endpoint*

The design prints `eu-central-1`. Nothing exposes the region to the client.

**FE today:** read from `DEPLOY_REGION` at runtime (server env, deliberately not
`NEXT_PUBLIC_*`, which is inlined at build time and so cannot be changed by whoever runs
the container). Set it and it appears.

---

## 16. One batched nav-badge count endpoint — *unblocks the sidebar's badge vocabulary*

`../assets/Uyer-Admin-Sidebar.dc.html` gives the rail a count vocabulary — a white pill for a
queue the operator clears, a red pill for someone waiting on a reply, an amber dot for
"expiring soon", a plain mono figure for a total — and files the endpoint under its own
"Confirm before build" heading: *"Leave requests, agency requests, documents and tickets need
their counts in one call, otherwise the rail fires fifteen requests per load."*

**FE today:** the treatments are implemented and the rows are tagged with which one they use
(`badge` on `NavItem` in `lib/nav-items.ts`), but `navBadgeCounts` in
`components/layout/app-sidebar.tsx` is an empty map, so **no badge renders at all**. That is
deliberate: an empty white pill reads as a queue of zero, and a permanent amber dot claims
something is expiring when nothing is known.

**Need:** one call, returning only the figures the rail draws. Suggested:

`GET /api/admin/nav-counts` →

```json
{
  "leaveRequests":   3,    // queue    — pending worker leave requests
  "workerDocuments": 12,   // queue    — worker docs awaiting review
  "agencyRequests":  4,    // waiting  — unanswered agency requests
  "supportTickets":  5,    // waiting  — open tickets with an unread inbound message
  "dispatchExpiring": 2,   // expiring — tasks whose dispatch window lapses soon
  "owners":          248,  // total
  "workers":         312,  // total
  "tasks":           128   // total
}
```

Each figure must be **scoped to what the calling admin may see**, and every key should be
omitted (not zeroed) when the admin lacks the permission behind it — a `0` is a real
statement that the queue is empty, and the rail draws nothing for an absent key. No new
permission needed; the existing per-section grants already decide who sees which row.

**Two open questions for whoever builds it:**
1. The `expiring` treatment needs a definition of "soon" for a dispatch window. The design
   says only "expiring soon". Pick a window and state it.
2. `dispatchExpiring` and the three totals cost the most to compute and are the least
   urgent — if the whole payload is too expensive, the four `queue`/`waiting` figures are
   the ones the design calls "work waiting", and shipping only those is a useful first cut.

---

## 17. Severity on the notification DTO — *unblocks the topbar bell's two-state badge*

The sidebar spec gives the bell three states and separates two of them by *urgency*, not by count:
*"Red count for anything with a person waiting, lime dot for 'new but nothing is on fire', nothing
for read."*

**FE today:** `useUnreadCount()` returns one number with no notion of urgency, so the bell renders
the **red count for every unread notification** — including ones that are merely new. The lime dot
state is unreachable and is not implemented.

**Need:** something on the notification DTO that separates "someone is waiting on a reply" from
"informational". Either is enough:

- `severity: "info" | "waiting"` (or `priority: number`) on each notification, **and** a split in
  the unread-count response — e.g. `{ "waiting": 2, "info": 7 }` — so the bell can pick a state
  without paging the whole list; **or**
- a documented mapping from the existing `entityType` values to the two buckets, which the FE can
  apply client-side. Cheaper, but it puts a product judgement in the frontend and it will drift
  every time an `entityType` is added.

The first option is preferred. Until then the bell stays red-on-any-unread, which over-alarms
rather than under-alarms — the safe direction, but not what the design says.

---

# Open — raised 2026-08-27

Found while implementing the redesigned **Owner detail** and **Worker detail** screens
(`Uyer-Admin-Owner-Detail.dc.html`, `Uyer-Admin-Worker-Detail.dc.html`). Both designs
introduce three blocks — an attention strip, a per-account history and a conversations
list — and name the reads they would need. Every one of them shipped, built on the
closest read that exists, and every one of them is narrower than the design because of
it. The gaps below are the difference, and each is visible on screen today.

## 18. Tasks for one worker — *the shift grid reads a whole week of the system to draw one row of it*

`GET /api/tasks/admin` filters on `ownerUserId` and `propertyId`, not on a worker. The
worker's week grid therefore fetches **every task in the date window across all owners**
and matches `workers[].workerId` in memory.

It is bounded (both `scheduledFrom` and `scheduledTo` are sent, so the window governs and
the 500-row cap lifts to the 5,000-row ceiling) and it is correct, but the cost scales with
the whole platform's week rather than with one worker's.

**Ask:** `?workerId=` on `GET /api/tasks/admin`, ANDed with the existing filters. No new
permission — `task:list_any` already covers the route.

**FE today:** `hooks/use-worker-shifts.ts`. The filter is one line; delete the in-memory
match and pass the id.

*Rejected alternative, for the record:* `GET /api/admin/attendance?date=` carries the same
clock-ins per day and would be seven requests instead of one — but it is gated on
`system:attendance:read`, which nothing else on the worker screen needs, so the grid would
go dark for an admin who can read the worker perfectly well.

## 19. Lifecycle events for one subject — *the "History" tab is an admin log, and says so*

The designs draw a third tab telling one account's story: KYC verdicts, contract versions,
per-document decisions, properties added on its behalf, cancellations, tickets, registration.

`GET /api/admin/audit-log?targetId=` is the closest thing and it cannot assemble that,
because the audit rows are keyed on the object acted upon rather than on its subject —
verified in the service, not assumed:

- **Per-document verdicts are unreachable.** `WorkerDocApproved` / `WorkerDocRejected` are
  written with `targetId: doc.Id` (`GermanyERP.Services/Workers/WorkerDocService.cs:304`),
  and `OwnerKycDocApproved` / `OwnerKycDocRejected` with the KYC doc id
  (`.../Kyc/KycService.cs:826`). The subject is in the metadata, which is not a filterable
  column.
- **Contract events are unreachable** for the same reason — `ContractSent` / `ContractSigned`
  key on the contract id.
- **Nothing the subject did is in the log at all.** `SuperAdminAuditAction` has no member for
  a registration, a KYC submission, a sub-account invite or a ticket, so five of the eleven
  rows the Owner design draws have no source of any kind.
- **An owner needs two queries**, because their own rows are split across `OwnerUser` (the
  user id) and `OwnerProfile` (the profile id).

**Ask:** one of —

- `GET /api/admin/audit-log?subjectType=Owner|Worker&subjectId=` that resolves the indirection
  server-side (it already knows which metadata field holds the subject); **or**
- a purpose-built `GET /api/admin/{owners|workers}/{id}/events` that also carries the
  subject-side milestones the audit log was never meant to hold.

The second is what the design draws. The first is most of the value for much less work.

**FE today:** `hooks/use-account-log.ts` + `components/detail/account-log.tsx`. The tab is
titled **Log**, not History, and carries a line under the list naming what it excludes —
a partial feed presented as a complete one is the one thing that surface must not do.

## 20. Support tickets by target user — *the Conversations card reads every ticket in the system*

Creation exists (`POST /api/support-tickets/admin/for-user`); listing by subject does not.
`GET /api/support-tickets/admin/all` is unpaginated and unfiltered by requester, so the card
reads all of them and filters on `requesterUserId` in memory.

It shares the support inbox's query key, so on a panel where the inbox has been opened it
costs no request — but on a cold detail page it fetches the platform's whole ticket list to
show at most six rows.

**Ask:** `?requesterUserId=` (and ideally `?requesterUserType=`) on that route.

**FE today:** `hooks/use-subject-tickets.ts`.

## 21. Unstaffed shifts for one owner — *the attention strip counts them client-side*

The Owner design's first attention slot is "17:00 shift has no worker". It is derived here
from the owner's task groups the screen already reads, comparing `requiredWorkerCount`
against the non-vacated `workers[]` on each task in the week ahead.

That is a true statement about the data on screen, and it is not the same statement as
"this owner has an unstaffed shift today" — the groups list is unpaginated and complete
today, and stops being a safe basis the moment it is capped.

**Ask:** a count (or a short list) of under-staffed tasks for one owner inside a date window.
`GET /api/tasks/admin?ownerUserId=&scheduledFrom=&scheduledTo=&understaffed=true` would do it.

**FE today:** `lib/owners/attention.ts`.

## 22. The lateness grace period — *a question, not an endpoint*

The Worker design's grid labels a 14:18 check-in on a 14:00 shift "18 min late". Nothing in
the API defines when a check-in becomes late, so the screen picked **5 minutes** and named
the constant so the argument happens in one place.

**Need:** the window payroll actually uses — and whether it differs by property category or
shift length. If there is no rule yet, say so and the label becomes a plain check-in time
rather than a judgement.

**FE today:** `LATE_GRACE_MINUTES` in `hooks/use-worker-shifts.ts`.

## 23. Two fields the identity band still has no source for

Both are re-statements of asks already open above, listed here because these two screens are
where their absence is now visible:

- **`profilePictureUrl` on `GET /api/owners/{id}`** — the owner band renders initials while
  the worker band beside it renders a photo, because only the worker detail DTO carries the
  field. See ask #7; this is the account read, not the list row.
- **A system/type flag on `GET /api/owners/{id}`** — the owner screen still recognises the
  walk-in account through a separate `ownerType=Default` lookup
  (`useWalkInOwnerId`), and the whole action row waits on that lookup before it may paint.
  One boolean on the account read deletes that branch and that wait.

---

# Open — raised 2026-08-27 (second batch)

Found while planning the redesigned **documents workspace**
(`Uyer-Admin-Documents-Detail.dc.html` — two review queues and the four-step subject
detail behind them). The **detail** is fully served by today's endpoints; the **queues**
are not. The design draws eight columns and the two list DTOs between them can fill three.

Every item below is a column that is drawn in the design and will ship absent, with the
column simply not registered rather than rendered as an em dash — a permanently blank
column teaches an operator to ignore it.

## 24. The two documents-queue list DTOs are too thin for the queue they feed

Both queues are meant to answer one question at a glance: *which submission has been
waiting longest, and does it have a problem in it?* Neither DTO carries the fields that
answer it.

`KycProfileSummaryDto` (`GermanyERP.Domain/Models/DTOs/Kyc/KycDtos.cs`) — 8 fields:
`ownerProfileId, ownerUserId, ownerName, ownerEmail, onboardingStatus,
onboardingRejectReason, onboardingReviewedAt, documentCount`.

`WorkerRowDto` (`.../Workers/WorkerDtos.cs:124`) — ~20 fields, none of them the review ones:
no `onboardingReviewedAt`, no `onboardingRejectReason`, no document count, no `identity`.

**Ask — four fields, in descending order of value:**

1. **A submitted-at** on both rows — when the bundle entered `Review`. This is the highest
   value single field: it is the design's default sort, and the "Waiting — days" column
   (red past 7) that makes the oldest submission findable. Today neither side has it.
   Worker `createdAt` is registration, not submission, so it cannot stand in.
2. **Per-document verdict counts** — `{ approved, pending, rejected }`, or the `status`
   strings. The design renders one dot per file in verdict colour, because *"a red dot in
   the row is the fastest read of 'this one has a problem'."* `documentCount` alone cannot
   draw it, and the worker row has not even got that.
3. **`company.name` + `legalForm` on `KycProfileSummaryDto`** — the owner queue's subject
   line and its Company column. `null` is a complete answer here ("Natural person"), not a
   gap, so it needs no separate flag.
4. **`identity.licenseExpiry` on `WorkerRowDto`** — the design's one worker-only column and,
   in its own words, *"the one row that must not be missed — a lapse drops the account back
   to KYC and makes every future shift unfillable."* It exists on `WorkerDetailDto` only,
   and one detail request per row is an N+1 a table must not do.

Items 2–4 are the same shape as ask **#7** (`profilePictureUrl` on the list rows): the
detail DTO has it, the row DTO does not, and the table cannot afford to ask row by row.

**Also, while these routes are open:** `GET /api/admin/kyc` returns a **bare array with no
paging, search or sort parameters at all** (`KycController.cs:217-222` takes
`OnboardingStatus? status` and nothing else), while `GET /api/admin/workers` is paged,
server-filtered and server-sorted. The frontend absorbs the difference with a two-mode data
source, so this is not blocking — but the owner queue is doing all of its filtering and
sorting client-side over the full list, and that stops being viable somewhere in the low
thousands of owners.

**FE today:** `lib/onboarding/subject-row.ts` normalises both rows into one `SubjectRow`.
Each field above is one entry in the queue's column registry once it exists.

**⚠ What the owner queue does instead, and why it should not have to.** Items 1–3 are all on
`GET /api/admin/kyc/{ownerProfileId}`, so the queue reads that **once per row of the tab being
viewed** (`hooks/use-queue-details.ts`) to fill the Files dots, the Waiting column and the
company line. It is keyed `["kyc", "profile", id]`, the same key the detail page uses, so the
requests are cached and clicking a row opens an already-warm screen — but it is still one HTTP
request per owner, and it grows with the tenant.

It is scoped to the **tab** rather than to the visible page, which would be the tighter bound and
does not work: sorting by Waiting reads a value that only arrives with these details, so
page-scoped enrichment feeds itself — the page decides what to fetch, the fetch changes the sort,
the sort changes the page. Descending settles after one round; ascending never does.

Putting a `submittedAt`, a `{approved, pending, rejected}` count and `company.name` on the list
row deletes all of that: one request, no cache-key coupling, no ordering feedback.

## 25. Resolve an admin id to a name — *the review history shows ids, so it shows nothing*

The design's per-file rows and its Review history feed are attributed: *"Passport approved by
D. Krüger"*, *"26 Aug · D. Krüger"* in the queue's Last decision column.

Two separate gaps, and the first one is smaller than it looks.

**(a) The submission's reviewer is not on any DTO — but the column already exists.**
`OwnerProfile.OnboardingReviewedByAdminId` is a real column
(`GermanyERP.Domain/Entities/OwnerProfile.cs:30` — *"Reviewing admin's id. Bare column with no
navigation, matching `WorkerDocument.ReviewedByAdminId`"*). It is returned by **nothing**:
`KycProfileSummaryDto` has eight fields and `KycProfileDto` has six plus identity, company and
documents — neither carries it, though both carry `OnboardingReviewedAt` right beside where it
would go.

**Ask (a):** add `onboardingReviewedByAdminId` to `KycProfileSummaryDto` and `KycProfileDto`.
The value is already stored; this is a projection change, not a feature.

**(b) Nothing resolves an admin id to a name.** `reviewedByAdminId` on `KycDocDto` and
`WorkerDocumentDto` has the same problem, and so does the audit log (ask #19). The panel does
have `GET /api/admin/admins`, which lists them — usable as a client-side id→name map, but it
needs `system:admin:read`, which an admin who may review KYC does not necessarily hold.

**Ask (b):** either widen that read, or denormalise an `adminName` alongside each reviewer id.

**FE today:** the queue's "Last decision" column shows **the date alone**. The per-document rows
and the review-history feed carry the action and the timestamp and no attribution line. A
deliberate choice over the available near-miss: the newest *document* verdict's
`reviewedByAdminId` is reachable, and using it as a stand-in for who decided the *submission*
would name the wrong admin whenever two of them worked the same bundle — worse, on a compliance
screen, than naming nobody.

## 26. Carry the queue's order into the detail route — *the ‹ 4 of 12 in review › pager*

The detail header pages through the queue without going back to it. That needs the position
and total of the current subject *within the filtered queue* — which the detail route, keyed
on one id, has no way to know.

The design files this under "Confirm before build" itself.

**Only half of it is a backend ask.** The pager needs the **filtered, sorted** queue order, and
the two queues keep that in different places:

- **Owner** — the whole list is client-side, so the order exists in the browser and can be
  carried into the detail through a shared cache. No backend work needed.
- **Worker** — the filtering and sorting happen server-side and the client only ever holds one
  page of 25, so a subject on page 3 has no knowable position. This half needs either a
  position-in-set on the row (`index` within the current query) or an ordered id list for the
  query.

Logged so the missing arrows are read as a deferral rather than an omission, and so the owner
half is not blocked waiting on the worker half.

**FE today:** the detail header has Back and the subject, and no pager.

## 27. `OrphanedFileCleanupJob` deletes every KYC and worker document — *data loss, not an endpoint gap*

**This is a defect report, not a feature request, and it is the reason an approved bundle can
render "the document is missing from storage".**

`OrphanedFileCleanupJob` keeps a file alive by finding it in one of two sets, and the two sets
are compared differently:

- `confirmedFilePaths` is tested against the raw `f.StorageKey`.
- `confirmedUrls` is tested against `_fileStore.GetPublicUrl(f.StorageKey)` — an **absolute URL**.

`OwnerKYCDocs.FileUrl` and `WorkerDocuments.FileUrl` are put in `confirmedUrls`
(`OrphanedFileCleanupJob.cs:52,55`). Both columns now hold a **storage key**, not a URL:

- `Owner/src/components/profile/KycDocumentSection.tsx:95` posts `fileUrl: storageKey`
- `Worker/src/api/hooks/useUploadWorkerDoc.ts:33` posts `fileUrl: storageKey`, with the comment
  *"The storage key, never the publicUrl"*
- `KycService.cs:461` stores it verbatim — `FileUrl = d.FileUrl`

A key is never equal to `GetPublicUrl(key)`, so neither set ever matches, and every owner KYC
scan and every worker document older than `Storage:Local:PresignExpirySeconds` is classified as
an orphan and deleted on the next hourly pass. The row survives and still lists the file; the
bytes are gone.

The job is live, not dormant — `InfrastructureServiceCollectionExtensions.cs:175` registers it
with `AddHostedService<OrphanedFileCleanupJob>()`, and its interval is one hour. Worth checking
as part of this: `appsettings.Production.json` carries `PresignExpirySeconds: 0`. If that is a
placeholder overridden by an environment variable, fine; if it is the effective value, the cutoff
is `UtcNow` and a file is eligible for collection the moment it lands.

**This is the third instance of exactly this mistake**, and the job's own comments document the
first two at length — the F-03 contract PDFs (fixed 2026-07-31) and the F-05a agency application
docs (2026-08-22), both of which say in a ⚠ block *"confirmedFilePaths, NOT confirmedUrls — the
column stores a storage KEY, and the URL set is compared against `GetPublicUrl(...)`, which a raw
key never matches."* The two KYC/worker lines above them were left on the URL set when the
clients migrated to posting keys.

**Fix:** move those two `UnionWith` calls to `confirmedFilePaths`. Because rows written before
the presign migration still hold absolute URLs, they need to feed **both** sets during the
overlap — key-shaped values into `confirmedFilePaths`, absolute ones into `confirmedUrls` —
rather than being moved wholesale.

**Ask alongside the fix:** whether already-collected documents are recoverable from backups, and
if not, which owners must be asked to re-upload. The admin panel cannot tell a deleted file from
a never-uploaded one — both are a 404 on `/files/{key}`.

**FE today:** the viewer resolves the key correctly (`lib/http/files.ts`, added 2026-08-28) and
reports an honest "missing from storage" when the fetch 404s. It deliberately does not retry:
per the design's own rule, a missing artifact is a server problem, not a retry prompt.
