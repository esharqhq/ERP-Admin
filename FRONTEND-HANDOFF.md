# Frontend Handoff — ERP-Admin Backend Asks (all shipped)

Every backend ask in `BACKEND-ASKS.md` is **implemented, seeded, and runtime-verified** (sessions 1–6, 2026-06-10/11). This document is the FE contract for wiring the admin panel to them. Nothing below is a proposal — these are the live endpoints.

## Conventions (read first)

- **Base URL:** `http://localhost:5156` (HTTP) / `https://localhost:7249` (HTTPS) in dev. Swagger at `/swagger`.
- **Auth:** `Authorization: Bearer <JWT>` on every request. All admin endpoints require an authenticated admin.
- **JSON casing:** responses are **camelCase** (ASP.NET Core default — no custom naming policy). Request bodies are matched case-insensitively; send camelCase.
- **Enums:** serialized **as strings** in/out (`JsonStringEnumConverter`). e.g. status comes back `"Pending"`, not `1`. Where an int mapping is given below it's the DB value, **1-based** — you won't see the int over the wire, but it's the source of truth if you ever query directly.
- **Error shape:** `400`/`404`/`409` → `{ "error": "error_code", "detail"?: "message" }`. `403` → empty body (`Forbid()`). No success envelope — success returns the data directly or `{ "message": "..." }`.
- **Two admin roles:** `SUPER_ADMIN` (all perms) and `MODERATOR` (subset). Gate the UI with ask #5 below — do **not** assume a moderator holds every permission.
- **Idempotency:** POST endpoints marked `[Idempotent]` accept an `X-Idempotency-Key` header; a repeated key replays the cached 2xx response for 24h (scoped to your user id).

---

## #5 — Current-admin effective permissions  ⭐ wire this first

Drives all client-side gating. It is **`[Authorize]`-only** (intentionally not behind `system:permission:read`) so a MODERATOR can read its own grants.

```
GET /api/admin/me/permissions
```

**Response 200** — raw array of permission-code strings (no wrapper object):

```json
["property:list", "property:create_any", "admin:list", "system:analytics:read", "..."]
```

- Empty array `[]` if the admin has no role assigned.
- Gate every admin action against membership in this array. Stop using the JWT role code alone — moderators and `custom_<uuid>`-role admins need this list.

---

## #1 — Admin analytics home (Dashboard)

```
GET /api/analytics/admin/home
```
**Permission:** `system:analytics:read` (held by SUPER_ADMIN + MODERATOR). No params, no body.

**Response 200** (camelCase):

```json
{
  "totals": { "workers": 0, "owners": 0, "properties": 0, "activeTasks": 0 },
  "statusBreakdown": [ { "status": "Active", "count": 0 } ],
  "topWorkers": [ { "id": "<guid>", "fullName": "Jane Doe", "rating": 4.7 } ],
  "trend": [ { "date": "2026-06-11", "created": 0, "completed": 0 } ],
  "revenueSeries": []
}
```

- `statusBreakdown` — one row per TaskGroup status, **zero-filled** (statuses with no groups still appear with `count: 0`).
- `topWorkers` — up to 10, ordered by `rating` desc then `fullName`.
- `trend` — exactly 30 contiguous days, `[today-29 … today]`, zero-filled. `date` is `YYYY-MM-DD`.
- `revenueSeries` — **always `[]` for now.** No monetary data exists in the domain yet (tracked gap `G_AdminRevenueAnalytics`). Render the revenue widget as empty/"coming soon"; the field shape is `{ date, amount }` for when it lands.

---

## #2 — Attendance report

```
GET /api/admin/attendance?date=YYYY-MM-DD
```
**Permission:** `system:attendance:read` (SUPER_ADMIN + MODERATOR). `date` optional → defaults to **today (UTC)**.

**Response 200** — raw array, **one row per assigned worker** for tasks scheduled that day (absent workers included), ordered by `workerName` then `checkinAt`:

```json
[
  {
    "taskId": "<guid>", "taskGroupId": "<guid>", "taskGroupTitle": "Lobby clean",
    "propertyId": "<guid>", "propertyName": "Haus Berlin",
    "workerId": "<guid>", "workerName": "Jane Doe",
    "scheduledDate": "2026-06-11", "scheduledAt": "2026-06-11T08:00:00Z",
    "taskStatus": "Active",
    "present": true,
    "checkinAt": "2026-06-11T08:03:00Z", "checkinLat": 52.52, "checkinLng": 13.40,
    "checkoutAt": "2026-06-11T16:00:00Z", "submittedAt": "2026-06-11T16:05:00Z",
    "outcome": "Completed"
  }
]
```

