# Phase 1 Close — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the unfinished obligations of Phase 1, close three gaps in the contract lifecycle the panel exposes, stand up a test harness for pure logic, and clear the debt that makes every later phase gate ambiguous.

**Architecture:** Phase 1's screens shipped without their plan file (see "Why this file is named `-close`"). Ten of the roadmap's fourteen tasks are in the working tree and verified present. This plan covers the tail: a dead-vocabulary sweep in i18n, a locale-preserving redirect, the contracts registry's `isActive` → `phase` migration, and making the `settings-link` error reaction land somewhere real. It also adds `vitest` for pure-logic modules, because three of the four remaining phases turn on logic that compiles cleanly while being wrong.

**Amended 2026-08-10 — Tasks 8, 9 and 10 added after a backend re-read.** The backend moved between 2026-08-07 and 2026-08-10 (three merged PRs), and the re-read found three things the panel gets wrong about the contract lifecycle: **early termination has no entry point in the Docs detail** and Phase 2 would have deleted the only one that exists; **both contract PDF links go stale within ~300 seconds** and are rendered as static hrefs; and **three separate error paths all surface as "unknown error"** while the server was specific. One correction also landed in Task 4 — `canTerminate` excluded `Draft` and `Sent`, which the backend allows deliberately.

**Tech Stack:** Next.js 16 (App Router, Turbopack, `proxy.ts`), next-intl, TanStack react-query v5, Tailwind v4 `@theme inline`, axios, vitest (added by Task 1).

---

## Why this file is named `-close`, not `-docs-workspace`

The roadmap (`2026-08-04-v2-migration-roadmap.md:143`) names the file to write as
`2026-08-XX-v2-phase-1-docs-workspace.md`. **That plan was never written.** The Docs workspace was
built directly across commits `bc292f0`…`8a3a9ed` without it. Writing it now, retroactively, would
manufacture a record of planning that did not happen.

What actually shipped, verified in the working tree against the roadmap's 14-task outline:

| Roadmap task | State | Evidence |
|---|---|---|
| 1–3 adapters | ✅ **different shape** — one normalizer, not three adapter files | `lib/onboarding/subject-row.ts` |
| 4 filter bar + table | ✅ | `components/docs-workspace/docs-filter-bar.tsx`, `subject-docs-table.tsx` |
| 5 routes + nav + delete `/dashboard/kyc` | 🟡 **partial** — see Tasks 2 and 3 below | `app/[locale]/dashboard/kyc/page.tsx:11`, `messages/en.json:398` |
| 6 stepper | ✅ | `components/docs-workspace/onboarding-stepper.tsx` |
| 7 documents panel | ✅ | `components/docs-workspace/documents-panel.tsx` |
| 7b identity + company | ✅ | `components/docs-workspace/identity-panel.tsx`, commit `83d7c31` |
| 7c per-document review | ✅ | commits `6c36d73`, `e2421df` |
| 8 review actions | ✅ | folded into the panels |
| 9 contract form | ✅ **including the presign fix** | `useUpload("contract-sources")` at both detail pages and `components/contracts/contract-form-dialog.tsx:67` |
| 10 contract state panel | ✅ | `components/docs-workspace/contract-panel.tsx` |
| 11 subject detail | ✅ | `components/docs-workspace/subject-detail.tsx` |
| 12 detail routes | ✅ | `[ownerProfileId]`, `[workerId]` |
| **13 Settings switch + 409 path** | ❌ | Task 5 below |
| **14 phase gate** | 🔒 blocked on G2 | Task 8 below |
| **Constraint 3 — `isActive` on the registry** | ❌ | Task 4 below |

Deviation from the roadmap's task 1–3 decomposition is deliberate and already merged: a single
`SubjectRow` normalizer with two adapter functions replaced three files. It serves both sides
through one table, which was the point of the decomposition. No follow-up needed.

---

## Global Constraints

Copied verbatim from the roadmap's Phase 1 Global Constraints where they still bind, plus the ones
this plan adds. Every task's requirements implicitly include this section.

1. **`phase` is the truth; `isActive` is a lagging mirror reconciled hourly.** Every cover statement
   derives from `phase === "InForce"` — use `isCoveredNow()` from `lib/types/onboarding.types.ts:76`.
   `isActive` may appear in a DTO type; it may not drive a badge, an affordance, or a filter.
2. **`Terminated` is *ended early*, never *expired*.** A document lapse stamps in-period rows
   `Terminated` and elapsed ones `Expired` in the same list. `Terminated` renders muted, not as a
   compliance alarm — `lib/onboarding/subject-row.ts:203-216` already encodes this; match it.
3. **Permission-aware rendering, not 403-driven.** Read the caller's set through
   `hooks/use-current-permissions.ts`. An admin lacking a permission must not see the affordance at
   all. 403 handlers stay as the backstop, never as the gate.
4. **Every status renders through `lib/onboarding/status.ts`; every API error through
   `lib/onboarding/errors.ts`.** No ad-hoc status strings, no raw error codes in components.
5. **en/de key parity is exact.** Every key added to `messages/en.json` is added to
   `messages/de.json` in the same position. German is first-class — the product is German-market.
6. **Reuse, don't re-invent.** `components/ui/` already holds `data-table-card`, `table-pagination`,
   `sortable-table-head`, `filter-menu`, `switch`, `dialog`, `sheet`, `tabs`, `skeleton`,
   `row-link`. A new primitive duplicating one of these, a new dependency, or a hardcoded colour
   instead of an `app/globals.css` token is a review rejection. Dark mode must work because tokens
   were used, not because it was patched after.
7. **No live backend access this round.** G2 (`ERP_ADMIN_EMAIL` / `ERP_ADMIN_PASSWORD`) and G3 are
   both unmet. Every decision that depends on live data is recorded in the Assumption Ledger at the
   bottom of this file, not silently assumed.
8. **Verification gates:** `npx tsc --noEmit` exit 0; `npm run test` green; `npm run lint` shows **no
   finding attributable to this work** — after Task 6 that means `lint` exits 0, and any regression
   from 0 is this plan's fault; `npm run build` compiles.
9. **Commit per task.** Conventional-commit subject, body explaining *why*. Never `--no-verify`.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `vitest.config.mts` | Test runner config: node environment, tsconfig path aliases, pure-logic globs only | 1 |
| `package.json` | `test` / `test:watch` scripts, three devDependencies | 1 |
| `lib/onboarding/subject-row.test.ts` | Locks in the day-boundary arithmetic fixed on 2026-08-07 | 1 |
| `messages/en.json`, `messages/de.json` | Retire 19 dead keys per locale; add the settings-link copy | 2, 5 |
| `app/[locale]/dashboard/kyc/page.tsx` | Locale-preserving redirect | 3 |
| `lib/contracts/registry-row.ts` | **New.** Normalize an owner/worker contract DTO into one registry row keyed on `phase` | 4 |
| `lib/contracts/registry-row.test.ts` | **New.** Phase-driven affordance rules | 4 |
| `app/[locale]/dashboard/contracts/page.tsx` | Drive every badge and affordance off `phase` | 4 |
| `lib/onboarding/errors.ts` | Add the settings deep-link target to the reaction contract | 5 |
| `components/onboarding/error-notice.tsx` | **New.** Renders a catalogued error *with* its reaction | 5 |
| `app/[locale]/dashboard/settings/page.tsx` | Boolean settings render as a `Switch`; `contract` category icon; deep-link highlight | 5 |
| `components/ui/sidebar.tsx`, `global.d.ts`, `components/workers/approve-modal.tsx` | Clear the three pre-existing lint findings | 6 |
| `docs/superpowers/index/` (delete), `../docs/` (delete) | Remove stale copies of `Backend/index/` and `Backend/docs/handoff/` | 7 |
| `components/docs-workspace/contract-panel.tsx` | Terminate/withdraw entry point; fresh-URL PDF opening; signature method | 8, 9 |
| `hooks/use-contracts.ts` | `useTerminateContract` with a declared invalidation list | 8 |
| `hooks/use-signed-pdf.ts` | **New.** Follow-don't-cache a short-lived signed PDF URL, one retry | 9 |
| `lib/types/contract.types.ts` | Add `signatureMethod` to `ContractRowBase` | 9 |
| `lib/http/api-error.ts` | **New behaviour.** Parse ASP.NET problem-details; detect a leaked library message | 10 |
| `lib/http/api-error.test.ts` | **New.** | 10 |
| `lib/onboarding/errors.ts` | Two missing KYC intake codes; validation-detail path | 5, 10 |

---

## Task 1: Vitest harness for pure logic

Pure logic in this repo currently has no gate but the compiler, and the compiler does not catch
arithmetic. On 2026-08-07 a real off-by-one shipped and was caught only by looking at a screenshot:
a cover period starting **today** rendered "Starts in 1 day", and every end date sat one day too far
out, because `today` was midnight-quantized while `from`/`to` were raw instants. This task locks
that fix in place and gives Phases 2–4 somewhere to put their tests.

Scope is deliberately narrow: **no component tests.** No `jsdom`, no `@testing-library/react`, no
`@vitejs/plugin-react`. Components stay on `tsc` + `build` + looking at them.

**Files:**
- Create: `vitest.config.mts`
- Create: `lib/onboarding/subject-row.test.ts`
- Modify: `package.json` (scripts + devDependencies)

**Interfaces:**
- Consumes: `coverPresentation`, `indexCover`, `ownerSubjectRow`, `withCover` from
  `lib/onboarding/subject-row.ts`.
- Produces: `npm run test` (single run, CI-shaped) and `npm run test:watch`. Every later task in
  every later phase uses `npm run test` as a gate. Test files live beside their module as
  `*.test.ts` and are picked up by the `include` glob below.

- [ ] **Step 1: Install the three devDependencies**

Per `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md:44`, the TypeScript setup wants
`vite-tsconfig-paths` so `@/` resolves. We skip the four React/jsdom packages that doc lists —
they exist to test components, which is out of scope.

```bash
npm install -D vitest vite-tsconfig-paths @vitest/coverage-v8
```

- [ ] **Step 2: Write the config**

The Next.js guide (`vitest.md:63`) specifies `vitest.config.mts` for TypeScript projects. Keep the
`.mts` extension — the repo has no `"type": "module"`, so a plain `.ts` config would be parsed as
CJS and the ESM `export default` would fail.

```ts
// vitest.config.mts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // `node`, not `jsdom`: this suite covers pure logic only. Components are
    // verified by `tsc`, `build` and looking at them — adding jsdom here would
    // invite component tests that nobody maintains.
    environment: "node",
    // Colocated with the module under test. Deliberately excludes app/ and
    // components/ so a stray render test cannot creep in without a config change.
    include: ["lib/**/*.test.ts", "hooks/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add the scripts**

`vitest` alone watches by default (`vitest.md:105`), which hangs a gate. `vitest run` is the
single-shot form.

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest",
  "verify:api": "node scripts/verify-v2.mjs"
}
```

- [ ] **Step 4: Write the failing test**

Every case below is a day-boundary case, because that is where the bug was. `DAY` is one day in ms;
`today` is a fixed day-start so the suite never depends on the wall clock.

