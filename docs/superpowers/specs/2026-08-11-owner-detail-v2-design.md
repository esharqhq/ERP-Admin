# Owner Detail v2 — weekly work, documents, contact actions, and a layout that stops repeating itself (A2)

**Date:** 2026-08-11
**Follows:** `2026-08-11-owner-detail-actions-design.md` (A1 — admin edit + system-owner gating, shipped)
**Status:** design approved, not yet implemented

---

## 1. What this is

Five changes to one screen. They are specified together because they compete for the same layout, not because they are one feature — §9 splits them into shippable pieces.

| | Change | Backend |
|---|---|---|
| 1 | The owner's **weekly work**, calendar + table, replacing *Recent activity* | ready |
| 2 | **Documents** — what the owner submitted, read-only | ready |
| 3 | **Call** — a `tel:` badge | none needed |
| 4 | **Message** — opens a support ticket | ready, no client |
| 5 | **Layout** — remove the stat row, resolve three duplications, move Properties | one field missing |

## 2. The correction that shaped this

The weekly view was scoped as new work. It is not: `components/tasks/tasks-calendar.tsx` is **already a weekly grid** — rows are task groups, columns are the days of the week, cells carry time and worker count. It sits on the Tasks screen.

Around it:

- `hooks/use-week-navigation.ts` — previous/next week, ISO week number, date-range label. Takes no arguments and is coupled to nothing.
- `useAdminTaskGroups(ownerUserId?, propertyId?)` — **already accepts an owner filter**.
- `useOwnerTaskGroups(id)` — Owner Detail is **already fetching this owner's task groups**, and rendering them as the *Recent activity* timeline.

So the data is on the page today and the weekly grid exists. `TasksCalendar` simply takes no props: it calls `useAdminTaskGroups()` unfiltered and owns its own property filter. Opening it up is the work, not building a calendar.

**What does not exist** anywhere: a weekly table on *Worker* Detail. That page renders a hero card, stat cards, a rating snapshot and a document table — nothing schedule-shaped. `/dashboard/attendance` is a **single-day** report, and `components/workers/assignments-card.tsx` is imported by nothing. There was no pattern to copy; there is now one to share.

## 3. Weekly work view

Replaces `ActivityTimeline` in the left column.

**Two views, one toggle**, as the brief asked:

- **Calendar** — `TasksCalendar` parameterised with `ownerUserId`. Its own property filter stays useful: an owner with six properties still wants to isolate one.
- **Table** — one row per *task*, flattened from the groups: date · property · time · workers · group title · status. Row click → `/dashboard/tasks/{id}`, which already exists.

Week navigation comes from `useWeekNavigation` in both, so switching views keeps the week.

### 3.1 Two columns the brief asked for that the data does not have

**"Xizmat turi" has no backend field.** There is no `serviceType`, and no service catalogue anywhere in the API. The table shows the **task group's `title`** instead — free text the owner wrote when booking ("Weekly cleaning", "Phone order — Frau Weber"), which in practice describes the service because that is what people type there. A real catalogue is a backend card; the column is honest in the meantime because it is labelled as the booking's name, not as a service type.

**A task has many workers, not one.** `TaskItemDto.workers` is an array with `requiredWorkerCount` beside it. The mockup shows a single name. The table renders the first two and `+N`; an unstaffed task shows an em dash, which is a real and common state — that is what `Kutilmoqda` means in the brief.

### 3.2 Three traps in the filters this rides on

F-02a·1 shipped the date window and status filter this needs, and the guide names three hazards:

- **`scheduledTo` is inclusive on a *timestamp*.** A week ending at Sunday `00:00` silently drops all of Sunday. The end bound must be the Sunday `23:59:59.999`, or Monday `00:00` exclusive — `useWeekNavigation.weekEnd` is documented as *"Sunday 00:00 local (start of Sunday)"*, so it cannot be passed through unchanged.
- **Its `400`s are `application/problem+json`**, not this API's `{error}` envelope. `getApiErrorCode` returns `null` for them; `getValidationMessage` is the reader.
- **`ownerUserId` is BOSS-only.** A sub-account returns `200 []` — "no work" rather than "wrong question". Owner Detail is only reachable for BOSS accounts today (the owners table is BOSS-only), so this is latent rather than live, but it must not be read as an empty state if that ever changes.

> The client-side week bucketing stands: there is no weekly server shape, by design.

## 4. Documents

The owner's own submissions — passport, ID, residence permit, and the company-typed documents — read from `useOwnerKyc`, **which A1 already put on this page**. No new request.

**Read-only, with a link to the full screen.** `/dashboard/owner-documents/{ownerProfileId}` already exists and carries the entire review workspace: identity panel, documents panel, contract panel, onboarding stepper. Approve/reject stays there. Rebuilding those actions here would put the same rules in two places, and they would drift.

Two things the original brief asked for that are **not** in this section, because the API cannot do them:

- **Bank details / payment info** — no such field exists on any owner DTO. Not a UI task.
- **Admin-attached documents (invoice, licence)** — upload is `kyc:doc:upload_self`, **Self-scoped**. An admin can approve and reject but cannot upload. Also `OwnerKYCDocType` is a closed enum — `Passport`, `IdCard`, `ResidencePermit`, `BusinessLicense`, `CompanyRegistration`, `TaxCertificate`, `Other` — with no invoice member.

Both are recorded in §8 as backend asks rather than silently dropped.

## 5. Call and Message

### 5.1 Call — a link, and only a link

`<a href="tel:…">` styled as a badge beside the phone number. No backend, no logging.

