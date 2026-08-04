# v2 Migration — Phase 0: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin app correct against the live v2 backend again — replace `isApproved`/`kycStatus` with `onboardingStatus`, adopt the paged worker list, add the contract lifecycle fields, and centralize status/error presentation — without adding a single new screen.

**Architecture:** Bottom-up, one domain per task. Shared vocabulary first (`lib/types/onboarding.types.ts`, `lib/onboarding/status.ts`, `lib/onboarding/errors.ts`), then i18n keys, then each domain (KYC → worker → gate/owner → contract) migrated together with its own call sites so **every task ends with a compiling app**.

**Tech Stack:** Next.js 16.2 (App Router), React 19.2, TypeScript 5, TanStack Query 5, axios, next-intl 4, Tailwind v4 + `components/ui/*` (base-ui + shadcn-style), zustand.

**Spec:** `docs/superpowers/specs/2026-08-04-erp-admin-v2-migration-design.md`
**Branch:** `feat/v2-migration` (already created; the spec commit is `520bc5f`)

## Global Constraints

- **Enums are serialized by name.** `"Review"`, never `2`. Applies to request query params and response fields alike.
- **`onboardingStatus` is a stage label only.** Any statement about *current* cover must derive from a contract row with `phase === "InForce"`. Never from `onboardingStatus === "Active"`, never from `isActive`, never from `hasActiveContract`.
- **Branch on the `error` string, not the HTTP status.** `kyc_profile_not_found`, `worker_not_found` and `kyc_documents_required` arrive as **400** even though swagger declares 404.
- **403 has two meanings.** Empty body = the caller's role lacks the permission. Body with `{"error": …}` = the ACTIVE gate refused because of the *subject's* account state. They must never render the same copy.
- **Every datetime sent to the API carries an explicit UTC offset.** A naive `"2026-08-01T00:00:00"` returns **500** with no parseable body.
- **`X-Idempotency-Key` is required** (not optional) on both contract `renew` routes and on `POST /api/support-tickets/admin/for-user`. Use `crypto.randomUUID()`.
- **`pageSize` is clamped to [1,100] server-side, silently.** Never offer a larger page size.
- **No new UI in this phase.** No new routes, no new components, no visual redesign. Phase 1 owns all of that.
- **No delete/terminate of contracts is exposed** anywhere in the UI (spec Non-goals).
- Do not touch `docs/superpowers/index/` content beyond the staleness banner in Task 7 — a full re-sync is out of scope.

## Testing adaptation (read before Task 1)

This repo has **no test runner** (no jest/vitest, no `test` script) and the plan does not add one — that was ruled out in the spec's Non-goals. The TDD cycle is preserved with the tools the repo actually has:

| TDD step | What it is here |
|---|---|
| "Write the failing test" | Either (a) a **live contract check** in `verify-v2.mjs` (real assertion against the deployed API), or (b) the compiler: a `tsc --noEmit` run that must fail at a specific file:line for a named reason |
| "Run it, see it fail" | `node verify-v2.mjs …` printing `FAIL`, or `npx tsc --noEmit` printing the expected error |
| "Implement" | the code in the step |
| "Run it, see it pass" | same command, now `PASS` / clean |
| "Commit" | `git add <exact files> && git commit` |

`verify-v2.mjs` lives **in the repo** at `scripts/verify-v2.mjs`, wired to `npm run verify:api`.
It is a permanent dev tool, not a scratch file: every phase gate re-runs it, and a check that
disappears with the session is not a check. Task 1 creates both the file and the npm script.

## Preconditions (must be true before Task 1 starts)

| # | Precondition | How to satisfy | Blocks |
|---|---|---|---|
| P1 | On branch `feat/v2-migration`, clean tree except `.claude/settings.local.json` | `git status --short` | all |
| P2 | `node_modules` present, `npx tsc --noEmit` runs | `npm install` | all |
| P3 | Live API reachable: `curl -s -o /dev/null -w "%{http_code}" https://germany-erp.esharq.com/swagger/v1/swagger.json` → `200` | — | Task 1, 8 |
| P4 | **Admin credentials** exported as `ERP_ADMIN_EMAIL` / `ERP_ADMIN_PASSWORD` | **User action** — run `! export ERP_ADMIN_EMAIL=… ERP_ADMIN_PASSWORD=…` or paste them when asked | the authenticated half of Task 1 and all of Task 8 |

**If P4 is unavailable:** Tasks 1–7 still run in full (the enum/DTO half of `verify-v2.mjs` uses only the public swagger). Task 8's authenticated smoke checklist is then deferred and Phase 1 must not start until it has run.

## Agent assignment

| Task | Agent | Rationale |
|---|---|---|
| 1 | `general-purpose` subagent | Self-contained new files, no judgment calls |
| 2 | `general-purpose` subagent, **German strings reviewed by the main agent** | Mechanical JSON edit; the `de` copy needs a second pair of eyes |
| 3, 4, 5, 6 | one `general-purpose` subagent **per task** | Each is a bounded domain slice with an exact file list |
| 7 | `general-purpose` subagent | Docs-only |
| 9 | `general-purpose` subagent (dispatch **before** Task 8 — the gate must verify the F-03·1 shapes too) | Bounded, exact file list, complete code in the brief |
| 8 | **main agent** (not delegated) + `git-pusher` for the final push | Needs live credentials, judgment on shape diffs, and the go/no-go on Phase 1 |
| Review gate after **every** task | main agent runs `superpowers:requesting-code-review`, then `/code-review` on the diff | Two-stage review per subagent-driven-development |

Before dispatching a "find every usage of X" sweep, use the `Explore` agent — it is read-only and cheaper than a general-purpose agent for fan-out searches.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `lib/types/onboarding.types.ts` | **NEW** — the v2 enums as const arrays + `ContractPrefillDto`. The single source of allowed status names | 1 |
| `lib/types/paged.types.ts` | **NEW** — `PagedResult<T>`, `PagedQuery`, page-size constants | 1 |
| `lib/onboarding/status.ts` | **NEW** — status/phase → badge variant + className + i18n key. Every screen renders a status through this | 1 |
| `lib/onboarding/errors.ts` | **NEW** — API error code → i18n key + UI reaction; permission-vs-gate 403 discrimination | 1 |
| `messages/en.json`, `messages/de.json` | `onboarding` namespace: statuses, phases, doc types, API error copy | 2 |
| `lib/types/kyc.types.ts` | **REWRITE** to the live v2 shapes | 3 |
| `lib/services/kyc.service.ts` | `?status=<name>`; approve/reject return `prefill` | 3 |
| `hooks/use-kyc.ts` | retyped on `OnboardingStatus` | 3 |
| `components/kyc/kyc-row.tsx`, `kyc-doc-review.tsx`, `app/[locale]/dashboard/kyc/page.tsx` | keep the existing screen alive on v2 fields (deleted in Phase 1) | 3 |
| `lib/types/worker.types.ts` | drop `isApproved`; add `WorkerRowDto`, `WorkerListQuery` | 4 |
| `lib/services/worker.service.ts` | paged list + typed query; reject requires `reason` | 4 |
| `hooks/use-workers.ts` | query-object signature, paged result | 4 |
| `app/…/(worker)/workers/page.tsx`, `workers/[id]/page.tsx`, `worker-documents/page.tsx`, `components/workers/hero-card.tsx` | status badge instead of `isApproved` | 4 |
| `components/properties/property-create-dialog.tsx` | owner picker on `onboardingStatus`; gate-aware 403 copy | 5 |
| `app/…/(worker)/workers/page.tsx` (assign errors) | v2 gate codes in the admin-assign error set | 5 |
| `lib/types/contract.types.ts` | **REWRITE** — `status`/`phase`/PDF URLs/revision/renewal + owner vs worker request bodies | 6 |
| `lib/services/contract.service.ts` | add `getOne`, `send`, `recall`, `updateDraft`; `renew` sends `X-Idempotency-Key` | 6 |
| `hooks/use-contracts.ts` | expose the new mutations | 6 |
| `docs/superpowers/index/{schemas,dtos,flows}/…` | staleness banner pointing at the v2 guides | 7 |
| `lib/types/identity.types.ts` | **NEW** — F-03·1 identity/company DTOs + `CompanyType` | 9 |
| `lib/onboarding/company.ts` | **NEW** — `CompanyType` → i18n label key (the backend prints the raw enum) | 9 |
| `lib/types/kyc.types.ts`, `worker.types.ts`, `errors.ts`, `status.ts`, `notification.types.ts`, both `messages/*.json`, `scripts/verify-v2.mjs` | F-03·1 catch-up (spec §12.2) | 9 |

---

### Task 1: Shared v2 vocabulary — enums, paged envelope, status and error presentation

**Files:**
- Create: `lib/types/onboarding.types.ts`
- Create: `lib/types/paged.types.ts`
- Create: `lib/onboarding/status.ts`
- Create: `lib/onboarding/errors.ts`
- Create: `scripts/verify-v2.mjs`
- Modify: `package.json` — add `"verify:api": "node scripts/verify-v2.mjs"` to `scripts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `ONBOARDING_STATUSES`, `OnboardingStatus`, `CONTRACT_STATUSES`, `ContractStatus`, `CONTRACT_PHASES`, `ContractPhase`, `ACCOUNT_STATUS_FILTERS`, `AccountStatusFilter`, `SortDir`, `OnboardingSubjectType`, `ContractPrefillDto`
  - `PagedResult<T>`, `PagedQuery`, `DEFAULT_PAGE_SIZE = 25`, `MAX_PAGE_SIZE = 100`
  - `onboardingStatusPresentation(status: OnboardingStatus): StatusPresentation`, `contractPhasePresentation(phase: ContractPhase): StatusPresentation`, `type StatusPresentation = { variant; className?; labelKey }`
  - `describeApiError(err: unknown): ApiErrorInfo | null`, `isPermissionDenied(err: unknown): boolean`, `isGateRefusal(err: unknown): boolean`, `type ApiErrorInfo = { code; labelKey; reaction }`

- [ ] **Step 1: Write the failing test — the live enum contract check**

Create `scripts/verify-v2.mjs`, and add `"verify:api": "node scripts/verify-v2.mjs"` to `package.json`'s `scripts` block:

```js
// Contract check: our TS unions must match the live API's enums, and the DTOs we
// depend on must still carry the fields we read. Run with: npm run verify:api
const BASE = process.env.ERP_API ?? "https://germany-erp.esharq.com";

let failures = 0;
const ok = (m) => console.log(`PASS  ${m}`);
const bad = (m) => { failures++; console.log(`FAIL  ${m}`); };

const swagger = await (await fetch(`${BASE}/swagger/v1/swagger.json`)).json();
const S = swagger.components.schemas;

// ── 1. enums ────────────────────────────────────────────────────────────────
const EXPECTED_ENUMS = {
  OnboardingStatus:    ["Kyc", "Review", "Rejected", "Approved", "Contract", "Active"],
  ContractStatus:      ["Draft", "Sent", "Signed", "Expired", "Terminated"],
  ContractPhase:       ["Draft", "Sent", "Scheduled", "InForce", "Lapsed", "Expired", "Terminated"],
  AccountStatusFilter: ["Active", "Pending", "Deleted", "Blocked"],
  SortDir:             ["Asc", "Desc"],
  OnboardingSubjectType: ["Owner", "Worker"],
  OwnerKYCDocType:     ["Passport", "IdCard", "ResidencePermit", "BusinessLicense",
                        "CompanyRegistration", "TaxCertificate", "Other"],
};
for (const [name, expected] of Object.entries(EXPECTED_ENUMS)) {
  const live = S[name]?.enum;
  if (!live) { bad(`enum ${name} missing from live swagger`); continue; }
  const same = live.length === expected.length && expected.every((v, i) => live[i] === v);
  same ? ok(`enum ${name}`) : bad(`enum ${name}: live=[${live}] expected=[${expected}]`);
}

// ── 2. fields we read ───────────────────────────────────────────────────────
const EXPECTED_FIELDS = {
  KycProfileSummaryDto: ["ownerProfileId", "ownerUserId", "ownerName", "ownerEmail",
    "onboardingStatus", "onboardingRejectReason", "onboardingReviewedAt", "documentCount"],
  KycProfileDto: ["ownerProfileId", "ownerUserId", "onboardingStatus",
    "onboardingRejectReason", "onboardingReviewedAt", "documents"],
  KycDocDto: ["id", "type", "fileName", "fileUrl", "createdAt"],
  KycApprovalDto: ["ownerProfileId", "onboardingStatus", "onboardingRejectReason", "prefill"],
  WorkerApprovalDto: ["id", "onboardingStatus", "onboardingRejectReason", "prefill"],
  ContractPrefillDto: ["subjectType", "subjectId", "fullName", "email", "phoneNumber"],
  OwnerRowDto: ["id", "fullName", "email", "phoneNumber", "status", "onboardingStatus",
    "isVerified", "propertyCount", "createdAt"],
  WorkerRowDto: ["id", "fullName", "email", "phoneNumber", "status", "onboardingStatus",
    "employeeType", "skills", "rating", "experience", "completedTasks",
    "hasActiveContract", "onTask", "createdAt"],
  WorkerRowDtoPagedResult: ["items", "total", "page", "pageSize", "totalPages"],
  WorkerDetailDto: ["id", "fullName", "onboardingStatus", "onboardingRejectReason",
    "onboardingReviewedAt", "professions", "documents"],
  AdminOwnerContractDto: ["id", "eligibleFrom", "eligibleTo", "fileName", "fileUrl", "isActive",
    "createdAt", "status", "phase", "sentAt", "signedAt", "documentUrl", "previewUrl",
    "ownerProfileId", "ownerUserId", "ownerFullName", "ownerEmail",
    "revisionReason", "revisionRequestedAt", "renewalStartsAt"],
  AdminWorkerContractDto: ["id", "status", "phase", "previewUrl", "documentUrl",
    "workerId", "workerFullName", "workerEmail", "renewalStartsAt"],
  CreateOwnerContractRequest: ["eligibleFrom", "eligibleTo", "fileName", "fileUrl",
    "commissionPercent", "paymentOrder", "generalTerms", "extraClauses"],
  CreateWorkerContractRequest: ["eligibleFrom", "eligibleTo", "fileName", "fileUrl"],
};
for (const [name, fields] of Object.entries(EXPECTED_FIELDS)) {
  const live = S[name]?.properties;
  if (!live) { bad(`schema ${name} missing`); continue; }
  const missing = fields.filter((f) => !(f in live));
  missing.length ? bad(`${name} missing: ${missing.join(", ")}`) : ok(`schema ${name}`);
}

