# ERP-Admin v2 Migration — Onboarding, Docs Workspace & Contracts

**Date:** 2026-08-04
**Status:** Approved (design) · **amended 2026-08-04 for F-03·1** (see §18)
**Scope:** Whole admin app, delivered in 5 phases. Rewrites the KYC/worker-approval surface,
adds a shared Docs workspace (owner + worker), a contract registry, server-paged admin tables,
lookup CRUD, and admin-initiated tickets.

**Sources of truth (in this order):**

1. **Live API** — `https://germany-erp.esharq.com` (v2). Verified 2026-08-04 by downloading
   `/swagger/v1/swagger.json` and diffing every DTO named in this spec. The v2 guides say
   "the live response wins"; so does this spec.
2. **Cross-stack guides** — the canonical set lives at `D:\projekts\ERP-Uyer\Backend\docs\handoff\`:
   `onboarding-and-active-gate.md`, `contract-lifecycle.md`,
   **`f-03-1-structured-document-data.md`** (F-03·1, PR #47 — new), `fnd-1-configurable-lookups.md`,
   `fnd-2-admin-initiated-ticket.md`, `fnd-3-table-query.md`.
   ⚠ The copies under `D:\projekts\ERP-Uyer\docs\` are a **2026-08-03 snapshot** and are missing the
   F-03·1 amendments. Read the `Backend\docs\handoff\` set. (The three FND docs are byte-identical in
   both places — verified by diff — so only the two F-03 docs drifted.)
3. This repo's `docs/superpowers/index/` is a **v1 mirror and is stale** (still describes
   `kycStatus`, `isApproved`). Do not trust it for owner/worker/contract work until re-synced.

---

## Problem

`.env.local` points at `https://germany-erp.esharq.com`, and that deployment is **already v2**:
`onboardingStatus` exists; `isApproved` and `kycStatus` appear **zero** times in its swagger.
The admin app is still written against v1, so several screens are broken in production right now:

- the KYC queue sends `?status=1` (a number) where the server expects `?status=Review` (a name);
- `GET /api/admin/workers` returns `PagedResult<WorkerRowDto>` while the app calls `.map()` on it
  as if it were an array;
- every `worker.isApproved` / `kyc.kycStatus` read resolves to `undefined`;
- `POST /api/admin/workers/{id}/reject` now requires `{ reason }` and 400s without it.

Beyond repair, v2 changes *what the admin does*: admin approval no longer unlocks anything. An
account is unlocked by **a signed contract whose period covers today**, and authoring that
contract is admin-only work. The admin app is where that work happens, and today it has almost
no UI for it (one dialog, `components/contracts/contract-form-dialog.tsx`).

## Goals

- Restore correctness against live v2 with the smallest possible first change.
- One **Docs workspace** used by both owner and worker sides — identical UI, one component set,
  one adapter per side. Review documents → approve/reject → author a contract → send → track.
- Make the contract lifecycle fully operable from the admin panel: draft, send, recall, renew,
  read the generated PDFs, and see contracts that were sent but never signed (nothing on the
  backend chases those).
- Adopt the FND-3 paged-table pattern for the Owners and Workers directories, with server-side
  filtering, sorting and CSV/XLSX export.
- Ship FND-1 lookup CRUD and the FND-2 admin-initiated ticket.
- Keep the app fully working at the end of every phase.

## Non-goals

- **No delete/terminate of contracts.** Product decision: the admin never deletes a contract.
  The recovery path for wrong terms is Recall → edit draft → send again. `DELETE
  /api/contracts/admin/{owner|worker}/{contractId}` stays unused.
- ~~**No per-document approve/reject.**~~ **Reversed 2026-08-04 (§18):** F-03·1 added the owner
  mirror, so per-document review is now in scope on both sides. Original rationale, kept for the
  record: the worker side had per-doc endpoints; they would stay unused so
  that the owner and worker screens are identical (owner has no such endpoints — see §4.3).
- **No pre-send PDF preview.** The backend renders the preview PDF only on `Draft → Sent`. The
  admin sees the real PDF after sending; that was accepted as normal.
- No bulk actions and no server-side saved views — neither exists in the API (FND-3 §7.4).
  Filter state lives in the URL instead.
- No changes to properties, tasks, dispatch, leave, attendance, chat beyond the gate-error and
  `isApproved` fixes listed in §13.
- No test runner is introduced (the repo has none); verification is type-check, lint, build and a
  scripted live-call checklist per phase.

---

## 1. What changed in the backend (verified live)

**One status field replaces two concepts.** `OwnerProfile.kycStatus` and `isApproved` (both sides)
are gone. Everything reads `onboardingStatus`:

```
Kyc → Review → Approved → Contract → Active
        └──→ Rejected ──┘                │
  ↑                                      │
  └──── (cover lapsed / docs changed) ───┘
```

Live enums:

| Enum | Values |
|---|---|
| `OnboardingStatus` | `Kyc` `Review` `Rejected` `Approved` `Contract` `Active` |
| `ContractStatus` | `Draft` `Sent` `Signed` `Expired` `Terminated` |
| `ContractPhase` | `Draft` `Sent` `Scheduled` `InForce` `Lapsed` `Expired` `Terminated` |
| `AccountStatusFilter` | `Active` `Pending` `Deleted` `Blocked` |
| `SortDir` | `Asc` `Desc` |
| `OwnerKYCDocType` | `Passport` `IdCard` `ResidencePermit` `BusinessLicense` `CompanyRegistration` `TaxCertificate` `Other` |

Live shapes this spec depends on:

```
KycProfileSummaryDto  { ownerProfileId, ownerUserId, ownerName, ownerEmail,
                        onboardingStatus, onboardingRejectReason, onboardingReviewedAt,
                        documentCount }
KycProfileDto         { ownerProfileId, ownerUserId, onboardingStatus,
                        onboardingRejectReason, onboardingReviewedAt,
                        identity, company, documents[] }                  ← F-03·1
KycDocDto             { id, type, fileName, fileUrl, status, rejectReason,
                        reviewedAt, reviewedByAdminId, createdAt }        ← F-03·1
OwnerIdentityDto      { firstName, lastName, passportNumber, passportExpiry }
WorkerIdentityDto     { firstName, lastName, passportNumber, passportExpiry, licenseExpiry }
OwnerCompanyDto       { id, name, type, licenseNumber, licenseExpiry, registrationDate,
                        countryId, countryNameDe, countryNameEn,
                        cityId, cityNameDe, cityNameEn, taxNumber }
CompanyType           Llc | Gmbh | IndividualEntrepreneur | SoleTrader | Other
KycApprovalDto        { ownerProfileId, onboardingStatus, onboardingRejectReason, prefill }
WorkerApprovalDto     { id,             onboardingStatus, onboardingRejectReason, prefill }
ContractPrefillDto    { subjectType, subjectId, fullName, email, phoneNumber }
WorkerDocumentDto     { id, type, fileName, fileUrl, status, rejectReason,
                        reviewedAt, reviewedByAdminId, createdAt }        ← has status
WorkerDetailDto       { …, onboardingStatus, onboardingRejectReason, onboardingReviewedAt,
                        identity, professions[], documents[] }            ← no isApproved; identity is F-03·1
OwnerRowDto           { id, fullName, email, phoneNumber, status, onboardingStatus,
                        isVerified, propertyCount, createdAt }
WorkerRowDto          { id, fullName, email, phoneNumber, status, onboardingStatus,
                        employeeType, skills[], rating, experience, completedTasks,
                        hasActiveContract, onTask, createdAt }
PagedResult<T>        { items[], total, page, pageSize, totalPages }
AdminOwnerContractDto { id, eligibleFrom, eligibleTo, fileName, fileUrl, isActive, createdAt,
                        status, phase, sentAt, signedAt, documentUrl,
                        ownerProfileId, ownerUserId, ownerFullName, ownerEmail,
                        revisionReason, revisionRequestedByUserId, revisionRequestedAt,
                        renewalStartsAt, previewUrl }
AdminWorkerContractDto = same, with workerId / workerFullName / workerEmail
CreateOwnerContractRequest  { eligibleFrom, eligibleTo, fileName, fileUrl,
                              commissionPercent, paymentOrder, generalTerms, extraClauses }
CreateWorkerContractRequest { eligibleFrom, eligibleTo, fileName, fileUrl }   ← 4 fields only
```