The original brief also asked to log *"who called, when, and how long it lasted."* A `tel:` link cannot produce any of that — the browser hands the number to the OS and hears nothing back. The only recordable event would be "an admin clicked a button", which is not evidence a call happened; as an audit trail it would be false. Logging is therefore **out of scope by decision**, not by oversight. Real call records need a VoIP integration, which is its own card.

### 5.2 Message — a ticket, not a chat

`POST /api/support-tickets/admin/for-user` (FND-2), permission `support_ticket:create_for_user` (120015). Shipped on the backend; the panel has no client for it, but already has the support inbox and thread UI the ticket lands in.

The form matches the Owner app's flow, plus priority:

| Field | Control |
|---|---|
| `category` | select — Payment · Task · Property · Technical · Account · Other |
| `subject` | text |
| `initialMessage` | textarea |
| `priority` | select — Low · Normal · **High** · Urgent, default Normal |

Errors: `invalid_target_type` (the literal matters — send what the live API accepts for an owner, verified against swagger before shipping, since `index/` and the handoff guide describe it differently), `target_not_found` (404), and **`owner_is_system` (400)** for the walk-in account — which the A1 guard already hides actions for, so this branch is defence rather than a path.

## 6. Layout

```
before                                after
─────────────────────────             ─────────────────────────
[hero]                                [hero: photo · name · role · KYC status]
[role][status][joined][props]         (removed)
┌ Properties ──┐┌ Contact ──┐         ┌ Weekly work ──┐┌ Contact ──┐
│              ││           │         │  cal ⇄ table  ││ Properties│
├ Recent act. ─┤├ Sub-accts ┤         │               ││ Documents │
└─── 2/3 ──────┘└─── 1/3 ───┘         └──── 2/3 ──────┘│ Sub-accts │
                                                       └─── 1/3 ───┘
```

**The stat row goes entirely.** Every one of its four cards repeats something:

| Card | Already shown |
|---|---|
| Role | hero card badge |
| Verified / status | hero card badge |
| Joined | contact card row |
| Properties count | the Properties card's own header |

The brief named the first two. `Joined` is the same duplication and goes with them; the fourth leaves nothing worth a row on its own.

**One status, one place.** The hero card carries the onboarding stage beside the role, under the name — where the brief asked for it, and where the owners *table* renders the same fact, so the two screens agree.

**Properties moves to the right column**, between Contact and Sub-accounts, at that column's width.

### 6.1 The photo cannot be fixed here

The owner's picture renders as initials because **`GET /api/owners/{id}` never returns it**. `OwnerSummaryDto` is seven fields — id, fullName, email, phoneNumber, isVerified, roleCode, createdAt — with no `profilePictureUrl`, confirmed in `OwnerDtos.cs`.

The value exists: `PUT /api/owners/{id}` writes it and `AdminOwnerProfileDto` returns it. Only the read this page uses omits it.

So the hero card is written to render `profilePictureUrl` when present and fall back to initials when not — and it will show initials until the backend adds the field. This is a **backend gap, not a UI defect**, and the fallback is the correct end state either way.

## 7. Files

| File | Change |
|---|---|
| `lib/tasks/weekly-rows.ts` + test | **new** — flatten groups → task rows, bucket by day, format the week bound so `scheduledTo` does not drop Sunday |
| `components/tasks/tasks-calendar.tsx` | accept `ownerUserId?` and an optional preset property filter |
| `components/owners/weekly-work-card.tsx` | **new** — the view toggle, week nav, and the flat table |
| `components/owners/owner-documents-card.tsx` | **new** — read-only list + link |
| `components/owners/message-owner-dialog.tsx` | **new** — the ticket form |
| `components/owners/hero-card.tsx` | photo with initials fallback · onboarding badge · call badge · message button |
| `components/owners/contact-card.tsx` | call badge beside the phone row |
| `components/owners/activity-timeline.tsx` | **deleted** — replaced by the weekly view. Imported only by this page |
| `components/owners/stat-card.tsx` | **deleted** — imported only by this page. Worker Detail has its own `components/workers/stat-card.tsx` and is untouched |
| `lib/services/support.service.ts` · `hooks/use-support.ts` | admin ticket creation |
| `lib/types/support.types.ts` | the admin create request |
| `app/…/owners/[id]/page.tsx` | the new layout |
| `messages/{en,de}.json` · `scripts/verify-v2.mjs` | copy · the admin-ticket request shape |

## 8. Backend asks

Two of these are one message — both are fields on the same DTO.

1. **`profilePictureUrl` on `OwnerSummaryDto`** — blocks §6.1. The value already exists on the entity.
2. **`ownerType` (or `isSystem`) on `OwnerSummaryDto`** — carried over from A1; deletes `useWalkInOwnerId` and closes the two cases where the walk-in guard goes silently inert.

Not blocking, but recorded so they are not rediscovered:

3. **A service catalogue on tasks** — or a decision that the group `title` is the intended display.
4. **Admin-side document upload for an owner**, if admins are ever meant to attach invoices or licences.
5. **Bank / payment fields on the owner**, if that data is meant to live in this system at all.

## 9. Shipping order

Each is independently useful and independently reviewable:

1. **Layout cleanup + call badge** — no new data, immediate legibility win, and it clears the space the rest needs.
2. **Message → ticket** — backend done, thread UI done; the largest value per line.
3. **Documents card** — reads data A1 already fetches.
4. **Weekly work view** — the largest, and the only one that touches a component another screen uses.

## 10. Gates

`tsc` · `eslint` · `vitest` · `next build` · `verify-v2`.

Only `lib/tasks/weekly-rows.ts` is unit-testable — vitest here is node-only over `lib/**` and `hooks/**`. That is where the week-bound arithmetic goes, because an off-by-one there deletes a day of work from the screen without erroring.

Everything else needs the browser, and this repo has no gate that can see whether a card rendered.