// ── 3. fields that must be GONE ─────────────────────────────────────────────
for (const [name, dead] of Object.entries({
  WorkerDetailDto: "isApproved", KycProfileDto: "kycStatus", KycProfileSummaryDto: "isApproved",
})) {
  const live = S[name]?.properties ?? {};
  dead in live ? bad(`${name}.${dead} still exists — v1 field came back`) : ok(`${name}.${dead} gone`);
}

// ── 4. routes we call ───────────────────────────────────────────────────────
for (const [route, method] of [
  ["/api/admin/kyc", "get"], ["/api/admin/kyc/{ownerProfileId}", "get"],
  ["/api/admin/kyc/{ownerProfileId}/approve", "post"], ["/api/admin/kyc/{ownerProfileId}/reject", "post"],
  ["/api/admin/workers", "get"], ["/api/admin/workers/{id}", "get"],
  ["/api/admin/workers/{id}/approve", "post"], ["/api/admin/workers/{id}/reject", "post"],
  ["/api/admin/owners", "get"], ["/api/admin/owners/export", "get"], ["/api/admin/owners/bosses", "get"],
  ["/api/contracts/admin/owner", "get"], ["/api/contracts/admin/owner/{contractId}", "get"],
  ["/api/contracts/admin/owner/{contractId}/send", "post"],
  ["/api/contracts/admin/owner/{contractId}/recall", "post"],
  ["/api/contracts/admin/owner/{ownerUserId}/renew", "post"],
  ["/api/contracts/admin/worker/{contractId}/send", "post"],
  ["/api/system/settings/{key}", "get"],
]) {
  swagger.paths[route]?.[method] ? ok(`route ${method.toUpperCase()} ${route}`)
                                 : bad(`route ${method.toUpperCase()} ${route} missing`);
}

// ── 5. X-Idempotency-Key really is required on renew ───────────────────────
const renewParams = swagger.paths["/api/contracts/admin/owner/{ownerUserId}/renew"]?.post?.parameters ?? [];
const idem = renewParams.find((p) => p.name === "X-Idempotency-Key");
idem?.required ? ok("renew requires X-Idempotency-Key") : bad("renew no longer requires X-Idempotency-Key — re-check the spec");

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Run it — the enum/DTO half must already pass, proving the checker works**

Run: `npm run verify:api`
Expected: `ALL PASS`. If any line FAILs, **stop and report** — the live API has drifted from the spec and the spec must be corrected first (that is the whole point of this check).

- [ ] **Step 3: Create `lib/types/onboarding.types.ts`**

```ts
/**
 * v2 onboarding + contract vocabulary. Every value is serialized BY NAME in JSON
 * (`"Review"`, never `2`) in both directions.
 *
 * Verified against the live API 2026-08-04; re-verified by scripts/verify-v2.mjs.
 * Guides: docs/onboarding-and-active-gate.md §1, contract-lifecycle.md §5.
 */

/** The single onboarding state machine, shared by owners and workers. */
export const ONBOARDING_STATUSES = [
  "Kyc",
  "Review",
  "Rejected",
  "Approved",
  "Contract",
  "Active",
] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

/** Stored contract lifecycle, written by admin/subject actions. */
export const CONTRACT_STATUSES = [
  "Draft",
  "Sent",
  "Signed",
  "Expired",
  "Terminated",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

/**
 * Computed on every read, never stored — this is what the UI renders.
 * `InForce` is the only value that means "covering today".
 */
export const CONTRACT_PHASES = [
  "Draft",
  "Sent",
  "Scheduled",
  "InForce",
  "Lapsed",
  "Expired",
  "Terminated",
] as const;
export type ContractPhase = (typeof CONTRACT_PHASES)[number];

/** Coarse account filter on the admin owner/worker tables (`?status=`). */
export const ACCOUNT_STATUS_FILTERS = [
  "Active",
  "Pending",
  "Deleted",
  "Blocked",
] as const;
export type AccountStatusFilter = (typeof ACCOUNT_STATUS_FILTERS)[number];

export type SortDir = "Asc" | "Desc";

export type OnboardingSubjectType = "Owner" | "Worker";

/** Returned by both admin approve endpoints so the admin can go straight to authoring. */
export interface ContractPrefillDto {
  subjectType: OnboardingSubjectType;
  /** Owner: the ownerProfileId. Worker: the workerId. */
  subjectId: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
}

/**
 * `true` only when a contract row is covering today.
 *
 * Deliberately takes a phase, not an onboardingStatus: the stored status is a
 * projection refreshed by an hourly job and reads `Active` in two windows where
 * the server's live gate refuses the subject with 403. Never answer "is this
 * subject covered?" from `onboardingStatus`.
 */
export function isCoveredNow(phase: ContractPhase | null | undefined): boolean {
  return phase === "InForce";
}
```

- [ ] **Step 4: Create `lib/types/paged.types.ts`**

```ts
import type { SortDir } from "@/lib/types/onboarding.types";

/**
 * FND-3 paged envelope. A deliberate, documented exception to this API's
 * "no envelope" rule, scoped to the admin owner/worker tables and their exports.
 */
export interface PagedResult<T> {
  items: T[] | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PagedQuery {
  /** 1-based; the server clamps to >= 1. */
  page?: number;
  /** The server clamps to [1,100] silently — 500 becomes 100, not an error. */
  pageSize?: number;
  /** Per-table whitelist; anything else is `400 invalid_sort_column`. */
  sortBy?: string;
  dir?: SortDir;
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/** Empty envelope for `useQuery` placeholders so consumers never see `undefined.items`. */
export function emptyPage<T>(pageSize = DEFAULT_PAGE_SIZE): PagedResult<T> {
  return { items: [], total: 0, page: 1, pageSize, totalPages: 0 };
}
```

- [ ] **Step 5: Create `lib/onboarding/status.ts`**

```ts
import type {
  ContractPhase,
  OnboardingStatus,
} from "@/lib/types/onboarding.types";

/** Variants actually implemented by components/ui/badge.tsx. */
type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";

export interface StatusPresentation {
  variant: BadgeVariant;
  /** Extra classes for tones the Badge has no variant for. */
  className?: string;
  /** Key under the `onboarding.status` / `onboarding.phase` i18n namespace. */
  labelKey: string;
}

// Tones follow the emerald/amber convention already used by the worker stat cards.
const EMERALD = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
const AMBER = "bg-amber-500/10 text-amber-700 dark:text-amber-400";
const SKY = "bg-sky-500/10 text-sky-700 dark:text-sky-400";
const MUTED = "bg-muted text-muted-foreground";

const ONBOARDING: Record<OnboardingStatus, StatusPresentation> = {
  // Subject has not submitted anything yet — nothing for the admin to do.
  Kyc: { variant: "outline", labelKey: "kyc" },
  // The work queue: this is the only state where approve/reject are legal.
  Review: { variant: "secondary", className: AMBER, labelKey: "review" },
  Rejected: { variant: "destructive", labelKey: "rejected" },
  // Approved unlocks nothing on its own — a contract still has to be authored and signed.
  Approved: { variant: "secondary", labelKey: "approved" },
  Contract: { variant: "secondary", className: SKY, labelKey: "contract" },
  Active: { variant: "secondary", className: EMERALD, labelKey: "active" },
};

const PHASE: Record<ContractPhase, StatusPresentation> = {
  Draft: { variant: "outline", labelKey: "draft" },
  Sent: { variant: "secondary", className: AMBER, labelKey: "sent" },
  // Signed but not started yet — the normal shape of an early renewal, NOT an error.
  Scheduled: { variant: "secondary", className: SKY, labelKey: "scheduled" },
  InForce: { variant: "secondary", className: EMERALD, labelKey: "inForce" },
  // Lapsed vs Expired is a <=1h job artifact; render them identically.
  Lapsed: { variant: "destructive", labelKey: "expired" },
  Expired: { variant: "destructive", labelKey: "expired" },
  Terminated: { variant: "secondary", className: MUTED, labelKey: "terminated" },
};

export function onboardingStatusPresentation(
  status: OnboardingStatus,
): StatusPresentation {
  return ONBOARDING[status] ?? { variant: "outline", labelKey: "unknown" };
}

export function contractPhasePresentation(
  phase: ContractPhase,
): StatusPresentation {
  return PHASE[phase] ?? { variant: "outline", labelKey: "unknown" };
}

/** The subject is waiting on an admin decision. */
export function needsReview(status: OnboardingStatus): boolean {
  return status === "Review";
}

/** Approve/reject are legal only from `Review` — the server 400s otherwise. */
export function canDecide(status: OnboardingStatus): boolean {
  return status === "Review";
}

/** Contract authoring is legal only from `Approved` or `Active` (else 409). */
export function canAuthorContract(status: OnboardingStatus): boolean {
  return status === "Approved" || status === "Active";
}
```

- [ ] **Step 6: Create `lib/onboarding/errors.ts`**

```ts
import { AxiosError } from "axios";
import { getApiErrorCode } from "@/lib/http/api-error";

/**
 * How the UI should react to a machine error code. The caller decides the
 * widget; this only says which kind of reaction the code deserves.
 */
export type ErrorReaction =
  /** Show under the contract period inputs. */
  | "inline-period"
  /** Show under the reason textarea. */
  | "inline-reason"
  /** State moved under us — refetch and let the screen re-render. */
  | "refetch"
  /** Blocked by a system setting — link the admin to Settings. */
  | "settings-link"
  /** The ACTIVE gate refused because of the subject's cover, not the caller's role. */
  | "gate"
  /** Render the not-found state. */
  | "not-found"
  /** Plain toast. */
  | "toast";

export interface ApiErrorInfo {
  code: string;
  /** Key under the `onboarding.apiErrors` i18n namespace. */
  labelKey: string;
  reaction: ErrorReaction;
}

/**
 * Every code this app can receive from the onboarding, contract, table, lookup and
 * admin-ticket routes. Sources: onboarding-and-active-gate.md §13,
 * contract-lifecycle.md §11, fnd-1 §8, fnd-2 §9, fnd-3 §8.
 *
 * Note the codes that arrive as 400 despite swagger declaring 404 — that is why
 * callers branch on the code, never on the status.
 */
const CATALOG: Record<string, Omit<ApiErrorInfo, "code">> = {
  // ── onboarding review ───────────────────────────────────────────────────
  invalid_onboarding_transition: { labelKey: "invalidOnboardingTransition", reaction: "refetch" },
  rejection_reason_required: { labelKey: "rejectionReasonRequired", reaction: "inline-reason" },
  kyc_documents_required: { labelKey: "kycDocumentsRequired", reaction: "toast" },
  worker_documents_required: { labelKey: "workerDocumentsRequired", reaction: "toast" },
  kyc_profile_not_found: { labelKey: "subjectNotFound", reaction: "not-found" },
  owner_profile_not_found: { labelKey: "subjectNotFound", reaction: "not-found" },
  owner_not_found: { labelKey: "subjectNotFound", reaction: "not-found" },
  worker_not_found: { labelKey: "subjectNotFound", reaction: "not-found" },
  worker_doc_not_found: { labelKey: "documentNotFound", reaction: "not-found" },
  kyc_doc_not_found: { labelKey: "documentNotFound", reaction: "not-found" },

  // ── contract authoring ──────────────────────────────────────────────────
  onboarding_not_approved: { labelKey: "onboardingNotApproved", reaction: "refetch" },
  contract_already_sent: { labelKey: "contractAlreadySent", reaction: "toast" },
  contract_template_not_approved: { labelKey: "contractTemplateNotApproved", reaction: "settings-link" },
  contract_template_missing: { labelKey: "contractTemplateMissing", reaction: "settings-link" },
  invalid_contract_period: { labelKey: "invalidContractPeriod", reaction: "inline-period" },
  contract_period_overlaps: { labelKey: "contractPeriodOverlaps", reaction: "inline-period" },
  contract_period_gap: { labelKey: "contractPeriodGap", reaction: "inline-period" },
  no_active_contract_to_renew: { labelKey: "noActiveContractToRenew", reaction: "toast" },
  invalid_contract_transition: { labelKey: "invalidContractTransition", reaction: "refetch" },
  revision_reason_required: { labelKey: "revisionReasonRequired", reaction: "inline-reason" },
  contract_already_inactive: { labelKey: "contractAlreadyInactive", reaction: "toast" },
  contract_not_found: { labelKey: "contractNotFound", reaction: "not-found" },

  // ── the ACTIVE gate: 403 WITH a body, about the SUBJECT's cover ──────────
  onboarding_incomplete: { labelKey: "gateOnboardingIncomplete", reaction: "gate" },
  contract_expired: { labelKey: "gateContractExpired", reaction: "gate" },
  contract_not_yet_active: { labelKey: "gateContractNotYetActive", reaction: "gate" },
  contract_expiring_imminently: { labelKey: "gateContractExpiringImminently", reaction: "gate" },
  task_date_beyond_contract: { labelKey: "taskDateBeyondContract", reaction: "toast" },
  worker_contract_ends_before_task: { labelKey: "workerContractEndsBeforeTask", reaction: "toast" },
  property_docs_not_approved: { labelKey: "propertyDocsNotApproved", reaction: "toast" },

  // ── tables, exports, lookups, tickets ───────────────────────────────────
  invalid_sort_column: { labelKey: "invalidSortColumn", reaction: "toast" },
  invalid_filter_value: { labelKey: "invalidFilterValue", reaction: "toast" },
  invalid_format: { labelKey: "invalidFormat", reaction: "toast" },
  export_too_large: { labelKey: "exportTooLarge", reaction: "toast" },
  code_exists: { labelKey: "codeExists", reaction: "toast" },
  name_exists: { labelKey: "nameExists", reaction: "toast" },
  country_not_found: { labelKey: "countryNotFound", reaction: "not-found" },
  invalid_target_type: { labelKey: "invalidTargetType", reaction: "toast" },
  target_not_found: { labelKey: "targetNotFound", reaction: "not-found" },
};

export function describeApiError(err: unknown): ApiErrorInfo | null {
  const code = getApiErrorCode(err);
  if (!code) return null;
  const known = CATALOG[code];
  return known
    ? { code, ...known }
    : { code, labelKey: "unknown", reaction: "toast" };
}

function status(err: unknown): number | null {
  return err instanceof AxiosError ? (err.response?.status ?? null) : null;
}

/**
 * An **empty** 403 body means the permission filter refused: the caller's role
 * lacks the permission. Copy must talk about the admin's access, not the subject.
 */
export function isPermissionDenied(err: unknown): boolean {
  return status(err) === 403 && getApiErrorCode(err) === null;
}

/**
 * A 403 **with** a body is the ACTIVE gate: the caller is permitted, but the
 * subject has no signed contract covering today. Copy must talk about the
 * subject's contract — and `contract_not_yet_active` must never say "expired".
 */
export function isGateRefusal(err: unknown): boolean {
  return status(err) === 403 && getApiErrorCode(err) !== null;
}
```