```ts
// lib/onboarding/subject-row.test.ts
import { describe, expect, it } from "vitest";
import {
  coverPresentation,
  indexCover,
  ownerContractSubjectId,
  withCover,
  type SubjectCover,
  type SubjectRow,
} from "@/lib/onboarding/subject-row";
import type { AdminOwnerContractDto } from "@/lib/types/contract.types";

const DAY = 86_400_000;
/** 2026-08-07T00:00:00Z, as a day-start — the shape `useToday()` produces. */
const TODAY = Date.parse("2026-08-07T00:00:00.000Z");

function cover(from: string, to: string, phase: SubjectCover["phase"]): SubjectCover {
  return { from, to, phase };
}
/** ISO instant `n` days from TODAY, at an awkward hour to prove hours are ignored. */
function iso(days: number, hour = 13): string {
  return new Date(TODAY + days * DAY + hour * 3_600_000).toISOString();
}

describe("coverPresentation — day arithmetic", () => {
  it("reports 0 days until start for a period beginning today", () => {
    const c = coverPresentation(cover(iso(0), iso(30), "InForce"), TODAY);
    expect(c.daysUntilStart).toBe(0);
  });

  it("counts whole days to the end date, ignoring the hour", () => {
    expect(coverPresentation(cover(iso(-10), iso(4), "InForce"), TODAY).daysLeft).toBe(4);
    expect(coverPresentation(cover(iso(-10), iso(23), "InForce"), TODAY).daysLeft).toBe(23);
  });

  it("reports a future start in whole days", () => {
    const c = coverPresentation(cover(iso(14), iso(400), "Scheduled"), TODAY);
    expect(c.daysUntilStart).toBe(14);
  });

  it("returns a negative daysLeft once the end date has passed", () => {
    expect(coverPresentation(cover(iso(-90), iso(-3), "Expired"), TODAY).daysLeft).toBe(-3);
  });
});

describe("coverPresentation — tone", () => {
  it("keeps Terminated muted: ended early is a recorded outcome, not an alarm", () => {
    expect(coverPresentation(cover(iso(-30), iso(10), "Terminated"), TODAY).tone).toBe("muted");
  });

  it("marks a real expiry critical", () => {
    expect(coverPresentation(cover(iso(-90), iso(-1), "Expired"), TODAY).tone).toBe("critical");
    expect(coverPresentation(cover(iso(-90), iso(-1), "Lapsed"), TODAY).tone).toBe("critical");
  });

  it("warns inside 30 days and escalates inside 7", () => {
    expect(coverPresentation(cover(iso(-10), iso(20), "InForce"), TODAY).tone).toBe("warning");
    expect(coverPresentation(cover(iso(-10), iso(5), "InForce"), TODAY).tone).toBe("critical");
    expect(coverPresentation(cover(iso(-10), iso(200), "InForce"), TODAY).tone).toBe("muted");
  });

  it("keeps an unsigned draft or sent contract muted and flagged pending", () => {
    const c = coverPresentation(cover(iso(2), iso(400), "Sent"), TODAY);
    expect(c.tone).toBe("muted");
    expect(c.pending).toBe(true);
  });
});

describe("coverPresentation — annotate", () => {
  it("leaves a quiet in-force row unannotated", () => {
    expect(coverPresentation(cover(iso(-10), iso(200), "InForce"), TODAY).annotate).toBe(false);
  });

  it("annotates a row that does not cover today even though both dates look innocent", () => {
    expect(coverPresentation(cover(iso(14), iso(400), "Scheduled"), TODAY).annotate).toBe(true);
  });
});

describe("indexCover — which contract governs", () => {
  function row(id: string, phase: SubjectCover["phase"], from: number, to: number) {
    return {
      ownerProfileId: id,
      eligibleFrom: iso(from),
      eligibleTo: iso(to),
      phase,
    } as unknown as AdminOwnerContractDto;
  }

  it("prefers the in-force row over a scheduled renewal", () => {
    const map = indexCover(
      [row("a", "Scheduled", 30, 400), row("a", "InForce", -300, 29)],
      ownerContractSubjectId,
    );
    expect(map.get("a")?.phase).toBe("InForce");
  });

  it("breaks a same-phase tie on the later end date", () => {
    const map = indexCover(
      [row("b", "Expired", -800, -400), row("b", "Expired", -300, -20)],
      ownerContractSubjectId,
    );
    expect(map.get("b")?.to).toBe(iso(-20));
  });

  it("still surfaces a subject whose only contract has ended", () => {
    const map = indexCover([row("c", "Expired", -400, -30)], ownerContractSubjectId);
    expect(map.get("c")?.phase).toBe("Expired");
  });
});

describe("withCover", () => {
  const base: SubjectRow = {
    id: "a",
    fullName: "Hans Müller",
    email: "hans@example.de",
    avatarUrl: null,
    onboardingStatus: "Active",
    cover: null,
  };

  it("attaches a cover when one exists and null when none does", () => {
    const map = new Map([["a", cover(iso(-10), iso(20), "InForce")]]);
    const [withIt, without] = withCover([base, { ...base, id: "z" }], map);
    expect(withIt.cover?.phase).toBe("InForce");
    expect(without.cover).toBeNull();
  });
});
```

- [ ] **Step 5: Run it and confirm it passes**

Run: `npm run test`

Expected: all suites pass. `subject-row.ts` already carries the 2026-08-07 fix, so this suite is a
**regression lock**, not a red-green cycle — it is green on first run by design. If any day-arithmetic
case fails, the fix has been reverted; do not adjust the test to match, re-read
`lib/onboarding/subject-row.ts:183-200` and restore the `startOfDay` + `Math.round` pair.

- [ ] **Step 6: Confirm the config excludes components**

Run: `npm run test -- --reporter=verbose`

Expected: only `lib/onboarding/subject-row.test.ts` collected. If anything under `app/` or
`components/` is collected, the `include` glob is wrong.

- [ ] **Step 7: Confirm the other gates still pass**

Run: `npx tsc --noEmit && npm run build`

Expected: `tsc` exit 0; build compiles. A `.test.ts` file is inside `tsconfig`'s include set, so a
type error in the suite fails `tsc` — that is intended.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.mts package.json package-lock.json lib/onboarding/subject-row.test.ts
git commit -m "$(cat <<'EOF'
test: vitest for pure logic, starting with the cover day arithmetic

Three of the four remaining migration phases turn on logic that compiles
cleanly while being wrong: URL round-tripping, range validation, phase
selection. The compiler cannot see any of it.

The first suite locks in the day-boundary fix from 2026-08-07, which shipped
a real off-by-one — a period starting today read "starts in 1 day" — and was
caught only by looking at a screenshot.

Node environment and a lib/hooks-only include glob on purpose: no jsdom, no
testing-library. Component quality stays with tsc, build and looking at them.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Retire the dead KYC vocabulary from i18n

Roadmap constraint 10 required this in the same task that deleted `/dashboard/kyc`. The page was
deleted; the keys were not. Verified dead — `owners.kyc` has **zero** code references
(`rg 'owners\.kyc|"kyc\.' --type ts --type tsx` returns nothing), and `columns.kycStatus` is
unreferenced because the live tables call `columns.status` and `directory.columns.status`.

Spec §11 (`:708`) says to *rename* `columns.kycStatus` → `columns.onboardingStatus`. That rename
already happened: `messages/en.json:396` has `onboardingStatus` sitting directly beneath the stale
`kycStatus`. So this is a deletion, not a rename.

**Files:**
- Modify: `messages/en.json` — remove `owners.columns.kycStatus` (`:393`), the whole `owners.kyc`
  block (`:398-414`, **15 keys** — `allTab` through `markWrongNote`), and `owners.detail.kycStatus`
  (`:418`). **17 keys per locale in total.**
- Modify: `messages/de.json` — the same three sites, same line region
- Modify: `lib/services/kyc.service.ts` — delete the uncalled `getProfileByUser` (Step 1b)

