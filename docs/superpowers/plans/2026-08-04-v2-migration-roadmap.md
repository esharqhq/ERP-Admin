# v2 Migration Roadmap — phases, agents, and gates

> **For agentic workers:** this file is the **execution contract** for the whole migration: which
> phase runs when, which agent does each kind of work, and which gate must be green before the next
> phase starts. It is not a task list — each phase has (or gets) its own detailed plan.

**Spec:** `docs/superpowers/specs/2026-08-04-erp-admin-v2-migration-design.md` (amended 2026-08-04 for
F-03·1 — see its §18; the canonical backend guides live at `D:\projekts\ERP-Uyer\Backend\docs\handoff\`)
**Branch:** `feat/v2-migration` (spec commit `520bc5f`)
**Phase 0 plan:** `docs/superpowers/plans/2026-08-04-v2-phase-0-foundation.md` ← executed
**Phase 1:** built **without a plan file** across commits `bc292f0`…`8a3a9ed`. Its unfinished tail is
`docs/superpowers/plans/2026-08-07-v2-phase-1-close.md`, which opens with a task-by-task
reconciliation of what actually shipped. See "Phase 1 was executed without its plan" below.
**Phases 2–4 plans:** all written 2026-08-07 —
`2026-08-07-v2-phase-2-contracts-registry.md`,
`2026-08-07-v2-phase-3-paged-tables.md`,
`2026-08-07-v2-phase-4-lookups-ticket-notifications.md`.

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
| **0** | App correct against live v2; shared status/error vocabulary; **F-03·1 catch-up** | — | 9 tasks |
| **1** | Docs workspace: review → approve → author → send → track, both sides, **plus the F-03·1 identity/company panels and per-document review** | 0 | ~17 tasks |
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
| **G1** | Live API reachable and `npm run verify:api` reports `ALL PASS` on the public (unauthenticated) half | worker | Phase 0 Task 1 |
| **G2** | `ERP_ADMIN_EMAIL` / `ERP_ADMIN_PASSWORD` available, authenticated half of `verify-v2.mjs` passes | **user** (provide credentials) | Phase 0 Task 8, all of Phase 1 |
| **G3** | Explicit user approval to set `contract.template.approved = true` on the **shared deployment**, plus a dedicated **test owner** and **test worker** account (email + password for each) | **user** | Phase 1's send/sign verification only — the UI work proceeds without it |
| **G4** | Phase 0 gate task green: `tsc` and `build` clean, **no lint finding attributable to this phase** (see the pre-existing-issues section — `lint` itself exits 1 and has since June 2026), dead-vocabulary sweep empty, live check passing | worker | Phases 1, 3, 4 |
| **G5** | Phase 1 merged and the full owner+worker journey verified once against live | worker | Phase 2 |
| **G6** | FND-2 `targetUserType` owner literal (`"Owner"` vs `"OwnerUser"`) confirmed with one live call | worker | Phase 4's ticket dialog only |

**G2 and G3 are the two things only the user can unblock.** Everything else a worker can satisfy
alone. If G2 is missing, Phase 0 still completes tasks 1–7 and stops at the gate.

> ### Gate status as of 2026-08-10 — Phase 1 Close is DONE, G4 is green, G5 is waived
>
> - **G4 is green, and it now means what it says.** `npm run test` 37/37 · `npx tsc --noEmit` exit 0 ·
>   **`npm run lint` exit 0** · `npm run build` ✓ · dead-v1-vocabulary sweep clean ·
>   `npm run verify:api` **ALL PASS** on the public half. Measured 2026-08-10 on `8ff8077`.
> - **`lint` exits 0 for the first time since June 2026** (Phase 1 Close Task 6). Every later gate is
>   therefore the plain check, not a comparison against a remembered baseline of three findings.
>   ⚠ One caveat for whoever runs the dead-vocabulary sweep: four hits survive and **all four are
>   comments or docs that record the removal** — `workers/page.tsx:54`, `dispatch/page.tsx:46`,
>   `worker.service.ts:14`, `FRONTEND-HANDOFF.md:182`. Keep them; they stop someone re-adding the
>   dead names. Scope the sweep to code, or accept those four by name.
> - **A test runner now exists.** `npm run test` is part of every gate from here on. Node environment,
>   `lib/**` + `hooks/**` only — no jsdom, no component tests, deliberately.
> - **G5 is waived, not met, and does not become met by Phase 2.** The condition is *"Phase 1 merged
>   and the full owner+worker journey verified once against live"*. G2 and G3 are both unmet, so **no
>   contract has ever been sent, signed, renewed, or terminated from this panel.** Phase 1's UI is
>   complete and every static gate is green; that is a different claim and the two must not be
>   conflated in a PR description.
>
>   What *was* verified, and it is more than nothing: every new screen was rendered in a real browser
>   against mock data, in both locales, in light and dark, via temporary harnesses that were deleted
>   afterwards. That caught six defects no diff review would have found — an off-by-one day count, a
>   hydration mismatch introduced by a lint fix, ambiguous month-first dates in two places, a
>   `Scheduled` contract described as "ends now", and an i18n key that rendered its own path to the
>   admin. **Rendering is verified. The backend round-trip is not.**
>
>   The single cheapest thing that would discharge the most risk: the product owner has a real signed
>   contract on screen (`documentUrl` populated). Opening that panel, waiting ~6 minutes and clicking
>   "Open signed contract" would settle AL-10 and AL-11 in one action.
> - **Phases 2, 3 and 4 therefore run on G4 alone**, each under an Assumption Ledger at the foot of
>   its plan file. Those four ledgers are the consolidated list of what to verify, in order, on the
>   day credentials arrive — the cheapest single check in the whole set is
>   `GET /api/property-categories`, which is open to any authenticated user and settles two entries
>   that between them block four of Phase 4's tasks.
> - **G6 remains unconfirmed** and blocks only Phase 4 Task 6.

**Signing as the subject does not need the Owner or Worker app.** G3 only has to provide credentials;
the verification signs over the API, which keeps Phase 1's end-to-end check inside one terminal:

```bash
# 1. subject logs in (userType=Owner or Worker)
node -e "
const B='https://germany-erp.esharq.com';
(async()=>{
  const a=await fetch(B+'/api/auth/login?userType=Owner',{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:process.env.ERP_TEST_OWNER_EMAIL,password:process.env.ERP_TEST_OWNER_PASSWORD})});
  const {accessToken}=await a.json();
  // 2. read own contracts — the Sent row carries previewUrl
  const r=await fetch(B+'/api/contracts/owner/me',{headers:{Authorization:'Bearer '+accessToken}});
  const rows=await r.json();
  console.log(rows.map(c=>({id:c.id,status:c.status,phase:c.phase,previewUrl:!!c.previewUrl})));
  // 3. sign the Sent one
  const sent=rows.find(c=>c.status==='Sent');
  if(!sent){console.log('nothing to sign');return}
  const s=await fetch(B+'/api/contracts/owner/'+sent.id+'/sign',{method:'POST',
    headers:{Authorization:'Bearer '+accessToken}});
  console.log('sign →',s.status,JSON.stringify(await s.json()).slice(0,300));
})()
"
```

Signing is deliberately **not** idempotent: a second call returns
`400 invalid_onboarding_transition`, which is itself a useful assertion. The worker variant is the
same with `userType=Worker` and `/api/contracts/worker/…`.

---

## Why the later plans were written later — and how that resolved

*Amended 2026-08-07. All four remaining plans are now written. Each deferral reason is recorded here
with what actually happened, because two of them dissolved and two turned into documented
assumptions rather than answers.*

- **Phase 1** needed the `{{token}}` names inside `contract.template.owner.en`, readable only from the
  deployed database. **Moot** — Phase 1 was built without its plan file, and the contract form
  shipped. What remains is a four-item tail with no token dependency.
- **Phase 2** was to render `phase` values observed in real rows. **Not resolved.** G2 never arrived,
  so nothing was observed. The plan is written against DTO types instead, and every rendering
  decision is listed in that plan's Assumption Ledger. Its Settings screen also writes keys whose
  current values were never read, which is ledger entry AL-3.
- **Phase 3** was to reuse `use-paged-table`, "whose exact shape is decided by Phase 1's Docs table —
  the first real consumer". **The premise was wrong.** Phase 1's Docs table never built that hook:
  the owner side filters in memory and the worker side passes `pageSize` straight through. So Phase 3
  Task 1 designs the hook fresh, now with two known consumers instead of one — a better position than
  the deferral was protecting.
- **Phase 4** needed G6 confirmed. **Still unconfirmed.** The owner-side `targetUserType` literal is
  isolated behind one exported constant, and Phase 4 Task 6 — the three entry points — does not
  start until a single live call settles it.

What was **never** deferred, and held: the endpoints, DTOs, error codes, IA decisions and phase
boundaries were fixed in the spec, and writing the plans required no new decisions about any of them.
The reading that did not hold is that deferring a plan buys accuracy — **without G2 it buys nothing**,
and the four Assumption Ledgers are what the deferral was supposed to avoid needing.

---

## Phase 1 — Docs workspace

> ### Phase 1 is CLOSED — 2026-08-10, commits `2b360a8`…`8ff8077`
>
> All 11 tasks of `2026-08-07-v2-phase-1-close.md` are complete, each with a task review and, where
> findings arose, a scoped re-review. **Nine fix rounds across five tasks**, one of which was a
> Critical caught only by rendering the component (a lint fix that broke SSR hydration in a primitive
> every dashboard screen mounts). Full record: `.superpowers/sdd/2026-08-07-v2-phase-1-close/progress.md`.
>
> Worth carrying forward: **five of the nine fix rounds traced back to defects in the plan itself**,
> not to the implementers — a miscounted key total, a commit template describing the opposite of what
> the code did, an i18n value that forced an argument nine call sites don't pass, and two copy
> instructions that were too narrow. Every one was found by executing the plan, none by re-reading it.
>
> *Amended 2026-08-07.* The plan file this section originally called for —
> `2026-08-XX-v2-phase-1-docs-workspace.md` — **was never written.** The Docs workspace was built
> directly across commits `bc292f0`…`8a3a9ed`, and the 14-task outline below was used as the working
> list rather than expanded into a plan.
>
> It is not being written retroactively; that would manufacture a record of planning that did not
> happen. Ten of the fourteen tasks are verified complete in the working tree, and the tail is
> **`2026-08-07-v2-phase-1-close.md`**, which opens with the task-by-task reconciliation and the
> evidence for each.
>
> Two things went differently from this outline and both are merged and fine:
> tasks 1–3 became **one** normalizer (`lib/onboarding/subject-row.ts`) with two adapter functions
> instead of three adapter files, and task 4's table serves both sides from one component. Constraint
> 3 (`isActive` on the registry), constraint 10's i18n sweep, task 13 and task 14 are what remain.

**Plan file:** `docs/superpowers/plans/2026-08-07-v2-phase-1-close.md` (the tail only)
**Gates:** G4 required; G2 required; G3 required only for the send/sign verification task.

### Phase 1 Global Constraints — copy these verbatim into that plan's header

These are the things that separate a working screen from a finished one. Each is a review rejection
if missing, not a nice-to-have.

1. **Permission-aware rendering, not 403-driven.** An admin holding `kyc:read` but not
   `owner_contract:create_any` (70011) must never see the contract panel at all — not see it and get
   a 403. Read the caller's set through the existing `hooks/use-current-permissions.ts`. Gates:
   documents panel `kyc:review` (40011) / `worker:doc:read_any` (80030); Approve `kyc:approve`
   (40012) / `worker:approve` (80003); Reject `kyc:reject` (40013) / `worker:reject` (80004);
   contract panel and all its actions `owner_contract:create_any` (70011) /
   `worker_contract:create_any` (90021); Renew `owner_contract:renew_any` (70012) /
   `worker_contract:renew_any` (90022). The 403 handlers stay as the backstop.
2. **One invalidation map, declared once.** Approve/reject/create/send/recall/renew each invalidate
   an explicit list, and nothing invalidates by guesswork: approve → `["kyc"]` or `["workers"]`,
   plus the subject's detail key, plus `["owner-contracts"]`/`["worker-contracts"]`, plus
   `["notifications"]` (an approval produces bell rows for other admins). Never invalidate a
   still-mounted detail query for a record that was just soft-deleted — the repo already documents
   that trap in `hooks/use-owners.ts`.
3. **First thing to fix on the contracts screen: it still gates on `isActive`.** `app/[locale]/dashboard/contracts/page.tsx` renders its badge and its renew/terminate affordances from `r.isActive`, and `phase` is not even mapped onto its row type. `isActive` is a mirror reconciled hourly; `phase` is computed live. This predates `phase` existing on the DTO and Phase 0 deliberately left it alone ("change only what the compiler forces"), but it is the literal thing the global constraint warns against — map `phase` onto the row and drive every affordance off it before adding anything to that screen.
4. **The admin contract list is fetched once, selected per subject.** `GET /api/contracts/admin/{side}`
   is unpaginated and returns every subject's rows. Hold it under one query key and derive the
   subject's rows with react-query's `select`; do **not** refetch the whole list on every detail
   open.
5. **The 70/30 split collapses.** Two columns at `lg` and above; below that the documents panel moves
   **above** the contract form (documents are read first) and both go full width. The page body never
   scrolls horizontally.
6. **Every panel has four states.** Skeleton (reuse `components/ui/skeleton.tsx`), empty (with copy
   that says what to do next), error (with a retry), and loaded. "Loading…" text is not a state.
7. **Search feels identical on both sides.** 300 ms debounce on both; the owner side filters an
   in-memory array, the worker side issues a request — the pending indicator must appear on both so
   the two screens behave the same to the admin.
8. **One `useSignedPdf` helper for `previewUrl` / `documentUrl`.** Follow the URL, never persist it;
   on 404 re-read the contract once and retry with the fresh URL; on the second 404 stop and surface
   "this document is missing" (it means a genuine backend problem). No retry loops.
9. **Every date leaves through one `toUtcIso()` helper.** ~~A naive datetime is a 500 with no parseable
   body~~, so there must be exactly one place that serializes contract dates.

   > **Amended 2026-08-10 — the stated reason is no longer true.** A naive datetime is **accepted**
   > now. A global `UtcDateTimeConverter` reads an offset-less body value as UTC
   > (`G_NaiveDatetimeReturns500`, closed 2026-08-08) and a model binder does the same for
   > query/route/form values (`G_QueryBoundDatesRejectOffsetless`, closed 2026-08-09), so all of
   > `"2026-08-01T00:00:00"`, `"…Z"`, `"…+02:00"` and `"2026-08-01"` are valid and store the same
   > instant. `index/dtos/contracts.md:35-43`: *"Sending the `Z` remains the clearest habit; it is no
   > longer load-bearing on either path."* There is also **no 500 left anywhere for a naive datetime**
   > (`G_HandoffClaims500HasNoErrorBody`, closed moot). Keep the single helper — one serializer is still
   > right — but it is hygiene now, not a defence.
10. **Deleting `/dashboard/kyc` requires two follow-ups in the same task:** a redirect from
   `/dashboard/kyc` → `/dashboard/owner-documents` so existing bookmarks and any external link keep
   working, and repointing `notificationRoute`'s `OwnerProfile` case to
   `/dashboard/owner-documents/{entityId}`. Also delete the now-dead `owners.kyc.*` i18n keys the old
   page owned (`allTab`, `documents`, `documentsEmpty`, …) in **both** locales — **and**
   `owners.columns.kycStatus`, which Phase 0's gate sweep found still serving as that page's column
   header (two occurrences per locale), labelling an onboarding stage "KYC Status". The replacement
   table names it `onboardingStatus`; do not carry the old name forward.
11. **The worker Docs table has no document-count column at all** — `WorkerRowDto` has no such field,
    and a column of dashes reads as missing data. The owner table shows it; the shared table takes the
    column set from the adapter.
12. **F-03·1 rules the panels must carry** (spec §4.2, §18):
    - Identity and company are **read-only here, always** — only the subject writes them, only while at
      `Kyc`/`Rejected`, and **no admin correction endpoint exists**. Where an admin would look for an
      edit affordance, state the loop instead: reject with a reason → the subject edits → the subject
      re-submits.
    - `company: null` is **"natural person"**, a valid and complete state — never an empty company form,
      never a blank card. There is no `isLegalEntity` flag; the row's absence is the fact.
    - **Per-document decisions are silent and do not move `onboardingStatus`.** The panel must say so.
      An admin who rejects six files and stops has told the subject nothing.
    - `CompanyType` renders through `companyTypeLabelKey` — never the raw enum member.
    - A per-document reject can fail model validation *before* the service guard, returning a
      model-validation body instead of `{"error": …}`. Require the reason client-side.
13. **Reuse, don't re-invent.** `data-table-card`, `table-pagination`, `sortable-table-head`,
    `filter-menu`, `dialog`, `sheet`, `tabs`, `skeleton` already exist. A new primitive that
    duplicates one of these, a new dependency, or hardcoded colors instead of the `globals.css`
    tokens is a rejection. Dark mode must work because the tokens are used, not because it was
    patched afterwards.

**Task outline** (the plan expands each into bite-sized steps with real code):

| # | Task | Agent |
|---|---|---|
| 1 | `lib/onboarding/subject-adapter.ts` — the interface plus `SubjectRow`/`SubjectDetail`/`SubjectDoc`/`SubjectContract` normalizers | `general-purpose` |
| 2 | `owner-adapter.ts` — `/api/admin/kyc` + client-side search/sort/page; carries both `ownerProfileId` and `ownerUserId` | `general-purpose` |
| 3 | `worker-adapter.ts` — `/api/admin/workers` server-side query; `documentCount: null` | `general-purpose` |
| 4 | `docs-filter-bar.tsx` + `docs-table.tsx` — identical both sides, no row actions, sortable on name/date only | `general-purpose` + `frontend-design` |
| 5 | Routes `/dashboard/owner-documents` and `/dashboard/worker-documents` (list) + nav rename `KYC` → `Docs`; delete `/dashboard/kyc` **with** its redirect, the `notificationRoute` repoint, and the dead `owners.kyc.*` keys removed (constraint 9) | `general-purpose` |
| 6 | `onboarding-stepper.tsx` — the 4-step state machine derived from status + phase | `general-purpose` + `frontend-design` |
| 7 | `documents-panel.tsx` + `document-viewer-modal.tsx` — read-only list with each document's `status` badge and `rejectReason`, modal viewer over the public `/files/` URL | `general-purpose` + `frontend-design` |
| 7b | **F-03·1** `identity-panel.tsx` + `company-panel.tsx` — read-only passport block and the conditional company block; `company: null` renders as "natural person", never an empty form; `CompanyType` through `companyTypeLabelKey`; flag a passport/licence expiry that is past or within 30 days | `general-purpose` + `frontend-design` |
| 7c | **F-03·1** `document-review-actions.tsx` — per-document ✓/✕ with a required reason, identical on both sides, on the account-level permissions. Must state that per-document decisions are **silent** (no notification) and do **not** move `onboardingStatus`; visually separated from the bundle actions | `general-purpose` + `frontend-design` |
| 8 | `review-actions.tsx` — account-level Approve / Reject+reason, enabled only at `Review`, `prefill` captured from the response. Copy must tell the admin this is the step that actually notifies the subject | `general-purpose` |
| 9 | `contract-form.tsx` — owner 8 fields / worker 4, `toUtcIso()` on every date, re-seed from the response (snapped `eligibleFrom`), presign under `contract-sources`. ⚠ **Fixing a live bug:** the current `components/contracts/contract-form-dialog.tsx:67` calls `useUpload("contracts")`, and the `contracts/` prefix is signature-protected while `fileUrl` is never signed — so every source file uploaded through it 404s for everyone, including the admin who uploaded it. The replacement must presign under a distinct category (`contract-sources`), and this must not be dropped when the dialog is retired | `general-purpose` + `frontend-design` |
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

**Plan file:** `docs/superpowers/plans/2026-08-07-v2-phase-2-contracts-registry.md` ← written
**Gate:** G5 — **waived, not met.** See the gates table. The plan proceeds under an explicit waiver and
an Assumption Ledger; no contract row has ever been rendered from live data.

| # | Task | Agent |
|---|---|---|
| 1 | `findUnsigned` / expiring-soon selectors over the unpaginated admin lists | `general-purpose` |
| 2 | Unsigned block (`phase === "Sent"` by `sentAt`) + expiring block (`InForce`, `eligibleTo` ≤ 30 d) | `general-purpose` + `frontend-design` |
| 3 | Registry table with owner/worker tabs, phase filter, rows linking into the Docs detail | `general-purpose` + `frontend-design` |
| 4 | Settings "Contract" category: templates (read-only view + edit), the four `onboarding.expiry.*` keys with **corrected** `block_days` copy, plus a note that the ladder now watches passport and licence dates too | `general-purpose` |
| 4b | **F-03·1** the registry's "expiring" block covers contract dates only — label it as such, and render `Terminated` as *ended early* (never *expired*), since a document lapse now stamps in-period rows `Terminated` and elapsed ones `Expired` in the same list | `general-purpose` |
| 5 | Remove whatever survived of `contract-form-dialog.tsx` and any terminate entry point | `general-purpose` |
| 6 | Phase gate + PR | **main agent** + `git-pusher` |

---

## Phase 3 — FND-3 paged tables and export

**Plan file:** `docs/superpowers/plans/2026-08-07-v2-phase-3-paged-tables.md` ← written
**Gate:** G4. May run in parallel with Phase 2.

⚠ **Two of the eight tasks below are already done.** Phase 0 built `WorkerListQuery` with every FND-3
filter (`lib/types/worker.types.ts:60-78`), the `WORKER_SORT_COLUMNS` whitelist, and the paged worker
service with repeated-key serialization. Task 5 is UI only. The **owner** half has none of it — the
directory still reads the unpaged `bosses` picker as if it were the table.

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

**Plan file:** `docs/superpowers/plans/2026-08-07-v2-phase-4-lookups-ticket-notifications.md` ← written
**Gates:** G4; **G6 for task 6** (the three entry points), not task 5 — the service and dialog can ship
with the owner literal behind one constant; only the owner-side entry point would 400 on every attempt.

⚠ **Task 7 is already done.** Phase 0 widened both notification unions
(`lib/types/notification.types.ts:7-24`) and `lib/notifications/route.ts` exists. What is missing is
`metadata.sourceKey` routing, which the plan makes its own task.

| # | Task | Agent |
|---|---|---|
| 1 | `lookup.types.ts` + `lookup.service.ts` + `use-lookups.ts` (3 entities, create/update only — no delete exists) | `general-purpose` |
| 2 | Shared lookup CRUD screen: `nameDe`/`nameEn`, create-only `code`, `isActive` toggle, "send only what changed" updates | `general-purpose` + `frontend-design` |
| 3 | `settings/property-categories` and `settings/countries` (cities nested per country row, no cascade) + `navExtraGates` entries | `general-purpose` |
| 4 | Locale-aware name rendering helper (`nameDe`/`nameEn`, no `?lang=`) used by every picker | `general-purpose` |
| 5 | Admin-ticket dialog + `support.service.openForUser` with required `X-Idempotency-Key`; recipient-not-caller semantics documented in code | `general-purpose` + `frontend-design` |
| 6 | Three entry points for the dialog (Docs detail, owner/worker detail, support inbox) | `general-purpose` |
| 7 | Notification types 44/47/48/51/52/54/56 + `OwnerContract`/`WorkerContract`/`SupportTicket` entity types | `general-purpose` |
| 8 | Deep links per type; `metadata["eligibleTo"]` in the bell row. **F-03·1:** route the expiry alert on `metadata.sourceKey` (`contract`\|`license`\|`passport`), **not** on `entityType` — the warning row carries the contract as its entity even when a licence fired it, so `entityType` routing sends the admin to the wrong screen. Handle `entityType: "Onboarding"` on the revert notification | `general-purpose` |
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
- `npm run test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` clean; `npm run verify:api`
  `ALL PASS`.
- The eight backend asks are filed.

*Amended 2026-08-07:* `npm run test` is new. Phase 1 Close Task 1 adds `vitest` for **pure logic
only** — node environment, a `lib/**` + `hooks/**` include glob, no jsdom and no testing-library, so
component tests cannot creep in without a config change. The reason is specific rather than general:
the remaining phases turn on logic that compiles cleanly while being wrong — URL round-tripping,
range validation, phase selection, day arithmetic — and a real off-by-one shipped on 2026-08-07 that
`tsc` could not see and only a screenshot caught.

**One thing this list cannot claim.** Every item above is a static check. None of them, and nothing in
Phases 1–4, establishes that the product works: no contract has been sent, signed or renewed, and no
FND-3 query or export has run. Discharging G5 is a separate piece of work that needs credentials.

## Known pre-existing issues

Found while planning; not caused by this migration. Listed so nobody mistakes them for migration
fallout. **Amended 2026-08-07:** the product owner brought two of the three into scope; the third
stays out by their decision.

- ✅ **Now in scope — Phase 1 Close Task 6.** **`npm run lint` has exited 1 since June 2026** — three findings in files this migration never
  touches: `components/ui/sidebar.tsx:610` (error, `react-hooks/set-state-in-effect`, last changed
  `6724399` 2026-06-05), `global.d.ts:7` (error, `no-empty-object-type`, `379bef7` 2026-06-14), and an
  unused `workerName` warning in `components/workers/approve-modal.tsx:23` (`8f1fb8a` 2026-06-01).
  Every phase gate therefore measures **"no lint finding attributable to this phase"**, never "lint
  exits 0" — *until Task 6 clears them, after which the gate becomes plain `lint` exit 0.*
- ❌ **Stays out of scope, by the product owner's decision on 2026-08-07.** **Two dead sidebar
  links.** `lib/nav-items.ts:71-79` declares an `agency` group pointing at
  `/dashboard/agency-requests` and `/dashboard/agencies`; neither route exists under
  `app/[locale]/dashboard/`. **Both 404 today** and will continue to. No phase may touch that group —
  Phase 4 Task 4 adds two nav entries beside them and is instructed to leave them alone.
- ✅ **Now in scope — Phase 1 Close Task 7.** **Two directories of stale backend-doc copies.**
  `docs/superpowers/index/` duplicates `Backend/index/` (26 files) and `ERP-Uyer/docs/` holds 8 of 18
  handoff guides. That partial copy already cost a review cycle: a shipped feature looked
  undocumented and a blocker that did not exist was reported to the backend team.
- 🆕 **Added 2026-08-07 — a real bug, fixed in Phase 3 Task 1.** `components/ui/table-pagination.tsx:30`
  offers page sizes `[50, 100, 200]` against a server ceiling of `MAX_PAGE_SIZE = 100`. The server
  clamps silently, so choosing 200 returns 100 rows while the component computes
  `pageCount = ceil(total / 200)` — **half the real page count, making the tail of every paged table
  unreachable with no error anywhere.** Affects every current consumer of the component, not just the
  FND-3 tables.
- **The audit screen will show unfamiliar action codes** once Phase 3 lands, because exports write
  `OWNER_TABLE_EXPORTED` / `WORKER_TABLE_EXPORTED` rows. F-03·1 adds three more —
  `OWNER_KYC_DOC_APPROVED`, `OWNER_KYC_DOC_REJECTED`, and `ONBOARDING_REVERTED_TO_KYC` (whose metadata
  carries `revertSource`, `expiredContractIds` and `terminatedContractIds`). Confirm how
  `lib/services/audit.service.ts` labels unknown codes and add labels if it renders them raw. That
  revert row is also the **only** way to tell a compliance-driven contract end from an admin
  force-terminate, so it is worth surfacing well.
