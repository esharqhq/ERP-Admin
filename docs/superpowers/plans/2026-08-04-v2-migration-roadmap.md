# v2 Migration Roadmap — phases, agents, and gates

> **For agentic workers:** this file is the **execution contract** for the whole migration: which
> phase runs when, which agent does each kind of work, and which gate must be green before the next
> phase starts. It is not a task list — each phase has (or gets) its own detailed plan.

**Spec:** `docs/superpowers/specs/2026-08-04-erp-admin-v2-migration-design.md`
**Branch:** `feat/v2-migration` (spec commit `520bc5f`)
**Phase 0 plan:** `docs/superpowers/plans/2026-08-04-v2-phase-0-foundation.md` ← written, ready to execute
**Phases 1–4 plans:** written at the start of each phase (see "Why the later plans are written later")

---

## Phase order and dependencies

```
Phase 0  Foundation  ──┬──► Phase 1  Docs workspace  ──► Phase 2  Contracts registry + Settings
                       │
                       ├──► Phase 3  FND-3 paged tables + export
                       │
                       └──► Phase 4  FND-1 lookups · FND-2 ticket · notifications
```

Phase 1 is the only hard dependency chain (0 → 1 → 2). Phases 3 and 4 depend on Phase 0 only, so
they may run in parallel with Phase 2 if more than one worker is available. Phase 1 should still be
finished first — it is where the product value is.

| Phase | Deliverable | Depends on | Rough size |
|---|---|---|---|
| **0** | App correct against live v2; shared status/error vocabulary | — | 8 tasks |
| **1** | Docs workspace: review → approve → author → send → track, both sides | 0 | ~14 tasks |
| **2** | Contracts registry (unsigned + expiring blocks) and the full Settings contract category | 0, 1 | ~6 tasks |
| **3** | Owners/Workers directories: server paging, filters, CSV/XLSX export | 0 | ~8 tasks |
| **4** | Lookup CRUD, admin-initiated ticket, new notification types | 0 | ~9 tasks |

---

## Agent assignment

### By kind of work

| Work | Agent / skill | Why this one |
|---|---|---|
| "Find every place that touches X" before editing | **`Explore`** agent | Read-only, fans out cheaply, returns the conclusion instead of file dumps |
| Types, services, hooks, i18n, mechanical call-site migration | **`general-purpose`** subagent, one per task | Bounded, exact file list, no design judgment |
| New UI components and screens (Phase 1, 2, 3, 4) | **`general-purpose`** subagent that **must invoke `frontend-design:frontend-design` first** | Visual quality is a product requirement; the skill sets the design approach before code |
| TSX quality pass after a batch of component edits | **`vercel:react-best-practices`** skill (main agent) | Hooks/a11y/perf checklist over the new components |
| Review gate after **every** task | main agent: `superpowers:requesting-code-review`, then `/code-review` on the diff | Two-stage review is the point of subagent-driven development |
| Quality cleanup before a phase PR | **`simplify`** skill | Reuse/altitude/duplication pass — not a bug hunt |
| Live API verification, credential handling, go/no-go | **main agent — never delegated** | Needs secrets, judgment on shape diffs, and the authority to stop the phase |
| Commit + push + PR at a phase boundary | **`git-pusher`** agent | Writes the conventional-commit message from the diff and pushes |
| Anything touching the deployed backend's settings | **main agent, after explicit user approval** | Shared server; see gate G3 |

### Rules for whoever dispatches

1. **One task per subagent.** A subagent gets exactly one task's text plus the Global Constraints
   block of its phase plan. It does not get the whole plan — that is what the Interfaces block in
   each task is for.
2. **Never let a subagent choose the API contract.** Every endpoint, field name and error code is
   already fixed in the spec. A subagent that "cannot find the field" must report back, not invent.
3. **Never let a subagent flip a system setting, create a contract on a real subject, or send
   anything to a real user.** Those are main-agent actions behind gate G3.
4. **A subagent that finishes with `tsc` errors has not finished.** The task's own verification
   steps are part of the task.
5. **Prefer `Explore` before `general-purpose`** when the first question is "where is this used?".
6. UI subagents must reuse `components/ui/*` and the `app/globals.css` tokens. Adding a new
   dependency, a new CSS system, or a hand-rolled primitive that duplicates an existing one is a
   review rejection.

---

## Gates

A gate is a condition, not a ceremony. If it is red, the phase does not start.