> **Corrected 2026-08-10, mid-execution.** This section first said "17 keys" for the `owners.kyc`
> block and "19" in total. Both were wrong: the block holds **15** keys, so the total is **17**. The
> 17 was a line count (the block's braces included), not a key count. The implementer caught it and
> the task reviewer confirmed it against the diff — recorded here rather than quietly amended, because
> a plan that miscounts is a plan whose other numbers deserve checking.

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. This task only removes. If a later task needs one of these strings, it writes a
  new key under the namespace that owns the screen — it does not resurrect `owners.kyc.*`.

- [ ] **Step 1b: Delete one piece of dead code found in the 2026-08-10 backend sweep**

> **Moved here 2026-08-10.** This step was mistakenly filed under Task 11's gate, whose second step is
> also called "dead-vocabulary sweep". It belongs with the i18n deletion — same sweep, same reasoning,
> and Task 11 is a gate that should not be deleting code.

`lib/services/kyc.service.ts:34` `getProfileByUser(ownerUserId)` wraps
`GET /api/admin/kyc/owner/{ownerUserId}` and **has no caller** — verify with
`rg 'getProfileByUser' --glob '*.ts' --glob '*.tsx'`, which should match only its own definition.

It looks like the missing piece for `lib/notifications/route.ts:32`, where `entityType: "Onboarding"`
returns `null` because the id is a subject id and neither Docs route is keyed on an `ownerUserId`.
**It is not.** Spec §10 (`:695`) states that `OnboardingRevertedToKyc` (55) goes to the **subject,
never to admins**, so an `Onboarding` bell row never reaches this panel — `route.ts` returning `null`
is correct and defensive, not a gap.

Delete the method and its doc comment together. If a future feature needs the by-user lookup it is two
lines to restore, and an uncalled service method reads as a capability the panel has. Do not touch
`getProfile` or any other method.

- [ ] **Step 1: Prove every key is dead before deleting anything**

```bash
rg -n 'owners\.kyc|columns\.kycStatus|detail\.kycStatus|"kyc\.' --glob '!messages/*' --glob '!docs/**' .
```

Expected: **no output.** If anything matches, stop — that file is a consumer and must be migrated
first. `FRONTEND-HANDOFF.md:182` mentions `kycStatus` in backend prose; a `docs/` or `.md` hit is
fine and is why those globs are excluded.

- [ ] **Step 2: Delete the three sites in `messages/en.json`**

Remove the `kycStatus` line from `owners.columns` so the block reads:

```json
    "columns": {
      "owner": "Owner",
      "email": "Email",
      "documents": "Documents",
      "actions": "Actions",
      "onboardingStatus": "Stage"
    },
```

Delete the entire `"kyc": { … }` block (17 keys, `allTab` through `markWrongNote`) that sits between
`columns` and `detail`.

Remove the `kycStatus` line from `owners.detail` so it begins:

```json
    "detail": {
      "documents": "Documents",
      "uploadedFiles": "Uploaded files",
      "activeOwner": "Active owner",
```

- [ ] **Step 3: Delete the same three sites in `messages/de.json`**

Same keys, same positions. Do not translate anything — this step only removes.

- [ ] **Step 4: Verify exact en/de parity**

The repo has no key-parity script, so compare sorted key paths directly:

```bash
node -e "
const flat=(o,p='')=>Object.entries(o).flatMap(([k,v])=>
  v&&typeof v==='object'?flat(v,p+k+'.'):[p+k]);
const en=flat(require('./messages/en.json')).sort();
const de=flat(require('./messages/de.json')).sort();
const onlyEn=en.filter(k=>!de.includes(k)), onlyDe=de.filter(k=>!en.includes(k));
console.log('en keys',en.length,'de keys',de.length);
if(onlyEn.length||onlyDe.length){console.log('ONLY EN',onlyEn);console.log('ONLY DE',onlyDe);process.exit(1)}
console.log('PARITY OK');
"
```

Expected: `PARITY OK`, and both counts down by exactly **17** from their pre-edit values. (Measured
2026-08-10: 1023 → 1006 in both locales.)

- [ ] **Step 5: Confirm nothing broke**

Run: `npx tsc --noEmit && npm run build`

Expected: both clean. next-intl resolves keys at runtime, so a missed consumer would surface as
missing-key text in the browser rather than a compile error — which is why Step 1 is the real gate.

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
chore(i18n): retire the dead KYC vocabulary the deleted queue owned

/dashboard/kyc was replaced by /dashboard/owner-documents, but its 19 keys per
locale outlived it: the whole owners.kyc block plus two columns.kycStatus and
detail.kycStatus headers that labelled an onboarding stage "KYC Status".

Verified unreferenced outside messages/ and docs/ before deleting. The
replacement tables already read columns.onboardingStatus, which sat directly
beneath the stale key.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Make the `/dashboard/kyc` redirect keep the locale

`app/[locale]/dashboard/kyc/page.tsx:11` calls `redirect()` imported from `next/navigation`. That
function knows nothing about the `[locale]` segment, so it sends every caller to the unprefixed
path. A German admin following a bookmark or a notification deep link from `/de/dashboard/kyc`
lands on the default locale.

The repo already has the locale-aware wrapper: `@/i18n/navigation` — `settings/page.tsx:16` imports
`useRouter` from it for exactly this reason.

**Files:**
- Modify: `app/[locale]/dashboard/kyc/page.tsx`

**Interfaces:**
- Consumes: `redirect` from `@/i18n/navigation`.
- Produces: nothing.

- [ ] **Step 1: Confirm `@/i18n/navigation` exports a `redirect`**

```bash
rg -n 'export' i18n/navigation.ts
```

Expected: a `createNavigation` destructure that includes `redirect`. If it exports only `Link`,
`useRouter`, `usePathname`, add `redirect` to the destructured list in the same call — next-intl's
`createNavigation` returns it.

- [ ] **Step 2: Swap the import and add the `locale` argument**

next-intl's `redirect` requires the target locale when called outside a request-scoped render, and
the page already receives `params`. Read the locale from `params` rather than guessing.

```tsx
// app/[locale]/dashboard/kyc/page.tsx
import { redirect } from "@/i18n/navigation";

/**
 * The owner KYC queue moved to `/dashboard/owner-documents`, where the documents
 * sit beside the contract they unlock instead of expanding inside a table row.
 *
 * This redirect stays because the old path is not only in bookmarks: notification
 * deep links pointed here too, and a 404 is a worse answer than a redirect.
 *
 * It must be next-intl's `redirect`, not the one from `next/navigation`. That one
 * knows nothing about the `[locale]` segment, so a German admin arriving at
 * `/de/dashboard/kyc` was silently moved to the default locale — the bookmark
 * worked and the language quietly changed.
 */
export default async function KycRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/dashboard/owner-documents", locale });
}
```

`params` is a Promise in Next.js 16 — awaiting it is required, not stylistic.

- [ ] **Step 3: Verify the types**

Run: `npx tsc --noEmit`

Expected: exit 0. If `redirect` rejects the object argument, this next-intl version takes the
positional form — use `redirect(\`/${locale}/dashboard/owner-documents\`)` and note which form the
installed version wants in a comment.

- [ ] **Step 4: Verify both locales in the browser**

Run: `npm run dev`

Check, and record the result of each:
- `http://localhost:3000/en/dashboard/kyc` → lands on `/en/dashboard/owner-documents`
- `http://localhost:3000/de/dashboard/kyc` → lands on `/de/dashboard/owner-documents`, **German UI**
- `http://localhost:3000/dashboard/kyc` → lands on the default locale's Docs queue, no 404

The middle case is the whole point of the task; do not mark this step done without checking it.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/dashboard/kyc/page.tsx
git commit -m "$(cat <<'EOF'
fix(kyc): the legacy redirect keeps the admin's locale

redirect() from next/navigation has no idea the [locale] segment exists, so
/de/dashboard/kyc quietly moved a German admin to the default locale. The
bookmark worked and the language changed under them, which is worse than a
404 because nothing looks wrong.

next-intl's redirect from @/i18n/navigation takes the locale explicitly, and
the page already receives it in params.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: The contracts registry stops gating on `isActive`

This is roadmap Phase 1 constraint 3, quoted in full at `2026-08-04-v2-migration-roadmap.md:165`:
*"map `phase` onto the row and drive every affordance off it before adding anything to that
screen."* Phase 2 adds a great deal to that screen, so this is the gate for Phase 2 starting.

`app/[locale]/dashboard/contracts/page.tsx` uses `isActive` in seven places (`:63` on the row type,
`:140` and `:153` mapping it, `:308-309` for the badge, `:328` and `:340` for the affordances).
`phase` is not mapped onto the row type at all, even though it is on
`ContractRowBase` (`lib/types/contract.types.ts:24`) and documented one line above as *"Computed per
read — this is what the UI renders."*

Why it matters concretely: `isActive` is reconciled by an hourly job. In the window after a period
starts and before the job runs, a live contract shows as inactive and its Renew/Terminate
affordances are the wrong ones. After a force-terminate, the mirror can still read active.

The normalization moves to a pure module so it can be tested and so Phase 2's registry can reuse it.

**Files:**
- Create: `lib/contracts/registry-row.ts`
- Create: `lib/contracts/registry-row.test.ts`
- Modify: `app/[locale]/dashboard/contracts/page.tsx` (`:54-65` row type; `:129-156` mapping;
  `:308-309`, `:328`, `:340` render sites)

**Interfaces:**
- Consumes: `AdminOwnerContractDto`, `AdminWorkerContractDto` from `lib/types/contract.types.ts`;
  `ContractPhase`, `isCoveredNow` from `lib/types/onboarding.types.ts`;
  `contractPhasePresentation` from `lib/onboarding/status.ts:61`.
- Produces, and Phase 2 Task 1 builds directly on these:
  ```ts
  export interface RegistryRow {
    contractId: string;
    /** Owner: ownerUserId (authoring routes are keyed on it). Worker: workerId. */
    partyId: string;
    /** Owner only: the Docs detail route is keyed on ownerProfileId, not ownerUserId. */
    partyProfileId: string | null;
    partyName: string | null;
    partyEmail: string | null;
    eligibleFrom: string;
    eligibleTo: string;
    fileName: string | null;
    fileUrl: string | null;
    phase: ContractPhase;
    sentAt: string | null;
    signedAt: string | null;
    renewalStartsAt: string | null;
    createdAt: string;
  }
  export function ownerRegistryRow(dto: AdminOwnerContractDto): RegistryRow;
  export function workerRegistryRow(dto: AdminWorkerContractDto): RegistryRow;
  export function canRenew(phase: ContractPhase): boolean;
  export function canTerminate(phase: ContractPhase): boolean;
  export function isAwaitingSignature(phase: ContractPhase): boolean;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// lib/contracts/registry-row.test.ts
import { describe, expect, it } from "vitest";
import {
  canRenew,
  canTerminate,
  isAwaitingSignature,
  ownerRegistryRow,
  workerRegistryRow,
} from "@/lib/contracts/registry-row";
import type {
  AdminOwnerContractDto,
  AdminWorkerContractDto,
} from "@/lib/types/contract.types";

const ownerDto = {
  id: "c1",
  ownerProfileId: "p1",
  ownerUserId: "u1",
  ownerFullName: "Hans Müller",
  ownerEmail: "hans@example.de",
  eligibleFrom: "2026-01-01T00:00:00Z",
  eligibleTo: "2026-12-31T00:00:00Z",
  fileName: "src.pdf",
  fileUrl: "contract-sources/src.pdf",
  // Deliberately contradicts `phase`: this is the hourly-lag window the task exists for.
  isActive: false,
  phase: "InForce",
  status: "Signed",
  sentAt: "2025-12-01T00:00:00Z",
  signedAt: "2025-12-02T00:00:00Z",
  renewalStartsAt: null,
  createdAt: "2025-11-30T00:00:00Z",
} as unknown as AdminOwnerContractDto;

describe("ownerRegistryRow", () => {
  it("carries ownerUserId as partyId and ownerProfileId separately", () => {
    const row = ownerRegistryRow(ownerDto);
    expect(row.partyId).toBe("u1");
    expect(row.partyProfileId).toBe("p1");
  });

  it("takes phase from the DTO and never derives it from isActive", () => {
    const row = ownerRegistryRow(ownerDto);
    expect(row.phase).toBe("InForce");
    expect(row).not.toHaveProperty("isActive");
  });
});

describe("workerRegistryRow", () => {
  it("uses workerId as partyId and has no profile id", () => {
    const row = workerRegistryRow({
      ...ownerDto,
      workerId: "w1",
      workerFullName: "Anna Schmidt",
      workerEmail: "anna@example.de",
    } as unknown as AdminWorkerContractDto);
    expect(row.partyId).toBe("w1");
    expect(row.partyProfileId).toBeNull();
  });
});

describe("affordance rules", () => {
  it("allows renew only on cover that exists now or is queued", () => {
    expect(canRenew("InForce")).toBe(true);
    expect(canRenew("Scheduled")).toBe(true);
    // Nothing to extend: re-author instead of renewing.
    expect(canRenew("Expired")).toBe(false);
    expect(canRenew("Lapsed")).toBe(false);
    expect(canRenew("Terminated")).toBe(false);
    // Unsigned: recall and edit the draft, do not renew it.
    expect(canRenew("Draft")).toBe(false);
    expect(canRenew("Sent")).toBe(false);
  });

  it("allows force-deactivate from every phase that has not already ended", () => {
    expect(canTerminate("InForce")).toBe(true);
    expect(canTerminate("Scheduled")).toBe(true);
    // Legal per contracts.md:37 — "so a bad contract can be withdrawn". An admin
    // who authored a wrong draft must be able to retire it, not only recall it.
    expect(canTerminate("Draft")).toBe(true);
    expect(canTerminate("Sent")).toBe(true);
    // Already ended: nothing left to terminate.
    expect(canTerminate("Expired")).toBe(false);
    expect(canTerminate("Lapsed")).toBe(false);
    expect(canTerminate("Terminated")).toBe(false);
  });

  it("flags exactly the sent-and-silent phase", () => {
    expect(isAwaitingSignature("Sent")).toBe(true);
    expect(isAwaitingSignature("Draft")).toBe(false);
    expect(isAwaitingSignature("InForce")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run test`

Expected: FAIL — `Cannot find module '@/lib/contracts/registry-row'`.

- [ ] **Step 3: Write the module**

```ts
// lib/contracts/registry-row.ts
import type {
  AdminOwnerContractDto,
  AdminWorkerContractDto,
} from "@/lib/types/contract.types";
import { isCoveredNow, type ContractPhase } from "@/lib/types/onboarding.types";

/**
 * One row of the contracts registry, normalized so the owner and worker tabs
 * render through the same table.
 *
 * **`isActive` is deliberately absent.** It is a mirror reconciled hourly, so in
 * the window after a period starts and before the job runs it disagrees with
 * reality — a live contract reads inactive and offers the wrong affordances.
 * `phase` is computed on every read. Leaving the mirror off the row type is what
 * stops it being reached for again.
 */
export interface RegistryRow {
  contractId: string;
  /** Owner: ownerUserId (authoring routes are keyed on it). Worker: workerId. */
  partyId: string;
  /** Owner only: the Docs detail route is keyed on ownerProfileId, not ownerUserId. */
  partyProfileId: string | null;
  partyName: string | null;
  partyEmail: string | null;
  eligibleFrom: string;
  eligibleTo: string;
  fileName: string | null;
  fileUrl: string | null;
  phase: ContractPhase;
  sentAt: string | null;
  signedAt: string | null;
  renewalStartsAt: string | null;
  createdAt: string;
}

export function ownerRegistryRow(dto: AdminOwnerContractDto): RegistryRow {
  return {
    contractId: dto.id,
    partyId: dto.ownerUserId,
    partyProfileId: dto.ownerProfileId,
    partyName: dto.ownerFullName,
    partyEmail: dto.ownerEmail,
    eligibleFrom: dto.eligibleFrom,
    eligibleTo: dto.eligibleTo,
    fileName: dto.fileName,
    fileUrl: dto.fileUrl,
    phase: dto.phase,
    sentAt: dto.sentAt,
    signedAt: dto.signedAt,
    renewalStartsAt: dto.renewalStartsAt,
    createdAt: dto.createdAt,
  };
}

export function workerRegistryRow(dto: AdminWorkerContractDto): RegistryRow {
  return {
    contractId: dto.id,
    partyId: dto.workerId,
    partyProfileId: null,
    partyName: dto.workerFullName,
    partyEmail: dto.workerEmail,
    eligibleFrom: dto.eligibleFrom,
    eligibleTo: dto.eligibleTo,
    fileName: dto.fileName,
    fileUrl: dto.fileUrl,
    phase: dto.phase,
    sentAt: dto.sentAt,
    signedAt: dto.signedAt,
    renewalStartsAt: dto.renewalStartsAt,
    createdAt: dto.createdAt,
  };
}

/**
 * Renew extends existing or queued cover. An ended period has nothing to extend —
 * that subject needs a new contract authored in the Docs workspace, and offering
 * "Renew" there sends the admin down a path the server refuses
 * (`400 no_active_contract_to_renew`).
 */
export function canRenew(phase: ContractPhase): boolean {
  return isCoveredNow(phase) || phase === "Scheduled";
}

/**
 * Force-deactivate is legal from **every phase that has not already ended**,
 * including `Draft` and `Sent`.
 *
 * ⚠ Corrected 2026-08-10 after reading the backend. An earlier version of this
 * function returned `InForce || Scheduled`, on the reasoning that "terminate ends
 * cover, so it needs cover to end" and an unsigned draft is recalled instead. The
 * backend disagrees, deliberately:
 * `Backend/index/controllers/contracts.md:37` —
 *
 *   > "Force-deactivate → `status = Terminated` (**not** `Expired`, the period had
 *   > not elapsed) + `isActive = false`; always writes
 *   > `OWNER_CONTRACT_FORCE_DEACTIVATED`. **Legal from `Draft`/`Sent` too, so a bad
 *   > contract can be withdrawn**"
 *
 * Recall and withdraw are different acts. Recall (`Sent → Draft`) keeps the row and
 * its history so the corrected contract stays one row; withdraw kills a contract
 * that should never have existed. Hiding the second one leaves an admin who authored
 * a wrong draft with no way to retire it.
 */
export function canTerminate(phase: ContractPhase): boolean {
  return phase !== "Expired" && phase !== "Lapsed" && phase !== "Terminated";
}

/**
 * Sent and silent. Nothing on the backend chases an unsigned contract: the
 * subject gets one notification at send, and the expiry ladder only watches
 * *signed* cover. Surfacing this is the point of the registry (spec §5).
 */
export function isAwaitingSignature(phase: ContractPhase): boolean {
  return phase === "Sent";
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run test`

Expected: PASS, all suites.

- [ ] **Step 5: Rewrite the page's row type and mapping**

Replace the local `interface Row` (`:54-65`) and both mapping branches (`:129-156`) with the module.
Delete the local `Row` type entirely — do not keep it as an alias, or `isActive` creeps back.

```tsx
import {
  canRenew,
  canTerminate,
  ownerRegistryRow,
  workerRegistryRow,
  type RegistryRow,
} from "@/lib/contracts/registry-row";

// …inside the component:
const rows = useMemo<RegistryRow[]>(
  () =>
    isOwner
      ? (ownerContracts.data ?? []).map(ownerRegistryRow)
      : (workerContracts.data ?? []).map(workerRegistryRow),
  [isOwner, ownerContracts.data, workerContracts.data],
);
```

Update `ModalState` (`:67-71`) to carry `RegistryRow` instead of `Row`.

- [ ] **Step 6: Drive the badge off `phase`**

`:308-309` currently reads `r.isActive ? t("active") : t("inactive")`, which collapses seven phases
into two words. Use the shared presentation so the registry agrees with the Docs queue.

```tsx
import { contractPhasePresentation } from "@/lib/onboarding/status";

// …in the row:
{(() => {
  const p = contractPhasePresentation(r.phase);
  return (
    <Badge variant={p.variant} className={p.className}>
      {tOnboarding(`phase.${p.labelKey}`)}
    </Badge>
  );
})()}
```

Add `const tOnboarding = useTranslations("onboarding");` beside the existing `useTranslations` calls
if the component does not already have it. Confirm the namespace key shape against
`lib/onboarding/status.ts:61` — if `contractPhasePresentation` returns a `labelKey` already scoped,
do not double-prefix it.

- [ ] **Step 7: Drive both affordances off `phase`**

`:328` and `:340` gate Renew and Terminate on `r.isActive`. Replace with the tested predicates.
Keep the existing permission wrapper — constraint 3 in the Global Constraints still applies, so the
affordance needs **both** the permission and the phase.

```tsx
{canRenew(r.phase) ? (
  /* …existing Renew button, unchanged… */
) : null}

{canTerminate(r.phase) ? (
  /* …existing Terminate button, unchanged… */
) : null}
```

- [ ] **Step 8: Prove `isActive` is gone from the screen**

```bash
rg -n 'isActive' app/\[locale\]/dashboard/contracts/page.tsx
```

Expected: **no output.** The field stays on `ContractRowBase` — that is the DTO and it is accurate —
but nothing on this screen may read it.

- [ ] **Step 9: Run every gate**

Run: `npm run test && npx tsc --noEmit && npm run lint && npm run build`

Expected: tests green; `tsc` exit 0; lint shows no new finding; build compiles.

- [ ] **Step 10: Look at the screen in both themes**

Run: `npm run dev`, open `/en/dashboard/contracts`, both tabs.

Without live data the table is empty, so this check is limited to: the page renders, the empty state
appears, no console error, and switching owner/worker tabs does not throw. Record that the badge and
affordance rendering itself is **unverified against real rows** — it is entry AL-4 in the Assumption
Ledger.

- [ ] **Step 11: Commit**

```bash
git add lib/contracts/registry-row.ts lib/contracts/registry-row.test.ts app/\[locale\]/dashboard/contracts/page.tsx
git commit -m "$(cat <<'EOF'
fix(contracts): the registry renders phase, not the hourly mirror

isActive is reconciled by an hourly job; phase is computed on every read. In
the window between a period starting and the job running, the registry showed
a live contract as inactive and offered the wrong affordances — and after a
force-terminate the mirror can still read active.

The row type now omits isActive entirely rather than leaving it available, and
the badge renders all seven phases through contractPhasePresentation instead of
collapsing them into active/inactive.

Renew and Terminate move behind canRenew/canTerminate, which allow only InForce
and Scheduled: an ended period has nothing to extend, and an unsigned draft is
recalled rather than renewed.

Normalization lives in lib/contracts/registry-row.ts so Phase 2's registry
reuses it and so the affordance rules are covered by tests.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: The `settings-link` reaction becomes real

Roadmap task 13. The finding is larger than "the toggle is missing", and worth stating precisely
because it changes the work:

1. `lib/onboarding/errors.ts:16` declares a `settings-link` reaction, and `:69-70` route
   `contract_template_not_approved` and `contract_template_missing` to it.
2. **No component reads `reaction` at all.** `rg 'reaction' --glob '*.tsx'` returns nothing. The
   entire reaction taxonomy is inert — the catalog classifies errors and nothing acts on the
   classification.
3. The Settings page is **generic**: `app/[locale]/dashboard/settings/page.tsx:88-97` groups whatever
   `GET /api/system/settings` returns by the key prefix before the first dot. So
   `contract.template.approved` already appears — under an auto-generated "Contract" category, as a
   text row where an admin types the word `true`.

So the deliverable is not "build a toggle". It is: booleans render as a `Switch`, and the 409 that
blocks every send actually carries the admin to that switch.

Phase 2 Task 4 owns the *rest* of the Contract category (template textareas, the four
`onboarding.expiry.*` keys, the corrected `block_days` copy). This task does the switch and the link
only — that split is the roadmap's, and it holds.

**Files:**
- Modify: `lib/onboarding/errors.ts` (add the link target to the reaction contract)
- Create: `components/onboarding/error-notice.tsx`
- Modify: `app/[locale]/dashboard/settings/page.tsx` (boolean rows; `contract` icon; deep-link highlight)
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: `describeApiError` from `lib/onboarding/errors.ts`; `Switch` from
  `components/ui/switch.tsx`; `useUpsertSetting` from `hooks/use-settings.ts`.
- Produces:
  ```ts
  // lib/onboarding/errors.ts
  /** Where a `settings-link` reaction should send the admin. */
  export const SETTINGS_DEEP_LINK = "/dashboard/settings?highlight=";

  // components/onboarding/error-notice.tsx
  export function ErrorNotice({
    error,
    className,
  }: { error: unknown; className?: string }): React.ReactElement | null;
  ```
  Phase 2 and Phase 4 both render catalogued errors; both use `ErrorNotice` rather than re-deriving
  a message from `describeApiError`.

- [ ] **Step 1: Add the deep-link constant and the boolean-key list**

```ts
// lib/onboarding/errors.ts — append near the reaction type

/**
 * Where a `settings-link` reaction sends the admin. The Settings page reads
 * `?highlight=` and scrolls that key's row into view with a ring, because the
 * page renders every system setting grouped by prefix — without the highlight,
 * "go to Settings" means "find one row among dozens".
 */
export const SETTINGS_DEEP_LINK = "/dashboard/settings?highlight=";

/** The setting each `settings-link` error is actually blocked on. */
export const SETTINGS_LINK_TARGET: Record<string, string> = {
  contract_template_not_approved: "contract.template.approved",
  contract_template_missing: "contract.template.owner.en",
};
```

- [ ] **Step 2: Build `ErrorNotice`**

```tsx
// components/onboarding/error-notice.tsx
"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  describeApiError,
  isPermissionDenied,
  SETTINGS_DEEP_LINK,
  SETTINGS_LINK_TARGET,
} from "@/lib/onboarding/errors";
import { cn } from "@/lib/utils";

