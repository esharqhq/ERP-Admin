# Backend Asks — ERP-Admin Panel

These are the backend changes required to unblock the remaining ERP-Admin (Next.js super-admin panel) features. The FE for every other admin-facing capability is complete and verified; each item below is **blocked on a backend change** — the FE cannot proceed until the backend ships it.

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

### (e) Per-doc worker-document status
`WorkerDocument` has **no status field**; `AdminWorkerDocsController` approve/reject are **audit-log-only** and the list DTO returns identical data after a decision. So the admin UI can't show which docs were already approved/rejected (a reviewer re-sees the same Approve/Reject buttons after deciding). Needs a status/decision column on `WorkerDocument` surfaced in `WorkerDocumentDto`. *(Note: property-docs already persist `DocsStatus` correctly — this gap is worker-docs only.)*

---

*Generated from the master gap-analysis plan + per-domain build findings. Everything not listed here is implemented and verified in the ERP-Admin panel.*
