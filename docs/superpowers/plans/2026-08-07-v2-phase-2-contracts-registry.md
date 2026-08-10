# Phase 2 — Contracts Registry + Settings Contract Category — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/dashboard/contracts` from an authoring screen into the oversight screen that answers *"who was sent a contract and never signed it, and whose cover runs out soon"*, and give the Contract settings category the controls it needs.

**Architecture:** Spec §5 fixes the rule — **actions in one place (Docs), oversight in another (Contracts)**. Authoring already lives in the Docs workspace, so this phase removes the registry's mutation UI and replaces it with two alert blocks over a filterable table whose rows link into the Docs detail. Selection logic goes in a pure, tested module because both alert blocks are silent-failure territory: an unsigned contract nobody chases is invisible by definition, so a selector that returns an empty array looks identical to "nothing is wrong". Settings gets the Contract category's remaining rows.

**Tech Stack:** Next.js 16 App Router, next-intl, TanStack react-query v5, Tailwind v4, vitest.

**Depends on:** Phase 1 Close (all 8 tasks). Specifically `lib/contracts/registry-row.ts`, `npm run lint` exiting 0, and `npm run test` existing.

---

## Gate status: G5 is waived, not met

The roadmap gates this phase on **G5** — *"Phase 1 merged and the full owner+worker journey verified
once against live"* (`2026-08-04-v2-migration-roadmap.md:84`). G2 credentials are unavailable, so
that journey has never run.

**This phase proceeds on the waiver recorded in Phase 1 Close Task 8 Step 4.** The consequence is
concrete and worth stating before any code is written: every rendering decision below is derived from
DTO types and backend documentation, and **not one has been checked against a real contract row**.
The Assumption Ledger at the bottom is the list of what that leaves open. It is longer than Phase 1's
because this phase renders more contract state than any other screen in the product.

---

## Global Constraints

Every task's requirements implicitly include this section.

1. **`phase` is the truth.** `isActive` may not drive a badge, an affordance, a filter, or a
   selector. Use `isCoveredNow()` (`lib/types/onboarding.types.ts:76`) and the predicates in
   `lib/contracts/registry-row.ts`.
2. **`Terminated` renders as *ended early*, never as *expired*.** Spec §5 (`:566`) makes this
   load-bearing: when a passport or licence lapses, the hourly job retires every signed row and
   stamps each on its own date — a period that genuinely elapsed becomes `Expired`, one still
   in-period and cut short becomes `Terminated`. **One lapse produces both in the same list.**
3. **`phase` alone cannot distinguish a compliance-driven end from an admin force-terminate.** Only
   the audit log can: `ONBOARDING_REVERTED_TO_KYC` is never written by a force-terminate, and its
   metadata carries `revertSource`, `expiredContractIds` and `terminatedContractIds`. Where the UI
   would be tempted to explain *why* cover ended, it must either say "see the audit log" or say
   nothing — never guess.
4. **The expiring block covers contract dates only, and must say so.** The backend ladder counts down
   to the **earliest** of the contract's cover end, the subject's `passportExpiry`, and a licence
   expiry (spec §5 `:557`). A subject whose licence lapses next month is *not* in this block. Label
   it accordingly; document expiries surface in the Docs detail.
5. **The admin contract list is unpaginated and unfiltered.** `GET /api/contracts/admin/{side}`
   returns every contract for every subject. Fetch it **once** per side under one query key
   (`["owner-contracts"]` / `["worker-contracts"]`) and derive everything client-side. Never one
   request per row. Recorded as backend ask #8.
6. **This screen has no mutations.** No create, no renew, no terminate. Every action is a link into
   the Docs detail, which owns the mutation, its permissions, and its invalidation map.

   > ⚠ **Hard prerequisite, added 2026-08-10: Phase 1 Close Task 8 must land first.** Terminate was
   > wired **only** here — `components/docs-workspace/contract-panel.tsx` never had it. Removing this
   > screen's mutations before Task 8 relocates terminate into the Docs detail **deletes the only way
   > to end a contract early anywhere in the panel.** Spec §5's rule is *actions in Docs, oversight in
   > Contracts*; the action has to arrive in Docs before it leaves here. Verify before starting Task 3:
   >
   > ```bash
   > rg -n 'useTerminateContract|terminate' components/docs-workspace/contract-panel.tsx
   > ```
   >
   > No output means Task 8 has not landed and Task 3 must not proceed.
7. **Permission-aware rendering.** Read the caller's set through `hooks/use-current-permissions.ts`.
   The owner tab needs `owner_contract:read_any`, the worker tab `worker_contract:read_any`. An admin
   holding one and not the other sees one tab, not a 403. `hooks/use-contracts.ts` already takes an
   `enabled` argument for exactly this — a caller lacking the permission must skip the request, not
   provoke a 403 (which also forces a permission refetch via `lib/http/on-forbidden.ts`).
8. **Every status through `lib/onboarding/status.ts`; every error through `ErrorNotice`.**
9. **en/de parity exact.** German is first-class.
10. **Reuse, don't re-invent.** `data-table-card`, `table-pagination`, `sortable-table-head`,
    `filter-menu`, `tabs`, `card`, `badge`, `skeleton`, `row-link` all exist. Note the two known
    limits before reaching for them: `DataTableCard` takes `columns: { label, className }[]` — plain
    labels, **not** sortable heads — and `FilterMenu` is **single-select per group**. Phase 2 needs
    only single-select filtering, so `FilterMenu` fits as-is; Phase 3 is where both limits bite.
11. **Gates:** `npm run test` green, `npx tsc --noEmit` exit 0, `npm run lint` **exit 0**,
    `npm run build` compiles.
12. **Commit per task**, conventional subject, body explains *why*.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `lib/contracts/registry-select.ts` | **New.** Pure selectors: unsigned, expiring, phase filter, search, sort | 1 |
| `lib/contracts/registry-select.test.ts` | **New.** Covers every boundary the selectors turn on | 1 |
| `components/contracts/attention-blocks.tsx` | **New.** The unsigned and expiring blocks | 2 |
| `components/contracts/registry-table.tsx` | **New.** Tabs, phase filter, search, rows linking into Docs | 3 |
| `app/[locale]/dashboard/contracts/page.tsx` | Rewritten as a thin page: fetch, permission-gate, compose | 3 |
| `components/contracts/contract-form-dialog.tsx` | **Deleted** | 5 |
| `hooks/use-contracts.ts` | Drop the mutation hooks no consumer has left | 5 |
| `app/[locale]/dashboard/settings/page.tsx` | Contract-category copy overrides and the read-only template view | 4 |
| `lib/settings/contract-settings.ts` | **New.** The seven keys, their control kind, and the corrected copy | 4 |
| `messages/en.json`, `messages/de.json` | Registry + settings copy | 2, 3, 4 |

---

## Task 1: Pure selectors for the two attention blocks

Both blocks are silent-failure territory. An unsigned contract that nobody chases is invisible **by
definition** — nothing on the backend chases it, the subject gets one notification at send and then
silence, and the expiry ladder only watches *signed* cover (spec §5 `:553`). So a selector returning
`[]` looks exactly like "nothing needs attention". That is why this is the first task and why it is
tested before anything renders.

**Files:**
- Create: `lib/contracts/registry-select.ts`
- Create: `lib/contracts/registry-select.test.ts`

**Interfaces:**
- Consumes: `RegistryRow`, `isAwaitingSignature`, `canRenew` from `lib/contracts/registry-row.ts`
  (Phase 1 Close Task 4).