| Gate | Condition | Who satisfies it | Blocks |
|---|---|---|---|
| **G0** | On `feat/v2-migration`, clean tree, `npm install` done, `npx tsc --noEmit` runs | worker | everything |
| **G1** | Live API reachable and `node $SCRATCH/verify-v2.mjs` reports `ALL PASS` on the public (unauthenticated) half | worker | Phase 0 Task 1 |
| **G2** | `ERP_ADMIN_EMAIL` / `ERP_ADMIN_PASSWORD` available, authenticated half of `verify-v2.mjs` passes | **user** (provide credentials) | Phase 0 Task 8, all of Phase 1 |
| **G3** | Explicit user approval to set `contract.template.approved = true` on the **shared deployment**, plus a dedicated **test owner** and **test worker** account | **user** | Phase 1's send/sign verification only — the UI work proceeds without it |
| **G4** | Phase 0 gate task green: `tsc` + `lint` + `build` clean, dead-vocabulary sweep empty, live check passing | worker | Phases 1, 3, 4 |
| **G5** | Phase 1 merged and the full owner+worker journey verified once against live | worker | Phase 2 |
| **G6** | FND-2 `targetUserType` owner literal (`"Owner"` vs `"OwnerUser"`) confirmed with one live call | worker | Phase 4's ticket dialog only |

**G2 and G3 are the two things only the user can unblock.** Everything else a worker can satisfy
alone. If G2 is missing, Phase 0 still completes tasks 1–7 and stops at the gate.

---

## Why the later plans are written later

Each phase plan is written at that phase's kickoff, not now — for a concrete reason per phase, not
as a scheduling preference:

- **Phase 1** needs the `{{token}}` names inside `contract.template.owner.en`, which live only in
  the deployed database. Phase 0 Task 8 Step 5 reads them. Writing the contract-form task before
  that means inventing token names and correcting them later.
- **Phase 2** renders `phase` values observed in real rows (how many `Scheduled`, whether any
  `Lapsed` exist), and its Settings screen writes keys whose current values Phase 0 Task 8 records.
- **Phase 3** reuses `use-paged-table`, whose exact shape is decided by Phase 1's Docs table — the
  first real consumer. Designing the hook twice is the failure mode to avoid.
- **Phase 4** needs G6 confirmed, and its notification deep links point at routes Phase 1 creates.

What is **not** deferred: the endpoints, DTOs, error codes, IA decisions and phase boundaries are
all fixed in the spec now. The per-phase plans add task decomposition and code, not decisions.

---

## Phase 1 — Docs workspace

**Plan file to write:** `docs/superpowers/plans/2026-08-XX-v2-phase-1-docs-workspace.md`
**Gates:** G4 required; G2 required; G3 required only for the send/sign verification task.

**Task outline** (the plan expands each into bite-sized steps with real code):

| # | Task | Agent |
|---|---|---|
| 1 | `lib/onboarding/subject-adapter.ts` — the interface plus `SubjectRow`/`SubjectDetail`/`SubjectDoc`/`SubjectContract` normalizers | `general-purpose` |
| 2 | `owner-adapter.ts` — `/api/admin/kyc` + client-side search/sort/page; carries both `ownerProfileId` and `ownerUserId` | `general-purpose` |
| 3 | `worker-adapter.ts` — `/api/admin/workers` server-side query; `documentCount: null` | `general-purpose` |
| 4 | `docs-filter-bar.tsx` + `docs-table.tsx` — identical both sides, no row actions, sortable on name/date only | `general-purpose` + `frontend-design` |
| 5 | Routes `/dashboard/owner-documents` and `/dashboard/worker-documents` (list) + nav rename `KYC` → `Docs`, delete `/dashboard/kyc` | `general-purpose` |
| 6 | `onboarding-stepper.tsx` — the 4-step state machine derived from status + phase | `general-purpose` + `frontend-design` |
| 7 | `documents-panel.tsx` + `document-viewer-modal.tsx` — read-only list, modal viewer over the public `/files/` URL | `general-purpose` + `frontend-design` |
| 8 | `review-actions.tsx` — account-level Approve / Reject+reason, enabled only at `Review`, `prefill` captured from the response | `general-purpose` |
| 9 | `contract-form.tsx` — owner 8 fields / worker 4, `toUtcIso()` on every date, re-seed from the response (snapped `eligibleFrom`), presign under `contract-sources` | `general-purpose` + `frontend-design` |
| 10 | `contract-state-panel.tsx` — Sent/Scheduled/InForce rendering, `previewUrl`/`documentUrl` follow-don't-cache with one retry, `renewalStartsAt` copy, Renew entry point | `general-purpose` + `frontend-design` |
| 11 | `subject-detail.tsx` — the 70/30 layout wiring 6–10 together; `use-docs-workspace.ts` orchestration | `general-purpose` + `frontend-design` |
| 12 | Detail routes `[ownerProfileId]` / `[workerId]`; owner term fields become required in `CreateOwnerContractRequest` | `general-purpose` |
| 13 | `contract.template.approved` switch in Settings + the 409 → Settings link path | `general-purpose` |
| 14 | Phase gate: `vercel:react-best-practices` pass, `simplify` pass, full live journey (needs G3), PR | **main agent** + `git-pusher` |