- [ ] **Step 7: Verify the new files compile and nothing else broke**

Run: `npx tsc --noEmit`
Expected: exit 0 — these are new, unreferenced modules; no existing file imports them yet.

- [ ] **Step 8: Commit**

```bash
git add lib/types/onboarding.types.ts lib/types/paged.types.ts \
        lib/onboarding/status.ts lib/onboarding/errors.ts \
        scripts/verify-v2.mjs package.json
git commit -m "feat(onboarding): v2 status vocabulary, paged envelope, status and error presentation

Adds scripts/verify-v2.mjs (npm run verify:api): asserts our TS unions against the
live API's enums, that the DTO fields we read still exist, that the v1 fields are
gone, and that every i18n key both locales need is present."
```

---

### Task 2: i18n — the `onboarding` namespace in both locales

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Consumes: the `labelKey` values produced by Task 1 (`status.*`, `phase.*`, `apiErrors.*`).
- Produces: a top-level `onboarding` namespace with `status`, `phase`, `docType`, `apiErrors`, `gate`, `permissionDenied`. Consumed via `useTranslations("onboarding")` from Task 3 onward.

- [ ] **Step 1: Write the failing test — a key-parity check**

Append to `scripts/verify-v2.mjs` (keep the existing content; add at the end, before the summary lines — move the two summary lines to the bottom of the file):

```js
// ── 6. i18n: every labelKey used by lib/onboarding/* exists in BOTH locales ──
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
// This script lives in <repo>/scripts, so the repo root is one level up. No hardcoded path.
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = {
  status: ["kyc", "review", "rejected", "approved", "contract", "active", "unknown"],
  phase: ["draft", "sent", "scheduled", "inForce", "expired", "terminated", "unknown"],
  apiErrors: ["invalidOnboardingTransition", "rejectionReasonRequired", "kycDocumentsRequired",
    "workerDocumentsRequired", "subjectNotFound", "documentNotFound", "onboardingNotApproved",
    "contractAlreadySent", "contractTemplateNotApproved", "contractTemplateMissing",
    "invalidContractPeriod", "contractPeriodOverlaps", "contractPeriodGap",
    "noActiveContractToRenew", "invalidContractTransition", "revisionReasonRequired",
    "contractAlreadyInactive", "contractNotFound", "gateOnboardingIncomplete",
    "gateContractExpired", "gateContractNotYetActive", "gateContractExpiringImminently",
    "taskDateBeyondContract", "workerContractEndsBeforeTask", "propertyDocsNotApproved",
    "invalidSortColumn", "invalidFilterValue", "invalidFormat", "exportTooLarge",
    "codeExists", "nameExists", "countryNotFound", "invalidTargetType", "targetNotFound",
    "unknown"],
  docType: ["passport", "idCard", "residencePermit", "businessLicense",
    "companyRegistration", "taxCertificate", "other"],
};
for (const locale of ["en", "de"]) {
  const msgs = JSON.parse(readFileSync(join(REPO, "messages", `${locale}.json`), "utf8"));
  const ns = msgs.onboarding;
  if (!ns) { bad(`${locale}.json has no "onboarding" namespace`); continue; }
  for (const [group, keys] of Object.entries(REQUIRED)) {
    const missing = keys.filter((k) => typeof ns[group]?.[k] !== "string");
    missing.length
      ? bad(`${locale}.json onboarding.${group} missing: ${missing.join(", ")}`)
      : ok(`${locale}.json onboarding.${group}`);
  }
  if (typeof ns.permissionDenied !== "string") bad(`${locale}.json onboarding.permissionDenied missing`);
}
```

- [ ] **Step 2: Run it, see it fail**

Run: `npm run verify:api`
Expected: `FAIL  en.json has no "onboarding" namespace` and the same for `de.json`.

- [ ] **Step 3: Add the namespace to `messages/en.json`**

Insert as a new top-level key (place it directly after the existing `"status"` block so related copy stays together):

```json
  "onboarding": {
    "status": {
      "kyc": "Awaiting documents",
      "review": "Under review",
      "rejected": "Rejected",
      "approved": "Approved",
      "contract": "Contract sent",
      "active": "Active",
      "unknown": "Unknown"
    },
    "phase": {
      "draft": "Draft",
      "sent": "Awaiting signature",
      "scheduled": "Starts later",
      "inForce": "In force",
      "expired": "Expired",
      "terminated": "Terminated",
      "unknown": "Unknown"
    },
    "docType": {
      "passport": "Passport",
      "idCard": "ID card",
      "residencePermit": "Residence permit",
      "businessLicense": "Business licence",
      "companyRegistration": "Company registration",
      "taxCertificate": "Tax certificate",
      "other": "Other"
    },
    "permissionDenied": "Your role does not have permission for this action.",
    "apiErrors": {
      "invalidOnboardingTransition": "This status changed elsewhere — the screen has been refreshed.",
      "rejectionReasonRequired": "A rejection reason is required.",
      "kycDocumentsRequired": "No documents have been uploaded yet.",
      "workerDocumentsRequired": "No documents have been uploaded yet.",
      "subjectNotFound": "This record no longer exists.",
      "documentNotFound": "This document no longer exists.",
      "onboardingNotApproved": "Approve the documents before writing a contract.",
      "contractAlreadySent": "A contract is already out for signature. Recall it before sending another.",
      "contractTemplateNotApproved": "The contract template has not been approved yet — no contract can be sent until it is.",
      "contractTemplateMissing": "The contract template setting is missing.",
      "invalidContractPeriod": "Check the contract period: the end date must be after the start date and in the future.",
      "contractPeriodOverlaps": "This period starts before the current contract ends.",
      "contractPeriodGap": "This period starts more than a day after the current contract ends.",
      "noActiveContractToRenew": "There is no active contract to renew.",
      "invalidContractTransition": "This contract can no longer be changed in its current state.",
      "revisionReasonRequired": "A reason is required.",
      "contractAlreadyInactive": "This contract has already ended.",
      "contractNotFound": "This contract no longer exists.",
      "gateOnboardingIncomplete": "This account has no signed contract yet, so this action is blocked.",
      "gateContractExpired": "This account's contract has ended — renew it to continue.",
      "gateContractNotYetActive": "This account's new contract has not started yet.",
      "gateContractExpiringImminently": "This account's contract ends within 24 hours — nothing new can be created.",
      "taskDateBeyondContract": "At least one date falls after the contract ends.",
      "workerContractEndsBeforeTask": "This date falls after the worker's contract ends.",
      "propertyDocsNotApproved": "The property's documents must be approved first.",
      "invalidSortColumn": "This column cannot be sorted.",
      "invalidFilterValue": "Check the filter values — a range is inconsistent.",
      "invalidFormat": "Unsupported export format.",
      "exportTooLarge": "Too many rows to export — narrow the filter and try again.",
      "codeExists": "This code is already in use.",
      "nameExists": "This name is already in use.",
      "countryNotFound": "This country no longer exists.",
      "invalidTargetType": "Invalid recipient type.",
      "targetNotFound": "This recipient no longer exists.",
      "unknown": "Something went wrong. Please try again."
    }
  },
```

- [ ] **Step 4: Add the same namespace to `messages/de.json`**

```json
  "onboarding": {
    "status": {
      "kyc": "Warten auf Dokumente",
      "review": "In Prüfung",
      "rejected": "Abgelehnt",
      "approved": "Genehmigt",
      "contract": "Vertrag gesendet",
      "active": "Aktiv",
      "unknown": "Unbekannt"
    },
    "phase": {
      "draft": "Entwurf",
      "sent": "Warten auf Unterschrift",
      "scheduled": "Beginnt später",
      "inForce": "In Kraft",
      "expired": "Abgelaufen",
      "terminated": "Beendet",
      "unknown": "Unbekannt"
    },
    "docType": {
      "passport": "Pass",
      "idCard": "Personalausweis",
      "residencePermit": "Aufenthaltstitel",
      "businessLicense": "Gewerbeschein",
      "companyRegistration": "Handelsregisterauszug",
      "taxCertificate": "Steuerbescheinigung",
      "other": "Sonstiges"
    },
    "permissionDenied": "Ihre Rolle hat keine Berechtigung für diese Aktion.",
    "apiErrors": {
      "invalidOnboardingTransition": "Dieser Status wurde an anderer Stelle geändert — die Ansicht wurde aktualisiert.",
      "rejectionReasonRequired": "Ein Ablehnungsgrund ist erforderlich.",
      "kycDocumentsRequired": "Es wurden noch keine Dokumente hochgeladen.",
      "workerDocumentsRequired": "Es wurden noch keine Dokumente hochgeladen.",
      "subjectNotFound": "Dieser Datensatz existiert nicht mehr.",
      "documentNotFound": "Dieses Dokument existiert nicht mehr.",
      "onboardingNotApproved": "Genehmigen Sie die Dokumente, bevor Sie einen Vertrag erstellen.",
      "contractAlreadySent": "Ein Vertrag wartet bereits auf Unterschrift. Ziehen Sie ihn zurück, bevor Sie einen neuen senden.",
      "contractTemplateNotApproved": "Die Vertragsvorlage ist noch nicht freigegeben — bis dahin kann kein Vertrag gesendet werden.",
      "contractTemplateMissing": "Die Einstellung für die Vertragsvorlage fehlt.",
      "invalidContractPeriod": "Prüfen Sie den Vertragszeitraum: Das Enddatum muss nach dem Startdatum und in der Zukunft liegen.",
      "contractPeriodOverlaps": "Dieser Zeitraum beginnt, bevor der laufende Vertrag endet.",
      "contractPeriodGap": "Dieser Zeitraum beginnt mehr als einen Tag nach Ende des laufenden Vertrags.",
      "noActiveContractToRenew": "Es gibt keinen aktiven Vertrag zur Verlängerung.",
      "invalidContractTransition": "Dieser Vertrag kann in seinem aktuellen Status nicht mehr geändert werden.",
      "revisionReasonRequired": "Ein Grund ist erforderlich.",
      "contractAlreadyInactive": "Dieser Vertrag ist bereits beendet.",
      "contractNotFound": "Dieser Vertrag existiert nicht mehr.",
      "gateOnboardingIncomplete": "Für dieses Konto besteht noch kein unterschriebener Vertrag, daher ist diese Aktion gesperrt.",
      "gateContractExpired": "Der Vertrag dieses Kontos ist beendet — verlängern Sie ihn, um fortzufahren.",
      "gateContractNotYetActive": "Der neue Vertrag dieses Kontos hat noch nicht begonnen.",
      "gateContractExpiringImminently": "Der Vertrag dieses Kontos endet innerhalb von 24 Stunden — es kann nichts Neues angelegt werden.",
      "taskDateBeyondContract": "Mindestens ein Datum liegt nach dem Vertragsende.",
      "workerContractEndsBeforeTask": "Dieses Datum liegt nach dem Vertragsende des Mitarbeiters.",
      "propertyDocsNotApproved": "Die Dokumente des Objekts müssen zuerst genehmigt werden.",
      "invalidSortColumn": "Diese Spalte kann nicht sortiert werden.",
      "invalidFilterValue": "Prüfen Sie die Filterwerte — ein Bereich ist inkonsistent.",
      "invalidFormat": "Nicht unterstütztes Exportformat.",
      "exportTooLarge": "Zu viele Zeilen für den Export — schränken Sie den Filter ein.",
      "codeExists": "Dieser Code wird bereits verwendet.",
      "nameExists": "Dieser Name wird bereits verwendet.",
      "countryNotFound": "Dieses Land existiert nicht mehr.",
      "invalidTargetType": "Ungültiger Empfängertyp.",
      "targetNotFound": "Dieser Empfänger existiert nicht mehr.",
      "unknown": "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut."
    }
  },
```

- [ ] **Step 5: Run it, see it pass**

Run: `npm run verify:api`
Expected: `ALL PASS`, including all eight `onboarding.*` lines.

- [ ] **Step 6: Confirm both files are still valid JSON**

Run: `node -e "require('./messages/en.json');require('./messages/de.json');console.log('valid')"`
Expected: `valid`

- [ ] **Step 7: Commit**

```bash
git add messages/en.json messages/de.json
git commit -m "feat(i18n): onboarding status, contract phase and API error copy (en + de)"
```

---

### Task 3: KYC domain — types, service, hook and the existing screen

**Files:**
- Rewrite: `lib/types/kyc.types.ts`
- Modify: `lib/services/kyc.service.ts`
- Modify: `hooks/use-kyc.ts`
- Modify: `app/[locale]/dashboard/kyc/page.tsx:19,23-28,36`
- Modify: `components/kyc/kyc-row.tsx:31,68-69,78-79`
- Modify: `components/kyc/kyc-doc-review.tsx:167,170`

**Interfaces:**
- Consumes: `OnboardingStatus`, `ContractPrefillDto` (Task 1); `onboardingStatusPresentation`, `canDecide` (Task 1); `onboarding.status.*` (Task 2).
- Produces: `KycDocDto`, `KycProfileSummaryDto`, `KycProfileDto`, `KycApprovalDto`, `RejectKycRequest`; `kycService.getList(status?: OnboardingStatus)`, `.getProfile(ownerProfileId)`, `.getProfileByUser(ownerUserId)`, `.approve(ownerProfileId): Promise<KycApprovalDto>`, `.reject(ownerProfileId, { reason })`; `useKycList(status?: OnboardingStatus)`, `useKycProfile`, `useApproveKyc`, `useRejectKyc`.

- [ ] **Step 1: Write the failing test — compile against the v2 field names**

Add to `scripts/verify-v2.mjs` (section 7), an authenticated live check. It is skipped with a clear message when P4 credentials are absent, so the task still runs without them:

```js
// ── 7. authenticated shape checks (skipped without credentials) ─────────────
const email = process.env.ERP_ADMIN_EMAIL, password = process.env.ERP_ADMIN_PASSWORD;
if (!email || !password) {
  console.log("SKIP  authenticated checks (set ERP_ADMIN_EMAIL / ERP_ADMIN_PASSWORD)");
} else {
  const auth = await fetch(`${BASE}/api/auth/login?userType=Admin`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!auth.ok) { bad(`admin login failed: ${auth.status}`); }
  else {
    const { accessToken } = await auth.json();
    const H = { Authorization: `Bearer ${accessToken}` };

    const kyc = await fetch(`${BASE}/api/admin/kyc?status=Review`, { headers: H });
    kyc.ok ? ok("GET /api/admin/kyc?status=Review") : bad(`GET /api/admin/kyc?status=Review → ${kyc.status}`);
    const kycRows = kyc.ok ? await kyc.json() : [];
    if (Array.isArray(kycRows)) {
      ok(`kyc list is a bare array (${kycRows.length} rows)`);
      if (kycRows[0]) {
        for (const f of ["ownerProfileId", "ownerUserId", "onboardingStatus", "documentCount"])
          (f in kycRows[0]) ? ok(`kyc row has ${f}`) : bad(`kyc row missing ${f}`);
        ("kycStatus" in kycRows[0]) && bad("kyc row still has kycStatus");
      } else console.log("SKIP  kyc row field check (queue is empty)");
    } else bad("kyc list is not an array");

    const wk = await fetch(`${BASE}/api/admin/workers?onboardingStatus=Review&pageSize=1`, { headers: H });
    wk.ok ? ok("GET /api/admin/workers?onboardingStatus=Review") : bad(`GET /api/admin/workers → ${wk.status}`);
    if (wk.ok) {
      const page = await wk.json();
      ["items", "total", "page", "pageSize", "totalPages"].every((f) => f in page)
        ? ok("worker list is a PagedResult envelope") : bad("worker list is not a PagedResult");
    }

    const oc = await fetch(`${BASE}/api/contracts/admin/owner`, { headers: H });
    oc.ok ? ok("GET /api/contracts/admin/owner") : bad(`GET /api/contracts/admin/owner → ${oc.status}`);
    if (oc.ok) {
      const rows = await oc.json();
      if (Array.isArray(rows) && rows[0]) {
        for (const f of ["status", "phase", "previewUrl", "documentUrl", "renewalStartsAt"])
          (f in rows[0]) ? ok(`owner contract has ${f}`) : bad(`owner contract missing ${f}`);
      } else console.log("SKIP  owner contract field check (no contracts yet)");
    }

    const tpl = await fetch(`${BASE}/api/system/settings/contract.template.approved`, { headers: H });
    if (tpl.ok) {
      const s = await tpl.json();
      console.log(`INFO  contract.template.approved = ${s.value} (send fails with 409 while false)`);
    } else console.log(`INFO  contract.template.approved unreadable (${tpl.status})`);
  }
}
```

- [ ] **Step 2: Run it — the authenticated section must pass or print SKIP**

Run: `npm run verify:api`
Expected: either `SKIP  authenticated checks …` (no credentials) or `PASS` on every authenticated line. Any `FAIL` here means the live API disagrees with the spec — stop and report.

- [ ] **Step 3: Rewrite `lib/types/kyc.types.ts`**

```ts
import type {
  ContractPrefillDto,
  OnboardingStatus,
} from "@/lib/types/onboarding.types";

/**
 * Owner KYC document. Deliberately has **no** review fields: unlike worker
 * documents there is no per-document status, reason or reviewer on the owner
 * side, and no admin endpoint to set one. Owner review is account-level only.
 */
export interface KycDocDto {
  id: string;
  /** `OwnerKYCDocType` name — render via `onboarding.docType.*`. */
  type: string | null;
  fileName: string | null;
  /** Storage key as posted; fetch at `{filesBase}/files/{fileUrl}` (public, no auth). */
  fileUrl: string | null;
  createdAt: string;
}

/** One row of `GET /api/admin/kyc` — a bare array, not a paged envelope. */
export interface KycProfileSummaryDto {
  /** Admin KYC routes are keyed on this. */
  ownerProfileId: string;
  /** Admin contract-authoring routes are keyed on this. Not interchangeable. */
  ownerUserId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  onboardingStatus: OnboardingStatus;
  onboardingRejectReason: string | null;
  onboardingReviewedAt: string | null;
  documentCount: number;
}

/** `GET /api/admin/kyc/{ownerProfileId}` and `/api/admin/kyc/owner/{ownerUserId}`. */
export interface KycProfileDto {
  ownerProfileId: string;
  ownerUserId: string;
  onboardingStatus: OnboardingStatus;
  onboardingRejectReason: string | null;
  onboardingReviewedAt: string | null;
  documents: KycDocDto[] | null;
}

/**
 * Approve/reject response. `prefill` exists because approval alone unlocks
 * nothing — the admin must go on to author and send a contract.
 */
export interface KycApprovalDto {
  ownerProfileId: string;
  onboardingStatus: OnboardingStatus;
  onboardingRejectReason: string | null;
  prefill: ContractPrefillDto;
}

/** `reason` is required — an empty string is `400 rejection_reason_required`. */
export interface RejectKycRequest {
  reason: string;
}
```

- [ ] **Step 4: Update `lib/services/kyc.service.ts`**

Replace the whole file:

```ts
import { apiClient } from "@/lib/http/client";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";
import type {
  KycApprovalDto,
  KycProfileDto,
  KycProfileSummaryDto,
  RejectKycRequest,
} from "@/lib/types/kyc.types";

export const kycService = {
  /**
   * `status` is an OnboardingStatus **name** (`"Review"`), not a number.
   * The review queue is `?status=Review`; omit it for every owner with a KYC row.
   */
  getList: async (
    status?: OnboardingStatus,
  ): Promise<KycProfileSummaryDto[]> => {
    const params = status !== undefined ? { status } : {};
    const { data } = await apiClient.get<KycProfileSummaryDto[]>(
      "/api/admin/kyc",
      { params },
    );
    return data;
  },

  getProfile: async (ownerProfileId: string): Promise<KycProfileDto> => {
    const { data } = await apiClient.get<KycProfileDto>(
      `/api/admin/kyc/${ownerProfileId}`,
    );
    return data;
  },

  /** Same profile, looked up by the owner **account** id. */
  getProfileByUser: async (ownerUserId: string): Promise<KycProfileDto> => {
    const { data } = await apiClient.get<KycProfileDto>(
      `/api/admin/kyc/owner/${ownerUserId}`,
    );
    return data;
  },

  /** `Review → Approved`. Legal only from `Review`; else 400 invalid_onboarding_transition. */
  approve: async (ownerProfileId: string): Promise<KycApprovalDto> => {
    const { data } = await apiClient.post<KycApprovalDto>(
      `/api/admin/kyc/${ownerProfileId}/approve`,
    );
    return data;
  },

  /** `Review → Rejected`. `reason` is required. */
  reject: async (
    ownerProfileId: string,
    body: RejectKycRequest,
  ): Promise<KycApprovalDto> => {
    const { data } = await apiClient.post<KycApprovalDto>(
      `/api/admin/kyc/${ownerProfileId}/reject`,
      body,
    );
    return data;
  },
};
```

- [ ] **Step 5: Update `hooks/use-kyc.ts`**

Change the import and the `useKycList` signature; leave the rest of the file as it is:

```ts
import type { OnboardingStatus } from "@/lib/types/onboarding.types";

export function useKycList(status?: OnboardingStatus) {
  return useQuery({
    queryKey: ["kyc", status],
    queryFn: () => kycService.getList(status),
  });
}
```

Delete the now-dangling `import type { KycStatus } from "@/lib/types/kyc.types";`.

- [ ] **Step 6: Run the compiler to see exactly which call sites break**

Run: `npx tsc --noEmit`
Expected: errors in `app/[locale]/dashboard/kyc/page.tsx` (`KycStatus` no longer exported, numeric tab map), `components/kyc/kyc-row.tsx` (`kycStatus`, `isApproved`, `kycRejectReason`), `components/kyc/kyc-doc-review.tsx` (`kycRejectReason`). This error list is the checklist for the next three steps.

- [ ] **Step 7: Fix `app/[locale]/dashboard/kyc/page.tsx`**

Replace the import on line 19 and the tab map on lines 21–28:

```tsx
import type { OnboardingStatus } from "@/lib/types/onboarding.types";

type FilterTab = "all" | "review" | "approved" | "rejected";

// The queue filter is `?status=Review`, not `Pending` — the old Pending conflated
// "uploaded nothing yet" with "submitted and waiting for an admin".
const tabStatusMap: Record<FilterTab, OnboardingStatus | undefined> = {
  all: undefined,
  review: "Review",
  approved: "Approved",
  rejected: "Rejected",
};
```

Then update the tab labels (lines 49–54) to use the new namespace:

```tsx
  const tOnboarding = useTranslations("onboarding");

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: t("kyc.allTab") },
    { key: "review", label: tOnboarding("status.review") },
    { key: "approved", label: tOnboarding("status.approved") },
    { key: "rejected", label: tOnboarding("status.rejected") },
  ];
```

Add `"allTab": "All"` to `owners.kyc` in `messages/en.json` and `"allTab": "Alle"` in `messages/de.json`.

- [ ] **Step 8: Fix `components/kyc/kyc-row.tsx`**

Replace line 31 and the badge block on lines 66–80:

```tsx
import { canDecide, onboardingStatusPresentation } from "@/lib/onboarding/status";
import { useTranslations } from "next-intl";

  // Approve/reject are legal only from `Review` — the server 400s otherwise.
  const canAct = canDecide(kyc.onboardingStatus);
  const presentation = onboardingStatusPresentation(kyc.onboardingStatus);
  const tOnboarding = useTranslations("onboarding");
```

```tsx
          <Badge variant={presentation.variant} className={presentation.className}>
            {tOnboarding(`status.${presentation.labelKey}`)}
          </Badge>
```

```tsx
          {kyc.onboardingRejectReason && (
            <span className="text-xs text-destructive line-clamp-1">
              {kyc.onboardingRejectReason}
            </span>
          )}
```

- [ ] **Step 9: Fix `components/kyc/kyc-doc-review.tsx`**

Replace lines 167–170:

```tsx
      {!canAct && profile.onboardingRejectReason && (
        <p className="text-xs text-destructive">
          {profile.onboardingRejectReason}
        </p>
      )}
```

- [ ] **Step 10: Run the compiler again**

Run: `npx tsc --noEmit`
Expected: exit 0. If `kyc-doc-review.tsx` still errors, its local `canAct` derivation also reads a v1 field — port it to `canDecide(profile.onboardingStatus)`.

- [ ] **Step 11: Smoke-test the screen**

Run: `npm run dev`, open `/dashboard/kyc`, click each tab.
Expected: rows render with the new badges; the `Review` tab issues `GET /api/admin/kyc?status=Review` (confirm in DevTools Network); no console errors about missing i18n keys.

- [ ] **Step 12: Commit**

```bash
git add lib/types/kyc.types.ts lib/services/kyc.service.ts hooks/use-kyc.ts \
        app/\[locale\]/dashboard/kyc/page.tsx components/kyc/kyc-row.tsx \
        components/kyc/kyc-doc-review.tsx messages/en.json messages/de.json
git commit -m "fix(kyc): migrate owner KYC queue to onboardingStatus"
```

---

### Task 4: Worker domain — paged list, status badges, required reject reason

**Files:**
- Modify: `lib/types/worker.types.ts:24-33,35-51,69-76`
- Modify: `lib/services/worker.service.ts:11-15,27-30`
- Modify: `hooks/use-workers.ts:12-16`
- Modify: `hooks/use-worker-actions.ts`, `hooks/use-worker-detail.ts` (whatever the compiler flags: `WorkerSummaryDto` imports, optional reject `reason`)
- Modify: `app/[locale]/dashboard/(worker)/workers/page.tsx:96-99,214-215`
- Modify: `app/[locale]/dashboard/(worker)/workers/[id]/page.tsx:107,203-206`
- Modify: `app/[locale]/dashboard/(worker)/worker-documents/page.tsx:33-41,56`
- Modify: `components/workers/hero-card.tsx:54-55`

**Interfaces:**
- Consumes: `OnboardingStatus`, `AccountStatusFilter`, `PagedResult`, `PagedQuery`, `DEFAULT_PAGE_SIZE`, `emptyPage` (Task 1); `onboardingStatusPresentation` (Task 1); `onboarding.status.*` (Task 2).
- Produces: `WorkerRowDto`, `WorkerListQuery`, `WorkerDetailDto` (v2), `WorkerApprovalDto` (v2), `RejectWorkerRequest`; `workerService.getWorkers(query?: WorkerListQuery): Promise<PagedResult<WorkerRowDto>>`; `useWorkers(query?: WorkerListQuery, enabled?: boolean)`.

- [ ] **Step 1: Write the failing test — the compiler pins every `isApproved` read**

Run: `npx rg -n "isApproved" --glob "!node_modules" .`
Expected output (the exact list this task must empty):

```
components/properties/property-create-dialog.tsx:53   ← Task 5, not this task
components/workers/hero-card.tsx:54,55
app/[locale]/dashboard/(worker)/workers/[id]/page.tsx:107,203,204,206
app/[locale]/dashboard/(worker)/workers/page.tsx:96,99,214,215
app/[locale]/dashboard/(worker)/worker-documents/page.tsx:33,34,56
hooks/use-workers.ts:12,14,15
lib/services/worker.service.ts:11,12
lib/types/worker.types.ts:29,45,71
```

- [ ] **Step 2: Update `lib/types/worker.types.ts`**

Replace `WorkerSummaryDto` (lines 24–33) with the row DTO and the query type, and drop `isApproved` from the detail and approval DTOs:

```ts
import type {
  AccountStatusFilter,
  ContractPrefillDto,
  OnboardingStatus,
} from "@/lib/types/onboarding.types";
import type { PagedQuery } from "@/lib/types/paged.types";

/** One row of `GET /api/admin/workers` (`PagedResult<WorkerRowDto>`). */
export interface WorkerRowDto {
  id: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  /** Coarse account status: Active | Pending | Deleted | Blocked. */
  status: string | null;
  onboardingStatus: OnboardingStatus;
  employeeType: string | null;
  skills: string[] | null;
  rating: number;
  experience: number | null;
  completedTasks: number;
  /**
   * Reconciled mirror of the contract's `isActive` flag, refreshed hourly —
   * can lag real cover by up to an hour. Never use it to decide whether a
   * worker is covered right now; read their contract list for `phase: "InForce"`.
   */
  hasActiveContract: boolean;
  onTask: boolean;
  createdAt: string;
}

/**
 * `GET /api/admin/workers` query. `status` (coarse) and `onboardingStatus`
 * (exact stage) AND together. `?onboardingStatus=Review` **is** the review queue.
 */
export interface WorkerListQuery extends PagedQuery {
  search?: string;
  status?: AccountStatusFilter;
  onboardingStatus?: OnboardingStatus;
  employeeType?: string;
  /** Repeatable, match-any. */
  professionIds?: string[];
  ratingMin?: number;
  /** When true, unrated workers are kept alongside the ratingMin set. */
  includeUnrated?: boolean;
  experienceMin?: number;
  experienceMax?: number;
  completedMin?: number;
  completedMax?: number;
  registeredFrom?: string;
  registeredTo?: string;
  hasActiveContract?: boolean;
  onTask?: boolean;
}

/** `sortBy` whitelist — anything else is `400 invalid_sort_column`. */
export const WORKER_SORT_COLUMNS = [
  "fullName",
  "createdAt",
  "rating",
  "experience",
  "completedTasks",
] as const;
```