/**
 * Renders a catalogued API error **together with its reaction**.
 *
 * The catalog in `lib/onboarding/errors.ts` has classified every error's
 * reaction since Phase 0, and until now nothing read that field — a
 * `settings-link` error rendered as a sentence with no link, which is the
 * worst case: the admin is told a system setting blocks them and given no
 * way to reach it.
 *
 * Only `settings-link` is handled here. `refetch`, `gate`, `inline-period`
 * and `toast` belong to the screen that owns the mutation, because each needs
 * that screen's own state — this component would have to guess.
 */
export function ErrorNotice({
  error,
  className,
}: {
  error: unknown;
  className?: string;
}) {
  const t = useTranslations("onboarding");
  if (!error) return null;

  const described = describeApiError(error);
  const message = isPermissionDenied(error)
    ? t("permissionDenied")
    : t(`apiErrors.${described?.labelKey ?? "unknown"}`);

  const settingKey = described?.code
    ? SETTINGS_LINK_TARGET[described.code]
    : undefined;
  const showLink = described?.reaction === "settings-link" && !!settingKey;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <p className="text-sm leading-snug text-foreground">{message}</p>
      </div>
      {showLink ? (
        <Button
          variant="outline"
          size="sm"
          className="ml-6 w-fit gap-1.5"
          render={<Link href={`${SETTINGS_DEEP_LINK}${settingKey}`} />}
        >
          {t("goToSettings")}
          <ArrowRight className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
```

If `describeApiError` does not return the matched `code`, add it to that function's return shape in
the same step — `ErrorNotice` needs to know *which* error it caught to pick the target key, and
re-parsing the error twice would be worse.

- [ ] **Step 3: Render boolean settings as a Switch**

In `app/[locale]/dashboard/settings/page.tsx`, add a boolean detector beside the existing
`isProse` helper (`:46`) and a `contract` entry to `CATEGORY_ICONS` (`:37`).

```tsx
import { FileSignature } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  attachment: Paperclip,
  task: ListChecks,
  contract: FileSignature,
};

/**
 * A boolean setting must not be a text field. `contract.template.approved`
 * gates every contract send in the product: while it is false, every send
 * returns 409. Asking an admin to type the word `true` into a box invites
 * `True`, `1`, `yes` — and the server compares strings.
 */
function isBoolean(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === "true" || v === "false";
}
```

In the row body, branch **before** the prose/scalar branches so a boolean never reaches the text
input:

```tsx
{isBoolean(s.value) ? (
  <div className="flex shrink-0 items-center gap-3">
    <span className="text-sm text-muted-foreground">
      {s.value.trim().toLowerCase() === "true" ? t("on") : t("off")}
    </span>
    <Switch
      checked={s.value.trim().toLowerCase() === "true"}
      disabled={isPending}
      aria-label={s.description || s.key}
      onCheckedChange={(next) =>
        upsert({ key: s.key, value: next ? "true" : "false" })
      }
    />
  </div>
) : isEditing && prose ? (
  /* …existing prose branch, unchanged… */
```

Check `components/ui/switch.tsx`'s actual prop name before writing this — the repo is on
`@base-ui/react`, whose switch may expose `onCheckedChange` or `onChange`. Match the file, do not
assume the Radix name.

- [ ] **Step 4: Honour `?highlight=` on the Settings page**

```tsx
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

// …in the component:
const searchParams = useSearchParams();
const highlight = searchParams.get("highlight");
const highlightRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  highlightRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
}, [highlight, settings.length]);
```

On the row wrapper, attach the ref and the ring for the matching key:

```tsx
<div
  key={s.key}
  ref={s.key === highlight ? highlightRef : undefined}
  className={cn(
    "flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-accent/20 sm:px-5",
    !(isEditing && prose) && "sm:flex-row sm:items-center sm:gap-4",
    s.key === highlight && "bg-primary/5 ring-1 ring-inset ring-primary/40",
  )}
>
```

`settings.length` is in the dependency list on purpose: the ref is null on the first render because
the list is still loading, so the effect must re-run once rows exist.

- [ ] **Step 5: Add the i18n keys, both locales**

```json
// messages/en.json — under "settings"
"on": "On",
"off": "Off",
```
```json
// messages/en.json — under "onboarding"
"goToSettings": "Open Settings",
```
```json
// messages/de.json — under "settings"
"on": "Ein",
"off": "Aus",
```
```json
// messages/de.json — under "onboarding"
"goToSettings": "Einstellungen öffnen",
```

- [ ] **Step 6: Verify parity**

Run the parity script from Task 2 Step 4.

Expected: `PARITY OK`, both counts up by exactly 3.

- [ ] **Step 7: Run every gate**

Run: `npm run test && npx tsc --noEmit && npm run lint && npm run build`

Expected: all clean.

- [ ] **Step 8: Verify the deep link in the browser**

Run: `npm run dev`, open `/en/dashboard/settings?highlight=task.default_priority` (any key the
environment actually returns — the contract keys may not exist locally).

Check: the named row scrolls into view and carries the ring. Then confirm any boolean-valued setting
renders a Switch rather than a text row.

**If no setting in the local environment has a boolean value**, this step cannot be completed — record
it as Assumption Ledger entry AL-5 and move on. Do not fabricate a setting on a shared server to
test against.

- [ ] **Step 9: Commit**

```bash
git add lib/onboarding/errors.ts components/onboarding/error-notice.tsx app/\[locale\]/dashboard/settings/page.tsx messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
feat(settings): boolean settings get a switch, and the 409 now leads to it

Two findings, one fix. The error catalog has classified reactions since Phase 0
and no component ever read the field, so contract_template_not_approved
rendered as a sentence telling the admin a system setting blocks them, with no
way to reach it. And the Settings page groups whatever the API returns by key
prefix, so contract.template.approved was reachable — as a text box where an
admin types the word "true" into a value the server string-compares.

Booleans now render as a Switch. ErrorNotice reads the reaction and, for
settings-link errors, links to ?highlight=<key>, which the Settings page
scrolls to and rings. Without the highlight, "go to Settings" means "find one
row among dozens".

Phase 2 Task 4 owns the rest of the Contract category: template bodies, the
four onboarding.expiry keys, and the corrected block_days copy.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Clear the three pre-existing lint findings

`npm run lint` has exited 1 since June 2026 in files this migration never touched
(roadmap `:311-316`). The cost is not the findings — it is that **every phase gate has to be
measured as "no finding attributable to this phase"** instead of "lint is clean", which requires a
human to compare against a remembered baseline. Clearing them makes every remaining gate in Phases
2–4 mechanical.

The user selected this work explicitly on 2026-08-07.

**Files:**
- Modify: `components/ui/sidebar.tsx:610` — `react-hooks/set-state-in-effect` (error)
- Modify: `global.d.ts:7` — `@typescript-eslint/no-empty-object-type` (error)
- Modify: `components/workers/approve-modal.tsx:23` — unused `workerName` (warning)

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run lint` exits 0. **Every later task's gate changes from "no new finding" to
  "lint exits 0".** Phases 2, 3 and 4 assume this.

- [ ] **Step 1: Record the exact baseline**

```bash
npm run lint 2>&1 | tee /tmp/lint-before.txt; tail -5 /tmp/lint-before.txt
```

Expected: 3 problems (2 errors, 1 warning). If the count differs, the baseline moved since
2026-08-07 — reconcile before changing anything, because the roadmap's numbers are what later gates
compare against.

- [ ] **Step 2: Read each site before deciding the fix**

```bash
sed -n '600,620p' components/ui/sidebar.tsx
sed -n '1,12p' global.d.ts
sed -n '15,30p' components/workers/approve-modal.tsx
```

`sidebar.tsx` is a vendored shadcn primitive — the fix must preserve its behaviour exactly. If the
`setState` is genuinely required in that effect and cannot be derived during render, a scoped
`// eslint-disable-next-line react-hooks/set-state-in-effect` **with a comment explaining why** is
the correct outcome, not a contortion. Do not restructure a working primitive to satisfy a linter.

- [ ] **Step 3: Fix the unused variable**

The warning is the unambiguous one. Delete `workerName` from `approve-modal.tsx:23` if nothing
reads it; if it is a prop the caller passes, either render it or drop it from the props type and the
call sites.

- [ ] **Step 4: Fix the empty object type**

`global.d.ts:7` declares something as `{}`. Replace with the accurate type: `Record<string, never>`
for "no properties", `unknown` for "anything", or the real shape if one exists. Do not use `object`
— it forbids primitives and is rarely what was meant.

- [ ] **Step 5: Fix or justify the sidebar finding**

Apply whichever Step 2 concluded. If it is a disable comment, it reads:

```tsx
// eslint-disable-next-line react-hooks/set-state-in-effect -- <the actual reason>
```

An unexplained disable is a review rejection.

- [ ] **Step 6: Confirm lint is clean**

Run: `npm run lint`

Expected: **exit 0, no output.** This is the first time since June 2026.

- [ ] **Step 7: Confirm nothing regressed**

Run: `npm run test && npx tsc --noEmit && npm run build`

Expected: all clean. `sidebar.tsx` is used by every dashboard screen, so a behaviour change there is
wide — open `/en/dashboard` and confirm the sidebar still expands, collapses, and remembers its
state.

- [ ] **Step 8: Commit**

```bash
git add components/ui/sidebar.tsx global.d.ts components/workers/approve-modal.tsx
git commit -m "$(cat <<'EOF'
chore(lint): clear the three findings outstanding since June 2026

None were caused by the v2 migration, which is exactly why they cost
something: every phase gate had to be measured as "no finding attributable to
this phase" against a remembered baseline of three, instead of "lint is clean".

Phases 2 through 4 now gate on lint exiting 0.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Delete the stale copies of backend documentation

Two directories in this workspace are copies of files that live in `Backend/`. Copies start correct,
drift silently, and give no signal when they diverge — the failure only surfaces when somebody builds
against a contract that changed months ago. This workspace has already paid that cost: a partial copy
in `ERP-Uyer/docs/` caused a non-existent blocker to be reported to the backend team, because the
copy held 8 of 18 handoff files and the missing one documented a shipped feature.

The user selected this work explicitly on 2026-08-07.

**Files:**
- Delete: `docs/superpowers/index/` — 26 files, a copy of `Backend/index/`
- Delete: `../docs/` (i.e. `D:\projekts\ERP-Uyer\docs\`) — 9 files, a partial copy of
  `Backend/docs/handoff/` plus one `backend-answers-*` file
- Modify: `../INTEGRATION.md` — mark the two rows resolved

**Interfaces:**
- Consumes: nothing.
- Produces: nothing in code. Anyone needing a backend fact reads
  `D:\projekts\ERP-Uyer\Backend\docs\handoff\` or `Backend\index\` directly and cites `file:line`.

- [ ] **Step 1: Prove each file is a copy, not unique work**

Compare against the backend before deleting. `Backend/` is a git repo and readable.

```bash
for f in ../docs/*.md; do
  b="../Backend/docs/handoff/$(basename "$f")"
  if [ -f "$b" ]; then
    if diff -q "$f" "$b" >/dev/null; then echo "IDENTICAL  $(basename "$f")";
    else echo "DIVERGED   $(basename "$f")"; fi
  else echo "NO SOURCE  $(basename "$f")"; fi
done
```

`IDENTICAL` → safe to delete. `DIVERGED` → the copy is **stale**, which is the whole problem; still
safe to delete, but read the diff first in case it records a local decision worth keeping. `NO
SOURCE` → **stop and read it.** `backend-answers-f03-owner-app.md` is likely this case; if it holds
answers not present in `Backend/`, it is not a copy and must be kept or relocated, not deleted.

- [ ] **Step 2: Same check for the index copy**

```bash
find docs/superpowers/index -name '*.md' | while read -r f; do
  b="../Backend/index/${f#docs/superpowers/index/}"
  if [ -f "$b" ]; then
    if diff -q "$f" "$b" >/dev/null; then echo "IDENTICAL  ${f#docs/superpowers/index/}";
    else echo "DIVERGED   ${f#docs/superpowers/index/}"; fi
  else echo "NO SOURCE  ${f#docs/superpowers/index/}"; fi
done
```

`docs/superpowers/` is otherwise this app's own specs and plans, which stay. Only the `index/`
subtree is a copy.

- [ ] **Step 3: Delete what Step 1 and Step 2 cleared — two different mechanisms**

⚠ **The two directories live on opposite sides of a repository boundary, and one command does not
work for both.** `D:\projekts\ERP-Uyer` is **not a git repository** (verified 2026-08-10:
`git -C D:\projekts\ERP-Uyer rev-parse` → *"not a git repository"*). So `../docs` is outside
ERP-Admin's worktree and `git rm` refuses it.

`docs/superpowers/index/` is inside the repo — but note `/docs` is in `.gitignore` (line 12), so only
a force-added subset is tracked. `git ls-files docs` returns **9** files. Use `git rm` for whatever is
tracked and a plain delete for the rest:

```bash
# Inside the repo. --cached-safe: git rm errors on untracked paths, so split them.
git ls-files docs/superpowers/index | wc -l          # how many are tracked?
git rm -r --quiet docs/superpowers/index 2>/dev/null || true
rm -rf docs/superpowers/index                         # the untracked remainder
```

```bash
# OUTSIDE the repo — a filesystem delete only. There is nothing to stage.
rm -rf "D:/projekts/ERP-Uyer/docs"    # omit any NO SOURCE file identified in Step 1
```

If a file was kept, move it somewhere that names what it is rather than leaving it in a directory
called `docs/` beside deleted copies.

- [ ] **Step 4: Update `INTEGRATION.md`** — a file edit, not a commit

In the "Known stale copies — delete these" table, mark the `ERP-Uyer/docs/` row resolved with the
date. Leave every `Worker/` row untouched — that repo was mid-work on `feat/worker-chat-v2-groups`
with uncommitted changes, and it is not this plan's to clean.

⚠ **`D:\projekts\ERP-Uyer\INTEGRATION.md` is not under version control** — its directory is not a git
repo. Edit it and stop there; do **not** try to stage it, and do not report it as committed. The
commit in Step 6 covers only the in-repo deletion.

- [ ] **Step 5: Confirm nothing referenced the deleted paths**

```bash
rg -n 'superpowers/index|ERP-Uyer/docs/|\.\./docs/' --glob '!node_modules' . | rg -v '^\.\./INTEGRATION.md'
```

Expected: no output, or only hits inside plan/spec prose that describe the deletion. A code or config
reference must be repointed at `Backend/` before this task is done.

- [ ] **Step 6: Commit**

Only the in-repo deletion is committable. `/docs` is gitignored, so the removal of tracked files needs
`-A` on the path; `../INTEGRATION.md` is not in any repo and is deliberately absent from this command.

```bash
git add -A docs
git commit -m "$(cat <<'EOF'
chore(docs): delete the stale copies of the backend's own documentation

docs/superpowers/index/ duplicated Backend/index/ (26 files) and ERP-Uyer/docs/
held 8 of 18 handoff guides. That partial copy already cost a review cycle: a
shipped feature looked undocumented and a blocker that did not exist was
reported to the backend team.

Backend/ is a readable git repo in this workspace. Facts get cited as
path + quoted line, never pasted.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Early termination lives in the Docs detail

> **Added 2026-08-10** after a backend re-read. This task exists because Phase 2 would otherwise
> **delete the only way to terminate a contract in the entire panel.**

The chain of facts:

1. The endpoint exists: `DELETE /api/contracts/admin/{owner|worker}/{contractId}` → 204, permission
   `owner_contract:deactivate_any` (70013) / `worker_contract:deactivate_any` (90023). It sets
   `status = Terminated` — **not** `Expired`, because the period had not elapsed — plus
   `isActive = false`, and always writes `OWNER_CONTRACT_FORCE_DEACTIVATED`
   (`Backend/index/controllers/contracts.md:37`).
2. The client method exists: `lib/services/contract.service.ts:191` `terminate(type, contractId)`.
3. It is wired **only** on `app/[locale]/dashboard/contracts/page.tsx`, and that file's own doc
   comment (`contract.service.ts:189`) says *"Follow-up: remove this call site in the Phase 2 plan."*
4. **`components/docs-workspace/contract-panel.tsx` has no terminate at all** — verified: it renders
   `documentUrl`, `previewUrl` and a recall flow, and nothing else.

So Phase 2's "this screen has no mutations" constraint, applied as written, removes the capability
rather than relocating it. Spec §5's rule is *actions in Docs, oversight in Contracts* — the action has
to arrive in Docs first.

**Recall and withdraw are not the same act.** Recall (`Sent → Draft`, with a reason) keeps the row and
its history so a corrected contract stays one row instead of a graveyard of attempts
(`index/dtos/contracts.md:121`). Withdraw retires a contract that should never have existed. An admin
who authored a wrong draft currently has only the first.

**Files:**
- Modify: `components/docs-workspace/contract-panel.tsx`
- Modify: `hooks/use-contracts.ts` — a terminate mutation with the correct invalidation
- Modify: `lib/services/contract.service.ts` — correct the now-wrong doc comment
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: `canTerminate` from `lib/contracts/registry-row.ts` (Task 4, corrected);
  `useHasPermission`; `ConfirmDialog` from `components/tasks/confirm-dialog.tsx` (already used by
  `settings/professions`).
- Produces:
  ```ts
  export function useTerminateContract(type: ContractType): UseMutationResult<void, unknown, string>;
  ```

- [ ] **Step 1: Add the mutation with an explicit invalidation list**

Terminating changes the subject's cover, so it invalidates more than the contract list. Never
invalidate by guesswork — the roadmap's Phase 1 constraint 2 requires the list be declared.

```ts
// hooks/use-contracts.ts
export function useTerminateContract(type: ContractType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => contractService.terminate(type, contractId),
    onSuccess: () => {
      // The contract list on this side — the terminated row's phase changes.
      qc.invalidateQueries({ queryKey: type === "owner" ? OWNER_KEY : WORKER_KEY });
      // The subject queue: onboardingStatus may follow, and the Docs table's cover
      // column is joined from the contract list.
      qc.invalidateQueries({ queryKey: [type === "owner" ? "kyc" : "workers"] });
      // Other admins get bell rows for a force-deactivation.
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
```

⚠ **Do not invalidate the subject's own detail query if the mutation could have removed the record** —
`hooks/use-owners.ts` documents that trap. A terminate does not delete the subject, so the detail key
is safe to include; add it explicitly if the detail panel shows contract state.

- [ ] **Step 2: Add the affordance, gated on both the permission and the phase**

```tsx
const canDeactivate = useHasPermission(
  side === "owner" ? "owner_contract:deactivate_any" : "worker_contract:deactivate_any",
);
const terminate = useTerminateContract(side);

// Permission-aware, not 403-driven, AND phase-aware. Both gates, not either.
const showTerminate = canDeactivate && contract && canTerminate(contract.phase);
```

Place it visually apart from Send/Recall — it is the destructive one, and a row of three equal-weight
buttons invites the wrong click. `variant="outline"` with destructive text, not a filled destructive
button: this is a legitimate routine action, not an alarm.

- [ ] **Step 3: Write copy that says which act this is**

The dialog body must differ by phase, because the consequence differs. Two strings, not one:

```json
// messages/en.json — under "docsWorkspace.contract"
"terminate": "Terminate cover",
"withdraw": "Withdraw contract",
"terminateTitle": "End this contract early?",
"terminateBody": "Cover ends now instead of on {date}. The contract is kept and marked as ended early — it is not deleted, and this is recorded in the audit log. The subject loses access to anything that requires active cover.",
"withdrawTitle": "Withdraw this contract?",
"withdrawBody": "The contract is retired without ever taking effect. Use this for a contract that should not have been authored; to correct one that was sent, recall it instead and edit the draft.",
"terminateConfirm": "Yes, end it"
```
```json
// messages/de.json — under "docsWorkspace.contract"
"terminate": "Deckung beenden",
"withdraw": "Vertrag zurückziehen",
"terminateTitle": "Diesen Vertrag vorzeitig beenden?",
"terminateBody": "Die Deckung endet jetzt statt am {date}. Der Vertrag bleibt erhalten und wird als vorzeitig beendet markiert — er wird nicht gelöscht, und der Vorgang wird im Audit-Log erfasst. Die betroffene Person verliert den Zugriff auf alles, was aktive Deckung erfordert.",
"withdrawTitle": "Diesen Vertrag zurückziehen?",
"withdrawBody": "Der Vertrag wird zurückgezogen, ohne jemals wirksam geworden zu sein. Verwenden Sie dies für einen Vertrag, der nicht hätte erstellt werden dürfen; um einen gesendeten Vertrag zu korrigieren, rufen Sie ihn stattdessen zurück und bearbeiten den Entwurf.",
"terminateConfirm": "Ja, beenden"
```

Pick the pair by phase: `InForce`/`Scheduled` → terminate; `Draft`/`Sent` → withdraw. Same endpoint,
different truth. Note the terminate copy says **"marked as ended early"** — never "expired", per
Global Constraint 2.

- [ ] **Step 4: Correct the stale doc comment in the service**

`contract.service.ts:182-190` currently claims termination "is not exposed as a UI concept — the
brief's Non-goals list it explicitly" and ends "Follow-up: remove this call site in the Phase 2 plan."
Both halves are now wrong: it *is* a UI concept as of this task, and the call site moves rather than
being removed. Rewrite it to say where the entry point lives and why the phase rule is what it is.

- [ ] **Step 5: Gates**

Run: `npm run test && npx tsc --noEmit && npm run lint && npm run build`

- [ ] **Step 6: Verify what can be verified without live data**

Run `npm run dev`, open a Docs detail. With no contract the panel shows its empty state and no
terminate button — confirm that. **The button itself cannot be exercised without a real contract**;
record that as Assumption Ledger entry AL-9.

- [ ] **Step 7: Commit**

```bash
git add components/docs-workspace/contract-panel.tsx hooks/use-contracts.ts lib/services/contract.service.ts messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
feat(docs): early termination moves into the Docs detail

Phase 2 removes every mutation from the contracts registry, and the registry was
the only place terminate was wired — contract-panel.tsx never had it. Applied as
written, that plan would have deleted the capability instead of relocating it.

Recall and withdraw are different acts and now read differently. Recall keeps the
row and its history so a corrected contract stays one row; withdraw retires one
that should not have been authored. The dialog picks its copy from the phase:
InForce/Scheduled ends cover early, Draft/Sent withdraws.

canTerminate was also corrected — it excluded Draft and Sent, but
contracts.md:37 allows both deliberately, "so a bad contract can be withdrawn".

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: The contract PDF opens in its real state, not a stale link

> **Added 2026-08-10.** The panel renders both PDF links today, and both can be dead by the time
> anyone clicks them.

`previewUrl` and `documentUrl` **became short-lived absolute HMAC-signed URLs on 2026-07-31**
(`index/dtos/contracts.md:210-216`):

> "It is minted per read and expires (`Storage.Local.ReadPresignExpirySeconds`, default 300 s), so it
> is **a link to follow now, not an identifier to store**; re-read the contract for a fresh one."

`components/docs-workspace/contract-panel.tsx:176-222` renders each straight into an `<a href>` at
render time. A panel left open for six minutes — an entirely normal thing while an admin reads the
documents beside it — produces a **404 on click, with no explanation.** The roadmap's Phase 1
constraint 8 specified exactly the helper this needs (*"follow the URL, never persist it; on 404
re-read the contract once and retry with the fresh URL; on the second 404 stop and surface 'this
document is missing'"*) and **it was never built.**

Two further facts the panel must respect:

- ⚠ **`fileUrl` is not one of these.** It stays a plain, permanently public storage key on the same
  DTO — the admin-supplied *source* document, sharing the posture of every KYC and worker document
  (`dtos/contracts.md:218-221`, and `index/gaps/open.md → G_NonContractMediaServedUnsigned`). Two
  `…Url` fields, two different meanings; the asymmetry is intentional. Do not route `fileUrl` through
  the refresh helper, and do not treat the signed pair as cacheable.
- **`signatureMethod` is missing from our types.** It is on both admin DTOs *deliberately* —
  `dtos/contracts.md:295`: *"included on the admin pair deliberately, since the admin answers 'was
  this properly signed?' in a compliance question."* `lib/types/contract.types.ts`'s `ContractRowBase`
  does not declare it, so the panel cannot answer that question at all. `null` means either "not
  signed yet" **or** "signed before F-03·3" — disambiguated by `signedAt`.

**Files:**
- Create: `hooks/use-signed-pdf.ts`
- Modify: `lib/types/contract.types.ts` — add `signatureMethod`
- Modify: `components/docs-workspace/contract-panel.tsx`
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Produces:
  ```ts
  export type SignedPdfKind = "preview" | "document";
  export interface SignedPdfState {
    open(): void;
    isOpening: boolean;
    /** Set when the artifact is genuinely missing after one refresh. */
    missing: boolean;
  }
  /**
   * `refetch` must return the contract fresh from the server — a react-query
   * `refetch()` bound to the contract's own query key, not cached data.
   */
  export function useSignedPdf(
    url: string | null,
    refetch: () => Promise<string | null>,
  ): SignedPdfState;
  ```

- [ ] **Step 1: Add `signatureMethod` to the shared row type**

```ts
// lib/types/contract.types.ts — inside ContractRowBase
  /**
   * How the subject signed. `"Drawn"` is the only shipped member — SMS was ruled
   * out 2026-08-07 (`index/gaps/closed/2026-08-07-sms-signature.md`) and the enum
   * seam is reserved, not pending.
   *
   * `null` means either "not signed yet" **or** "signed before F-03·3 shipped" —
   * the two are told apart by `signedAt`. Present on the admin DTOs deliberately:
   * "was this properly signed?" is a compliance question and this is its answer.
   */
  signatureMethod: "Drawn" | null;
```

Serialized by name, so the string literal is correct and no numeric mapping is needed.

- [ ] **Step 2: Build the helper**

```ts
// hooks/use-signed-pdf.ts
"use client";

import { useCallback, useState } from "react";

/**
 * Open a contract PDF whose URL is short-lived.
 *
 * `previewUrl`/`documentUrl` are HMAC-signed and expire in ~300 s, so a link
 * rendered when the panel mounted is very often dead by the time anyone clicks it.
 * The rule from the roadmap's Phase 1 constraint 8: follow it, never persist it,
 * and on a 404 re-read the contract **once** for a fresh URL before giving up.
 *
 * A second 404 with a freshly minted URL means the artifact is genuinely missing —
 * a real backend problem — so it stops there. No retry loops.
 */
export function useSignedPdf(
  url: string | null,
  refetch: () => Promise<string | null>,
) {
  const [isOpening, setIsOpening] = useState(false);
  const [missing, setMissing] = useState(false);

  const open = useCallback(async () => {
    if (!url) return;
    setIsOpening(true);
    setMissing(false);
    try {
      // A HEAD is enough to learn whether the signature is still valid, and it
      // avoids opening a tab onto an error page.
      if (await reachable(url)) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      const fresh = await refetch();
      if (fresh && (await reachable(fresh))) {
        window.open(fresh, "_blank", "noopener,noreferrer");
        return;
      }
      setMissing(true);
    } finally {
      setIsOpening(false);
    }
  }, [url, refetch]);

  return { open, isOpening, missing };
}

/**
 * The signed URL is absolute and served by the backend's own file route, so this
 * is a cross-origin request. It needs no credentials — the signature *is* the
 * authorization — so a plain fetch is right; a failure to reach it at all is
 * treated the same as an expiry, because the next step (re-read and retry) is
 * the correct response either way.
 */
async function reachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}
```

⚠ **Verify the HEAD assumption before relying on it.** If the file route rejects `HEAD` (405) or CORS
blocks it, `reachable` reports false for a perfectly good URL and every open costs a needless refetch —
still correct, just wasteful. If HEAD is unusable, drop it: open the URL directly and accept that an
expired link shows the backend's 404 page once. Record which path was taken; this is Assumption Ledger
entry AL-10.

- [ ] **Step 3: Wire both buttons and surface the missing state**

Replace the two `render={<a href=… />}` sites. `refetch` must hit the server — bind it to the
contract's own query, or to `GET /api/contracts/admin/{side}/{contractId}` which exists precisely for a
single fresh read (`contracts.md:31`, `:47`).

Show `missing` as a sentence beside the button, not a toast — the admin is looking right at it:
"This document isn't available. That's a problem on the server, not something you can retry."

- [ ] **Step 4: Show the signature method where the compliance question is asked**

On a signed contract, render `signedAt` **with** the method — "Signed 12 Feb 2026 · drawn signature".
Where `signedAt` is set and `signatureMethod` is `null`, say so plainly rather than inventing a
method: the contract was signed before the method was recorded. Do not render `Drawn` raw; it goes
through i18n like every other enum member.

- [ ] **Step 5: Copy, both locales, then gates**

Run the parity script, then `npm run test && npx tsc --noEmit && npm run lint && npm run build`.

- [ ] **Step 6: Commit**

```bash
git add hooks/use-signed-pdf.ts lib/types/contract.types.ts components/docs-workspace/contract-panel.tsx messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
fix(docs): the contract PDF opens fresh, and says how it was signed