**Deviations from the written guides, found in live swagger.** These win:

1. `X-Idempotency-Key` is **required** (not optional) on
   `POST /api/contracts/admin/{owner|worker}/{id}/renew` and on
   `POST /api/support-tickets/admin/for-user`. Always send `crypto.randomUUID()`.
2. `AdminOwnerContractDto` also carries `revisionRequestedByUserId`, not mentioned in the guide.
3. Table query parameters are declared PascalCase (`Search`, `OnboardingStatus`, `SortBy`, `Dir`,
   `Page`, `PageSize`). ASP.NET binds case-insensitively, so camelCase works; documented so
   nobody "fixes" a non-bug.
4. `GET /api/system/settings/{key}` exists — a single setting can be read without pulling all of
   them (used for the contract template).

---

## 2. Architecture decisions

### 2.1 One component set, two adapters

The owner and worker Docs screens must look and behave identically, but they sit on different
endpoints, different DTOs, and a different number of contract fields. The seam is an adapter;
components never learn an endpoint.

```ts
// lib/onboarding/subject-adapter.ts
export interface OnboardingSubjectAdapter {
  kind: "owner" | "worker";

  useRows(query: DocsQuery): { rows: SubjectRow[]; total: number; isLoading: boolean };
  useDetail(id: string): { subject: SubjectDetail; documents: SubjectDoc[]; isLoading: boolean };

  useApprove(): (id: string) => Promise<ContractPrefillDto>;
  useReject():  (id: string, reason: string) => Promise<void>;

  useContracts(contractSubjectId: string): SubjectContract[];
  contractActions: {
    createDraft(contractSubjectId: string, body: ContractFormValues): Promise<SubjectContract>;
    updateDraft(contractId: string, body: ContractFormValues): Promise<SubjectContract>;
    send(contractId: string): Promise<SubjectContract>;
    recall(contractId: string, reason: string): Promise<SubjectContract>;
    renew(contractSubjectId: string, body: ContractFormValues): Promise<SubjectContract>;
  };

  contractFields: "owner" | "worker";        // 8-field vs 4-field form
  sortableColumns: readonly string[];        // server whitelist, per side
  routes: { list: string; detail(id: string): string };
}
```

Two implementations: `lib/onboarding/owner-adapter.ts`, `lib/onboarding/worker-adapter.ts`.

### 2.2 Normalized shapes

```ts
interface SubjectRow {
  id: string;                 // owner: ownerProfileId  | worker: workerId
  contractSubjectId: string;  // owner: ownerUserId     | worker: workerId
  name: string | null;
  email: string | null;
  phone: string | null;
  onboardingStatus: OnboardingStatus;
  rejectReason: string | null;
  reviewedAt: string | null;
  documentCount: number | null;   // owner: number | worker: null (not in WorkerRowDto)
  createdAt: string;
}

interface SubjectDoc {
  id: string;
  type: string | null;        // localized for display via i18n key lookup
  fileName: string | null;
  fileUrl: string | null;     // storage key → `${filesBase}/files/${fileUrl}`
  createdAt: string;
}
```

`contractSubjectId` is the whole reason this indirection exists: **admin KYC routes take
`ownerProfileId`, admin contract-authoring routes take `ownerUserId`.** Both come back on every
KYC response, so the adapter carries both and no component has to know.

`SubjectDoc` deliberately omits the worker-only `status` / `rejectReason` / `reviewedAt` fields —
see §2.3.

### 2.3 Data-source asymmetry (contained in the adapters)

| | Owner | Worker |
|---|---|---|
| List endpoint | `GET /api/admin/kyc` (`?status=`) | `GET /api/admin/workers` (full query) |
| List response | bare array | `PagedResult<WorkerRowDto>` |
| Search / sort / paging | **client-side** over the array | **server-side** |
| Document count | `documentCount` present | absent from the DTO |
| Per-document review | `…/docs/{docId}/approve\|reject` — **added by F-03·1** | `…/docs/{docId}/approve\|reject` (pre-existing) |
| Identity block | `identity` + nullable `company` on the profile read | `identity` on `WorkerDetailDto` |
| Detail endpoint | `GET /api/admin/kyc/{ownerProfileId}` (also `/owner/{ownerUserId}`) | `GET /api/admin/workers/{id}` |
| Account approve/reject | `POST /api/admin/kyc/{ownerProfileId}/approve|reject` | `POST /api/admin/workers/{id}/approve|reject` |

Client-side paging for the owner list is acceptable at current scale (the list is BOSS owners
holding a KYC profile row only — sub-accounts never appear) and follows the existing repo pattern
(`useAttendanceTable`, `useTableFilters`). When the backend adds a paged owner KYC list, only
`owner-adapter.ts` changes.

**Per-document review is used on both sides** (revised 2026-08-04 — see §18). The original decision
ruled it out because only the worker side had per-document endpoints and asymmetric screens would
split the admin's mental model. F-03·1 added the owner mirror, so the symmetry constraint is now
satisfied *with* per-document review rather than without it.

Three behaviours the UI must carry, all of them counter-intuitive:

- **A per-document decision does not move `onboardingStatus`.** Approving all six documents does not
  approve the subject; the admin still presses the account-level Approve. The two actions must be
  visually distinct.
- **A per-document decision notifies nobody** — no bell row, no push, no email. The account-level
  rejection is the only thing that tells the subject to come back. So the screen must say it plainly:
  reject the files, then reject the bundle, or the subject is never told.
- **Approving a document clears its `rejectReason`.**

`status` is TitleCase on the wire on **both** sides — `"Pending"` | `"Approved"` | `"Rejected"`.
(An earlier revision of this spec said `PENDING`; that was wrong. The repo's pre-existing comment in
`lib/types/worker.types.ts` had it right.)

### 2.4 `phase` is the truth; `onboardingStatus` lags

`onboardingStatus` is a stored projection maintained by an hourly job. The ACTIVE gate computes
cover live from contract rows. In two narrow windows they disagree (force-terminating a running
contract while a successor is `Sent`/`Scheduled`; future-dated cover authored after all cover had
lapsed): the row says `Active`, the gate returns `403 contract_not_yet_active`.

**Rule for this app:** any statement about *current* cover is derived from a contract row with
`phase: "InForce"`. `onboardingStatus` is only ever rendered as a stage badge. The same applies to
`WorkerRowDto.hasActiveContract`, which reads the lagging `isActive` mirror (≤ 1 h stale) — it is
offered as a filter with a tooltip, never as a source of truth.

### 2.5 File layout

