# Backend Asks — ERP-Admin Panel

These are the backend changes required to unblock ERP-Admin (Next.js super-admin panel) features.

> ⚠ **Items #1–6 and (a)–(f) below all shipped** and were wired in commit `9d36d4b` — see
> `FRONTEND-HANDOFF.md`, which is the live contract for them. They are kept here as the record of what
> was asked and why. **Only the section dated 2026-08-07 at the bottom is open.**

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