previewUrl and documentUrl became short-lived HMAC-signed URLs on 2026-07-31 and
expire in about 300 seconds. The panel rendered each into a static <a href> at
mount, so a panel left open while the admin read the documents beside it gave a
404 on click with no explanation. The roadmap specified this helper in Phase 1
constraint 8; it was never built.

fileUrl is deliberately excluded — it is the admin-supplied source document and
stays a permanently public key. Two ...Url fields, two postures.

signatureMethod was missing from ContractRowBase even though the backend puts it
on both admin DTOs specifically so an admin can answer "was this properly
signed?". null is ambiguous between "not signed" and "signed before F-03.3", so
it is read together with signedAt.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Errors say what actually happened

> **Added 2026-08-10.** Three distinct defects, one symptom: the admin reads "unknown error".

`lib/onboarding/errors.ts` holds a 60-code catalog and `describeApiError` falls back to
`labelKey: "unknown"` for anything unmatched. Three separate paths reach that fallback while the server
was perfectly specific:

**A · Two codes are missing, both added by the KYC intake work of 2026-08-07.**

| Code | HTTP | When | In our catalog? |
|---|---|---|---|
| `incomplete_document_set` | 400 | documents present but no `Passport`/`IdCard`/`ResidencePermit`; **or** an `OwnerCompany` row exists with no `CompanyRegistration` (`BusinessLicense` does **not** discharge it) | ❌ |
| `invalid_document_type` | 400 | a `type` that is absent, or present but not a defined `OwnerKYCDocType`. All-or-nothing before the transaction opens | ❌ |