```
lib/types/
  onboarding.types.ts   NEW   OnboardingStatus, ContractStatus, ContractPhase, ContractPrefillDto
  paged.types.ts        NEW   PagedResult<T>
  kyc.types.ts          REWRITE
  worker.types.ts       EDIT  drop isApproved; add WorkerRowDto, WorkerListQuery
  owner.types.ts        EDIT  add OwnerRowDto, OwnerListQuery
  contract.types.ts     REWRITE  status/phase/sentAt/signedAt/documentUrl/previewUrl/
                                 revisionReason/revisionRequestedAt/renewalStartsAt
                                 + owner term fields + worker 4-field variant
  lookup.types.ts       NEW   PropertyCategoryDto, CountryDto, CityDto (+ create/update)

lib/onboarding/
  status.ts             NEW   badge variant + i18n key for OnboardingStatus and ContractPhase
  errors.ts             NEW   error code → i18n key + UI reaction
  subject-adapter.ts    NEW   interface + shared normalizers
  owner-adapter.ts      NEW
  worker-adapter.ts     NEW
  contract-template.ts  NEW   read the template setting for read-only display (see §4.5)

lib/services/
  kyc.service.ts        EDIT  status is a name; approve/reject return prefill
  worker.service.ts     EDIT  paged list + typed query; reject requires reason
  owner.service.ts      EDIT  paged /api/admin/owners + export
  contract.service.ts   EDIT  + getOne, send, recall, updateDraft; renew sends X-Idempotency-Key
  lookup.service.ts     NEW
  support.service.ts    EDIT  + openForUser (X-Idempotency-Key)
  export.service.ts     NEW   blob download helper shared by both exports

hooks/
  use-paged-table.ts    NEW   URL-synced page/pageSize/sort/filters for server-paged tables
  use-docs-workspace.ts NEW   detail orchestration: approve → author → send → recall → renew
  use-lookups.ts        NEW
  use-kyc.ts / use-workers.ts / use-owners.ts / use-contracts.ts   EDIT to v2

components/docs-workspace/          NEW — used by both sides
  docs-table.tsx
  docs-filter-bar.tsx
  subject-detail.tsx                70/30 layout + stepper
  onboarding-stepper.tsx
  documents-panel.tsx
  document-viewer-modal.tsx
  review-actions.tsx                account-level Approve / Reject+reason
  contract-form.tsx                 owner 8 fields / worker 4 fields
  contract-state-panel.tsx          Sent/Signed/Scheduled state, PDF links, Renew
```

### 2.6 Routes and navigation

Next.js route groups (`(owner)`, `(worker)`) do not contribute a URL segment, so two `docs`
folders would both resolve to `/dashboard/docs` and collide. Distinct paths:

| Sidebar group | Label | URL | Notes |
|---|---|---|---|
| Owner | **Docs** | `/dashboard/owner-documents`, `/[ownerProfileId]` | replaces `/dashboard/kyc` (page deleted, nav item renamed) |
| Worker | **Docs** | `/dashboard/worker-documents`, `/[workerId]` | existing page rewritten |

Sidebar groups stay exactly as they are today — owner review under Owner, worker review under
Worker. Permission gates: `kyc:read` for the owner item (unchanged), `worker:list` for the worker
item (unchanged).

---

## 3. Docs workspace — list screen

Identical on both sides. Default view is **everything**, filtered from the top (product decision;
a shared admin-wide filter system will replace this bar later, so keep it self-contained).

```
[🔍 name / email / phone]   [Status ▾ All]   [Registered: from — to]   [Clear]
Quick filter:  ( Review 7 )
```

Rich per-domain filters (employeeType, professions, rating, hasActiveContract, propertyCount) are
**not** here — they belong to the Owners/Workers directories (§7). That keeps both Docs screens
identical.

Columns:

| Subject (name + email/phone) | Status badge | Docs | Reviewed | Reason | Registered |
|---|---|---|---|---|---|

`Docs` renders `documentCount` on the owner side and `—` on the worker side. The whole row is a
link (`components/ui/row-link.tsx`) to the detail screen. **There are no approve/reject actions in
the table** — every decision happens in the detail screen.

Status badges (`lib/onboarding/status.ts`, shared with every other screen):

| Status | Variant | Meaning shown |
|---|---|---|
| `Kyc` | outline | waiting for documents (subject has not submitted) |
| `Review` | accent | **needs an admin decision** |
| `Rejected` | destructive | rejected, with reason |
| `Approved` | default | approved, contract not yet sent |
| `Contract` | secondary | contract sent, awaiting signature |
| `Active` | success | contract in force |

Sorting is offered on **Subject** and **Registered** only — both are in the server whitelist on
both sides (`fullName`, `createdAt`). Anything else returns `400 invalid_sort_column`, so the
adapter's `sortableColumns` is the single source for which headers are clickable.

Paging: `components/ui/table-pagination.tsx`, `pageSize` default 25, capped at 100 client-side
(the server silently clamps above 100).

---

## 4. Docs workspace — detail screen

```
← Docs                                 Hans Müller · boss@example.com      [Review]
┌────────────────────────────────────────────────────────────────────────────────────┐
│  ① Documents ────── ② Contract ────── ③ Awaiting signature ────── ④ In force      │
└────────────────────────────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────┬────────────────────────────────────────┐
│ 70% — CONTRACT                            │ 30% — SUBMITTED DOCUMENTS              │
│                                           │                                        │
│ For: Hans Müller · +49301234567 (prefill) │  ▸ Passport                            │
│                                           │    passport.pdf · 30.07.2026           │
│ Period      [01.08.2026] — [31.07.2027]   │  ▸ Business licence                    │
│ Commission %[12.5]                        │    licence.pdf · 30.07.2026            │
│ Payment order [Monthly, net 14 days]      │  ▸ Tax certificate                     │
│ General terms [                        ]  │    tax-cert.pdf · 30.07.2026           │
│ Extra clauses [                        ]  │                                        │
│ Source file   [upload PDF]                │  (click → modal viewer)                │
│                                           │  ──────────────────────────────────    │
│        [ Save draft ]   [ Send ]          │  [ ✓ Approve ]   [ ✕ Reject ]          │
└───────────────────────────────────────────┴────────────────────────────────────────┘
```

### 4.1 Stepper state machine

Derived from `onboardingStatus` plus the subject's contract rows (`phase`):

| State | Step | Left panel | Right panel |
|---|---|---|---|
| `Kyc` | ① | form editable, **save/send disabled** | Approve **and** Reject **disabled** — "subject has not submitted yet" (the server requires `Review` for both) |
| `Review` | ① | form editable, save/send disabled | Approve / Reject **enabled** |
| `Rejected` | ① | disabled | reason shown + "waiting for re-submission" |
| `Approved` | ② | form **fully enabled** — Save draft / Send | list read-only |
| `Contract` + `phase: Sent` | ③ | sent contract + **preview PDF** + `Recall` (reason) | read-only |
| `Active` + `phase: InForce` | ④ | contract read-only + **signed PDF** + `Renew` in the header | read-only |
| `phase: Scheduled` | ④ | "cover starts {date}" — **not an error state** | read-only |
| `phase: Lapsed` / `Expired` | ④ | rendered identically (the difference is a ≤1 h job artifact) | read-only |

The form is editable while the subject sits at `Kyc`/`Review` so the admin can type while reading
the documents (matching how the work is actually done); after a rejection it is disabled until the
subject re-submits. **Save draft / Send stay disabled until the subject is `Approved`** —
the backend refuses authoring with `409 onboarding_not_approved` otherwise. The stepper makes that
order visible instead of surprising the admin with an error.