- `present` = `checkinAt != null`. **No-shows surface as `present: false`** with null check-in fields — that's by design (scope = all-assigned), so you can render an attendance/absence grid directly.
- `taskGroupTitle` may be null. `checkinLat/Lng` are decimals, null when not checked in.

---

## #3 — Conversations inbox (standalone chat)

```
GET /api/admin/conversations?status=<Open|InProgress|Resolved|Closed>&assignedAdminId=<guid>
```
**Permission:** `conversation:list_any` (SUPER_ADMIN + MODERATOR). Both query params optional.

**Response 200** — array of summaries, ordered by `lastMessageAt ?? createdAt` **desc** (newest activity first):

```json
[
  {
    "id": "<conversation-guid>", "ticketId": "<ticket-guid>",
    "scope": "Support",
    "requesterUserType": "Worker", "requesterId": "<guid>",
    "assignedAdminId": "<guid|null>",
    "ticketStatus": "Open", "ticketPriority": "Normal",
    "lastMessageAt": "2026-06-11T12:00:00Z", "createdAt": "2026-06-10T09:00:00Z"
  }
]
```

- Conversations are currently support-ticket-scoped 1:1 (`scope: "Support"`).
- `ticketStatus` values: `Open` (1), `InProgress` (2), `Resolved` (3), `Closed` (4). `ticketPriority`: `Low`/`Normal`/`High`/`Urgent`.
- `lastMessageAt` is the max non-deleted message time, null if no messages yet.

---

## #6 — SignalR real-time for admins (now live)

The chat hub now authenticates admins over WebSocket and admins can join conversation groups. **The FE hook (`use-conversation-hub.ts`) needs no change** — just connect; the 15s poll fallback can be retired.