Both from `Backend/index/controllers/kyc.md:15-16`. `kyc_documents_required` survives and still means
**zero** documents — the two are different failures and must read differently.

**A′ · One of those two codes does not arrive as a bare code on the worker side.** Verified in C# on
2026-08-10:

```
GermanyERP.Services/Kyc/KycService.cs:395          throw new InvalidOperationException("invalid_document_type");
GermanyERP.Services/Workers/WorkerDocService.cs:75 throw new InvalidOperationException($"invalid_document_type: {req.DocumentType}");
```

**The worker side interpolates the offending value into the code.** So the wire value is
`invalid_document_type: Nonsense`, and `CATALOG["invalid_document_type"]` — an exact-key lookup —
**misses**. Worse, the prose-detection in **C** below would classify it as a leaked library message
(it has a colon, a space and a capital) and suppress it. The parser must split on the first `": "`,
match the head against the catalog, and keep the tail as detail. `incomplete_document_set` is bare on
both sides (`KycService.cs:269,:280`, `WorkerDocService.cs:154`) and needs no such handling.

**B · Model-validation 400s are not parsed at all.** `lib/http/api-error.ts:12` reads only
`data.error`. But some refusals arrive as **ASP.NET problem-details** (`{type, title, status,
errors:{…}}`), with no `error` field — most concretely a `type` that is not a valid enum *name* at all
(`"Nonsense"`), which `kyc.md:16` says *"dies earlier still, in deserialization → **ASP.NET
problem-details, not `{error}`**"*. `getApiErrorCode` returns `null`, `describeApiError` returns
`null`, and the admin is told "unknown error".