`prefill` (`fullName`, `email`, `phoneNumber`) comes back from the approve call and is rendered in
the "For:" summary block. It does **not** fill contract fields — those fields do not exist in the
contract request. There is no document data extraction (no OCR anywhere in the API); the admin
reads the document in the modal and types.

### 4.2 Documents panel

- **Identity block at the top, read-only.** `firstName`, `lastName`, `passportNumber`,
  `passportExpiry` — the legal names off the passport, which are allowed to differ from the account's
  display `fullName` and are never reconciled with it. Flag an expiry that is past or within 30 days:
  the expiry ladder now acts on it (§5, §10).
- **Company block below it, read-only, and only when present.** `company: null` means **the owner is a
  natural person** — render that as a stated fact ("Natural person"), never as an empty form. There is
  no `isLegalEntity` flag anywhere; the row's absence *is* the fact.
  `OwnerCompanyDto` carries resolved `countryNameDe/En` and `cityNameDe/En` alongside the ids, so the
  block renders without a lookup call. ⚠ `type` must be mapped to a display label by us —
  `CompanyType` serializes as `Gmbh`, `IndividualEntrepreneur`, … and the backend's own PDF prints
  those raw. No rule derives `GmbH` from `Gmbh`; keep an explicit label map.
- **Identity and company are never editable here.** Only the subject writes them, only while at
  `Kyc`/`Rejected`, and **no admin correction endpoint exists**. The correction loop is: admin rejects
  with a reason → subject edits → subject re-submits. Say that in the UI where an admin would
  otherwise look for an edit affordance.
- Document list: localized type label, file name, upload date, **`status` badge**
  (`Pending`/`Approved`/`Rejected`) and the per-document `rejectReason` when set.
- Click → `document-viewer-modal.tsx`: `{filesBase}/files/{fileUrl}` is **public, unauthenticated**
  (KYC and worker documents were deliberately left public). PDFs in an `<iframe>`, images in
  `<img>`, anything else gets a download link.
- **Per-document actions** (`✓` / `✕` with a reason) — identical on both sides:
  `POST /api/admin/kyc/{ownerProfileId}/docs/{docId}/approve|reject` and
  `POST /api/admin/workers/{workerId}/docs/{docId}/approve|reject`, both `204`, both on the
  *account-level* permissions (`kyc:approve`/`kyc:reject`, `worker:approve`/`worker:reject`) — nothing
  new to seed. A wrong `docId`/subject pair is `404 kyc_doc_not_found`.
- **The panel must state that per-document decisions are silent.** They emit no notification of any
  kind and do not move `onboardingStatus`. Copy: reject the files, then reject the bundle — otherwise
  the subject is never told. This is the single most likely way an admin misuses the screen.
- Account-level actions at the bottom, visually separated from the per-document row actions:
  `Approve` and `Reject` (reason required, validated client-side before the call as well, because the
  server returns `400 rejection_reason_required`). Only these move `onboardingStatus`, and only they
  notify.
- A per-document reject may also fail model validation *before* the service guard, returning a
  model-validation body rather than `{"error": …}`. Require the reason client-side so neither shape is
  ever hit.

### 4.3 Contract authoring rules

- **Dates are always serialized with `Z`.** A naive `"2026-08-01T00:00:00"` returns **500**, not
  400, with no `{error}` body. A single `toUtcIso()` helper is used for every contract date.
- **`eligibleFrom` may come back snapped.** The server moves a start inside the ≤24 h chain slack
  to the exact boundary of previous cover. After any create/renew/update, the form is re-seeded
  from the response, never from local state.
- **Source file presign uses `category: "contract-sources"`** — never `"contracts"`. The
  `contracts/` prefix is signature-protected and `fileUrl` is never signed, so a source uploaded
  there 404s for everyone including the admin who uploaded it.
- **`fileUrl` is echoed verbatim.** Always post the presign response's `storageKey`, never its
  `publicUrl`.
- **Generated PDFs are short-lived signed URLs** (default 300 s), minted per read. Never persisted
  in state or cached: follow them immediately. A 404 means "expired link" far more often than
  "missing file" — re-read the contract once and retry, then surface an error.
- **`previewUrl` is minted from `status`, not from storage.** A fresh URL that still 404s means the
  artifact is genuinely missing; retry once, then stop and report it as a backend problem.
- **Recall, not delete.** `Sent → Draft` with a reason is how wrong terms are withdrawn; the
  reason lands on `revisionReason` and is shown on the draft edit screen. A subject's own rejection
  arrives the same way, so the corrected contract stays one row with one history.
- **Renew is the only action on a signed contract.** `PUT` is legal only while `Draft`
  (`400 invalid_contract_transition` otherwise). The header button reads "Renew" and is intended
  for expiry/renewal, which is exactly what the product asked "Edit" to do. `Terminate` is not
  exposed anywhere.
- Renew sends `X-Idempotency-Key` (required). The key is minted **once per renewal attempt** and
  reused on retry — that is the whole point of the header. Generating it per request would turn a
  retried renewal into a second draft, which is exactly what it exists to prevent.

### 4.4 Error → UI catalog

`lib/onboarding/errors.ts` maps a code to an i18n key and a reaction. Branch on the `error` string,
not the HTTP status — several routes map not-found to 400.

| Code | HTTP | Reaction |
|---|---|---|
| `onboarding_not_approved` | 409 | "Approve the documents first" + move the stepper to ① |
| `contract_template_not_approved` | 409 | "Contract template is not approved yet" + link to Settings → Contract |
| `contract_already_sent` | 409 | "A contract is already out for signature" + link to that contract |
| `contract_period_overlaps` / `contract_period_gap` / `invalid_contract_period` | 400 | inline error under the period fields |
| `no_active_contract_to_renew` | 400 | "Nothing to renew" — offer Create instead |
| `invalid_contract_transition` | 400 | "This contract can no longer be edited" + refetch |
| `invalid_onboarding_transition` | 400 | "State changed elsewhere" + refetch |
| `rejection_reason_required` / `revision_reason_required` | 400 | required-field error on the reason input |
| `kyc_profile_not_found` / `worker_not_found` / `kyc_documents_required` | **400** | not-found / empty state (swagger says 404; runtime says 400) |
| `contract_not_found` | 404 | not-found state |
| `kyc_doc_not_found` | **404** | per-document approve/reject with a wrong `docId`/subject pair — refetch the document list |
| `incomplete_identity_data` | 400 | **F-03·1** — the subject's own submit failed its identity check. The admin cannot fix it (no correction endpoint): surface it as "the subject's identity data is incomplete" and offer the reject-with-reason path |
| `onboarding_locked` | **409** | **F-03·1** — an identity/company write past `Kyc`/`Rejected`. The admin app never writes these, so this code should be unreachable here; catalogued so an unexpected occurrence is legible instead of falling into "unknown" |
| *(empty body)* | 403 | "Your role lacks this permission" — an **empty** 403 body is a permission problem |
| *(body with `error`)* | 403 | the ACTIVE gate — see §12.1 |
| *(`{"error":"forbidden","detail":"<code>"}`)* | **403** | **F-03·1, third flavour** — an unmapped authorization failure fell through to the global middleware, so the real code is in **`detail`**, not `error`. `describeApiError` must read `detail` when `error === "forbidden"`, otherwise every one of these degrades to "unknown" |