- Produces:
  ```ts
  export const EXPIRING_WINDOW_DAYS = 30;
  export interface UnsignedEntry { row: RegistryRow; daysSinceSent: number }
  export interface ExpiringEntry { row: RegistryRow; daysLeft: number }
  /** `phase === "Sent"`, longest-waiting first. Rows with no `sentAt` sort last. */
  export function findUnsigned(rows: RegistryRow[], today: number): UnsignedEntry[];
  /** InForce cover ending within 30 days, soonest first. Already-ended rows excluded. */
  export function findExpiring(rows: RegistryRow[], today: number): ExpiringEntry[];
  export function filterByPhase(rows: RegistryRow[], phase: ContractPhase | null): RegistryRow[];
  export function searchRows(rows: RegistryRow[], query: string): RegistryRow[];
  export function sortByCreatedDesc(rows: RegistryRow[]): RegistryRow[];
  ```
  Task 2 consumes `findUnsigned` / `findExpiring`; Task 3 consumes the other three.

- [ ] **Step 1: Write the failing test**

```ts
// lib/contracts/registry-select.test.ts
import { describe, expect, it } from "vitest";
import {
  EXPIRING_WINDOW_DAYS,
  filterByPhase,
  findExpiring,
  findUnsigned,
  searchRows,
  sortByCreatedDesc,
} from "@/lib/contracts/registry-select";
import type { RegistryRow } from "@/lib/contracts/registry-row";

const DAY = 86_400_000;
const TODAY = Date.parse("2026-08-07T00:00:00.000Z");
/** An awkward hour on purpose: whole-day arithmetic must ignore it. */
const iso = (days: number, hour = 17) =>
  new Date(TODAY + days * DAY + hour * 3_600_000).toISOString();

function row(over: Partial<RegistryRow> = {}): RegistryRow {
  return {
    contractId: "c",
    partyId: "u",
    partyProfileId: "p",
    partyName: "Hans Müller",
    partyEmail: "hans@example.de",
    eligibleFrom: iso(-100),
    eligibleTo: iso(200),
    fileName: null,
    fileUrl: null,
    phase: "InForce",
    sentAt: null,
    signedAt: null,
    renewalStartsAt: null,
    createdAt: iso(-100),
    ...over,
  };
}

describe("findUnsigned", () => {
  it("selects only the Sent phase", () => {
    const rows = [
      row({ contractId: "sent", phase: "Sent", sentAt: iso(-5) }),
      row({ contractId: "draft", phase: "Draft" }),
      row({ contractId: "inforce", phase: "InForce" }),
      row({ contractId: "signed-then-scheduled", phase: "Scheduled" }),
    ];
    expect(findUnsigned(rows, TODAY).map((e) => e.row.contractId)).toEqual(["sent"]);
  });

  it("orders longest-waiting first", () => {
    const rows = [
      row({ contractId: "recent", phase: "Sent", sentAt: iso(-2) }),
      row({ contractId: "ancient", phase: "Sent", sentAt: iso(-40) }),
      row({ contractId: "middling", phase: "Sent", sentAt: iso(-12) }),
    ];
    expect(findUnsigned(rows, TODAY).map((e) => e.row.contractId)).toEqual([
      "ancient",
      "middling",
      "recent",
    ]);
  });

  it("counts whole days since sent, ignoring the hour", () => {
    const [e] = findUnsigned([row({ phase: "Sent", sentAt: iso(-12) })], TODAY);
    expect(e.daysSinceSent).toBe(12);
  });

  it("keeps a Sent row with no sentAt but sorts it last", () => {
    const rows = [
      row({ contractId: "nulldate", phase: "Sent", sentAt: null }),
      row({ contractId: "dated", phase: "Sent", sentAt: iso(-1) }),
    ];
    const ids = findUnsigned(rows, TODAY).map((e) => e.row.contractId);
    // Dropping it would hide a genuinely unsigned contract, which is the one
    // thing this selector exists to prevent.
    expect(ids).toEqual(["dated", "nulldate"]);
    expect(findUnsigned(rows, TODAY)[1].daysSinceSent).toBe(0);
  });

  it("returns an empty array when nothing is outstanding", () => {
    expect(findUnsigned([row({ phase: "InForce" })], TODAY)).toEqual([]);
  });
});

describe("findExpiring", () => {
  it("selects InForce cover inside the 30-day window", () => {
    const rows = [
      row({ contractId: "soon", phase: "InForce", eligibleTo: iso(10) }),
      row({ contractId: "far", phase: "InForce", eligibleTo: iso(90) }),
    ];
    expect(findExpiring(rows, TODAY).map((e) => e.row.contractId)).toEqual(["soon"]);
  });

  it("includes the exact boundary day and excludes the one past it", () => {
    const onBoundary = row({ phase: "InForce", eligibleTo: iso(EXPIRING_WINDOW_DAYS) });
    const beyond = row({ phase: "InForce", eligibleTo: iso(EXPIRING_WINDOW_DAYS + 1) });
    expect(findExpiring([onBoundary], TODAY)).toHaveLength(1);
    expect(findExpiring([beyond], TODAY)).toHaveLength(0);
  });

  it("includes cover ending today", () => {
    const [e] = findExpiring([row({ phase: "InForce", eligibleTo: iso(0) })], TODAY);
    expect(e.daysLeft).toBe(0);
  });

  it("excludes rows that have already ended — those are not expiring, they are gone", () => {
    expect(findExpiring([row({ phase: "Expired", eligibleTo: iso(-2) })], TODAY)).toEqual([]);
    expect(findExpiring([row({ phase: "Lapsed", eligibleTo: iso(-2) })], TODAY)).toEqual([]);
    expect(findExpiring([row({ phase: "Terminated", eligibleTo: iso(20) })], TODAY)).toEqual([]);
  });

  it("excludes Scheduled cover: it has not started, so it is not running out", () => {
    expect(findExpiring([row({ phase: "Scheduled", eligibleTo: iso(15) })], TODAY)).toEqual([]);
  });

  it("orders soonest-expiring first", () => {
    const rows = [
      row({ contractId: "b", phase: "InForce", eligibleTo: iso(20) }),
      row({ contractId: "a", phase: "InForce", eligibleTo: iso(3) }),
      row({ contractId: "c", phase: "InForce", eligibleTo: iso(29) }),
    ];
    expect(findExpiring(rows, TODAY).map((e) => e.row.contractId)).toEqual(["a", "b", "c"]);
  });
});

describe("filterByPhase", () => {
  it("passes everything through for a null filter", () => {
    const rows = [row({ phase: "InForce" }), row({ phase: "Expired" })];
    expect(filterByPhase(rows, null)).toHaveLength(2);
  });

  it("does not conflate Terminated with Expired", () => {
    const rows = [
      row({ contractId: "t", phase: "Terminated" }),
      row({ contractId: "e", phase: "Expired" }),
    ];
    expect(filterByPhase(rows, "Terminated").map((r) => r.contractId)).toEqual(["t"]);
    expect(filterByPhase(rows, "Expired").map((r) => r.contractId)).toEqual(["e"]);
  });
});

describe("searchRows", () => {
  it("matches name and email, case-insensitively", () => {
    const rows = [
      row({ contractId: "h", partyName: "Hans Müller", partyEmail: "hans@example.de" }),
      row({ contractId: "a", partyName: "Anna Schmidt", partyEmail: "anna@example.de" }),
    ];
    expect(searchRows(rows, "MÜLLER").map((r) => r.contractId)).toEqual(["h"]);
    expect(searchRows(rows, "anna@").map((r) => r.contractId)).toEqual(["a"]);
  });

  it("returns everything for a blank or whitespace query", () => {
    const rows = [row(), row()];
    expect(searchRows(rows, "   ")).toHaveLength(2);
  });

  it("survives a null name and a null email", () => {
    const rows = [row({ partyName: null, partyEmail: null })];
    expect(searchRows(rows, "hans")).toEqual([]);
  });
});

describe("sortByCreatedDesc", () => {
  it("puts the newest first and does not mutate the input", () => {
    const rows = [
      row({ contractId: "old", createdAt: iso(-100) }),
      row({ contractId: "new", createdAt: iso(-1) }),
    ];
    expect(sortByCreatedDesc(rows).map((r) => r.contractId)).toEqual(["new", "old"]);
    expect(rows[0].contractId).toBe("old");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run test`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