**Verification that defines "done":** on a test owner — approve → draft → send → open `previewUrl`
→ recall → edit → send → sign as the subject → `documentUrl` renders → renew produces a
`Scheduled` row while the old row stays `InForce`. Then the same on a test worker.

---

## Phase 2 — Contracts registry + Settings

**Plan file:** `docs/superpowers/plans/2026-08-XX-v2-phase-2-contracts-registry.md`
**Gate:** G5.

| # | Task | Agent |
|---|---|---|
| 1 | `findUnsigned` / expiring-soon selectors over the unpaginated admin lists | `general-purpose` |
| 2 | Unsigned block (`phase === "Sent"` by `sentAt`) + expiring block (`InForce`, `eligibleTo` ≤ 30 d) | `general-purpose` + `frontend-design` |
| 3 | Registry table with owner/worker tabs, phase filter, rows linking into the Docs detail | `general-purpose` + `frontend-design` |
| 4 | Settings "Contract" category: templates (read-only view + edit), the four `onboarding.expiry.*` keys with **corrected** `block_days` copy | `general-purpose` |
| 5 | Remove whatever survived of `contract-form-dialog.tsx` and any terminate entry point | `general-purpose` |
| 6 | Phase gate + PR | **main agent** + `git-pusher` |

---

## Phase 3 — FND-3 paged tables and export

**Plan file:** `docs/superpowers/plans/2026-08-XX-v2-phase-3-paged-tables.md`
**Gate:** G4. May run in parallel with Phase 2.

| # | Task | Agent |
|---|---|---|
| 1 | `hooks/use-paged-table.ts` — URL-synced page/pageSize/sortBy/dir/filters, clamped to `MAX_PAGE_SIZE`, whitelist-guarded `sortBy` | `general-purpose` |
| 2 | `owner.service.ts` paged `/api/admin/owners` + `OwnerListQuery` types | `general-purpose` |
| 3 | `lib/services/export.service.ts` — blob download, `Content-Disposition` filename, `export_too_large` / `invalid_format` handling | `general-purpose` |
| 4 | Owners directory screen: filters, sortable heads, pagination, export button with the "this action is logged" note | `general-purpose` + `frontend-design` |
| 5 | Workers directory screen: the rich filter set (professions multi-select, rating + `includeUnrated`, ranges, `hasActiveContract` with its lag tooltip) | `general-purpose` + `frontend-design` |
| 6 | Client-side range validation so `invalid_filter_value` is never reached by accident | `general-purpose` |
| 7 | Retire the client-side CSV path for these two tables (`lib/csv.ts` stays for attendance) | `general-purpose` |
| 8 | Phase gate + PR | **main agent** + `git-pusher` |

---

## Phase 4 — Lookups, admin ticket, notifications

**Plan file:** `docs/superpowers/plans/2026-08-XX-v2-phase-4-lookups-ticket-notifications.md`
**Gates:** G4; G6 for task 5.

| # | Task | Agent |
|---|---|---|
| 1 | `lookup.types.ts` + `lookup.service.ts` + `use-lookups.ts` (3 entities, create/update only — no delete exists) | `general-purpose` |
| 2 | Shared lookup CRUD screen: `nameDe`/`nameEn`, create-only `code`, `isActive` toggle, "send only what changed" updates | `general-purpose` + `frontend-design` |
| 3 | `settings/property-categories` and `settings/countries` (cities nested per country row, no cascade) + `navExtraGates` entries | `general-purpose` |
| 4 | Locale-aware name rendering helper (`nameDe`/`nameEn`, no `?lang=`) used by every picker | `general-purpose` |
| 5 | Admin-ticket dialog + `support.service.openForUser` with required `X-Idempotency-Key`; recipient-not-caller semantics documented in code | `general-purpose` + `frontend-design` |
| 6 | Three entry points for the dialog (Docs detail, owner/worker detail, support inbox) | `general-purpose` |
| 7 | Notification types 44/47/48/51/52/54/56 + `OwnerContract`/`WorkerContract`/`SupportTicket` entity types | `general-purpose` |
| 8 | Deep links per type; `metadata["eligibleTo"]` in the bell row | `general-purpose` |
| 9 | Phase gate + PR; append the eight backend asks from spec §16 to `BACKEND-ASKS.md` | **main agent** + `git-pusher` |

---

## What "done" means for the whole migration

- No occurrence of `isApproved`, `kycStatus`, `worker_not_approved` or `CreateContractRequest`
  outside `docs/`.
- Every status rendered through `lib/onboarding/status.ts`; every API error through
  `lib/onboarding/errors.ts`; no ad-hoc status strings in components.
- Every cover statement derives from `phase === "InForce"`.
- An admin can take an owner and a worker from submitted documents to a signed, in-force contract
  without leaving the admin panel, and can see who was sent a contract and never signed it.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` clean; `node $SCRATCH/verify-v2.mjs`
  `ALL PASS`.
- The eight backend asks are filed.