### 4.5 Contract preview content

The product asked that the preview show the real contract content. That content lives in backend
system settings (`contract.template.owner.en`, `contract.template.worker.en`) as a body with
`{{token}}` substitution, readable via `GET /api/system/settings/{key}`.

Decision: **no pre-send preview is built.** The admin sends and then reads the server-rendered
`previewUrl`, which is the actual artifact the subject sees. `lib/onboarding/contract-template.ts`
is still created, but only to render the template text (read-only) inside the Settings screen, so
an admin can see what will be generated before approving the template flag.

Implementation note: the token names are not documented anywhere. Read the live value of
`contract.template.owner.en` as the first task of the Phase 1 plan and record the token list there.
Today the template body is a placeholder (11 clauses reading `[PLACEHOLDER — NOT LEGAL TEXT]`,
no company data), so the UI must not imply a legally complete document.

---

## 5. Contracts registry (`/dashboard/contracts`)

Authoring moves into the Docs workspace, so this page becomes monitoring only. **Rule: actions in
one place (Docs), oversight in another (Contracts).** Rows link into the Docs detail.

```
Contracts                                            [Owner] [Worker]
[Phase ▾ All]  [🔍 subject]
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⚠  Unsigned: 3 contracts sent, no response                                   │
│    Hans Müller — sent 12 days ago                              → open        │
├──────────────────────────────────────────────────────────────────────────────┤
│ ⏳ Expiring within 30 days: 2                                    → renew      │
└──────────────────────────────────────────────────────────────────────────────┘
│ Subject     │ Period            │ Phase       │ Sent      │ Signed     │
```

- The **unsigned block is the point of the page.** Nothing on the backend chases an unsigned
  contract: the subject gets one notification at send and then silence, and the expiry ladder only
  watches *signed* cover. Built from `phase == "Sent"`, sorted by `sentAt`.
- The **expiring block** lists `phase: "InForce"` rows whose `eligibleTo` is within 30 days, linking
  to Renew in the Docs detail. ⚠ **F-03·1: a contract's end date is no longer the only thing that can
  end cover.** The hourly job counts down to the *earliest* of the contract's cover end, the subject's
  `passportExpiry`, and a licence expiry (the owner's company licence or the worker's own). So this
  block understates the risk: a subject whose licence lapses next month is not in it. Surface the
  document expiries in the Docs detail (§4.2) and treat this block as "contract-driven expiry only".
- `GET /api/contracts/admin/{owner|worker}` is **unpaginated and unfiltered** — it returns every
  contract for every subject. Filtering is client-side; recorded as a backend ask (§16).
- `Scheduled` renders as upcoming cover, never as a problem. `Lapsed` and `Expired` render
  identically.
- ⚠ **`Terminated` vs `Expired` became load-bearing in F-03·1.** When a passport or licence lapses,
  the job retires **every** signed row and stamps each on **its own** date: a period that genuinely
  elapsed → `Expired` ("ran its full term"), one still in-period and cut short → **`Terminated`**
  ("ended early"). One lapse can produce both in the same list. Render `Terminated` as *ended early*,
  never as *expired* — and note that `phase` alone cannot distinguish a compliance-driven end from an
  admin force-terminate. Only the audit log can: `ONBOARDING_REVERTED_TO_KYC` is never written by a
  force-terminate, and its metadata carries `revertSource` plus separate `expiredContractIds` and
  `terminatedContractIds` lists.
- A consequence worth designing for: **a contract with months left can vanish from a subject's list
  without any admin action.** If an admin asks why, the answer is in that audit row.

---

## 6. Settings — "Contract" category

Added to the existing category-grouped settings page.

| Key | Control | Notes |
|---|---|---|
| `contract.template.approved` | Switch | **Seeded `false`.** While false, every send returns `409`. Copy must say plainly: no contract can be sent to anyone until this is on. Flipping it is a deliberate one-time human act |
| `contract.template.owner.en` | Textarea (read-only preview + edit) | `{{token}}` body; today a placeholder skeleton |
| `contract.template.worker.en` | Textarea | worker body (no commission clause) |
| `onboarding.expiry.warn_days` | text (`30,14,7`) | warning rungs |
| `onboarding.expiry.daily_from_days` | number (`7`) | daily repeat through the final week |
| `onboarding.expiry.ticket_days` | number (`7`) | day a system support ticket opens automatically |
| `onboarding.expiry.block_days` | number (`1`) | ⚠ moves **only the final admin alert**. The 24 h booking-creation stop is a separate hardcoded constant in the booking engine. The setting's server-side description claims otherwise and is wrong — the UI must not repeat it |

---

## 7. FND-3 — Owners and Workers directories

Different purpose from Docs: the full catalogue, rich filters, export.

- `GET /api/admin/owners` — `search`, `status` (`Active|Pending|Deleted|Blocked`),
  `onboardingStatus`, `registeredFrom/To`, `propertyCountMin/Max`, `sortBy`
  (`fullName|createdAt|propertyCount`), `dir`, `page`, `pageSize`.
- `GET /api/admin/workers` — the above plus `employeeType`, `professionIds` (repeatable, match-any),
  `ratingMin`, `includeUnrated`, `experienceMin/Max`, `completedMin/Max`, `hasActiveContract`,
  `onTask`; `sortBy` adds `rating|experience|completedTasks`.
- `use-paged-table.ts` keeps page/pageSize/sort/filters **in the URL query**, which makes views
  shareable and covers the "saved views" gap the API deliberately left to clients.
- Omitting `status` excludes `Deleted`. `Blocked` means "was covered once and isn't now" — the
  filter label must say that, not "banned".
- Export: `/export?format=csv|xlsx` with the *same* params (paging ignored), streamed as an
  attachment. `format` defaults to `csv`; an unknown value is `400 invalid_format`; more than
  50,000 matching rows is `400 export_too_large` → "narrow the filter" (there is no async export).
  Every export writes an audit row and is PII egress, so the button carries a "this action is
  logged" note.
- Sorting outside the whitelist returns `400 invalid_sort_column`; inconsistent ranges return
  `400 invalid_filter_value` (e.g. `registeredFrom > registeredTo`) — validate client-side first.
- `hasActiveContract` is a lagging mirror (≤ 1 h); tooltip says so.
- The legacy `GET /api/owners` admin listing is retired (404). `GET /api/owners/{id}` and
  `GET /api/owners/{id}/sub-accounts` still exist and are unaffected.

---

## 8. FND-1 — Lookup CRUD

Placed beside the existing `settings/professions`, which is the same pattern:

```
/dashboard/settings/property-categories   NEW
/dashboard/settings/countries             NEW  (expanding a row reveals that country's cities)
```

- One shared CRUD form: `nameDe` + `nameEn` required; `code` accepted **only on create**
  (immutable afterwards, silently ignored on update); `isActive` is the only lifecycle field —
  **no delete endpoint exists anywhere in this domain**.
- Update DTOs are all-nullable = "leave unchanged"; send only what changed.
- `includeInactive=true` is honored **only** for callers holding that entity's `:update`
  permission, and is silently ignored (not 403) otherwise. If the "show inactive" toggle appears
  to do nothing, check permissions before filing a bug.
- Deactivating a country does **not** cascade to its cities; the UI must not invent that rule.
- Deactivating never breaks existing references — a property tagged `HOTEL` keeps rendering
  "Hotel"; only new-selection pickers hide it.