In `WorkerDetailDto` (line 45) replace `isApproved: boolean;` with:

```ts
  onboardingStatus: OnboardingStatus;
  onboardingRejectReason: string | null;
  onboardingReviewedAt: string | null;
```

Replace `WorkerApprovalDto` (lines 69–72) and `RejectWorkerRequest` (74–76):

```ts
export interface WorkerApprovalDto {
  id: string;
  onboardingStatus: OnboardingStatus;
  onboardingRejectReason: string | null;
  prefill: ContractPrefillDto;
}

/** `reason` is required since F-03 — empty is `400 rejection_reason_required`. */
export interface RejectWorkerRequest {
  reason: string;
}
```

- [ ] **Step 3: Update `lib/services/worker.service.ts`**

Replace `getWorkers` (lines 11–15) and `rejectWorker` (27–30):

```ts
import type { PagedResult } from "@/lib/types/paged.types";
import type {
  WorkerListQuery,
  WorkerRowDto,
} from "@/lib/types/worker.types";

  /**
   * Paged since FND-3 — the old array shape and the `?isApproved` filter are gone.
   * `professionIds` must be serialized as a repeated key, which is axios's default
   * for arrays only with `indexes: null`; pass it explicitly.
   */
  getWorkers: async (
    query: WorkerListQuery = {},
  ): Promise<PagedResult<WorkerRowDto>> => {
    const { data } = await apiClient.get<PagedResult<WorkerRowDto>>(
      "/api/admin/workers",
      {
        params: query,
        paramsSerializer: { indexes: null },
      },
    );
    return data;
  },

  /** `reason` is required — the server 400s on an empty one. */
  rejectWorker: async (
    id: string,
    body: RejectWorkerRequest,
  ): Promise<WorkerApprovalDto> => {
    const { data } = await apiClient.post<WorkerApprovalDto>(
      `/api/admin/workers/${id}/reject`,
      body,
    );
    return data;
  },
```

- [ ] **Step 4: Update `hooks/use-workers.ts`**

```ts
import type { WorkerListQuery } from "@/lib/types/worker.types";

export function useWorkers(query: WorkerListQuery = {}, enabled = true) {
  return useQuery({
    queryKey: ["workers", query],
    queryFn: () => workerService.getWorkers(query),
    enabled,
  });
}
```

Leave the other hooks in the file untouched except `useRejectWorker`, whose `reason` argument becomes non-optional:

```ts
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      workerService.rejectWorker(id, { reason }),
```

- [ ] **Step 5: Run the compiler to enumerate the broken call sites**

Run: `npx tsc --noEmit`
Expected: errors at the four component/page files listed in this task's Files block, plus anywhere `useWorkers(boolean)` is still called (`dispatch`, `tasks`, `worker-documents` — check the actual error list).

- [ ] **Step 6: Fix `app/[locale]/dashboard/(worker)/workers/page.tsx`**

Replace the tab→filter derivation (lines 96–99):

```tsx
import type { OnboardingStatus } from "@/lib/types/onboarding.types";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/paged.types";

  // Tabs map to the exact onboarding stage; `Review` is the admin review queue.
  const onboardingStatus: OnboardingStatus | undefined =
    tab === "approved" ? "Active" : tab === "pending" ? "Review" : undefined;

  const { data: page, isLoading } = useWorkers({
    onboardingStatus,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const workers = page?.items ?? [];
```

Replace the badge (lines 214–215):

```tsx
            {(() => {
              const p = onboardingStatusPresentation(w.onboardingStatus);
              return (
                <Badge variant={p.variant} className={p.className}>
                  {tOnboarding(`status.${p.labelKey}`)}
                </Badge>
              );
            })()}
```

Add `const tOnboarding = useTranslations("onboarding");` beside the existing `useTranslations` calls.

- [ ] **Step 7: Fix `app/[locale]/dashboard/(worker)/workers/[id]/page.tsx`**

Line 107 guard becomes a review-state check:

```tsx
        {worker.onboardingStatus === "Review" && (
```

Lines 203–206 (the stat card):

```tsx
          value={tOnboarding(`status.${onboardingStatusPresentation(worker.onboardingStatus).labelKey}`)}
          hint={worker.onboardingRejectReason ?? undefined}
          tone={worker.onboardingStatus === "Active" ? "emerald" : "amber"}
```

Add the `onboardingStatusPresentation` import and `const tOnboarding = useTranslations("onboarding");`.

- [ ] **Step 8: Fix `app/[locale]/dashboard/(worker)/worker-documents/page.tsx`**

Replace `ApprovalBadge` (lines 33–41) and its use (line 56):

```tsx
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import type { WorkerRowDto } from "@/lib/types/worker.types";

function StatusBadge({ status }: { status: WorkerRowDto["onboardingStatus"] }) {
  const t = useTranslations("onboarding");
  const p = onboardingStatusPresentation(status);
  return (
    <Badge variant={p.variant} className={p.className}>
      {t(`status.${p.labelKey}`)}
    </Badge>
  );
}
```

```tsx
        <StatusBadge status={worker.onboardingStatus} />
```

Also change the row's prop type from `WorkerSummaryDto` to `WorkerRowDto`, and read the list through the paged envelope exactly as in Step 6.

- [ ] **Step 9: Fix `components/workers/hero-card.tsx`**

Replace lines 54–55:

```tsx
                {(() => {
                  const p = onboardingStatusPresentation(worker.onboardingStatus);
                  return (
                    <Badge variant={p.variant} className={p.className}>
                      {tOnboarding(`status.${p.labelKey}`)}
                    </Badge>
                  );
                })()}
```

- [ ] **Step 10: Fix every remaining caller the compiler names — both `useWorkers(boolean)` and `WorkerSummaryDto`**

`WorkerSummaryDto` no longer exists. Run `npx rg -n "WorkerSummaryDto" --glob "!node_modules" .` and convert every hit to `WorkerRowDto` (check `hooks/use-worker-detail.ts`, `hooks/use-worker-actions.ts`, the dispatch and tasks screens).

Then, for each file in the `tsc` error list, replace the boolean argument with a query object. A picker that used to want approved workers wants covered workers:

```tsx
  const { data: page } = useWorkers({ onboardingStatus: "Active", pageSize: 100 });
  const workers = page?.items ?? [];
```

- [ ] **Step 11: Run the compiler and the usage sweep**

Run: `npx tsc --noEmit` → expected exit 0.
Run: `npx rg -n "isApproved" --glob "!node_modules" .` → expected: only `components/properties/property-create-dialog.tsx:53` remains (Task 5).

- [ ] **Step 12: Smoke-test**

Run: `npm run dev`, open `/dashboard/workers` and `/dashboard/worker-documents`, switch tabs, open one worker.
Expected: rows render; DevTools shows `GET /api/admin/workers?onboardingStatus=Review&pageSize=25` returning `{items,total,…}`; the detail page shows the stage badge.

- [ ] **Step 13: Commit**

```bash
git add lib/types/worker.types.ts lib/services/worker.service.ts hooks/use-workers.ts \
        "app/[locale]/dashboard/(worker)" components/workers/hero-card.tsx
git commit -m "fix(workers): paged admin list, onboardingStatus badges, required reject reason"
```

---

### Task 5: The ACTIVE gate — owner picker and admin-assign error copy

**Files:**
- Modify: `components/properties/property-create-dialog.tsx:53`
- Modify: `app/[locale]/dashboard/(worker)/workers/page.tsx:49-55` (the `KNOWN_ASSIGN_ERRORS` set)
- Modify: `messages/en.json`, `messages/de.json` (`workers.assignErrors`)

**Interfaces:**
- Consumes: `describeApiError`, `isGateRefusal`, `isPermissionDenied` (Task 1); `onboarding.apiErrors.*`, `onboarding.permissionDenied` (Task 2); `KycProfileSummaryDto.onboardingStatus` (Task 3).
- Produces: no new exports — this task changes behavior only.