> **Correction, 2026-08-10.** An earlier draft of this task claimed
> `rejection_reason_required` and `revision_reason_required` "may never arrive on the wire" because
> `[Required]` would catch a blank reason first. **That was wrong, and the grep in Step 6 disproved
> it.** Both are thrown by the services and do arrive as ordinary `{error}` codes:
> `KycService.cs:819`, `WorkerDocService.cs:269`, `OnboardingStateMachine.cs:122`, and
> `ContractService.cs:1272`. The two paths coexist — `[Required]` refuses a genuinely absent field as
> problem-details, and the service refuses whitespace that passes it. Both catalog entries stay, and
> **both** shapes need handling. Client-side required-field validation is still worth having, but as a
> courtesy rather than as the only defence.

**C · A library's exception message can arrive *as* the code.** `G_ArgumentExceptionMessageLeaksIntoErrorField`
(`index/gaps/open.md:351`) — **OPEN**, nine sites across five controllers, and two of them are
`AdminOwnersController.cs:46,76` and `AdminWorkersController.cs:48,75`: **the exact FND-3 table
endpoints Phase 3 targets.** It has already shipped once — Npgsql's `Cannot write DateTime with
Kind=Unspecified…` reached clients as the `error` value on `GET /api/admin/owners`. The trigger was
removed 2026-08-09; **the class was not.** So an `error` value may be a sentence, not a code.

**Files:**
- Modify: `lib/onboarding/errors.ts` — two codes, and a validation-detail path
- Modify: `lib/http/api-error.ts` — parse problem-details
- Create: `lib/http/api-error.test.ts`
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Produces:
  ```ts
  // lib/http/api-error.ts
  export function getApiErrorCode(err: unknown): string | null;   // unchanged
  /** First field-validation message from an ASP.NET problem-details body. */
  export function getValidationMessage(err: unknown): string | null;
  /** True when `error` looks like prose rather than a snake_case code. */
  export function looksLikeLeakedMessage(code: string): boolean;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// lib/http/api-error.test.ts
import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import {
  getApiErrorCode,
  getValidationMessage,
  looksLikeLeakedMessage,
} from "@/lib/http/api-error";

function axiosErr(status: number, data: unknown): AxiosError {
  const e = new AxiosError("boom");
  // @ts-expect-error minimal shape is all the parser reads
  e.response = { status, data };
  return e;
}

describe("getApiErrorCode", () => {
  it("reads the project envelope", () => {
    expect(getApiErrorCode(axiosErr(400, { error: "incomplete_document_set" })))
      .toBe("incomplete_document_set");
  });

  it("returns null for problem-details, which carries no error field", () => {
    expect(
      getApiErrorCode(
        axiosErr(400, { title: "One or more validation errors occurred.", status: 400, errors: {} }),
      ),
    ).toBeNull();
  });
});

describe("getValidationMessage", () => {
  it("pulls the first field message out of problem-details", () => {
    const msg = getValidationMessage(
      axiosErr(400, {
        title: "One or more validation errors occurred.",
        status: 400,
        errors: { Reason: ["The Reason field is required."] },
      }),
    );
    expect(msg).toBe("The Reason field is required.");
  });

  it("returns null for the project envelope", () => {
    expect(getValidationMessage(axiosErr(400, { error: "code_exists" }))).toBeNull();
  });

  it("survives an empty or malformed errors bag", () => {
    expect(getValidationMessage(axiosErr(400, { errors: {} }))).toBeNull();
    expect(getValidationMessage(axiosErr(400, { errors: { A: [] } }))).toBeNull();
    expect(getValidationMessage(axiosErr(400, { errors: "nope" }))).toBeNull();
  });
});