- Names render by locale (`nameDe`/`nameEn`); there is no `?lang=`.
- Errors: `code_exists`, `name_exists` (city name unique per country), `country_not_found`.

---

## 9. FND-2 — Admin-initiated ticket

One dialog, three entry points: Docs detail (ask before rejecting), Owner/Worker detail, and the
Support inbox ("New ticket").

- `POST /api/support-tickets/admin/for-user` with **required** `X-Idempotency-Key`.
- `targetUserType` is a case-sensitive literal `"Worker"` / `"Owner"`; anything else is
  `400 invalid_target_type`. `targetUserId` unknown or soft-deleted → `404 target_not_found`.
  ⚠ The guide's prose says `"Owner"` while its own error catalog names `OwnerUser` — the exact
  owner-side literal must be confirmed with one live call before this dialog ships.
- `category`: `Payment|Task|Property|Technical|Account|Other`; `priority`:
  `Low|Normal|High|Urgent` (default `Normal`).
- ⚠ In the response, `requesterUserId`/`requesterUserType` are the **recipient**, not the admin.
  `assignedAdminId` is the caller. Never assume `requesterUserId == me` on this route.
- ⚠ `requesterUserType` is SCREAMING_SNAKE (`WORKER` / `OWNER_USER`) while `status`, `category`,
  `priority` on the same object are PascalCase.
- The ticket is born `InProgress` with `assignedAdminId` already set. There is no origin flag, so
  "admin-initiated" is recognized by exactly that birth shape.
- Onboarding state is never a barrier — messaging a worker who has not submitted anything is a
  supported use case.
- On success, navigate straight to the conversation thread in the existing inbox.

---

## 10. Notifications

`NotificationType` currently has three values; the admin-relevant additions:

| Type | Deep link |
|---|---|
| `WorkerOnboardingSubmitted` (44) | Worker Docs detail |
| `OwnerContractSigned` (47) / `WorkerContractSigned` (48) | Docs detail, step ④ |
| `OwnerContractRejected` (51) / `WorkerContractRejected` (52) | Docs detail — `revisionReason` visible, edit the draft |
| `OnboardingExpiryAdminAlert` (54) | Docs detail → Renew |
| `TicketOpenedByUser` (56) | Support thread |

`NotificationEntityType` gains `OwnerContract`, `WorkerContract`, `SupportTicket`; `entityId` is
the target id. Contract notifications carry `metadata["eligibleTo"]`, so a bell row shows the new
end date without a second call. Types are split per side (45/46, 47/48, …) specifically so a deep
link can be routed on the type alone.

⚠ **F-03·1: route the expiry alert on `metadata.sourceKey`, not on `entityType`.** The ladder now
counts down to the earliest of three dates, and `sourceKey` says which one fired —
`"contract"` | `"license"` | `"passport"`. But the warning row still carries the **contract** as its
`entityType`/`entityId` even when a licence fired it, so routing on `entityType` alone lands the admin
on a contract screen for a passport problem. Branch on `sourceKey`: `contract` → the contract/renew
path, `license`/`passport` → the subject's Docs detail. (The *revert* notification uses
`entityType: "Onboarding"` with the subject's id — another value the union must tolerate.)

`AdminTicketOpened` (43), `OnboardingExpiryWarning` (53) and `OnboardingRevertedToKyc` (55) go to
the subject, never to admins — not added.

---

## 11. i18n

Both `messages/en.json` and `messages/de.json` gain: 6 onboarding statuses, 7 contract phases,
5 contract statuses, 7 owner document types, ~25 error-code messages, the Docs workspace copy,
stepper labels, filter labels, and the settings descriptions (including the corrected
`block_days` wording). German is first-class here: the product is German-market and the lookup
DTOs themselves carry `nameDe`.

The two existing `columns.kycStatus` keys (en/de, lines 195 and 218) are renamed to
`columns.onboardingStatus`.

---

## 12. Breaking-change inventory

Everything below is verified present in the working tree and broken against live v2.

| File | Line(s) | Problem | Fix |
|---|---|---|---|
| `lib/types/kyc.types.ts` | 1, 3 | `KycStatus = 1\|2\|3`, `KYC_STATUS_LABELS` | delete; use `OnboardingStatus` names |
| `lib/types/kyc.types.ts` | 22–26, 33–36, 42–44 | `kycStatus`, `isApproved`, `kycRejectReason`, `kycReviewedAt`, `kycId` | `onboardingStatus`, `onboardingRejectReason`, `onboardingReviewedAt`; add `prefill` to the approval DTO |
| `lib/services/kyc.service.ts` | 11–15 | sends `?status=1` | send `?status=Review` (name) |
| `lib/services/worker.service.ts` | 11–15 | `?isApproved` + array response | typed query object + `PagedResult<WorkerRowDto>` |
| `lib/services/worker.service.ts` | 27–30 | reject body optional | `reason` required |
| `lib/types/worker.types.ts` | 29, 45, 71 | `isApproved` on summary/detail/approval | `onboardingStatus` (+ `prefill` on approval) |
| `lib/types/contract.types.ts` | 5–38 | no `status`/`phase`/`sentAt`/`signedAt`/`documentUrl`/`previewUrl`/`revisionReason`/`renewalStartsAt`; create body missing the 4 owner term fields | rewrite; split owner/worker request types |
| `lib/services/contract.service.ts` | whole file | no `getOne`/`send`/`recall`/`updateDraft`; renew without `X-Idempotency-Key` | add all four; add the header |
| `hooks/use-kyc.ts` | 5, 7 | typed on numeric `KycStatus` | `OnboardingStatus` |
| `hooks/use-workers.ts` | 12–15 | `isApproved` param | query object + paged result |
| `app/[locale]/dashboard/kyc/page.tsx` | 19, 23–28, 105 | numeric tab map, `columns.kycStatus` | page deleted, replaced by `/dashboard/owner-documents` |
| `components/kyc/kyc-row.tsx` | 31, 68–69, 78–79 | `kycStatus`, `isApproved`, `kycRejectReason`; row-level approve/reject | replaced by `docs-table.tsx` (no row actions) |
| `components/kyc/kyc-doc-review.tsx` | 167, 170 | `kycRejectReason` | `onboardingRejectReason`; folded into `documents-panel.tsx` |
| `app/…/(worker)/worker-documents/page.tsx` | 33–41, 56 | `ApprovalBadge(isApproved)` | rewritten as the worker Docs workspace |
| `app/…/(worker)/workers/page.tsx` | 96–99, 214–215 | `useWorkers(isApproved)`, `w.isApproved` | paged query + status badge |
| `app/…/(worker)/workers/[id]/page.tsx` | 107, 203–206 | `worker.isApproved` ×4 | `onboardingStatus` |
| `components/workers/hero-card.tsx` | 54–55 | `worker.isApproved` | status badge |
| `components/properties/property-create-dialog.tsx` | 53 | `.filter(o => o.isApproved)` owner picker | filter on `onboardingStatus === "Active"` **and** handle the gate 403 (§12.1) |
| `app/…/(worker)/workers/page.tsx` | 49–55 | `KNOWN_ASSIGN_ERRORS` includes `worker_not_approved` | verify live; v2 refuses with the three gate codes + `worker_contract_ends_before_task` |
| `messages/{en,de}.json` | 195, 218 | `columns.kycStatus` | `columns.onboardingStatus` + all new keys |
| `lib/types/notification.types.ts` | 1–5 | `NotificationType` declares 3 values; the live backend already emits 44/47/48/51/52/54/56, and `NotificationDto` is **absent from swagger** so nothing catches it | widen both unions, accept unknown types instead of breaking the bell |
| `app/…/notifications/page.tsx` + `components/layout/dashboard-header.tsx` | 19–28 + local copy | two duplicated `entityType → route` maps; `OwnerProfile` points at `/dashboard/kyc`, which Phase 1 deletes | extract `lib/notifications/route.ts`; Phase 1 repoints `OwnerProfile` and adds a `/dashboard/kyc` redirect |