```ts
// lib/contracts/registry-select.ts
import { isAwaitingSignature, type RegistryRow } from "@/lib/contracts/registry-row";
import { isCoveredNow, type ContractPhase } from "@/lib/types/onboarding.types";

const DAY_MS = 86_400_000;

/**
 * How far ahead the expiring block looks.
 *
 * ⚠ **Drift risk.** This mirrors the outer rung of the backend's own expiry ladder
 * (`onboarding.expiry.warn_days`), which sits behind `system:settings:read`. Phase 2
 * Task 4 surfaces that setting in the UI, which is the first chance to reconcile the
 * two — until then, if the ladder is retuned this block keeps using 30 and quietly
 * disagrees with the emails the subject receives. Recorded in `ERP-Uyer/INTEGRATION.md`.
 */
export const EXPIRING_WINDOW_DAYS = 30;

/** Snap to the start of the day so whole-day differences carry no rounding. */
function startOfDay(ms: number): number {
  return Number.isNaN(ms) ? ms : Math.floor(ms / DAY_MS) * DAY_MS;
}

function wholeDaysBetween(fromMs: number, toMs: number): number {
  return Math.round((startOfDay(toMs) - startOfDay(fromMs)) / DAY_MS);
}

export interface UnsignedEntry {
  row: RegistryRow;
  daysSinceSent: number;
}

export interface ExpiringEntry {
  row: RegistryRow;
  daysLeft: number;
}

/**
 * Contracts sent and never answered — **the point of this page** (spec §5).
 *
 * Nothing on the backend chases one: the subject gets a single notification at
 * send, then silence, and the expiry ladder only watches *signed* cover. If this
 * block is empty, nobody is being chased and nobody is being told.
 *
 * A `Sent` row with a null `sentAt` is kept and sorted last. Dropping it would
 * hide a genuinely unsigned contract — the exact failure this selector prevents —
 * and a missing timestamp is a data problem, not a reason to stop caring.
 */
export function findUnsigned(rows: RegistryRow[], today: number): UnsignedEntry[] {
  return rows
    .filter((r) => isAwaitingSignature(r.phase))
    .map((row) => ({
      row,
      daysSinceSent: row.sentAt
        ? Math.max(0, wholeDaysBetween(Date.parse(row.sentAt), today))
        : 0,
    }))
    .sort((a, b) => {
      // Undated rows last, whatever their computed 0.
      if (!a.row.sentAt !== !b.row.sentAt) return a.row.sentAt ? -1 : 1;
      return b.daysSinceSent - a.daysSinceSent;
    });
}

/**
 * Cover that is running out — `InForce` only, ending within the window.
 *
 * ⚠ **This understates the risk, deliberately, and the UI must say so.** The
 * backend ladder counts down to the *earliest* of the contract's cover end, the
 * subject's `passportExpiry`, and a licence expiry. A subject whose licence lapses
 * next month has full contract cover and is absent from this block. Document
 * expiries surface in the Docs detail instead.
 *
 * `Scheduled` is excluded: cover that has not begun is not running out.
 * `Expired`, `Lapsed` and `Terminated` are excluded: they are gone, not going.
 */
export function findExpiring(rows: RegistryRow[], today: number): ExpiringEntry[] {
  return rows
    .filter((r) => isCoveredNow(r.phase))
    .map((row) => ({ row, daysLeft: wholeDaysBetween(today, Date.parse(row.eligibleTo)) }))
    .filter((e) => !Number.isNaN(e.daysLeft) && e.daysLeft >= 0 && e.daysLeft <= EXPIRING_WINDOW_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** `null` means "all phases". Exact match — never group Terminated with Expired. */
export function filterByPhase(
  rows: RegistryRow[],
  phase: ContractPhase | null,
): RegistryRow[] {
  return phase === null ? rows : rows.filter((r) => r.phase === phase);
}

export function searchRows(rows: RegistryRow[], query: string): RegistryRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) =>
      (r.partyName ?? "").toLowerCase().includes(q) ||
      (r.partyEmail ?? "").toLowerCase().includes(q),
  );
}

/** Newest first. Copies rather than sorting in place — the input is react-query data. */
export function sortByCreatedDesc(rows: RegistryRow[]): RegistryRow[] {
  return [...rows].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run test`

Expected: PASS. If the "undated sorts last" case fails, the comparator's first branch is wrong —
`!a.row.sentAt !== !b.row.sentAt` compares presence, not value.

- [ ] **Step 5: Commit**

```bash
git add lib/contracts/registry-select.ts lib/contracts/registry-select.test.ts
git commit -m "$(cat <<'EOF'
feat(contracts): tested selectors for the two attention blocks

Both blocks fail silently by nature. An unsigned contract is invisible by
definition — nothing on the backend chases it, the subject gets one
notification at send and then silence, and the expiry ladder only watches
signed cover. A selector returning [] is indistinguishable from "all clear",
so it gets tests before it gets a UI.

findExpiring deliberately understates risk: the backend ladder counts down to
the earliest of cover end, passport expiry and licence expiry, and this sees
only the first. The block's label has to say so.

A Sent row with a null sentAt is kept and sorted last rather than dropped.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: The unsigned and expiring blocks

**Files:**
- Create: `components/contracts/attention-blocks.tsx`
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: `findUnsigned`, `findExpiring`, `EXPIRING_WINDOW_DAYS` from Task 1; `Link` from
  `@/i18n/navigation`.
- Produces:
  ```tsx
  export function AttentionBlocks({
    rows,
    /** Docs detail href for a row, or null when the side cannot deep-link. */
    hrefFor,
  }: {
    rows: RegistryRow[];
    hrefFor: (row: RegistryRow) => string | null;
  }): React.ReactElement | null;
  ```
  Returns `null` when both blocks are empty — an empty alert region is noise.

- [ ] **Step 1: Note the worker deep-link asymmetry before writing the component**

The owner Docs detail route is keyed on `ownerProfileId`; `RegistryRow.partyProfileId` carries it.
The worker Docs detail route is keyed on the worker id, and `partyId` **is** that id. So both sides
can deep-link — but only because `registry-row.ts` kept the two ids apart. Confirm by reading:

```bash
rg -n 'partyProfileId' lib/contracts/registry-row.ts
ls "app/[locale]/dashboard/(owner)/owner-documents" "app/[locale]/dashboard/(worker)/worker-documents"
```

Expected: `partyProfileId` set from `ownerProfileId` on the owner adapter and `null` on the worker
adapter; both route directories contain a dynamic segment. `hrefFor` is supplied by the caller
(Task 3) so this component never has to know which side it is rendering.

- [ ] **Step 2: Write the component**

```tsx
// components/contracts/attention-blocks.tsx
"use client";