Two admin calls this app makes are gated on **somebody else's** contract:
`POST /api/admin/properties` (the target owner's) and
`POST /api/tasks/{taskId}/admin-assign/{workerId}` (the worker's).

- [ ] **Step 1: Write the failing test — prove the old error code is gone**

Run: `npx rg -n "worker_not_approved" --glob "!node_modules" .`
Expected: a hit at `app/[locale]/dashboard/(worker)/workers/page.tsx:50`. That code belongs to v1; v2 refuses with the three gate codes plus `worker_contract_ends_before_task`.

- [ ] **Step 2: Confirm against the live API which codes admin-assign can return**

Grep the v2 guide rather than guessing:
Run: `npx rg -n "worker_contract_ends_before_task|admin-assign" "D:/projekts/ERP-Uyer/docs/onboarding-and-active-gate.md"`
Expected: §9.3 lists **403** `onboarding_incomplete` / `contract_expired` / `contract_not_yet_active` and **400** `worker_contract_ends_before_task`. Record that `worker_not_approved` is absent.

- [ ] **Step 3: Replace the assign-error set**

In `app/[locale]/dashboard/(worker)/workers/page.tsx`, replace lines 49–55:

```tsx
// v2 admin-assign refusals. The gate codes arrive as 403 WITH a body and are about
// the WORKER's contract cover, not the admin's permission; an empty 403 body is a
// permission problem instead. `worker_not_approved` no longer exists.
const KNOWN_ASSIGN_ERRORS = new Set([
  "onboarding_incomplete",
  "contract_expired",
  "contract_not_yet_active",
  "worker_contract_ends_before_task",
  "worker_below_rating_floor",
  "worker_profession_not_eligible",
  "worker_limit_reached",
  "worker_has_overlapping_assignment",
]);
```

- [ ] **Step 4: Route the assign failure through the shared catalog**

Wherever that set is consulted, replace the lookup with:

```tsx
import { describeApiError, isPermissionDenied } from "@/lib/onboarding/errors";

  const info = describeApiError(err);
  const message = isPermissionDenied(err)
    ? tOnboarding("permissionDenied")
    : info && KNOWN_ASSIGN_ERRORS.has(info.code)
      ? tOnboarding(`apiErrors.${info.labelKey}`)
      : t(`assignErrors.${info?.code ?? "unknown"}`);
  toast.error(message);
```

Keep the existing `workers.assignErrors` keys for the four non-gate codes; add `"unknown"` to that block in both locales if it is missing.

- [ ] **Step 5: Fix the owner picker in `components/properties/property-create-dialog.tsx`**

Replace line 53:

```tsx
    // Creating a property for an owner whose contract is not covering today is
    // refused by the server (403 with a gate code), so only offer covered owners.
    // `Active` is the stored projection and can lag by up to an hour — the 403
    // handler below is the real guard.
    .filter((o) => o.onboardingStatus === "Active")
```

- [ ] **Step 6: Handle the gate 403 in the same dialog's submit handler**

```tsx
import { describeApiError, isGateRefusal, isPermissionDenied } from "@/lib/onboarding/errors";

    onError: (err) => {
      if (isPermissionDenied(err)) {
        toast.error(tOnboarding("permissionDenied"));
        return;
      }
      const info = describeApiError(err);
      if (info && isGateRefusal(err)) {
        // About the OWNER's contract, not the admin's access.
        toast.error(tOnboarding(`apiErrors.${info.labelKey}`));
        return;
      }
      toast.error(tOnboarding(`apiErrors.${info?.labelKey ?? "unknown"}`));
    },
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit` → exit 0.
Run: `npx rg -n "isApproved|worker_not_approved" --glob "!node_modules" .` → **no matches**.

- [ ] **Step 8: Smoke-test the gate copy — safely**

⚠ `.env.local` points at the **shared deployment**, so a successful submit here would create a real property in real data. The rule for this step: **only ever submit for an owner the API has just confirmed is _not_ `Active`.** For such an owner the gate refuses with a 403 and nothing is written; for a covered owner the property would be created for real.

First, pick that owner read-only:

```bash
node -e "
const B='https://germany-erp.esharq.com';
(async()=>{
  const a=await fetch(B+'/api/auth/login?userType=Admin',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:process.env.ERP_ADMIN_EMAIL,password:process.env.ERP_ADMIN_PASSWORD})});
  const {accessToken}=await a.json();
  const r=await fetch(B+'/api/admin/owners?pageSize=100',{headers:{Authorization:'Bearer '+accessToken}});
  const {items}=await r.json();
  const uncovered=items.filter(o=>o.onboardingStatus!=='Active');
  console.log('uncovered owners (safe to test with):');
  uncovered.slice(0,5).forEach(o=>console.log(' ',o.id,o.onboardingStatus,o.fullName));
  if(!uncovered.length) console.log('  NONE — skip the UI half of this step and report it');
})()
"
```

Then, with that owner id in hand: temporarily relax the picker filter to `!== "Deleted"`, open the dialog, select **that** owner, submit once.
Expected: a toast about the *owner's contract* (`gateOnboardingIncomplete` / `gateContractExpired` / `gateContractNotYetActive`), **not** "you don't have permission". DevTools shows `403` with a JSON body.

Finally restore the filter and confirm nothing was created:

```bash
npx rg -n 'onboardingStatus === "Active"' components/properties/property-create-dialog.tsx
```
Expected: the strict filter is back. If the run returned `NONE`, skip the UI half, note it in the task's report, and rely on Task 1's `isGateRefusal` / `isPermissionDenied` unit boundary plus the code review for this path.

- [ ] **Step 9: Commit**

```bash
git add components/properties/property-create-dialog.tsx \
        "app/[locale]/dashboard/(worker)/workers/page.tsx" messages/en.json messages/de.json
git commit -m "fix(gate): v2 ACTIVE-gate codes in admin-assign and property create"
```

---

### Task 6: Contract domain — full lifecycle types, service and hooks

**Files:**
- Rewrite: `lib/types/contract.types.ts`
- Modify: `lib/services/contract.service.ts`
- Modify: `hooks/use-contracts.ts`
- Modify: `components/contracts/contract-form-dialog.tsx` (only as far as the compiler demands)
- Modify: `lib/types/notification.types.ts`
- Create: `lib/notifications/route.ts`
- Modify: `app/[locale]/dashboard/notifications/page.tsx:19-28`, `components/layout/dashboard-header.tsx`

**Interfaces:**
- Consumes: `ContractStatus`, `ContractPhase`, `isCoveredNow` (Task 1).
- Produces: `AdminOwnerContractDto`, `AdminWorkerContractDto`, `ContractPeriodFields`, `CreateOwnerContractRequest`, `CreateWorkerContractRequest`, `ContractRevisionRequest`, `ContractType`; `contractService.{listOwner,getOwner,createOwner,updateOwnerDraft,sendOwner,recallOwner,renewOwner}` and the worker mirror; `useOwnerContracts`, `useWorkerContracts`, `useSendContract`, `useRecallContract`, `useUpdateContractDraft`, `useCreateOwnerContract`, `useRenewOwnerContract` (+ worker variants).

- [ ] **Step 1: Write the failing test — the live contract row must expose lifecycle fields**

Already covered by section 4 of `scripts/verify-v2.mjs` (`owner contract has status/phase/previewUrl/documentUrl/renewalStartsAt`) and section 2's `AdminOwnerContractDto` field list.

Run: `npm run verify:api`
Expected: those lines PASS (or SKIP when there are no contracts yet). This is what the new types must mirror.

- [ ] **Step 2: Rewrite `lib/types/contract.types.ts`**

```ts
import type {
  ContractPhase,
  ContractStatus,
} from "@/lib/types/onboarding.types";

/** Fields every contract row shares, owner and worker alike. */
interface ContractRowBase {
  id: string;
  eligibleFrom: string;
  eligibleTo: string;
  fileName: string | null;
  /**
   * The admin-supplied **source** document, echoed back exactly as posted.
   * Not a signed URL: fetch at `{filesBase}/files/{fileUrl}`.
   */
  fileUrl: string | null;
  /** Lagging mirror reconciled hourly. Prefer `phase` in every case. */
  isActive: boolean;
  createdAt: string;
  /** Stored lifecycle, written by admin/subject actions. */
  status: ContractStatus;
  /** Computed per read — this is what the UI renders. */
  phase: ContractPhase;
  sentAt: string | null;
  signedAt: string | null;
  /**
   * Counter-signed final PDF. Short-lived signed URL minted per read (~300 s):
   * follow it immediately, never cache it. A 404 usually means "expired link".
   */
  documentUrl: string | null;
  /**
   * Unsigned PDF the subject reads before signing. Set **only while `Sent`**.
   * Minted from `status`, not from storage — a fresh URL that still 404s means
   * the artifact is genuinely missing.
   */
  previewUrl: string | null;
  /** Why this contract came back — admin recall or the subject's rejection. */
  revisionReason: string | null;
  revisionRequestedByUserId: string | null;
  revisionRequestedAt: string | null;
  /** When the contract taking over from this one begins. Set only on the InForce row. */
  renewalStartsAt: string | null;
}

export interface AdminOwnerContractDto extends ContractRowBase {
  ownerProfileId: string;
  /** Contract-authoring routes are keyed on this, not on ownerProfileId. */
  ownerUserId: string;
  ownerFullName: string | null;
  ownerEmail: string | null;
}

export interface AdminWorkerContractDto extends ContractRowBase {
  workerId: string;
  workerFullName: string | null;
  workerEmail: string | null;
}

/** Shared body fields. Dates MUST carry an explicit UTC offset (else 500). */
export interface ContractPeriodFields {
  eligibleFrom: string;
  eligibleTo: string;
  fileName: string;
  /** presign `storageKey`, uploaded under `category: "contract-sources"`. */
  fileUrl: string;
}

/**
 * Owner create/renew/draft-edit body. The four term fields feed the generated PDF
 * and are owner-only.
 *
 * They are optional in Phase 0 because no UI collects them yet — omitting
 * `commissionPercent` makes the server default it to 0. Phase 1 builds the form
 * and makes them required.
 */
export interface CreateOwnerContractRequest extends ContractPeriodFields {
  commissionPercent?: number;
  paymentOrder?: string | null;
  generalTerms?: string | null;
  extraClauses?: string | null;
}

/** Worker body has no term fields — worker clause content is a later backend slice. */
export type CreateWorkerContractRequest = ContractPeriodFields;

/** Body for recall (admin) — `reason` is required. */
export interface ContractRevisionRequest {
  reason: string;
}

export type ContractType = "owner" | "worker";

/** The row that unlocks the account today, or null. */
export function findInForce<T extends { phase: ContractPhase }>(
  contracts: T[] | undefined,
): T | null {
  return contracts?.find((c) => isCoveredNow(c.phase)) ?? null;
}

/** Rows sent but never signed — nothing on the backend chases these. */
export function findUnsigned<T extends { phase: ContractPhase }>(
  contracts: T[] | undefined,
): T[] {
  return (contracts ?? []).filter((c) => c.phase === "Sent");
}
```

Add the missing import for `isCoveredNow` at the top:

```ts
import { isCoveredNow } from "@/lib/types/onboarding.types";
```

- [ ] **Step 3: Rewrite `lib/services/contract.service.ts`**

```ts
import { apiClient } from "@/lib/http/client";
import type {
  AdminOwnerContractDto,
  AdminWorkerContractDto,
  ContractRevisionRequest,
  CreateOwnerContractRequest,
  CreateWorkerContractRequest,
} from "@/lib/types/contract.types";

/**
 * Both renew routes require this header, and the key must stay **the same across
 * retries of one intent** — that is the whole point: a replay returns the cached
 * 201 for 24 h instead of authoring a second draft.
 *
 * So the caller supplies it. Generating it in here would give every retry a fresh
 * key, turning a retried renewal into a duplicate contract — exactly what the
 * header exists to prevent.
 */
function idempotent(key: string) {
  return { headers: { "X-Idempotency-Key": key } };
}

/**
 * Mint one key per user-initiated renewal attempt and hold it (a ref, not state)
 * for as long as that attempt may be retried. Do not call it per request.
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export const contractService = {
  // ── Owner ──────────────────────────────────────────────────────────────────
  /** owner_contract:read_any. Unpaginated and unfiltered — every owner's rows. */
  listOwner: async (): Promise<AdminOwnerContractDto[]> => {
    const { data } = await apiClient.get<AdminOwnerContractDto[]>(
      "/api/contracts/admin/owner",
    );
    return data;
  },

  getOwner: async (contractId: string): Promise<AdminOwnerContractDto> => {
    const { data } = await apiClient.get<AdminOwnerContractDto>(
      `/api/contracts/admin/owner/${contractId}`,
    );
    return data;
  },

  /**
   * Author a Draft. Keyed on the owner **account** id. 409 onboarding_not_approved
   * unless the subject is Approved or Active. `eligibleFrom` may come back snapped
   * to the previous cover's boundary — always re-seed the form from the response.
   */
  createOwner: async (
    ownerUserId: string,
    body: CreateOwnerContractRequest,
  ): Promise<AdminOwnerContractDto> => {
    const { data } = await apiClient.post<AdminOwnerContractDto>(
      `/api/contracts/admin/owner/${ownerUserId}`,
      body,
    );
    return data;
  },

  /** Edit a Draft. Legal only while Draft, else 400 invalid_contract_transition. */
  updateOwnerDraft: async (
    contractId: string,
    body: CreateOwnerContractRequest,
  ): Promise<AdminOwnerContractDto> => {
    const { data } = await apiClient.put<AdminOwnerContractDto>(
      `/api/contracts/admin/owner/${contractId}`,
      body,
    );
    return data;
  },

  /** Draft → Sent. Renders the preview PDF; 409 while the template is unapproved. */
  sendOwner: async (contractId: string): Promise<AdminOwnerContractDto> => {
    const { data } = await apiClient.post<AdminOwnerContractDto>(
      `/api/contracts/admin/owner/${contractId}/send`,
    );
    return data;
  },

  /** Sent → Draft with a reason. Not termination — this is "I want to fix this". */
  recallOwner: async (
    contractId: string,
    body: ContractRevisionRequest,
  ): Promise<AdminOwnerContractDto> => {
    const { data } = await apiClient.post<AdminOwnerContractDto>(
      `/api/contracts/admin/owner/${contractId}/recall`,
      body,
    );
    return data;
  },

  /**
   * Requires an existing active contract, else 400 no_active_contract_to_renew.
   * `idempotencyKey` comes from `newIdempotencyKey()` and must be reused on retry.
   */
  renewOwner: async (
    ownerUserId: string,
    body: CreateOwnerContractRequest,
    idempotencyKey: string,
  ): Promise<AdminOwnerContractDto> => {
    const { data } = await apiClient.post<AdminOwnerContractDto>(
      `/api/contracts/admin/owner/${ownerUserId}/renew`,
      body,
      idempotent(idempotencyKey),
    );
    return data;
  },

  // ── Worker (identical lifecycle, 4-field body) ─────────────────────────────
  listWorker: async (): Promise<AdminWorkerContractDto[]> => {
    const { data } = await apiClient.get<AdminWorkerContractDto[]>(
      "/api/contracts/admin/worker",
    );
    return data;
  },

  getWorker: async (contractId: string): Promise<AdminWorkerContractDto> => {
    const { data } = await apiClient.get<AdminWorkerContractDto>(
      `/api/contracts/admin/worker/${contractId}`,
    );
    return data;
  },

  createWorker: async (
    workerId: string,
    body: CreateWorkerContractRequest,
  ): Promise<AdminWorkerContractDto> => {
    const { data } = await apiClient.post<AdminWorkerContractDto>(
      `/api/contracts/admin/worker/${workerId}`,
      body,
    );
    return data;
  },

  updateWorkerDraft: async (
    contractId: string,
    body: CreateWorkerContractRequest,
  ): Promise<AdminWorkerContractDto> => {
    const { data } = await apiClient.put<AdminWorkerContractDto>(
      `/api/contracts/admin/worker/${contractId}`,
      body,
    );
    return data;
  },

  sendWorker: async (contractId: string): Promise<AdminWorkerContractDto> => {
    const { data } = await apiClient.post<AdminWorkerContractDto>(
      `/api/contracts/admin/worker/${contractId}/send`,
    );
    return data;
  },

  recallWorker: async (
    contractId: string,
    body: ContractRevisionRequest,
  ): Promise<AdminWorkerContractDto> => {
    const { data } = await apiClient.post<AdminWorkerContractDto>(
      `/api/contracts/admin/worker/${contractId}/recall`,
      body,
    );
    return data;
  },

  renewWorker: async (
    workerId: string,
    body: CreateWorkerContractRequest,
    idempotencyKey: string,
  ): Promise<AdminWorkerContractDto> => {
    const { data } = await apiClient.post<AdminWorkerContractDto>(
      `/api/contracts/admin/worker/${workerId}/renew`,
      body,
      idempotent(idempotencyKey),
    );
    return data;
  },
};
```

Note what is **absent**: no `deactivateOwner` / `deactivateWorker`. Contract termination is not exposed in the UI (spec Non-goals), so the methods are removed rather than left as a loaded gun.

- [ ] **Step 4: Remove the deactivate hooks if nothing consumes them**

Run: `npx rg -n "useDeactivateOwnerContract|useDeactivateWorkerContract|deactivateOwner|deactivateWorker" --glob "!node_modules" .`

- If the only hits are the definitions in `hooks/use-contracts.ts` and `lib/services/contract.service.ts`, delete both hooks.
- If a component consumes them, leave that component untouched and instead keep a single method:
  `terminate: async (type: ContractType, contractId: string) => apiClient.delete(\`/api/contracts/admin/${type}/${contractId}\`)`
  and open a follow-up note in the Phase 2 plan to remove the UI entry point.

- [ ] **Step 5: Add the new mutations to `hooks/use-contracts.ts`**

```ts
import type {
  ContractRevisionRequest,
  ContractType,
  CreateOwnerContractRequest,
  CreateWorkerContractRequest,
} from "@/lib/types/contract.types";

const OWNER_KEY = ["owner-contracts"] as const;
const WORKER_KEY = ["worker-contracts"] as const;

function keyFor(type: ContractType) {
  return type === "owner" ? OWNER_KEY : WORKER_KEY;
}

/** Draft → Sent, either side. */
export function useSendContract(type: ContractType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) =>
      type === "owner"
        ? contractService.sendOwner(contractId)
        : contractService.sendWorker(contractId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keyFor(type) }),
  });
}

/** Sent → Draft with a reason, either side. */
export function useRecallContract(type: ContractType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      body,
    }: {
      contractId: string;
      body: ContractRevisionRequest;
    }) =>
      type === "owner"
        ? contractService.recallOwner(contractId, body)
        : contractService.recallWorker(contractId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keyFor(type) }),
  });
}

export function useUpdateOwnerContractDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      body,
    }: {
      contractId: string;
      body: CreateOwnerContractRequest;
    }) => contractService.updateOwnerDraft(contractId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: OWNER_KEY }),
  });
}

export function useUpdateWorkerContractDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      body,
    }: {
      contractId: string;
      body: CreateWorkerContractRequest;
    }) => contractService.updateWorkerDraft(contractId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKER_KEY }),
  });
}
```

Retype the four existing create/renew hooks so the owner ones take
`CreateOwnerContractRequest` and the worker ones `CreateWorkerContractRequest`
(the old shared `CreateContractRequest` no longer exists). The two **renew** hooks
additionally thread the caller's idempotency key through — never generate one inside
the hook, because a re-render or a retry would then produce a duplicate contract:

```ts
export function useRenewOwnerContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ownerUserId,
      body,
      idempotencyKey,
    }: {
      ownerUserId: string;
      body: CreateOwnerContractRequest;
      /** From `newIdempotencyKey()`, minted once per renewal attempt and reused on retry. */
      idempotencyKey: string;
    }) => contractService.renewOwner(ownerUserId, body, idempotencyKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: OWNER_KEY }),
  });
}
```

Apply the identical change to `useRenewWorkerContract` with `workerId` and
`CreateWorkerContractRequest`.

- [ ] **Step 6: Make `components/contracts/contract-form-dialog.tsx` compile**

Run: `npx tsc --noEmit` and fix only what it reports in that file: the import of
`CreateContractRequest` becomes `CreateOwnerContractRequest` or
`CreateWorkerContractRequest` depending on which mutation the dialog calls. Do
**not** add the four term-field inputs here — Phase 1 replaces this dialog with
`components/docs-workspace/contract-form.tsx`.

- [ ] **Step 7: Widen the notification types the backend is already sending**

`NotificationDto` is **not in swagger at all**, so notification `type` values cannot be verified
mechanically — and the live v2 backend already emits types the app has never heard of (44, 47, 48,
51, 52, 54, 56). Today `lib/types/notification.types.ts` declares three. Widen both unions so the
new rows are typed rather than accidental:

```ts
export type NotificationType =
  // pre-v2
  | "WorkerApprovalPending"
  | "KycSubmitted"
  | "PropertyDocsSubmitted"
  // v2 — admin recipients (subject-only types are deliberately absent)
  | "WorkerOnboardingSubmitted"
  | "OwnerContractSigned"
  | "WorkerContractSigned"
  | "OwnerContractRejected"
  | "WorkerContractRejected"
  | "OnboardingExpiryAdminAlert"
  | "TicketOpenedByUser"
  // any type the backend adds later: render the row, do not crash
  | (string & {});

export type NotificationEntityType =
  | "Worker"
  | "OwnerProfile"
  | "Property"
  | "OwnerContract"
  | "WorkerContract"
  | "SupportTicket";
```

`(string & {})` keeps autocomplete for the known members while accepting anything else — the union
must never be the reason an unknown notification breaks the bell.

- [ ] **Step 8: Unify the duplicated notification routing**

`app/[locale]/dashboard/notifications/page.tsx:19-28` and `components/layout/dashboard-header.tsx`
each carry their own `entityType → route` mapping. Extract one:

```ts
// lib/notifications/route.ts
import type { NotificationEntityType } from "@/lib/types/notification.types";

/**
 * Deep link for a bell row, or null when the row is not navigable.
 * Unknown entity types return null — a new backend type must degrade to a
 * non-clickable row, never to a broken route.
 */
export function notificationRoute(
  entityType: NotificationEntityType | null,
  entityId: string | null,
): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "Worker":
      return `/dashboard/workers/${entityId}`;
    // Phase 1 repoints this to /dashboard/owner-documents/{ownerProfileId} when the
    // Docs workspace replaces /dashboard/kyc. See the roadmap, Phase 1 task 5.
    case "OwnerProfile":
      return `/dashboard/kyc`;
    case "Property":
      return `/dashboard/properties/${entityId}`;
    case "SupportTicket":
      return `/dashboard/support`;
    // Contract rows have no dedicated screen until Phase 2's registry exists.
    case "OwnerContract":
    case "WorkerContract":
      return `/dashboard/contracts`;
    default:
      return null;
  }
}
```

Point both consumers at it and delete their local copies.

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run lint` → no new errors.
Run: `npm run verify:api` → `ALL PASS` (or the documented SKIPs).
Run: `npx rg -n "entityRoute" --glob "!node_modules" .` → only `lib/notifications/route.ts`'s
`notificationRoute` remains; no local copies.

- [ ] **Step 10: Commit**

```bash
git add lib/types/contract.types.ts lib/services/contract.service.ts \
        hooks/use-contracts.ts components/contracts/contract-form-dialog.tsx \
        lib/types/notification.types.ts lib/notifications/route.ts \
        "app/[locale]/dashboard/notifications/page.tsx" components/layout/dashboard-header.tsx
git commit -m "feat(contracts): v2 lifecycle types, send/recall/draft-edit, idempotent renew

Also widens the notification unions to the v2 types the backend already emits and
unifies the two duplicated entity-route maps into lib/notifications/route.ts."
```

---

### Task 7: Mark the stale v1 schema mirror

**Files:**
- Modify: `docs/superpowers/index/INDEX.md`
- Modify: `docs/superpowers/index/schemas/owners.md`, `schemas/workers.md`
- Modify: `docs/superpowers/index/flows/owner.md`, `flows/worker.md`, `flows/contract.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Write the failing test — prove the mirror still teaches v1**

Run: `npx rg -n "kycStatus|isApproved" docs/superpowers/index/`
Expected: matches in the owner/worker/contract files. Anyone reading these will implement v1.

- [ ] **Step 2: Add the banner to each of the six files**

Insert immediately below the top heading of each file:

```markdown
> ⚠ **STALE for owner/worker/contract onboarding (v1).** `kycStatus` and `isApproved`
> no longer exist in the API. The v2 model — one `onboardingStatus`, the ACTIVE gate,
> and the admin-authored contract lifecycle — is documented in
> `D:\projekts\ERP-Uyer\docs\onboarding-and-active-gate.md` and
> `contract-lifecycle.md`, and mirrored for this app in
> `docs/superpowers/specs/2026-08-04-erp-admin-v2-migration-design.md`.
> A full re-sync of this mirror is tracked separately.
```

- [ ] **Step 3: Verify the banner landed in all six files**

Run: `npx rg -l "STALE for owner/worker/contract onboarding" docs/superpowers/index/`
Expected: exactly six file paths.

- [ ] **Step 4: Commit**

```bash
git add -f docs/superpowers/index/
git commit -m "docs(index): flag the v1 onboarding mirror as stale"
```

Note the `-f`: `/docs` is gitignored in this repo, so doc changes need a force-add.

---

### Task 8: Phase gate — full verification and the go/no-go for Phase 1

**Owner: main agent. Do not delegate.** This task decides whether Phase 1 may start.

**Files:** none modified (except a possible fix-up commit).

- [ ] **Step 1: Static verification**

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: `tsc` and `build` clean. A build warning about `next-intl` message shape is a real failure — investigate before continuing.

⚠ **`npm run lint` exits 1 on this repo and did so before this migration started.** Measured at
`fe7de88`: **2 errors and 14 warnings**, of which the errors and one warning are pre-existing and out of
scope for this phase — verified by `git log -1 -- <file>`, all three last touched in **June 2026**:

| Finding | File | Last changed |
|---|---|---|
| error `react-hooks/set-state-in-effect` | `components/ui/sidebar.tsx:610` | `6724399`, 2026-06-05 |
| error `@typescript-eslint/no-empty-object-type` | `global.d.ts:7` | `379bef7`, 2026-06-14 |
| warning unused `workerName` | `components/workers/approve-modal.tsx:23` | `8f1fb8a`, 2026-06-01 |

So the gate criterion is **"no lint finding attributable to this phase"**, not "lint exits 0". Fixing
those three files is unrelated scope creep and is not this phase's work; record them instead as
pre-existing issues in the roadmap. The remaining 13 warnings **are** ours —
`@typescript-eslint/no-unused-expressions` in `scripts/verify-v2.mjs`, from writing
`cond ? ok(…) : bad(…)` as a statement — and **Task 9 Step 15 cleans them up**. Confirm here that
nothing beyond the three rows above is left.

- [ ] **Step 2: Dead-vocabulary sweep**

```bash
npx rg -n "isApproved|kycStatus|kycRejectReason|kycReviewedAt|KYC_STATUS_LABELS|worker_not_approved|CreateContractRequest" --glob "!node_modules" --glob "!docs" .
```
Expected: **no matches.**

- [ ] **Step 3: Live contract check**

```bash
npm run verify:api
```
Expected: `ALL PASS`. If P4 credentials were unavailable, this prints `SKIP  authenticated checks` — in that case Phase 1 is **blocked** until it runs, because Phase 1 builds directly on these shapes.

- [ ] **Step 4: Confirm the routes the untouched screens still depend on**

FND-3 retired the bare `GET /api/owners` listing, but the owner **detail** screen calls
`/api/owners/{id}` and `/api/owners/{ownerId}/sub-accounts`. Both were present in the live swagger on
2026-08-04; re-confirm rather than assume, because that screen was never migrated:

```bash
node -e "
const s=require('C:/Users/bilol/AppData/Local/Temp/claude/D--projekts-ERP-Uyer-ERP-Admin/2c1533b2-068c-43fa-b840-85ca3fd479bc/scratchpad/swagger-live.json');
for(const p of ['/api/owners/{id}','/api/owners/{ownerId}/sub-accounts','/api/owners'])
  console.log(p, s.paths[p]?Object.keys(s.paths[p]):'GONE');
"
```
Expected: `/api/owners/{id}` → `[get,delete]`, `/api/owners/{ownerId}/sub-accounts` → `[get]`,
`/api/owners` → `GONE`. If a detail route is gone, the owner detail screen is broken too and needs a
task before this phase closes.

- [ ] **Step 5: Manual smoke pass**

Run `npm run dev` and walk: `/dashboard/kyc` (all four tabs) → `/dashboard/workers` (tabs, open one) → `/dashboard/worker-documents` → `/dashboard/owners` → open one owner (detail + sub-accounts) → `/dashboard/contracts` → `/dashboard/notifications` → open the property-create dialog.
Expected: no console errors, no `undefined` in badges, no missing-i18n warnings, notification rows render (unknown types appear as non-clickable rows, not blank).

- [ ] **Step 6: Record what Phase 1 needs to know**

Read the live template so Phase 1 does not have to guess its tokens:

```bash
node -e "
const B='https://germany-erp.esharq.com';
(async()=>{const a=await fetch(B+'/api/auth/login?userType=Admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.ERP_ADMIN_EMAIL,password:process.env.ERP_ADMIN_PASSWORD})});const{accessToken}=await a.json();
for(const k of ['contract.template.owner.en','contract.template.worker.en','contract.template.approved']){
const r=await fetch(B+'/api/system/settings/'+k,{headers:{Authorization:'Bearer '+accessToken}});
console.log('===',k,r.status); if(r.ok){const s=await r.json();console.log(s.value.slice(0,1500));}}})()
"
```
Write the `{{token}}` names you find into the Phase 1 plan's Global Constraints. If the login fails, note that Phase 1's contract-form task starts with this same command.

- [ ] **Step 7: Commit any fix-ups, then hand off**

```bash
git add -A ':!.claude/settings.local.json'
git commit -m "chore(v2): phase 0 verification fix-ups"
```

Then dispatch the `git-pusher` agent to push `feat/v2-migration` and open the PR titled
`Phase 0 — v2 foundation: onboardingStatus, paged workers, contract lifecycle types`.

- [ ] **Step 8: Write the Phase 1 plan**

Only now, with the live shapes and template tokens confirmed, write
`docs/superpowers/plans/2026-08-XX-v2-phase-1-docs-workspace.md` following
`docs/superpowers/plans/2026-08-04-v2-migration-roadmap.md`.

---

### Task 9: F-03·1 catch-up — identity, company, per-document fields, third 403 flavour

**Added 2026-08-04.** Tasks 1–6 were written before `f-03-1-structured-document-data.md` (PR #47) was
read. It is **deployed live** — verified against swagger the same day — so this task closes the gap.
Nothing already committed is *wrong* (TypeScript ignores extra response fields, so no screen breaks);
it is incomplete. Spec §12.2 is the authoritative list.

**Files:**
- Modify: `lib/types/kyc.types.ts` (add `identity`, `company`, and the four document review fields)
- Modify: `lib/types/worker.types.ts` (add `identity` to `WorkerDetailDto`)
- Create: `lib/types/identity.types.ts` (`OwnerIdentityDto`, `WorkerIdentityDto`, `OwnerCompanyDto`, `CompanyType`, `COMPANY_TYPES`)
- Create: `lib/onboarding/company.ts` (`CompanyType` → display-label key map)
- Modify: `lib/onboarding/errors.ts` (eight new codes + the third 403 flavour)
- Modify: `lib/onboarding/status.ts` (`Terminated` → "ended early")
- Modify: `lib/types/notification.types.ts` (`Onboarding` entity type)
- Modify: `messages/en.json`, `messages/de.json` (new error copy, company-type labels, `phase.terminated` wording)
- Modify: `scripts/verify-v2.mjs` (assert the F-03·1 schemas and routes)

**Interfaces:**
- Consumes: everything Tasks 1–6 produced.
- Produces: `OwnerIdentityDto`, `WorkerIdentityDto`, `OwnerCompanyDto`, `CompanyType`, `COMPANY_TYPES`, `companyTypeLabelKey(type)`; `KycProfileDto.identity`/`.company`; `KycDocDto.status`/`.rejectReason`/`.reviewedAt`/`.reviewedByAdminId`; `WorkerDetailDto.identity`. Phase 1's documents panel and per-document actions consume all of it.

- [ ] **Step 1: Write the failing test — assert the F-03·1 contract**

Add a section 8 to `scripts/verify-v2.mjs`, before the two summary lines (which must remain last):

```js
// ── 8. F-03·1 (PR #47): structured document data ───────────────────────────
const F031_FIELDS = {
  OwnerIdentityDto: ["firstName", "lastName", "passportNumber", "passportExpiry"],
  WorkerIdentityDto: ["firstName", "lastName", "passportNumber", "passportExpiry", "licenseExpiry"],
  OwnerCompanyDto: ["id", "name", "type", "licenseNumber", "licenseExpiry", "registrationDate",
    "countryId", "countryNameDe", "countryNameEn", "cityId", "cityNameDe", "cityNameEn", "taxNumber"],
  KycProfileDto: ["identity", "company"],
  KycDocDto: ["status", "rejectReason", "reviewedAt", "reviewedByAdminId"],
  WorkerDetailDto: ["identity"],
};
for (const [name, fields] of Object.entries(F031_FIELDS)) {
  const live = S[name]?.properties;
  if (!live) { bad(`F-03.1 schema ${name} missing`); continue; }
  const missing = fields.filter((f) => !(f in live));
  missing.length ? bad(`${name} missing: ${missing.join(", ")}`) : ok(`F-03.1 ${name}`);
}
const COMPANY_TYPES_EXPECTED = ["Llc", "Gmbh", "IndividualEntrepreneur", "SoleTrader", "Other"];
const liveCompanyTypes = S.CompanyType?.enum;
liveCompanyTypes && COMPANY_TYPES_EXPECTED.every((v, i) => liveCompanyTypes[i] === v)
  ? ok("enum CompanyType")
  : bad(`enum CompanyType: live=[${liveCompanyTypes}] expected=[${COMPANY_TYPES_EXPECTED}]`);
for (const [route, method] of [
  ["/api/admin/kyc/{ownerProfileId}/docs/{docId}/approve", "post"],
  ["/api/admin/kyc/{ownerProfileId}/docs/{docId}/reject", "post"],
]) {
  swagger.paths[route]?.[method] ? ok(`route ${method.toUpperCase()} ${route}`)
                                 : bad(`route ${method.toUpperCase()} ${route} missing`);
}
```

- [ ] **Step 2: Run it, see it fail**

Run: `npm run verify:api`
Expected: the new `F-03.1 …` lines FAIL — not because the API lacks them, but because this step is
the assertion itself; if any line fails **after** the code below lands, the live API disagrees with the
guide and you must stop and report. (The routes and `CompanyType` lines should pass immediately: they
assert live swagger, not our types.)

- [ ] **Step 3: Create `lib/types/identity.types.ts`**

```ts
/**
 * F-03·1 structured document data (PR #47, live 2026-08-03). The subject writes all
 * of this; the admin panel only ever reads it — there is deliberately no admin
 * correction endpoint, so the correction loop is reject-with-reason → subject edits
 * → subject re-submits.
 */

/** Legal names off the passport. Allowed to differ from the account's display name; never reconciled. */
export interface OwnerIdentityDto {
  firstName: string | null;
  lastName: string | null;
  passportNumber: string | null;
  /** Not validated as future-dated by the server. The expiry ladder acts on it. */
  passportExpiry: string | null;
}

/** The owner block plus the worker's own service licence. */
export interface WorkerIdentityDto extends OwnerIdentityDto {
  /** The worker's own service licence, not a company's. Optional even at submit. */
  licenseExpiry: string | null;
}

export const COMPANY_TYPES = [
  "Llc",
  "Gmbh",
  "IndividualEntrepreneur",
  "SoleTrader",
  "Other",
] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

/**
 * Present only when the owner is a legal entity. **A null company means the owner is a
 * natural person** — the absence is the fact. There is no `isLegalEntity` flag and no
 * CompanyType member meaning "not a company"; never default this to an empty object.
 *
 * Carries the resolved country/city names in both localizations alongside the ids, so
 * the block renders without an FND-1 lookup call.
 */
export interface OwnerCompanyDto {
  id: string;
  name: string | null;
  type: CompanyType;
  licenseNumber: string | null;
  /** Watched by the expiry ladder — a lapse reverts the owner to `Kyc`. */
  licenseExpiry: string | null;
  registrationDate: string | null;
  countryId: string;
  countryNameDe: string | null;
  countryNameEn: string | null;
  cityId: string | null;
  cityNameDe: string | null;
  cityNameEn: string | null;
  taxNumber: string | null;
}
```

- [ ] **Step 4: Create `lib/onboarding/company.ts`**

```ts
import type { CompanyType } from "@/lib/types/identity.types";

/**
 * `CompanyType` serializes as its enum member name — `Gmbh`, not `GmbH`;
 * `IndividualEntrepreneur`, not `Individual entrepreneur`. The backend prints the raw
 * member in its own generated PDF and treats the display strings as a pending business
 * ruling, so every place we show a company type maps it ourselves. No general rule
 * derives `GmbH` from `Gmbh`.
 *
 * Returns a key under the `onboarding.companyType` i18n namespace.
 */
export function companyTypeLabelKey(type: CompanyType | null | undefined): string {
  switch (type) {
    case "Llc":
      return "llc";
    case "Gmbh":
      return "gmbh";
    case "IndividualEntrepreneur":
      return "individualEntrepreneur";
    case "SoleTrader":
      return "soleTrader";
    case "Other":
      return "other";
    default:
      return "unknown";
  }
}
```

- [ ] **Step 5: Extend `lib/types/kyc.types.ts`**

Add the imports and the two nested blocks, and give `KycDocDto` its review fields:

```ts
import type {
  OwnerCompanyDto,
  OwnerIdentityDto,
} from "@/lib/types/identity.types";
```

In `KycDocDto`, after `fileUrl`:

```ts
  /** F-03·1. TitleCase on the wire: "Pending" | "Approved" | "Rejected". */
  status: string | null;
  /** Set by a per-document reject; cleared when the document is approved. */
  rejectReason: string | null;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
```

In `KycProfileDto`, after `onboardingReviewedAt`:

```ts
  /** F-03·1. Always present; its fields are null until the subject fills them. */
  identity: OwnerIdentityDto;
  /** F-03·1. **Null means the owner is a natural person** — do not default it to an object. */
  company: OwnerCompanyDto | null;
```

- [ ] **Step 6: Extend `lib/types/worker.types.ts`**

Import `WorkerIdentityDto` from `@/lib/types/identity.types` and add to `WorkerDetailDto`:

```ts
  /**
   * F-03·1. The admin read is one of only two places this block is served — the worker
   * app itself has no self-read route for it.
   */
  identity: WorkerIdentityDto;
```

- [ ] **Step 7: Add the eight F-03·1 codes to `lib/onboarding/errors.ts`**

Insert into `CATALOG`, in the onboarding-review group:

```ts
  // ── F-03·1 structured document data ─────────────────────────────────────
  incomplete_identity_data: { labelKey: "incompleteIdentityData", reaction: "toast" },
  onboarding_locked: { labelKey: "onboardingLocked", reaction: "refetch" },
  city_country_mismatch: { labelKey: "cityCountryMismatch", reaction: "toast" },
  city_not_found: { labelKey: "cityNotFound", reaction: "toast" },
  invalid_company_type: { labelKey: "invalidCompanyType", reaction: "toast" },
  company_name_required: { labelKey: "companyNameRequired", reaction: "toast" },
  company_license_number_required: { labelKey: "companyLicenseNumberRequired", reaction: "toast" },
  company_not_found: { labelKey: "companyNotFound", reaction: "not-found" },
```

- [ ] **Step 8: Teach `errors.ts` the third 403 flavour**

The global middleware answers an unmapped authorization failure with
`{"error": "forbidden", "detail": "<real_code>"}` — the only place in this API where `error` is not the
code. Without this, every such response resolves to the literal code `"forbidden"` and degrades to
"unknown", and `isPermissionDenied` returns `false` because a body is present.

Replace the three exported helpers with:

```ts
/** The middleware's fall-through shape puts the real code in `detail`, not `error`. */
function forbiddenDetail(err: unknown): string | null {
  if (!(err instanceof AxiosError)) return null;
  const data = err.response?.data as { error?: unknown; detail?: unknown } | undefined;
  if (data?.error !== "forbidden") return null;
  return typeof data.detail === "string" ? data.detail : null;
}

export function describeApiError(err: unknown): ApiErrorInfo | null {
  // `{"error":"forbidden","detail":"<code>"}` — read the code out of `detail`.
  const detail = forbiddenDetail(err);
  const code = detail ?? getApiErrorCode(err);
  if (!code) return null;
  const known = CATALOG[code];
  return known
    ? { code, ...known }
    : { code, labelKey: "unknown", reaction: "toast" };
}

/**
 * An **empty** 403 body means the permission filter refused: the caller's role lacks
 * the permission. The middleware's `{"error":"forbidden","detail":…}` shape means the
 * same thing — an authorization failure that simply wasn't mapped by its controller —
 * so it counts here too, even though a body is present.
 */
export function isPermissionDenied(err: unknown): boolean {
  if (status(err) !== 403) return false;
  return getApiErrorCode(err) === null || forbiddenDetail(err) !== null;
}

/**
 * A 403 **with** a gate code is the ACTIVE gate: the caller is permitted, but the
 * subject has no signed contract covering today. Copy must talk about the subject's
 * contract — and `contract_not_yet_active` must never say "expired".
 */
export function isGateRefusal(err: unknown): boolean {
  if (status(err) !== 403) return false;
  if (forbiddenDetail(err) !== null) return false;
  return getApiErrorCode(err) !== null;
}
```

Add these two codes to `CATALOG` as well, since they can now arrive through `detail`:

```ts
  kyc_submit_requires_boss: { labelKey: "requiresBoss", reaction: "toast" },
  kyc_doc_upload_requires_boss: { labelKey: "requiresBoss", reaction: "toast" },
```

- [ ] **Step 9: Reword `Terminated` in `lib/onboarding/status.ts`**

F-03·1 made `Expired` vs `Terminated` load-bearing: a revert stamps an elapsed period `Expired` and an
in-period one `Terminated`, so one lapse can produce both. Change only the phase entry's comment and
keep the labelKey stable (the i18n copy changes in Step 10):

```ts
  // "Ended early" — an admin force-terminate, or a period cut short when a watched
  // document expired (F-03·1). Never render this as "expired".
  Terminated: { variant: "secondary", className: MUTED, labelKey: "terminated" },
```

- [ ] **Step 10: i18n — new copy in both locales**

Add to `onboarding.apiErrors` in `messages/en.json`:

```json
      "incompleteIdentityData": "This subject's identity data is incomplete, so they cannot submit yet.",
      "onboardingLocked": "This data is locked while the application is under review.",
      "cityCountryMismatch": "That city does not belong to the selected country.",
      "cityNotFound": "This city no longer exists.",
      "invalidCompanyType": "Invalid company type.",
      "companyNameRequired": "A company name is required.",
      "companyLicenseNumberRequired": "A licence number is required.",
      "companyNotFound": "No company record exists for this owner.",
      "requiresBoss": "Only the account owner (BOSS) can do this."
```

and `messages/de.json`:

```json
      "incompleteIdentityData": "Die Identitätsdaten dieses Subjekts sind unvollständig, eine Einreichung ist noch nicht möglich.",
      "onboardingLocked": "Diese Daten sind während der Prüfung gesperrt.",
      "cityCountryMismatch": "Diese Stadt gehört nicht zum ausgewählten Land.",
      "cityNotFound": "Diese Stadt existiert nicht mehr.",
      "invalidCompanyType": "Ungültige Unternehmensform.",
      "companyNameRequired": "Ein Firmenname ist erforderlich.",
      "companyLicenseNumberRequired": "Eine Lizenznummer ist erforderlich.",
      "companyNotFound": "Für diesen Eigentümer existiert kein Unternehmenseintrag.",
      "requiresBoss": "Nur der Kontoinhaber (BOSS) kann dies tun."
```

Add a new `onboarding.companyType` group — `en`:

```json
    "companyType": {
      "llc": "LLC",
      "gmbh": "GmbH",
      "individualEntrepreneur": "Individual entrepreneur",
      "soleTrader": "Sole trader",
      "other": "Other",
      "unknown": "Unknown"
    },
```

`de`:

```json
    "companyType": {
      "llc": "LLC",
      "gmbh": "GmbH",
      "individualEntrepreneur": "Einzelunternehmer",
      "soleTrader": "Einzelkaufmann",
      "other": "Sonstige",
      "unknown": "Unbekannt"
    },
```

And change the existing `onboarding.phase.terminated` value — `en`: `"Ended early"`,
`de`: `"Vorzeitig beendet"`. Leave every other phase string alone.

- [ ] **Step 11: Extend the i18n parity check**

In `scripts/verify-v2.mjs`'s section 6, add to `REQUIRED`:

```js
  companyType: ["llc", "gmbh", "individualEntrepreneur", "soleTrader", "other", "unknown"],
```

and append to the `apiErrors` list: `"incompleteIdentityData"`, `"onboardingLocked"`,
`"cityCountryMismatch"`, `"cityNotFound"`, `"invalidCompanyType"`, `"companyNameRequired"`,
`"companyLicenseNumberRequired"`, `"companyNotFound"`, `"requiresBoss"`.

- [ ] **Step 12: Add `Onboarding` to the notification entity union**

In `lib/types/notification.types.ts`, add `| "Onboarding"` to `NotificationEntityType` — the
`OnboardingRevertedToKyc` notification uses it with the subject's id. In `lib/notifications/route.ts`,
route it to the subject's Docs detail once Phase 1 creates those routes; until then return `null` for
it rather than inventing a route, and say so in a comment.

- [ ] **Step 13: Verify**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run verify:api` → `ALL PASS`, including every `F-03.1 …` line and the new i18n groups.
Run: `node -e "require('./messages/en.json');require('./messages/de.json');console.log('valid')"` → `valid`.

- [ ] **Step 14: Clear this phase's own lint warnings in `scripts/verify-v2.mjs`**

`npm run lint` reports 13 `@typescript-eslint/no-unused-expressions` warnings in that file, all from
the pattern `cond ? ok("…") : bad("…")` used as a statement. They are ours — Task 1 introduced them and
Steps 1 and 11 above add more. Convert every one to a plain `if`/`else`:

```js
// before
same ? ok(`enum ${name}`) : bad(`enum ${name}: live=[${live}] expected=[${expected}]`);

// after
if (same) ok(`enum ${name}`);
else bad(`enum ${name}: live=[${live}] expected=[${expected}]`);
```

Do not silence them with an `eslint-disable` and do not exclude `scripts/` from the lint config — the
file is small and the rewrite is mechanical.

Then run `npm run lint` and confirm the only findings left are the three **pre-existing** ones, all
last touched in June 2026 and out of scope for this phase:
`components/ui/sidebar.tsx:610` (error), `global.d.ts:7` (error),
`components/workers/approve-modal.tsx:23` (warning). Zero findings in any file this phase created or
changed.

- [ ] **Step 15: Commit**

```bash
git add lib/types/identity.types.ts lib/onboarding/company.ts \
        lib/types/kyc.types.ts lib/types/worker.types.ts \
        lib/onboarding/errors.ts lib/onboarding/status.ts \
        lib/types/notification.types.ts lib/notifications/route.ts \
        messages/en.json messages/de.json scripts/verify-v2.mjs
git commit -m "feat(onboarding): F-03.1 identity, company, per-document fields and the third 403 flavour"
```

---

## Self-review

**Spec coverage for Phase 0.** Spec §12's inventory maps to tasks as follows: kyc types/service/hook and the three KYC call sites → Task 3; worker types/service/hook and the four worker call sites → Task 4; property-create-dialog and `KNOWN_ASSIGN_ERRORS` (spec §12.1) → Task 5; contract types/service/hooks → Task 6; i18n keys → Task 2; the shared status/error modules the spec puts in `lib/onboarding/` → Task 1; the stale mirror → Task 7. Spec §14's per-phase verification → Task 8. Spec §2.1–2.3 (adapters), §3–4 (Docs workspace), §5–6 (registry, settings), §7–10 (FND-3/1/2, notifications) are **deliberately out of this plan** — they are Phases 1–4 in the roadmap.

**Three items this plan adds beyond the spec's original §12 inventory** (found while reviewing the
plan; the spec was updated to match):
- `scripts/verify-v2.mjs` + `npm run verify:api` — the live contract checker is a repo tool, not a
  scratch file, because every later phase gate re-runs it (Task 1).
- The notification unions are widened and the two duplicated entity-route maps are unified
  (Task 6, Steps 7–8). The backend already emits v2 notification types and `NotificationDto` is not
  in swagger, so nothing else would have caught it.
- `X-Idempotency-Key` is minted by the caller, once per renewal attempt (Task 6). Generating it
  inside the service — as the first draft of this plan did — makes every retry a duplicate contract.

**Two spec items intentionally deferred with a note rather than silently dropped:**
- `owner.service.ts` paged `/api/admin/owners` + export → Phase 3 (nothing in the current UI calls it; the `bosses` picker it does use is unaffected).
- The four owner term fields are typed optional in Task 6 and made required in Phase 1 when the form that collects them exists.

**Type consistency.** `OnboardingStatus`, `ContractPhase`, `PagedResult<T>`, `StatusPresentation`, `ApiErrorInfo`, `WorkerRowDto`, `WorkerListQuery`, `CreateOwnerContractRequest`, `CreateWorkerContractRequest`, `ContractRevisionRequest` are each defined once (Tasks 1, 4, 6) and referenced by those exact names everywhere else. `onboardingStatusPresentation` / `contractPhasePresentation` / `describeApiError` / `isPermissionDenied` / `isGateRefusal` / `canDecide` / `canAuthorContract` / `isCoveredNow` / `findInForce` / `findUnsigned` / `emptyPage` are the only helpers introduced, all from Task 1 or 6.