### 12.1 The ACTIVE gate touches two admin calls

Both are gated on **somebody else's** contract — the gate is about whose obligation grows, not who
clicked:

| Call | Site | Gated on |
|---|---|---|
| `POST /api/admin/properties` | `lib/services/property.service.ts:42` | the **target owner's** contract |
| `POST /api/tasks/{taskId}/admin-assign/{workerId}` | `lib/services/task.service.ts:69` | the **worker's** contract |

Both can now return **403 with a body**: `onboarding_incomplete`, `contract_expired`,
`contract_not_yet_active` (plus `400 worker_contract_ends_before_task` for a date past the
worker's cover). An **empty** 403 body still means "your role lacks the permission" — that
distinction is the fastest way to tell a role problem from an account-state problem, and both
dialogs must render the two cases differently. `contract_not_yet_active` in particular must not be
worded as "expired": it is the normal state right after an early renewal.

### 12.2 F-03·1 catch-up (added 2026-08-04)

Phase 0 Tasks 1–3 shipped before F-03·1 was read. Nothing they wrote is *wrong* — TypeScript ignores
extra fields in a response, so no screen breaks — but six things are now incomplete. They are the
content of Phase 0's **Task 9**.

| File | Problem | Fix |
|---|---|---|
| `lib/types/kyc.types.ts` | `KycProfileDto` has no `identity` / `company`; `KycDocDto` has no `status` / `rejectReason` / `reviewedAt` / `reviewedByAdminId`. The admin review screen therefore cannot show any of it | add `OwnerIdentityDto`, `OwnerCompanyDto`, `CompanyType`, and the four document review fields |
| `lib/types/worker.types.ts` | `WorkerDetailDto` has no `identity` | add `WorkerIdentityDto` (five fields — `licenseExpiry` included) |
| `lib/onboarding/errors.ts` | eight F-03·1 codes absent: `incomplete_identity_data`, `onboarding_locked`, `city_country_mismatch`, `city_not_found`, `invalid_company_type`, `company_name_required`, `company_license_number_required`, `company_not_found` | add them to the catalog with i18n keys in both locales |
| `lib/onboarding/errors.ts` | `describeApiError` cannot see the **third 403 flavour**: `{"error":"forbidden","detail":"<code>"}` resolves to the literal code `"forbidden"` and degrades to "unknown"; `isPermissionDenied` also returns `false` for it because a body is present | read `detail` when `error === "forbidden"`; treat that shape as a permission failure |
| `lib/onboarding/status.ts` + i18n | `Terminated` reads as a neutral "Terminated"/"Beendet"; F-03·1 made the distinction load-bearing | render it as *ended early* / *vorzeitig beendet* |
| `lib/types/notification.types.ts` | `NotificationEntityType` lacks `Onboarding` (used by the revert notification) | add it |
| `scripts/verify-v2.mjs` | asserts the pre-F-03·1 shapes only | add the new schemas, the new routes, and the two per-document admin routes |

Also needed, and cheap: a `CompanyType` → display-label map (`Gmbh` → `GmbH`,
`IndividualEntrepreneur` → `Individual entrepreneur`, …) in both locales. The backend prints the raw
enum member in its own PDF and has no plan to change it, so every place we render `type` must map it.

---

## 13. Phases and PR split

Every phase ends with the app fully working.

| Phase | Content | PRs | Outcome |
|---|---|---|---|
| **0** | v2 types + services + hooks + `lib/onboarding/status.ts` + `errors.ts`; minimal patches to every site in §12 (including the two gate-error call sites); stale-mirror warning in `docs/superpowers/index/`; **Task 9 — the F-03·1 catch-up of §12.2** | 1 | **broken screens work again**, no new UI |
| **1** | Docs workspace: adapters + `components/docs-workspace/*` + both routes + nav rename (`KYC` → `Docs`) + delete `/dashboard/kyc`; `contract.template.approved` switch in Settings (nothing can be sent without it) | 1–2 | the full review → contract → send flow |
| **2** | Contracts registry (unsigned block, expiring block, phase filter) + full Settings "Contract" category | 1 | oversight and control |
| **3** | `use-paged-table` + Owners/Workers directories + CSV/XLSX export | 1–2 | catalogue and reporting |
| **4** | FND-1 lookups (2 screens) + FND-2 ticket dialog + notification types | 1–2 | remaining v2 surface |

---

## 14. Verification plan

No test runner exists. Per phase: `npx tsc --noEmit`, `npm run lint`, `npm run build`, then a live
checklist against `https://germany-erp.esharq.com` (the guides state that the live response wins,
so every DTO assumption is confirmed against a real call).

- **Phase 0:** admin login; `GET /api/admin/kyc?status=Review`; `GET /api/admin/kyc/{id}`;
  `GET /api/admin/workers?onboardingStatus=Review` (confirm the paged envelope);
  `GET /api/admin/workers/{id}`; `GET /api/contracts/admin/owner`. Confirm no screen renders
  `undefined` where `isApproved` used to be.
- **Phase 1:** end-to-end on a **test** owner and a **test** worker: approve → create draft →
  send → read `previewUrl` → recall → edit → send → sign (as the subject) → read `documentUrl` →
  renew. Confirm the snapped `eligibleFrom`, and confirm `403`/`409` copy for each error in §4.4.
  **F-03·1 additions:** confirm the identity block and a `company: null` owner both render; confirm
  per-document approve/reject returns `204`, changes only `documents[].status`, leaves
  `onboardingStatus` untouched, and produces **no** notification; confirm a document rejected under
  the wrong subject id gives `404 kyc_doc_not_found`.
- **Phase 2:** confirm `phase` values across the registry; confirm the settings write round-trips.
- **Phase 3:** confirm `invalid_sort_column`, `invalid_filter_value`, `invalid_format`,
  `export_too_large`, and that `pageSize=500` silently becomes 100.
- **Phase 4:** create a lookup row, deactivate it, confirm it disappears from the picker but
  existing references still render; open an admin ticket and confirm the recipient sees it.

### 14.1 Two coordination requirements

1. **Turning on `contract.template.approved` is a global change on a shared deployment.** Once on,
   any admin can send a real contract to a real subject. Explicit approval is required before
   Phase 1 verification flips it.
2. **Dedicated test owner and worker accounts are required** so the send/sign flow is never
   exercised against a real user.

---

## 15. Risks

| Risk | Mitigation |
|---|---|
| Live API drifts from these DTOs | Every phase re-verifies with real calls; the swagger snapshot is re-downloaded at phase start |
| Client-side owner list stops scaling | Contained in `owner-adapter.ts`; backend ask filed |
| Unpaginated contract lists grow | Client-side filtering today; backend ask filed |
| Placeholder contract template misleads admins | Settings copy states the template is a placeholder; the flag is off by default |
| Signed-URL PDFs expire while the screen is open | Never cached; re-read on 404, retry once, then report |
| `onboardingStatus` disagreeing with the gate confuses admins | All cover statements derive from `phase: "InForce"` (§2.4) |
| Sidebar/IA change surprises admins | Only one rename (`KYC` → `Docs`); groups and permissions unchanged |

---

## 16. Backend asks (to be appended to `BACKEND-ASKS.md`)

1. Owner KYC list has no paging/search/sort while the worker list has all three.
2. `GET /api/contracts/admin/{owner|worker}` is unpaginated and unfiltered.
3. No preview PDF for a `Draft` — the admin cannot see the rendered contract before sending.
4. ~~Owner documents have no per-document review.~~ **Closed by F-03·1** (PR #47) — the owner mirror
   shipped. Replacement ask: **the worker app cannot read back its own identity block.** `WorkerIdentityDto`
   is served only by the `PUT` response and by `GET /api/admin/workers/{id}`; `GET /api/worker-docs/me`
   returns documents only and `GET /api/profile` carries no passport fields. The owner side has
   `GET /api/kyc/me`. The asymmetry is acknowledged in the F-03·1 guide §6.2 — ask for the read route.
5. `onboardingStatus` lags live cover, so admin tables can report `Active` for a subject the gate
   refuses.
6. `onboarding.expiry.block_days`'s seeded description claims it drives the 24 h booking-creation
   stop; it does not.
7. A datetime without a UTC offset returns `500` with no `{error}` body instead of `400`.
8. approve/reject return `400` for an unknown id while swagger declares `404`.
9. **No admin route writes a subject's identity block — so an admin cannot correct or hand-enter
   passport data.** Both existing routes are SELF-scoped with no subject path parameter
   (`PUT /api/kyc/identity` → `kyc:data:update_self`; `PUT /api/worker-docs/identity` →
   `worker:data:update_self`), and `POST /api/admin/kyc/{ownerProfileId}/approve` takes no body. The
   only admin remedy today is "reject with a reason and wait for the subject to re-submit", which
   fails the case the OCR seam was built for: OCR returns nothing, the admin is holding the passport
   scan, and the subject cannot type. Requested:
   - `PUT /api/admin/kyc/{ownerProfileId}/identity` (body `UpdateIdentityRequest`) and
     `PUT /api/admin/workers/{workerId}/identity` (body `UpdateWorkerIdentityRequest`) — same DTOs,
     subject-scoped, behind new `kyc:data:update_any` / `worker:data:update_any` permissions.
   - **Writable at `Review`, not only at `Kyc`/`Rejected`.** The self routes return
     `409 onboarding_locked` outside those two states, but `Review` is precisely when the admin is on
     the screen. An admin route inheriting that guard would be unusable for its own use case.
   - The write must be audited (who typed it), because a hand-entered passport number is a
     compliance fact with no subject attestation behind it.
   Until this exists the Docs workspace keeps the identity block read-only and says why — a form
   whose Save cannot reach an endpoint is worse than an honest read-only panel.

---

## 17. Decisions log

| # | Decision | Rationale |
|---|---|---|
| 1 | Umbrella spec + per-phase implementation plans | The work spans 7 independent areas; cross-cutting decisions belong in one place |
| 2 | Sidebar structure unchanged; owner review under Owner, worker review under Worker | Product: keep the current shape admins already know |
| 3 | Both sides get a **Docs** item; one component set + per-side adapter | Product: identical UI and one flow on both sides |
| 4 | No pre-send preview; the PDF is read after sending | Backend renders the preview only at `Draft → Sent`; accepted as normal |
| 5 | "Edit" on a concluded contract = **Renew** | Backend allows edit only on a `Draft`; renewal is what the button is actually for |
| 6 | No delete/terminate anywhere in the UI | Product: contracts are never deleted; Recall covers wrong terms |
| 7 | Table shows everything by default, filtered from a top bar; no row actions | Product: decisions happen only in the detail screen; a shared admin filter system will replace the bar later |
| 8 | ~~No per-document approve/reject; account-level only, symmetric~~ → **Per-document review on both sides** (revised 2026-08-04) | The original rationale was that the owner side had no per-document capability, so symmetry meant going without. F-03·1 added the owner mirror, so symmetry is now satisfied *with* it. Product confirmed the reversal |
| 10 | Identity and company render read-only in the admin panel; there is no admin edit path | The backend has no admin correction endpoint by design — only the subject writes identity, only while at `Kyc`/`Rejected`. The correction loop is reject-with-reason → subject edits → re-submit |
| 11 | `company: null` renders as "natural person", never as an empty company form | The absence of the row *is* the fact; there is no `isLegalEntity` flag and no `CompanyType` member meaning "not a company" |
| 12 | We keep our own `CompanyType` label map | The backend prints the raw enum member (`Gmbh`) in its own PDF and treats the display strings as a pending business ruling; no rule derives `GmbH` from `Gmbh` |
| 13 | Expiry alerts route on `metadata.sourceKey`, not on `entityType` | The warning row carries the contract as its entity even when a passport or licence fired it, so `entityType` routing sends the admin to the wrong screen |
| 9 | Phase 0 first (stop the breakage), then the Docs workspace | The live backend is already v2, so several screens are broken right now |

---

## 18. Amendment log — F-03·1 (2026-08-04)

**What arrived.** `Backend\docs\handoff\f-03-1-structured-document-data.md` (PR #47, shipped
2026-08-03) plus amendments to the two F-03 guides. **Verified deployed** on
`https://germany-erp.esharq.com` the same day: all five new routes present, `OwnerIdentityDto` /
`OwnerCompanyDto` / `WorkerIdentityDto` / `CompanyType` present, `KycProfileDto` carrying `identity` +
`company`, `KycDocDto` carrying the four review fields, `WorkerDetailDto` carrying `identity`.
The three FND guides are **byte-identical** to the earlier snapshot — foundations unchanged.

**What it changes for this app**

| Area | Change | Where |
|---|---|---|
| Structured identity | Subject-written passport block (owner + worker) and a conditional owner company block. The admin app **reads** them; it can never write them | §4.2, §12.2 |
| Per-document review | Owner mirror of the worker routes shipped → **decision 8 reversed**, both sides get per-document actions | §2.3, §4.2, §17 |
| Submit precondition | `400 incomplete_identity_data`, checked **before** the document check on both submits | §4.4 |
| Expiry ladder | Watches the **earliest of three** dates (contract cover end, `passportExpiry`, licence expiry) with `metadata.sourceKey` naming the source; contract dates block live, document dates within ≤1 h | §5, §10 |
| `Expired` vs `Terminated` | A revert retires every signed row and stamps each on its own date, so one lapse can produce both. `Terminated` = *ended early* | §5 |
| Contract PDF | The client block is filled now; already-signed PDFs keep their old blank block, and `{{company.type}}` prints the raw enum | §4.5, §12.2 |
| 403 | A **third** flavour: `{"error":"forbidden","detail":"<code>"}` — the real code is in `detail` | §4.4, §12.2 |
| Worker doc `status` | TitleCase on the wire (`"Pending"`), on both sides. The earlier revision of this spec said `PENDING`; that was wrong | §2.3 |

**What it does not change.** The phase order, the IA (sidebar groups, two `Docs` screens, one adapter
pair), the "actions in Docs, oversight in Contracts" split, the no-delete rule, `phase` as the only
source of truth for cover, and every FND-3/FND-1/FND-2 decision.

**Cost.** One new task in Phase 0 (Task 9, §12.2) and roughly three more in Phase 1 — the identity and
company panels, the per-document actions with their silent-decision copy, and the `CompanyType` label
map.