import { useSyncExternalStore } from "react";
import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import type { RegistryRow } from "@/lib/contracts/registry-row";
import {
  EXPIRING_WINDOW_DAYS,
  findExpiring,
  findUnsigned,
} from "@/lib/contracts/registry-select";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

/**
 * Start of today in ms; `0` before the clock is known (server render).
 *
 * Read through `useSyncExternalStore` because the clock is external mutable
 * state and `react-hooks/purity` forbids calling `Date.now()` during render.
 * **Quantizing to the day is what makes the snapshot stable** — an unquantized
 * value differs on every render and the store spins forever.
 */
function useToday(): number {
  return useSyncExternalStore(
    subscribeNever,
    () => Math.floor(Date.now() / DAY_MS) * DAY_MS,
    () => 0,
  );
}
function subscribeNever() {
  return () => {};
}

/** How many rows each block lists before collapsing to a count. */
const VISIBLE = 3;

export function AttentionBlocks({
  rows,
  hrefFor,
}: {
  rows: RegistryRow[];
  hrefFor: (row: RegistryRow) => string | null;
}) {
  const t = useTranslations("contracts.attention");
  const today = useToday();

  // No clock yet: render nothing rather than a block computed from epoch 0.
  if (today === 0) return null;

  const unsigned = findUnsigned(rows, today);
  const expiring = findExpiring(rows, today);
  if (unsigned.length === 0 && expiring.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {unsigned.length > 0 ? (
        <Block
          tone="warning"
          icon={<AlertTriangle className="size-4" />}
          title={t("unsignedTitle", { count: unsigned.length })}
          note={t("unsignedNote")}
          entries={unsigned.slice(0, VISIBLE).map((e) => ({
            key: e.row.contractId,
            name: e.row.partyName,
            detail: t("sentDaysAgo", { days: e.daysSinceSent }),
            href: hrefFor(e.row),
          }))}
          more={unsigned.length - VISIBLE}
          moreLabel={(n) => t("andMore", { count: n })}
        />
      ) : null}

      {expiring.length > 0 ? (
        <Block
          tone="muted"
          icon={<Clock className="size-4" />}
          title={t("expiringTitle", {
            count: expiring.length,
            days: EXPIRING_WINDOW_DAYS,
          })}
          /* The ladder also watches passport and licence dates; this block sees
             only contract dates, so a subject with a lapsing licence is absent. */
          note={t("expiringNote")}
          entries={expiring.slice(0, VISIBLE).map((e) => ({
            key: e.row.contractId,
            name: e.row.partyName,
            detail:
              e.daysLeft === 0 ? t("endsToday") : t("daysLeft", { days: e.daysLeft }),
            href: hrefFor(e.row),
          }))}
          more={expiring.length - VISIBLE}
          moreLabel={(n) => t("andMore", { count: n })}
        />
      ) : null}
    </div>
  );
}