- **Hub URL:** `/hubs/chat`
- **Auth over WS/SSE:** pass the JWT in the **query string**, not the `Authorization` header (browsers can't set headers on WebSocket): `wss://<host>/hubs/chat?access_token=<JWT>`
- **On connect:** auto-joined to personal group `user:{userId}`.
- **Subscribe to a thread:** `JoinConversation(conversationId: Guid)` → joins `conv:{conversationId}`. `LeaveConversation(conversationId)` to unsubscribe.
- Admins bypass the participant check (the old `"ADMIN"` vs `"Admin"` casing bug that threw `not_a_participant` is fixed).

---

## #4 — Surface & restore soft-deleted properties

```
GET /api/properties?includeDeleted=true&ownerUserId=<guid>&withMedia=false
```
**Permission:** `property:list`. `includeDeleted` is **honored only if the caller also holds `property:restore`** (otherwise forced to `false` — non-privileged callers never see deleted rows).

**Response 200** — array of `PropertyDto`:

```json
{
  "id": "<guid>", "bossOwnerUserId": "<guid>",
  "name": "Haus Berlin", "address": "...", "lat": 52.52, "long": 13.40,
  "type": "Residential", "entryInstructions": "...", "floorCount": 4,
  "docsStatus": "Approved", "docsRejectReason": null, "docsReviewedAt": "2026-06-01T00:00:00Z",
  "createdAt": "2026-05-01T00:00:00Z",
  "isDeleted": false,
  "media": null
}
```

- `isDeleted` is the one DTO that exposes the soft-delete flag (deliberate, for the restore view). Filter `isDeleted: true` to build the deleted-properties list, then call the existing restore endpoint:

```
POST /api/properties/{id}/restore     (permission: property:restore)
```

---

## (c) — Admin create property on behalf of an owner

```
POST /api/admin/properties
```
**Permission:** `property:create_any` (SUPER_ADMIN). `[Idempotent]` — send `X-Idempotency-Key`.

**Request body** (`ownerUserId` is the target BOSS owner — the property is created under *them*, not the admin):

```json
{
  "ownerUserId": "<guid>",
  "name": "Haus Berlin", "address": "Strasse 1",
  "lat": 52.52, "long": 13.40,
  "type": "Residential",
  "entryInstructions": "Code 1234", "floorCount": 4,
  "docs": null
}
```

- `type` is a `PropertyType` enum string. `floorCount` range 0–500. `docs` optional array of new-doc objects.
- **Prereqs (mirror owner self-create):** the target owner must be a **BOSS** and have **approved KYC** (`kycStatus = Approved` and approved). Otherwise `400` (invalid owner is a bad request, not a 403).
- **Response 201 Created** → `PropertyDto` (same shape as #4), `Location: /api/properties/{id}`.
- Admin **edit + soft-delete** already worked before this (via the controller's `property:list` branch) — only create was the gap.

---

## (d) — Admin self-edit profile (name + avatar)

```
PUT /api/profile
```
**Auth:** `[Authorize]` (any authenticated user; admin branch added). Shares the multi-type `UpdateProfileRequest` body, but for an **admin only two fields take effect**:

```json
{ "fullName": "New Name", "profilePictureUrl": "https://.../avatar.png" }
```

- All other fields (`phoneNumber`, `address`, `age`, `gender`, `experience`, `employeeType`, `professionIds`) are **ignored for admins**.
- **Email is immutable here** — changing an admin's email is reserved for the `admin:update` flow.
- **Response 200** → `{ "message": "profile_updated" }` (returned even when nothing changed; per-field changes are audit-logged as `ADMIN_MODIFIED`).
- The profile page's existing **change-password** flow is unchanged and still works.

---

## (e) — Worker-document status (per-doc decision state)

`WorkerDocument` now persists a decision so the UI can stop re-showing Approve/Reject on an already-decided doc.

**List (admin):**
```
GET /api/admin/workers/{workerId}/docs        (permission: worker:doc:read_any)
```
**Response 200** — array of `WorkerDocumentDto`, newest first:

```json
{
  "id": "<guid>", "type": "Passport",
  "fileName": "passport.pdf", "fileUrl": "https://...",
  "status": "Pending",
  "rejectReason": null,
  "reviewedAt": null, "reviewedByAdminId": null,
  "createdAt": "2026-06-01T00:00:00Z"
}
```

- `status`: `Pending` (1) | `Approved` (2) | `Rejected` (3). Drive button state off this — hide Approve/Reject (or show the decision + reviewer) once `status != "Pending"`.

**Approve:**
```
POST /api/admin/workers/{workerId}/docs/{docId}/approve     (permission: worker:approve)
```
No body. **204 No Content.** Sets `status=Approved`, `reviewedAt`, `reviewedByAdminId`; clears `rejectReason`.

**Reject:**
```
POST /api/admin/workers/{workerId}/docs/{docId}/reject       (permission: worker:reject)
```
Body — reason is required, min 3 chars:
```json
{ "reason": "Document is blurry" }
```
**204 No Content.** Sets `status=Rejected`, `rejectReason`, `reviewedAt`, `reviewedByAdminId`.

---

## (b) — Role delete (clean up orphaned custom roles)

```
DELETE /api/admin/roles/{id}
```
**Permission:** `system:role:delete`.

- **Success → 204 No Content** (soft-deletes the role; audit `ROLE_DELETED`).
- `404 { "error": "role_not_found" }` — unknown id.
- `400 { "error": "system_role_immutable" }` — can't delete a built-in/system role.
- `409 { "error": "role_in_use" }` — role is still assigned to a live admin/owner/worker or an active property membership. Reassign/remove first, then retry.

Use this to clean up the `custom_<uuid>` role orphaned when a custom-override admin-create fails at the create/assign step.

---

## (a) — Localized permission descriptions

The permission catalog now ships **EN + DE** descriptions so the role permission-grid renders human text in either locale instead of raw codes.

```
GET /api/admin/permissions       (permission: system:permission:read)
```

- Each permission row now carries both an English `description` and a German `descriptionDe`. Pick by the active locale.
- ⚠️ **German is first-pass machine translation** — flag for native review before it's treated as final user-facing copy.
- Note: this catalog endpoint is still behind `system:permission:read` (which MODERATOR lacks). For *gating* moderators, use **#5** (`/api/admin/me/permissions`), not this catalog.

---

## Quick reference

| Ask | Method & path | Permission |
|---|---|---|
| #5 | `GET /api/admin/me/permissions` | `[Authorize]` only |
| #1 | `GET /api/analytics/admin/home` | `system:analytics:read` |
| #2 | `GET /api/admin/attendance?date=` | `system:attendance:read` |
| #3 | `GET /api/admin/conversations?status=&assignedAdminId=` | `conversation:list_any` |
| #6 | `WS /hubs/chat?access_token=` + `JoinConversation(id)` | `[Authorize]` (admin bypass) |
| #4 | `GET /api/properties?includeDeleted=true` | `property:list` (+`property:restore` to honor flag) |
| #4 | `POST /api/properties/{id}/restore` | `property:restore` |
| (c) | `POST /api/admin/properties` `[Idempotent]` | `property:create_any` |
| (d) | `PUT /api/profile` (fullName + profilePictureUrl) | `[Authorize]` |
| (e) | `GET /api/admin/workers/{workerId}/docs` | `worker:doc:read_any` |
| (e) | `POST .../docs/{docId}/approve` | `worker:approve` |
| (e) | `POST .../docs/{docId}/reject` (`{reason}`) | `worker:reject` |
| (b) | `DELETE /api/admin/roles/{id}` | `system:role:delete` |
| (a) | `GET /api/admin/permissions` (now EN + DE) | `system:permission:read` |