describe("looksLikeLeakedMessage", () => {
  it("accepts real snake_case codes", () => {
    expect(looksLikeLeakedMessage("incomplete_document_set")).toBe(false);
    expect(looksLikeLeakedMessage("invalid_contract_period")).toBe(false);
    expect(looksLikeLeakedMessage("forbidden")).toBe(false);
  });

  it("flags a leaked library sentence", () => {
    // Shipped for real on GET /api/admin/owners, measured 2026-08-08.
    expect(
      looksLikeLeakedMessage(
        "Cannot write DateTime with Kind=Unspecified to PostgreSQL type 'timestamp with time zone'",
      ),
    ).toBe(true);
  });

  it("flags anything with spaces or capitals", () => {
    expect(looksLikeLeakedMessage("Value cannot be null.")).toBe(true);
    expect(looksLikeLeakedMessage("SomeEnumName")).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch the two new functions fail**

Run: `npm run test` — `getValidationMessage` and `looksLikeLeakedMessage` are not exported yet.

- [ ] **Step 3: Extend the parser**

```ts
/**
 * Not every 400 uses this project's `{error}` envelope. `[Required]` failures and
 * enum-name deserialization failures are refused by ASP.NET **before** the action
 * runs, so they arrive as problem-details with no `error` field at all — a blank
 * rejection reason is the everyday case (`Backend/index/controllers/kyc.md:37`).
 * Without this the admin who left the box empty is told "unknown error".
 */
export function getValidationMessage(err: unknown): string | null {
  if (!(err instanceof AxiosError)) return null;
  const data = err.response?.data as { errors?: unknown } | undefined;
  const bag = data?.errors;
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) return null;
  for (const value of Object.values(bag as Record<string, unknown>)) {
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
      return value[0];
    }
  }
  return null;
}

/**
 * True when an `error` value is prose rather than a code.
 *
 * `G_ArgumentExceptionMessageLeaksIntoErrorField` (open): nine controller sites do
 * `catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }) }`,
 * so any library throwing inside those blocks becomes the `error` value verbatim —
 * including its wording, which changes on upgrade. It has shipped once already, on
 * `GET /api/admin/owners`. Every real code in this API is lower snake_case, so the
 * shape is enough to tell them apart, and a leaked sentence must not be shown to an
 * admin as if it were a diagnosis.
 */
export function looksLikeLeakedMessage(code: string): boolean {
  return !/^[a-z][a-z0-9_]*$/.test(code);
}
```

- [ ] **Step 4: Add the two missing codes**

```ts
  // ── KYC document intake (backend 2026-08-07) ─────────────────────────────
  // Distinct from kyc_documents_required, which still means ZERO documents.
  incomplete_document_set: { labelKey: "incompleteDocumentSet", reaction: "toast" },
  invalid_document_type: { labelKey: "invalidDocumentType", reaction: "toast" },
```

- [ ] **Step 5: Teach `describeApiError` about the other two shapes**

```ts
export function describeApiError(err: unknown): ApiErrorInfo | null {
  const detail = forbiddenDetail(err);
  const code = detail ?? getApiErrorCode(err);

  if (!code) {
    // Problem-details: no code, but a usable field message.
    const validation = getValidationMessage(err);
    return validation
      ? { code: "validation", labelKey: "validation", reaction: "toast", detail: validation }
      : null;
  }

  // A leaked library sentence is not a code and must not be matched or displayed.
  if (looksLikeLeakedMessage(code)) {
    return { code: "unknown", labelKey: "unknown", reaction: "toast" };
  }

  const known = CATALOG[code];
  return known ? { code, ...known } : { code, labelKey: "unknown", reaction: "toast" };
}
```

Add an optional `detail?: string` to `ApiErrorInfo`. `ErrorNotice` (Task 5) renders `detail` when
present instead of the generic sentence — the server's field message is more useful than any generic
string we could write, even in English on a German screen, and that trade-off is worth stating in a
comment.

- [ ] **Step 6: Handle the interpolated-code shape**

Split before matching, so the worker side's `invalid_document_type: Nonsense` resolves.

```ts
/**
 * Some services interpolate the offending value into the code:
 * `WorkerDocService.cs:75` throws `$"invalid_document_type: {req.DocumentType}"`
 * while `KycService.cs:395` throws the bare code for the same failure. Splitting
 * on the first `": "` lets one catalog entry serve both, and keeps the value as
 * detail — which is the useful half, since "which type was wrong" is the question
 * the admin has.
 */
function splitCode(raw: string): { code: string; detail: string | null } {
  const at = raw.indexOf(": ");
  return at === -1
    ? { code: raw, detail: null }
    : { code: raw.slice(0, at), detail: raw.slice(at + 2) };
}
```

Apply it **before** `looksLikeLeakedMessage`, or the colon and capital in the tail make a real code
look like leaked prose and it gets suppressed.

> **Catalog audit — done 2026-08-10, all four confirmed real.** This step previously asked whoever
> reached it to run a grep over the C# and mark four inherited entries as unverified. The grep was run
> while writing this task and **every one of them exists**, so nothing needs marking:
>
> | Code | Thrown at |
> |---|---|
> | `contract_already_sent` | `GermanyERP.Services/Contracts/ContractService.cs:1254` |
> | `revision_reason_required` | `ContractService.cs:1272` |
> | `contract_already_inactive` | `ContractService.cs:1316` |
> | `contract_template_missing` | `GermanyERP.Services/Contracts/ContractPdfRenderer.cs:147` |
>
> `rejection_reason_required` is real too, at three sites — see the correction under **B**.
> **Do not delete any catalog entry.** The audit is closed; Assumption Ledger entry AL-13 is
> discharged.

- [ ] **Step 7: Copy, both locales**

```json
// messages/en.json — under "onboarding.apiErrors"
"incompleteDocumentSet": "The document set is incomplete. An identity document is required — passport, ID card or residence permit — and a company registration document if a company is declared. A business licence does not replace the registration document.",
"invalidDocumentType": "One of the documents has an unrecognised type. Nothing was saved.",
"validation": "{detail}"
```
```json
// messages/de.json — under "onboarding.apiErrors"
"incompleteDocumentSet": "Der Dokumentensatz ist unvollständig. Ein Identitätsdokument ist erforderlich — Pass, Personalausweis oder Aufenthaltstitel — und ein Handelsregisterauszug, wenn ein Unternehmen angegeben ist. Eine Gewerbeerlaubnis ersetzt den Registerauszug nicht.",
"invalidDocumentType": "Eines der Dokumente hat einen unbekannten Typ. Es wurde nichts gespeichert.",
"validation": "{detail}"
```

The `incompleteDocumentSet` copy is long on purpose. It is the one refusal an admin cannot act on
without knowing the rule, and the `BusinessLicense`-does-not-count detail is the part nobody guesses.

- [ ] **Step 8: Gates and commit**

```bash
npm run test && npx tsc --noEmit && npm run lint && npm run build
git add lib/onboarding/errors.ts lib/http/api-error.ts lib/http/api-error.test.ts messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
fix(errors): three paths that all said "unknown error"

The catalog was missing incomplete_document_set and invalid_document_type, both
added backend-side on 2026-08-07 with the KYC intake validation.

Model-validation 400s were not parsed at all. A blank rejection reason and an
unrecognised enum name are refused by ASP.NET before the action runs, so they
arrive as problem-details with no `error` field — and the admin who left the box
empty was told "unknown error" instead of which field was missing.

And an `error` value is not always a code: G_ArgumentExceptionMessageLeaksIntoErrorField
is open, nine sites across five controllers, two of them the admin owner and
worker table endpoints. Npgsql's "Cannot write DateTime with Kind=Unspecified..."
reached clients as the error value once already. Every real code here is lower
snake_case, so prose is detectable and is no longer shown as a diagnosis.

Four inherited catalog entries have no counterpart in the backend index. They are
marked unverified rather than deleted — an unmatched code costs only a generic
message, and guessing wrong costs a real one.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Phase gate

**Files:**
- Modify: `docs/superpowers/plans/2026-08-04-v2-migration-roadmap.md` (Phase 1 status)
- Modify: `../INTEGRATION.md` (ERP-Admin F-03 row)

**Interfaces:**
- Consumes: every preceding task.
- Produces: G4 green for Phases 2, 3 and 4. **G5 cannot be produced this round** — see below.

- [ ] **Step 1: Run the full gate**

```bash
npm run test && npx tsc --noEmit && npm run lint && npm run build
```

Expected: tests green; `tsc` exit 0; **lint exit 0** (new, from Task 6); build compiles.

- [ ] **Step 2: Run the dead-vocabulary sweep**

```bash
rg -n 'isApproved|kycStatus|worker_not_approved|CreateContractRequest' --glob '!docs/**' --glob '!node_modules' --glob '!scripts/verify-v2.mjs' .
```

Expected: no output. This is the roadmap's definition of migration-done (`:295`). `scripts/verify-v2.mjs`
is excluded because it deliberately asserts these names are *absent* from live responses.

- [ ] **Step 3: Run the public half of the live check**

```bash
npm run verify:api
```

Expected: `ALL PASS` on the unauthenticated half. The authenticated half will report missing
credentials — that is G2, and it is expected to fail this round.

- [ ] **Step 4: Record the G5 waiver honestly**

In the roadmap's Gates table, do **not** mark G5 green. Add a line beneath it:

> **G5 not satisfied as of 2026-08-07.** Phase 1's UI is complete and every static gate is green,
> but the full owner+worker journey has never run against live — G2 (admin credentials) and G3
> (`contract.template.approved` plus test subject accounts) are both unmet. Phases 2–4 proceed on G4
> alone, under the assumption ledgers in their plan files. Nothing in Phase 1 has been exercised
> against a real backend: no contract has been sent, signed, or renewed from this panel.

- [ ] **Step 5: Update `INTEGRATION.md`**

Amend the ERP-Admin F-03 row with what is now true: Phase 1 complete, registry on `phase`, lint
clean, vitest present, still never exercised against live. Keep the two invariants section as is.

- [ ] **Step 6: Commit and open the PR**

Dispatch the `git-pusher` agent, or:

```bash
git add docs/superpowers/plans/2026-08-04-v2-migration-roadmap.md ../INTEGRATION.md
git commit -m "docs(plan): close Phase 1, record the G5 waiver

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

PR body must state plainly that no part of the Docs workspace or the contracts registry has been
exercised against a live backend.

---

## Assumption Ledger — verify when G2 lands

Every entry is something this plan could not check. When admin credentials arrive, work this list
**in order** — later entries depend on earlier ones being right.

| # | Assumption | Depends on it | Breaks how |
|---|---|---|---|
| **AL-1** | `GET /api/system/settings` returns `contract.template.approved` at all. If the key is absent until first written, the Settings page shows no Contract category and the deep link scrolls to nothing. | `settings/page.tsx` highlight; `ErrorNotice` link | Link lands on a page with no such row — silent dead end, exactly what Task 5 set out to fix |
| **AL-2** | Its value is the literal string `"true"` / `"false"`, lower case. `isBoolean()` matches those two only. | `isBoolean()` in `settings/page.tsx` | A value of `True` or `1` renders as a text row, and an admin edits it by hand again |
| **AL-3** | `describeApiError` returns the matched error `code`. Task 5 Step 2 adds it if not. | `ErrorNotice` target lookup | No link renders; the notice degrades to a plain sentence |
| **AL-4** | `contractPhasePresentation` covers all seven phases and its `labelKey` resolves under the `onboarding.phase.*` namespace. Verified by reading, never rendered with real rows. | Registry badge | Missing-key text in the badge for whichever phase is uncovered |
| **AL-5** | Some setting in the environment has a boolean value, so the Switch branch can be seen at all. Task 5 Step 8 may be unable to complete. | Task 5 verification | The Switch ships unrendered by a human eye |
| **AL-6** | next-intl's `redirect` takes `{ href, locale }` in the installed version. Task 3 Step 3 falls back to the positional form. | `/dashboard/kyc` redirect | `tsc` catches it — this one cannot ship broken |
| **AL-7** | `components/ui/switch.tsx` exposes `onCheckedChange`. The repo is on `@base-ui/react`, not Radix. | Task 5 Step 3 | `tsc` catches it |
| **AL-8** | The three lint fixes changed no behaviour, particularly in `sidebar.tsx`, which every dashboard screen mounts. | Task 6 | Sidebar state or layout regresses on screens not opened during Step 7 |
| **AL-9** | The terminate button works: `DELETE` returns 204, the row comes back `Terminated`, and the invalidation list refreshes what the admin is looking at. **No contract has ever been terminated from this panel.** | Task 8 | The destructive action is the one least safe to ship unexercised. A wrong invalidation leaves the admin looking at stale cover after ending it |
| **AL-10** | The signed file route answers `HEAD`, and CORS permits it from the app origin. `useSignedPdf` uses a HEAD probe to decide whether to refresh. | Task 9 | A 405 or a CORS block makes every open refetch needlessly — correct but wasteful. Task 9 Step 2 names the fallback: drop the probe |
| **AL-11** | `previewUrl`/`documentUrl` really do expire at ~300 s (`Storage.Local.ReadPresignExpirySeconds`, default per `dtos/contracts.md:215`). The deployment may have tuned it. | Task 9 | A longer expiry makes the helper harmless; a shorter one makes it essential. Either way it is right to have |
| **AL-12** | `signatureMethod` is serialized as the string `"Drawn"`, by name. | Task 9 | A numeric `1` renders as missing-key text where the compliance line should be |
| ~~**AL-13**~~ | ~~The four unverified catalog entries.~~ **DISCHARGED 2026-08-10** — the grep was run and all four exist in the C#, plus `rejection_reason_required` at three sites. See Task 10 Step 6. | — | — |

AL-6, AL-7 and AL-12 are compiler- or render-caught and therefore cheap.

**Two dangerous clusters.** AL-1, AL-2 and AL-5 all concern the one setting that gates every contract
send in the product; if a single live check is possible, make it `GET /api/system/settings` and read
what `contract.template.approved` actually holds. **AL-9 is the other**, and it is the more serious of
the two in kind: terminate is destructive, it is the only new destructive action in this plan, and it
will ship without ever having been run. Whoever gets credentials first should terminate a throwaway
draft on a test subject **before** trusting the button on anything real.
</content>
</invoke>