function Block({
  tone,
  icon,
  title,
  note,
  entries,
  more,
  moreLabel,
}: {
  tone: "warning" | "muted";
  icon: React.ReactNode;
  title: string;
  note: string;
  entries: {
    key: string;
    name: string | null;
    detail: string;
    href: string | null;
  }[];
  more: number;
  moreLabel: (n: number) => string;
}) {
  return (
    <Card
      className={cn(
        "border-l-2",
        tone === "warning" ? "border-l-amber-500" : "border-l-border",
      )}
    >
      <CardContent className="flex flex-col gap-2.5 py-4">
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 shrink-0",
              tone === "warning" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
            )}
          >
            {icon}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm font-medium leading-snug">{title}</p>
            <p className="text-xs leading-snug text-muted-foreground">{note}</p>
          </div>
        </div>
        <ul className="flex flex-col gap-1 pl-7">
          {entries.map((e) => (
            <li key={e.key} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{e.name ?? "—"}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs tabular-nums text-muted-foreground">{e.detail}</span>
                {e.href ? (
                  <Link
                    href={e.href}
                    className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                  >
                    {/* Label lives in the row, not the block: "open" for an unsigned
                        contract and "open" for an expiring one go to the same screen,
                        where the right action is chosen with full context. */}
                    <ArrowRight className="size-3" />
                  </Link>
                ) : null}
              </span>
            </li>
          ))}
          {more > 0 ? (
            <li className="text-xs text-muted-foreground">{moreLabel(more)}</li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Add the i18n keys, both locales**

The `expiringNote` copy is load-bearing — it is constraint 4. Do not shorten it into "expiring soon".

```json
// messages/en.json — under "contracts"
"attention": {
  "unsignedTitle": "{count, plural, one {# contract sent, no response} other {# contracts sent, no response}}",
  "unsignedNote": "Nothing chases these automatically. The subject was notified once, when the contract was sent.",
  "sentDaysAgo": "{days, plural, =0 {sent today} one {sent # day ago} other {sent # days ago}}",
  "expiringTitle": "{count, plural, one {# contract ends within {days} days} other {# contracts end within {days} days}}",
  "expiringNote": "Contract end dates only. A passport or licence that lapses sooner also ends cover, and is shown on the subject's Documents page.",
  "daysLeft": "{days, plural, one {# day left} other {# days left}}",
  "endsToday": "ends today",
  "andMore": "{count, plural, one {and # more} other {and # more}}"
}
```
```json
// messages/de.json — under "contracts"
"attention": {
  "unsignedTitle": "{count, plural, one {# Vertrag gesendet, keine Antwort} other {# Verträge gesendet, keine Antwort}}",
  "unsignedNote": "Diese werden nicht automatisch nachverfolgt. Die betroffene Person wurde einmal benachrichtigt, beim Senden.",
  "sentDaysAgo": "{days, plural, =0 {heute gesendet} one {vor # Tag gesendet} other {vor # Tagen gesendet}}",
  "expiringTitle": "{count, plural, one {# Vertrag endet innerhalb von {days} Tagen} other {# Verträge enden innerhalb von {days} Tagen}}",
  "expiringNote": "Nur Vertragsenddaten. Ein früher ablaufender Pass oder eine Lizenz beendet die Deckung ebenfalls und wird auf der Dokumentenseite der Person angezeigt.",
  "daysLeft": "{days, plural, one {noch # Tag} other {noch # Tage}}",
  "endsToday": "endet heute",
  "andMore": "{count, plural, one {und # weiterer} other {und # weitere}}"
}
```

- [ ] **Step 4: Verify parity and ICU syntax**

Run the parity script from Phase 1 Close Task 2 Step 4, then:

Run: `npx tsc --noEmit && npm run build`

Expected: both clean. A malformed ICU plural fails at render, not at build, so also confirm in Task 3
Step 6 once the blocks are mounted — a `{count, plural …}` with a nested `{days}` argument is the
most likely place to get it wrong.

- [ ] **Step 5: Commit**

```bash
git add components/contracts/attention-blocks.tsx messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
feat(contracts): unsigned and expiring blocks above the registry

The unsigned block is the reason this page exists. Nothing on the backend
chases a sent contract, so an admin who does not look here does not know.

The expiring block's note is not decoration: the backend ladder counts down to
the earliest of cover end, passport expiry and licence expiry, and this block
sees only the first. Calling it "expiring soon" without that caveat would let
an admin read an empty block as "nobody is at risk".

Both collapse to a count past three rows, and the region renders nothing at all
when both are empty.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: The registry table, and the removal of authoring from this screen

Spec §5: this page becomes **monitoring only**. Rows link into the Docs detail, which owns every
mutation.

Phase 1 Close Task 4 migrated this screen's Renew/Terminate affordances to `phase`. Those affordances
are now **removed**, which is not wasted work: `canRenew` stays in use — the expiring block links to
the Docs detail where Renew lives, and Phase 3 and 4 have no contract-authoring surface at all. What
Task 4 bought was a screen that was correct in the interim and a tested predicate module that
outlives the buttons.

**Files:**
- Create: `components/contracts/registry-table.tsx`
- Rewrite: `app/[locale]/dashboard/contracts/page.tsx`
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: everything from Tasks 1 and 2; `useOwnerContracts`, `useWorkerContracts` from
  `hooks/use-contracts.ts` (both take `enabled`); `useHasPermission` /
  `useCurrentPermissions`; `contractPhasePresentation` from `lib/onboarding/status.ts:61`;
  `DataTableCard` **not** used here — the registry needs a phase filter and a custom row, and
  `DataTableCard` owns its own search input, which would duplicate the page's.
- Produces:
  ```tsx
  export function RegistryTable({
    rows, hrefFor, isLoading, error, phase, onPhaseChange, search, onSearchChange,
  }: { … }): React.ReactElement;
  ```

- [ ] **Step 1: Write the table component**

```tsx
// components/contracts/registry-table.tsx
"use client";

import { ChevronRight, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FilterMenu } from "@/components/ui/filter-menu";
import { Input } from "@/components/ui/input";
import { RowLink } from "@/components/ui/row-link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ErrorNotice } from "@/components/onboarding/error-notice";
import { contractPhasePresentation } from "@/lib/onboarding/status";
import type { RegistryRow } from "@/lib/contracts/registry-row";
import { CONTRACT_PHASES, type ContractPhase } from "@/lib/types/onboarding.types";
import { cn } from "@/lib/utils";

const COLUMN_COUNT = 6;
const HEAD = "text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground";

export function RegistryTable({
  rows,
  hrefFor,
  isLoading,
  error,
  phase,
  onPhaseChange,
  search,
  onSearchChange,
}: {
  rows: RegistryRow[];
  hrefFor: (row: RegistryRow) => string | null;
  isLoading: boolean;
  error: unknown;
  phase: ContractPhase | null;
  onPhaseChange: (phase: ContractPhase | null) => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const t = useTranslations("contracts");
  const tOnboarding = useTranslations("onboarding");
  const locale = useLocale();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold tracking-tight">
              {t("registryTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("registryCount", { count: rows.length })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                className="h-9 w-full pl-9 sm:w-64"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <FilterMenu
              allLabel={t("allPhases")}
              groups={[
                {
                  key: "phase",
                  label: t("columns.phase"),
                  options: CONTRACT_PHASES.map((p) => ({
                    value: p,
                    label: tOnboarding(`phase.${p}`),
                  })),
                },
              ]}
              values={{ phase: phase ?? "" }}
              onChange={(_, value) =>
                onPhaseChange(value === "" ? null : (value as ContractPhase))
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <div className="px-5 py-4">
            <ErrorNotice error={error} />
          </div>
        ) : null}
        {/* Proportional widths so the row spreads at any viewport instead of
            pooling every spare pixel into one column. */}
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(HEAD, "w-[26%]")}>{t("columns.subject")}</TableHead>
              <TableHead className={cn(HEAD, "w-[24%]")}>{t("columns.period")}</TableHead>
              <TableHead className={cn(HEAD, "w-[16%]")}>{t("columns.phase")}</TableHead>
              <TableHead className={cn(HEAD, "w-[17%]")}>{t("columns.sent")}</TableHead>
              <TableHead className={cn(HEAD, "w-[17%]")}>{t("columns.signed")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell colSpan={COLUMN_COUNT} className="py-3">
                    <Skeleton className="h-8 w-full rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={COLUMN_COUNT}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {/* A filtered-empty table must not read as "no contracts exist". */}
                  {search || phase ? t("emptyFiltered") : t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const p = contractPhasePresentation(r.phase);
                const href = hrefFor(r);
                return (
                  <TableRow
                    key={r.contractId}
                    className={cn("relative", href && "cursor-pointer hover:bg-accent/40")}
                  >
                    <TableCell className="py-2.5">
                      {href ? <RowLink href={href} label={r.partyName ?? undefined} /> : null}
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-medium leading-none" title={r.partyName ?? undefined}>
                          {r.partyName ?? "—"}
                        </span>
                        <span
                          className="truncate text-xs leading-none text-muted-foreground"
                          title={r.partyEmail ?? undefined}
                        >
                          {r.partyEmail ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-sm tabular-nums">
                      {fmt(r.eligibleFrom, locale)} — {fmt(r.eligibleTo, locale)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant={p.variant} className={p.className}>
                        {tOnboarding(`phase.${p.labelKey}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 text-sm tabular-nums text-muted-foreground">
                      {r.sentAt ? fmt(r.sentAt, locale) : "—"}
                    </TableCell>
                    <TableCell className="py-2.5 text-sm tabular-nums text-muted-foreground">
                      {r.signedAt ? fmt(r.signedAt, locale) : "—"}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      {href ? (
                        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * Named month, not all-numeric. `toLocaleDateString("en")` gives `02/28/2026`,
 * and a month-first date in a German-market product is genuinely ambiguous — an
 * operator reading a contract boundary cannot tell `02/28` from `28/02` without
 * knowing which locale rendered it.
 */
function fmt(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}
```

- [ ] **Step 2: Confirm the phase label keys exist for all seven phases**

```bash
node -e "
const en=require('./messages/en.json');
const phases=['Draft','Sent','Scheduled','InForce','Lapsed','Expired','Terminated'];
const have=Object.keys(en.onboarding?.phase??{});
console.log('have:',have.join(','));
const missing=phases.filter(p=>!have.includes(p));
console.log(missing.length?'MISSING: '+missing.join(','):'ALL SEVEN PRESENT');
"
```

Expected: `ALL SEVEN PRESENT`. If keys are named by a `labelKey` that differs from the phase member
(check `lib/onboarding/status.ts:61`), the filter's `tOnboarding(\`phase.${p}\`)` call must use the
same mapping the badge uses — one of the two will otherwise render missing-key text. Reconcile before
continuing; this is Assumption Ledger entry AL-1.

- [ ] **Step 3: Rewrite the page as a thin composition**

```tsx
// app/[locale]/dashboard/contracts/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttentionBlocks } from "@/components/contracts/attention-blocks";
import { RegistryTable } from "@/components/contracts/registry-table";
import { useOwnerContracts, useWorkerContracts } from "@/hooks/use-contracts";
import { useHasPermission } from "@/hooks/use-current-permissions";
import {
  ownerRegistryRow,
  workerRegistryRow,
  type RegistryRow,
} from "@/lib/contracts/registry-row";
import {
  filterByPhase,
  searchRows,
  sortByCreatedDesc,
} from "@/lib/contracts/registry-select";
import type { ContractPhase } from "@/lib/types/onboarding.types";

type Side = "owner" | "worker";

/**
 * Oversight only. Spec §5: actions live in the Docs workspace, oversight lives
 * here, and a row's job is to carry the admin there with the phase already
 * understood. This page has no mutations — no create, no renew, no terminate.
 */
export default function ContractsPage() {
  const t = useTranslations("contracts");

  const canReadOwner = useHasPermission("owner_contract:read_any");
  const canReadWorker = useHasPermission("worker_contract:read_any");

  // Default to whichever side the admin may actually read, so a worker-only
  // moderator does not open onto an empty owner tab.
  const [side, setSide] = useState<Side>(canReadOwner ? "owner" : "worker");
  const [phase, setPhase] = useState<ContractPhase | null>(null);
  const [search, setSearch] = useState("");

  // `enabled` keeps an admin without the permission from provoking a 403, which
  // would also force a permission refetch via lib/http/on-forbidden.ts.
  const ownerQuery = useOwnerContracts(canReadOwner);
  const workerQuery = useWorkerContracts(canReadWorker);
  const query = side === "owner" ? ownerQuery : workerQuery;

  const allRows = useMemo<RegistryRow[]>(
    () =>
      side === "owner"
        ? (ownerQuery.data ?? []).map(ownerRegistryRow)
        : (workerQuery.data ?? []).map(workerRegistryRow),
    [side, ownerQuery.data, workerQuery.data],
  );

  const rows = useMemo(
    () => sortByCreatedDesc(searchRows(filterByPhase(allRows, phase), search)),
    [allRows, phase, search],
  );

  // The attention blocks read the UNFILTERED set on purpose: a phase filter of
  // "InForce" must not hide the fact that three contracts are sitting unsigned.
  const hrefFor = (r: RegistryRow) =>
    side === "owner"
      ? r.partyProfileId
        ? `/dashboard/owner-documents/${r.partyProfileId}`
        : null
      : `/dashboard/worker-documents/${r.partyId}`;

  const bothTabs = canReadOwner && canReadWorker;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {bothTabs ? (
        <Tabs value={side} onValueChange={(v) => setSide(v as Side)}>
          <TabsList>
            <TabsTrigger value="owner">{t("ownerTab")}</TabsTrigger>
            <TabsTrigger value="worker">{t("workerTab")}</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      <AttentionBlocks rows={allRows} hrefFor={hrefFor} />

      <RegistryTable
        rows={rows}
        hrefFor={hrefFor}
        isLoading={query.isLoading}
        error={query.error}
        phase={phase}
        onPhaseChange={setPhase}
        search={search}
        onSearchChange={setSearch}
      />
    </div>
  );
}
```

- [ ] **Step 4: Add the remaining i18n keys, both locales**

```json
// messages/en.json — under "contracts" (keep existing keys; add these)
"subtitle": "Who was sent a contract, who signed, and whose cover runs out. Author and renew from the Documents pages.",
"registryTitle": "All contracts",
"registryCount": "{count, plural, one {# contract} other {# contracts}}",
"allPhases": "All phases",
"empty": "No contracts have been authored yet.",
"emptyFiltered": "No contracts match this filter.",
"columns": {
  "subject": "Subject",
  "period": "Period",
  "phase": "Phase",
  "sent": "Sent",
  "signed": "Signed"
}
```
```json
// messages/de.json — under "contracts"
"subtitle": "Wer einen Vertrag erhalten hat, wer signiert hat und wessen Deckung ausläuft. Erstellen und verlängern auf den Dokumentenseiten.",
"registryTitle": "Alle Verträge",
"registryCount": "{count, plural, one {# Vertrag} other {# Verträge}}",
"allPhases": "Alle Phasen",
"empty": "Es wurden noch keine Verträge erstellt.",
"emptyFiltered": "Keine Verträge entsprechen diesem Filter.",
"columns": {
  "subject": "Person",
  "period": "Zeitraum",
  "phase": "Phase",
  "sent": "Gesendet",
  "signed": "Signiert"
}
```

Reuse the existing `contracts.title`, `contracts.ownerTab`, `contracts.workerTab` and
`contracts.searchPlaceholder` if present; add only what is missing. Remove any key the deleted
authoring UI owned — `active`, `inactive`, and the create/renew/deactivate dialog copy — but only
after Task 5 confirms nothing else reads them.

- [ ] **Step 5: Run every gate**

Run: `npm run test && npx tsc --noEmit && npm run lint && npm run build`

Expected: all clean, lint exit 0.

- [ ] **Step 6: Look at the screen, and force the ICU plurals to render**

Run: `npm run dev`, open `/en/dashboard/contracts` and `/de/dashboard/contracts`.

Without live data the table is empty and **the attention blocks never mount**, so the ICU plurals
from Task 2 stay unrendered — a malformed one would ship silently. Force them: temporarily hardcode
a small array of `RegistryRow` literals in the page (one `Sent` row with `sentAt` 12 days back, one
`InForce` row ending in 4 days, one ending today, one `Terminated`), confirm every string renders in
both locales with no missing-key text and no raw `{count}`, then **delete the literals before
committing**.

Check specifically:
- singular vs plural on `unsignedTitle` at 1 and 2 rows
- `sentDaysAgo` at `=0` (today), 1, and 12
- `expiringTitle`'s nested `{days}` argument renders `30`, not `{days}`
- `Terminated` renders as *ended early*, never *expired* — constraint 2

Record the outcome. If a literal cannot be added safely, this step is incomplete and becomes
Assumption Ledger entry AL-2.

- [ ] **Step 7: Commit**

```bash
git add components/contracts/registry-table.tsx app/\[locale\]/dashboard/contracts/page.tsx messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
feat(contracts): the registry becomes oversight, not authoring

Spec §5: actions in one place, oversight in another. Create, renew and
terminate leave this screen — every row now links into the Docs detail, which
already owns those mutations along with their permissions and invalidation.

The attention blocks read the unfiltered row set on purpose. Filtering to
InForce must not hide three contracts sitting unsigned.

Both list queries pass `enabled` from the caller's permission, so an admin who
holds one side and not the other sees one tab rather than a 403 — which would
also have forced a permission refetch.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: The Settings Contract category

Phase 1 Close gave booleans a `Switch` and made the 409 link land on a highlighted row. This task
gives the remaining six keys the right control and the right words — and corrects one description
that the backend itself gets wrong.

Spec §6 table, verbatim on the one that matters (`:591`): `onboarding.expiry.block_days` moves
**only the final admin alert**. The 24-hour booking-creation stop is a separate hardcoded constant in
the booking engine. **The setting's server-side description claims otherwise and is wrong — the UI
must not repeat it.**

**Files:**
- Create: `lib/settings/contract-settings.ts`
- Modify: `app/[locale]/dashboard/settings/page.tsx`
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: `SystemSettingDto` from `lib/services/setting.service.ts`.
- Produces:
  ```ts
  export type SettingControl = "switch" | "number" | "csv" | "template";
  export interface SettingSpec {
    key: string;
    control: SettingControl;
    /** i18n key under `settings.contract.*` — overrides the server description. */
    copyKey: string;
    /** True where the server's own description is known to be wrong. */
    overridesServer: boolean;
  }
  export const CONTRACT_SETTINGS: SettingSpec[];
  export function specFor(key: string): SettingSpec | undefined;
  ```

- [ ] **Step 1: Write the spec module**

```ts
// lib/settings/contract-settings.ts

export type SettingControl = "switch" | "number" | "csv" | "template";

export interface SettingSpec {
  key: string;
  control: SettingControl;
  /** i18n key under `settings.contract.*`. Replaces the server's description. */
  copyKey: string;
  /**
   * True where the server's own description is known to be wrong, not merely
   * terse. Rendering it would actively mislead.
   */
  overridesServer: boolean;
}

/**
 * The seven contract-category settings, from spec §6.
 *
 * Descriptions are written here rather than taken from the API for two reasons.
 * `GET /api/admin/permissions` and the settings table both ship English-or-null
 * descriptions, so a German admin would read English; and one description is
 * factually wrong (see `block_days`).
 */
export const CONTRACT_SETTINGS: SettingSpec[] = [
  {
    // Seeded false. While false, EVERY send returns 409 — this one switch gates
    // the entire contract flow for the whole product.
    key: "contract.template.approved",
    control: "switch",
    copyKey: "templateApproved",
    overridesServer: false,
  },
  {
    key: "contract.template.owner.en",
    control: "template",
    copyKey: "templateOwner",
    overridesServer: false,
  },
  {
    key: "contract.template.worker.en",
    control: "template",
    copyKey: "templateWorker",
    overridesServer: false,
  },
  {
    key: "onboarding.expiry.warn_days",
    control: "csv",
    copyKey: "warnDays",
    overridesServer: false,
  },
  {
    key: "onboarding.expiry.daily_from_days",
    control: "number",
    copyKey: "dailyFromDays",
    overridesServer: false,
  },
  {
    key: "onboarding.expiry.ticket_days",
    control: "number",
    copyKey: "ticketDays",
    overridesServer: false,
  },
  {
    // ⚠ The server's description says this moves the booking-creation stop. It
    // does not. It moves only the final admin alert; the 24-hour booking stop is
    // a private constant in the booking engine (spec §6). Repeating the server
    // text would tell an admin they can widen a window they cannot touch.
    key: "onboarding.expiry.block_days",
    control: "number",
    copyKey: "blockDays",
    overridesServer: true,
  },
];

const BY_KEY = new Map(CONTRACT_SETTINGS.map((s) => [s.key, s]));

export function specFor(key: string): SettingSpec | undefined {
  return BY_KEY.get(key);
}
```

- [ ] **Step 2: Use the spec in the Settings page**

The page already groups by key prefix, so both `contract.*` and `onboarding.*` categories exist
already. Two changes:

First, prefer the local copy over the server description. Where the row renders
`{s.description || humanize(s.key)}` (`:220`):

```tsx
const spec = specFor(s.key);
const label = spec
  ? tContract(`${spec.copyKey}.label`)
  : s.description || humanize(s.key);
const help = spec ? tContract(`${spec.copyKey}.help`) : null;
```

Render `help` as a second line beneath the key/date line, and where `spec.overridesServer` is true
also render a small note that the server's own description is inaccurate — an admin comparing the two
deserves to know which to trust:

```tsx
{help ? (
  <span className="text-xs leading-snug text-muted-foreground">{help}</span>
) : null}
{spec?.overridesServer ? (
  <span className="text-[11px] leading-snug text-amber-700 dark:text-amber-400">
    {tContract("serverDescriptionWrong")}
  </span>
) : null}
```

Second, route the control by `spec.control`, falling back to the existing generic branches for any
key without a spec. `switch` is already handled by Phase 1 Close Task 5's `isBoolean` branch — keep
that branch and let the spec agree with it rather than duplicating the logic. `template` forces the
prose textarea regardless of current length, because an empty template is still a template:

```tsx
const prose = spec?.control === "template" || isProse(s.value);
```

`number` and `csv` keep the existing single-line input. Do **not** add client-side numeric validation
here: these are free-form system settings and a wrong value is a server concern, not a form concern.

- [ ] **Step 3: Add the copy, both locales**

```json
// messages/en.json — under "settings"
"contract": {
  "serverDescriptionWrong": "The description stored on the server is inaccurate for this setting. The text above is correct.",
  "templateApproved": {
    "label": "Contract sending enabled",
    "help": "While this is off, every attempt to send a contract fails. No contract can reach any owner or worker until it is on. Turning it on is a deliberate one-time act."
  },
  "templateOwner": {
    "label": "Owner contract template",
    "help": "The body used to generate owner contracts. {token} placeholders are filled in per contract."
  },
  "templateWorker": {
    "label": "Worker contract template",
    "help": "The body used to generate worker contracts. Contains no commission clause."
  },
  "warnDays": {
    "label": "Expiry warning days",
    "help": "Comma-separated. A warning goes out this many days before cover ends — counted to the earliest of the contract end, the passport expiry, and the licence expiry."
  },
  "dailyFromDays": {
    "label": "Daily reminders from",
    "help": "Inside this many days of the end, reminders repeat every day instead of only on the rungs above."
  },
  "ticketDays": {
    "label": "Automatic ticket opens at",
    "help": "A support ticket is opened automatically this many days before cover ends."
  },
  "blockDays": {
    "label": "Final admin alert at",
    "help": "The last alert to admins goes out this many days before cover ends. This does not change when bookings stop being accepted — that limit is fixed in the booking engine and cannot be configured here."
  }
}
```
```json
// messages/de.json — under "settings"
"contract": {
  "serverDescriptionWrong": "Die auf dem Server gespeicherte Beschreibung ist für diese Einstellung nicht korrekt. Der Text oben ist richtig.",
  "templateApproved": {
    "label": "Vertragsversand aktiviert",
    "help": "Solange dies aus ist, schlägt jeder Versuch, einen Vertrag zu senden, fehl. Kein Vertrag erreicht einen Eigentümer oder Mitarbeiter, bevor dies eingeschaltet ist. Das Einschalten ist eine bewusste, einmalige Handlung."
  },
  "templateOwner": {
    "label": "Vertragsvorlage Eigentümer",
    "help": "Der Text, aus dem Eigentümerverträge erzeugt werden. {token}-Platzhalter werden pro Vertrag ersetzt."
  },
  "templateWorker": {
    "label": "Vertragsvorlage Mitarbeiter",
    "help": "Der Text, aus dem Mitarbeiterverträge erzeugt werden. Enthält keine Provisionsklausel."
  },
  "warnDays": {
    "label": "Vorwarnzeit in Tagen",
    "help": "Kommagetrennt. Eine Warnung wird so viele Tage vor Ende der Deckung versendet — gerechnet bis zum frühesten Datum aus Vertragsende, Passablauf und Lizenzablauf."
  },
  "dailyFromDays": {
    "label": "Täglich erinnern ab",
    "help": "Innerhalb dieser Anzahl Tage vor dem Ende wird täglich erinnert, nicht nur an den oben genannten Stufen."
  },
  "ticketDays": {
    "label": "Automatisches Ticket ab",
    "help": "So viele Tage vor Ende der Deckung wird automatisch ein Support-Ticket eröffnet."
  },
  "blockDays": {
    "label": "Letzte Admin-Warnung bei",
    "help": "Die letzte Warnung an Admins geht so viele Tage vor Ende der Deckung raus. Dies ändert nicht, ab wann keine Buchungen mehr angenommen werden — diese Grenze ist im Buchungssystem fest hinterlegt und hier nicht konfigurierbar."
  }
}
```

- [ ] **Step 4: Parity, then gates**

Run the parity script, then: `npm run test && npx tsc --noEmit && npm run lint && npm run build`

Expected: `PARITY OK` and all gates clean.

- [ ] **Step 5: Verify in the browser as far as the environment allows**

Run: `npm run dev`, open `/de/dashboard/settings`.

If the environment returns any of the seven keys, confirm the German label and help text render and
the `block_days` row carries the amber note. **If none of the seven keys exist locally, none of this
renders** — that is Assumption Ledger entry AL-3, and it is the same cluster Phase 1 Close flagged.
Do not create settings on a shared server to make the screen testable.

- [ ] **Step 6: Commit**

```bash
git add lib/settings/contract-settings.ts app/\[locale\]/dashboard/settings/page.tsx messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
feat(settings): the Contract category gets real copy, and one correction

Descriptions come from the app, not the API, for two reasons. The settings
table ships English-or-null descriptions, so a German admin read English. And
onboarding.expiry.block_days has a server description that is simply wrong: it
claims to move the booking-creation stop, which is a fixed constant in the
booking engine. Repeating it would tell an admin they can widen a window they
cannot touch, so that row carries an explicit note that the stored description
is inaccurate.

Templates force the textarea regardless of current length — an empty template
is still a template, and a single-line input strips the newlines out of one.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Delete the retired authoring surface

**Files:**
- Delete: `components/contracts/contract-form-dialog.tsx`
- Modify: `hooks/use-contracts.ts` — remove mutation hooks with no remaining consumer
- Modify: `messages/en.json`, `messages/de.json` — remove the dialog's dead keys

**Interfaces:**
- Consumes: nothing.
- Produces: a smaller `hooks/use-contracts.ts`. **Check before deleting** — the Docs detail pages own
  authoring now and may use these same hooks.

- [ ] **Step 1: Find every consumer before deleting anything**

```bash
rg -n 'contract-form-dialog|ContractFormDialog' --glob '!docs/**' .
rg -n 'useCreateOwnerContract|useCreateWorkerContract|useRenewOwnerContract|useRenewWorkerContract|useDeactivateOwnerContract|useDeactivateWorkerContract' --glob '!docs/**' .
```

The Docs detail pages (`owner-documents/[ownerProfileId]/page.tsx`,
`worker-documents/[workerId]/page.tsx`) almost certainly consume the create and renew hooks — they
own contract authoring. **Only hooks with zero consumers after the registry rewrite may be deleted.**
Write the consumer list into the commit body.

- [ ] **Step 2: Delete the dialog if and only if it has no consumer**

```bash
git rm components/contracts/contract-form-dialog.tsx
```

If the Docs detail still imports it, **stop**: the dialog is live and this task reduces to removing
the registry's own imports. Record that outcome instead of forcing the deletion — spec §12's
`fileUrl` presign fix lives in that file (`:67`, `useUpload("contract-sources")`), and deleting a
file that is still mounted would take the fix with it.

- [ ] **Step 3: Remove only the orphaned hooks**

For each hook Step 1 proved has no consumer, delete it from `hooks/use-contracts.ts`. Leave
`useOwnerContracts` / `useWorkerContracts` and their `enabled` argument — the registry depends on
both.

- [ ] **Step 4: Remove the dialog's dead i18n keys**

```bash
rg -n 'contracts\.(active|inactive|createTitle|renewTitle|deactivate)' --glob '!messages/*' --glob '!docs/**' .
```

Delete from both locales only the keys this returns nothing for. `active`/`inactive` are the two the
old `isActive` badge owned and are the most likely to be genuinely dead now.

- [ ] **Step 5: Gates**

Run: `npm run test && npx tsc --noEmit && npm run lint && npm run build`

Expected: all clean. `tsc` is the real gate here — a deleted export with a surviving import fails
compilation, which is exactly the safety net this task wants.

- [ ] **Step 6: Commit**

```bash
git add -A components/contracts hooks/use-contracts.ts messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
refactor(contracts): remove the authoring surface the registry no longer has

Consumers were enumerated before anything was deleted; the list is below. Hooks
still used by the Docs detail pages stay — authoring moved there, it did not
disappear.

<paste the rg output from Step 1 here>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Phase gate

- [ ] **Step 1: Full gate**

```bash
npm run test && npx tsc --noEmit && npm run lint && npm run build && npm run verify:api
```

Expected: tests green, `tsc` 0, **lint 0**, build compiles, `verify:api` `ALL PASS` on the public half.

- [ ] **Step 2: Confirm no mutation survives on the registry**

```bash
rg -n 'useMutation|useCreate|useRenew|useDeactivate|isActive' app/\[locale\]/dashboard/contracts/ components/contracts/registry-table.tsx components/contracts/attention-blocks.tsx
```

Expected: no output. Spec §5's rule is the deliverable, and this is how it is checked.

- [ ] **Step 3: Run the `simplify` skill over the phase diff**

Reuse/altitude/duplication pass, not a bug hunt. `fmt()` in `registry-table.tsx` and `formatDate()`
in `subject-docs-table.tsx` are the same function with the same rationale comment — that duplication
is the first thing to resolve, into `lib/format/date.ts`.

- [ ] **Step 4: Update the roadmap and INTEGRATION.md**

Mark Phase 2 complete. Keep the G5 waiver visible — it is not discharged by this phase. Add the
`EXPIRING_WINDOW_DAYS` constant to `INTEGRATION.md`'s hardcoded-values table; it is a third copy of
the same `onboarding.expiry.warn_days` ladder, alongside the Owner app's and
`lib/onboarding/subject-row.ts`'s.

- [ ] **Step 5: Commit and open the PR**

The PR body must state that no contract row has ever been rendered from live data by this screen.

---

## Assumption Ledger — verify when G2 lands

| # | Assumption | Depends on it | Breaks how |
|---|---|---|---|
| **AL-1** | `contractPhasePresentation`'s `labelKey` equals the `ContractPhase` member name, so the badge and the phase filter resolve the same i18n key. Task 3 Step 2 checks the message file but cannot check the mapping at runtime. | Registry badge + phase filter | One of the two renders missing-key text for some phases; the filter may list options that never match |
| **AL-2** | Task 3 Step 6's temporary literals were actually added and the ICU plurals rendered. If that step was skipped, **no attention-block string has ever been rendered.** | Every string in `contracts.attention.*` | A malformed nested `{days}` inside a plural throws at render — the block crashes the page the first time a real unsigned contract exists |
| **AL-3** | The seven `contract.*` / `onboarding.expiry.*` keys exist in the settings table. If absent, the whole Contract category and all its copy are unreachable. | Task 4 entirely | Silent: the category simply does not appear, and the Phase 1 deep link lands on nothing |
| **AL-4** | `sentAt` is populated on every `Sent` row. The selector tolerates null by sorting it last, but if null is the *norm* the unsigned block's ordering is meaningless. | `findUnsigned` ordering | Longest-waiting-first degrades to arbitrary order — the block still shows the right rows |
| **AL-5** | `GET /api/contracts/admin/{side}` really is unpaginated. Backend ask #8 asks for a commitment. | Every selector, both blocks | If it is ever paginated, blocks silently under-report — an unsigned contract on page 2 is invisible, which is the exact failure the page exists to prevent |
| **AL-6** | A subject can hold both an `Expired` and a `Terminated` row from one document lapse (spec §5 `:566`). Never observed. | Constraint 2 rendering | Two rows for one subject may read as duplicate data rather than as two periods retired on their own dates |
| **AL-7** | The Docs detail routes accept the ids `hrefFor` builds — `ownerProfileId` for owners, worker id for workers. | Every row link and both blocks | Links 404. Cheap to check the moment any contract exists |
| **AL-8** | `FilterMenu`'s single-select is sufficient. True for Phase 2; Phase 3 needs multi-select and ranges and will have to extend it. | Task 3 | None here — recorded so Phase 3 does not rediscover it |

**AL-2 and AL-5 are the dangerous pair.** AL-2 can crash the page the first time it has real data to
show, and AL-5 makes the page quietly lie. If one live check is possible, fetch
`GET /api/contracts/admin/owner` and confirm two things: the response is a bare array rather than a
`PagedResult` envelope, and at least one row's `sentAt` is populated.
</content>
