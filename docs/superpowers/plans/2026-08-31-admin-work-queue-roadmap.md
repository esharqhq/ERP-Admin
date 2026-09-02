# Admin work queue — program roadmap

**Written 2026-08-31**, from the five items the user named, against backend `f3a2334` (pulled 2026-08-30).

This document decomposes the five into sub-projects, records what the survey found, and fixes the
order. **It designs none of them.** Each sub-project gets its own spec before any code — the point of
this file is that the five are not five, and that two of them are already blocked or already planned.

## The five, as asked

1. Fix the documents screens — worker and owner both.
2. The docs table built for owner, build it for worker too.
3. Rework four tables: Owner, Worker, Task, Property.
4. Walk-in full: create and manage a task with no owner — before/after, send it back if it was not
   finished, rate the worker. Everything an owner can do, the admin can do here.
5. Finish Agency.

---

## What the survey changed

### A. Items 1 and 2 are the tail of a roadmap that already exists

`docs/superpowers/plans/2026-08-27-documents-workspace-roadmap.md` runs two tracks over six phases.
**F1, F2, F4 and F5 shipped on 08-27/28. F3 and F6 did not, and the worker detail was deferred with
F3.** So:

- **Item 2 *is* F3** — the worker queue on the shell, in **server mode** (the owner queue is client
  mode; the two-mode data source in `components/ui/data-table/types.ts` exists precisely for this).
- **Item 1 is F6 plus whatever rendering found** — the guards sweep, the worker detail, and the fact
  that ⚠ **every one of F1/F2/F4/F5 shipped unrendered.** The roadmap says so four times and records
  three failed attempts to get a browser onto the screens. The user has since rendered F2 and the
  revision that followed is in the file. Item 1 needs the same pass over F4/F5 and over the worker side.

**Neither needs a new spec.** They need that roadmap continued. What item 1 *does* need is a list of
what is actually wrong, which only the user has — see Open questions.

### B. Item 3 is one migration with six consumers, not four table reworks

The new primitive is built and **exactly one page uses it**:

| Page | Table primitive |
| --- | --- |
| `(owner)/owner-documents` | ✅ new `components/ui/data-table/` |
| `(owner)/owners` | old `data-table-card` |
| `(owner)/properties` | old `data-table-card` |
| `(worker)/workers` | old `data-table-card` |
| `(worker)/worker-documents` | old `SubjectDocsTable` + `DocsFilterBar` |
| `settings/admins` | old `data-table-card` |
| `tasks` | raw `<Table>`, no filters, no pager |

F1's own scope rule was *"do not touch `data-table-card.tsx` or migrate its four consumers — other
tables adopt it later, on their own schedule."* Item 3 **is** that later. Item 2 is the same migration
on a sixth page, which is why the two collapse into one sub-project.

Three things ride along with it, because they touch the same files and would otherwise be a second
pass over all six:

- **`onTask` → `booked`** (backend 2026-08-27). ⚠ Fails silently — `?onTask=` is now an unknown key,
  ignored, and the response is the **whole unfiltered table**. Sites in `BACKEND-REVISIONS.md`.
- **`Blocked` → `Lapsed`, plus a new real `Blocked`** (backend 2026-08-28). Worker table takes both;
  owner table takes the rename only and `?status=Blocked` there is now a `400`.
- **`buildWorkerFilterQuery` has no consumer.** Thirteen filters modelled, tested, wired to nothing —
  the workers page still filters `search` client-side over one page of 25. The migration is what
  finally connects it.

**Two DS rules deferred out of the per-page migration, because both are shell surgery:**

- **Sticky header.** §08 · Table asks for the header overline *and* "Sticky on scroll". The typography
  is right; the stickiness is absent, and it is not a one-liner. The card carries `overflow-hidden`
  (it clips the rounded corners), which makes the card the containing block for any sticky descendant
  — and the card does not scroll, so `sticky top-0` on the header would be inert. Making it work means
  revisiting the card's overflow and the `grow shrink-0` geometry F1 settled deliberately, and it moves
  every queue at once.
- **Mobile row-cards below 768px.** §08's "Mobile — no tables" forbids a horizontally scrolling table.
  The shell scrolls horizontally today. Same reason to defer: one change, every consumer.

**Server-side sort and export stay out of scope unless asked for.** `DataColumn.sortKey` exists for
server mode and nothing has ever set it; no page anywhere sends `sortBy`/`dir` and nothing calls any
export route. `BACKEND-REVISIONS.md` already rules both as *new features, not migrations*, each needing
its own spec. Two rules carried from there when they are built: the `sortBy` whitelist needs a
**default branch**, and an export must be read **by header name, not column position** — the owner
export has gone 9 → 10 → 13 columns.

### C. Item 4 is half-blocked, and the blocked half is the half that was asked for

The task state machine is `PENDING → ACTIVE → REVIEW → DONE`. "Send it back if it was not finished" is
`POST /api/tasks/{id}/reject` (REVIEW → ACTIVE). Accept is `POST /api/tasks/{id}/accept` (REVIEW → DONE).

⚠ **Both take `task:update` (110012), which is PROPERTY-scoped — resolved through `PropertyMembership`,
which admins do not have, so the resolver fails closed. There is no `task:update_any`.** The permission
registry states the principle itself at `index/permissions/registry.md:384`, explaining why
`task_group:create_any` (110038) had to be minted for walk-in in the first place.

**Consequence: a walk-in task that reaches REVIEW can never leave it.** Not to DONE, not back to ACTIVE.
The owner of record is the Walk-in / Manual Orders system account, which nobody logs into. Cancel is no
escape either — PENDING-only with a 1h cutoff, and the registry is explicit that this binds admins too
(`409 task_not_cancellable` covers ACTIVE/REVIEW/DONE/CANCELLED).

This is a **backend ask, filed below as #28**, and it should go out before we build anything else so
the backend can work in parallel.

What *is* buildable today, all of it already permissioned and partly wired:

| Capability | Permission | State here |
| --- | --- | --- |
| Rate a worker | `task_worker:rate_any` 110051 GLOBAL | ✅ wired — `lib/services/task.service.ts:141` |
| Override outcome | `task_worker:mark_outcome_any` 110053 GLOBAL | ✅ wired — `task.service.ts:154` |
| Read before/after media | `task:media:read_any` 110037 | ❌ not read anywhere |
| Unassign a worker | `task:unassign_worker_any` 110036 | ✅ wired |
| Cancel a group | `task_group:cancel_any` 110032 | ✅ wired |

⚠ **Before/after media has no handoff guide.** `TaskMedia` (`BEFORE` / `AFTER` / `VIDEO`, embedded by
`?withMedia=true` on any task or group GET) is documented **only** in `index/schemas/media.md`. Per the
precedence rule in `BACKEND-REVISIONS.md`, `index/` is backend truth, not contract: it carries no
`Revision:` date and no CHANGELOG entry, so if it changes we are not told. Building on it is a
deliberate risk to accept in writing, or a guide to request first.

### D. Item 5 depends on item 3

Agency is four merged backend cards and about six admin screens, of which **at least three are tables**
— the applications queue, the agencies list, and agency-links (whose status filter *is* the dispute
queue). Built before item 3 they are three more consumers of the old primitive to migrate later.

⚠ **The nav already points at two routes that do not exist.** `lib/nav-items.ts:93-101` ships an
"Agency" group with `/dashboard/agency-requests` and `/dashboard/agencies`; neither is in `app/`. Today
the sidebar has two links that 404.

Backend is ready and complete (F-05·0 #104, F-05c #106, F-05a #110, F-05b #112 — all merged, all guides
`status: current`). Two contract facts that shape the screens more than anything visual:

- **Approve does not open access.** It creates the login. `PUT /api/agencies/{id}` writes `signedOn` /
  `validUntil`, and *that* is the moment access opens — the dates are re-read on **every portal
  request**, so moving `validUntil` ends a partner's access within one request.
- **F-05b's portal is not ours.** Its `Consumers:` lists `admin-panel`, but the guide is explicit that
  it is a **new client** and that the admin panel is the wrong audience. Out of scope; do not let it
  swell item 5.

### E. Not on the list, and worth a decision

**F-06a Skill Requests** — a worker asks for a skill, an admin decides. Merged 08-25 (PR #114), full
admin surface waiting: `GET /api/admin/worker-skill-requests` (queue), `/{id}` (detail),
`request-info` / `reject` / `approve` / `revoke`. Nothing built. It is a single self-contained queue in
the shape F-05a already documents, so it is the cheapest real feature available. Left out of the five
deliberately or by oversight — the user decides.

---

## Decomposition and order

**0 first, on its own, because it is broken now.**

| # | Sub-project | Was | Depends on | Size |
| --- | --- | --- | --- | --- |
| **0** | Walk-in `lat`/`long` | — | — | XS |
| **0b** | File asks #28–#30 | — | — | XS, no code |
| **1** | Table platform: six pages onto `DataTable` + the two renames + wire `buildWorkerFilterQuery` | items 2 + 3 | — | L, but one shape ×6 |
| ↳ 1a | — Owners — **✅ done 2026-08-31**, see the section below | | | |
| ↳ 1b | — Properties — **✅ done 2026-08-31**, see the section below | | | |
| ↳ 1c | — Workers, **Table state** — **✅ done 2026-09-01**, see `2026-09-01-workers-table-state.md`. Carries the `onTask` → `booked` rename and the 22 filters. ⚠ The **Matrix** half of that screen is a separate phase and is not built. | | | |
| ↳ 1d | — Workers, **Matrix state** — code complete 2026-09-01, see `2026-09-01-workers-matrix-state.md`. Replaces the old Calendar view and keeps its assign flow. ⚠ **Unrendered** — not closed. | | | |
| **2** | Docs workspace tail: F3 worker queue, worker detail, F6 guards, and the render sweep | item 1 | shares F3 with #1 | M |
| **3** | Agency: applications queue, detail, three verbs, agency edit, agency-links, worker-detail block | item 5 | #1 | L |
| **4** | Walk-in parity, buildable half: before/after media, rating, outcome override | item 4 | #0b for accept/reject | M |
| **5** | *(optional)* Skill Requests queue | — | #1 | S |

### Why this order

**#0 now.** `POST /api/tasks/admin/groups` against the walk-in property has returned
`400 walkin_location_required` since 2026-08-26 (F-06c) unless the body carries `lat` and `long`.
`CreateTaskGroupRequest` (`lib/types/task.types.ts:95-113`) has no location field and
`components/walk-in/` has no address input. **The walk-in form cannot file an order.** We are on
`feat/walk-in-job-management`; this is that branch's bug.

**#0b before #4, not with it.** #28 is the only hard blocker in the whole queue. Filed now, the backend
can answer it while we do #1.

**#1 before #3.** Agency brings three tables. On the old primitive that is three migrations owed; on the
new one it is three registrations. #1 also carries the two silent backend renames, and `onTask` returning
an unfiltered table is the kind of bug nobody reports because the screen looks fine.

**#2 overlaps #1 at F3** — the worker docs queue is both "the sixth consumer" and "F3". Build it once,
inside #1, and #2 keeps the worker *detail*, F6 and the render sweep.

**#4 last of the required four** because its centre — send it back — is not ours to build yet.

---

## 1a · Owners on the shell — done 2026-08-31

The first of the six. Decided in session by the user: **three-row toolbar** (not §08's single row —
seven filter dimensions have never fitted one), **no selection or bulk bar** (kept cut with Export),
**mobile row-cards deferred**.

Shipped:

| File | What changed |
| --- | --- |
| `app/[locale]/dashboard/(owner)/owners/page.tsx` | Rewritten on `DataTable`, **server mode**. Tabs moved inside the card as `StageTabs`; the filter drawer became the in-card band; the bespoke skeleton, error card and `TablePagination` gave way to the shell's own. |
| `components/ui/data-table/table-states.tsx` | `ROW_HEIGHT` 52/40 → **56/44**, the DS's two heights. Compact was sitting exactly on the "never below 40px" floor. Moves every queue on the shell. |
| `lib/types/onboarding.types.ts` | `ACCOUNT_STATUS_FILTERS` → `Lapsed`; new `WORKER_STATUS_FILTERS` adds `Blocked`. Two lists, because one union would make the owner-side `400` spellable. |
| `lib/types/{owner,worker}.types.ts` | `WorkerListQuery.status` retyped; both `status` doc comments corrected. |
| `hooks/use-table-url-state.ts` | New `setFilters(patch)` — several filters in one write. |
| `components/ui/filter-bar.tsx` | **Bug fix, see below.** |

**Eight columns registered, seven visible** (§08 caps at seven): `joined` ships `defaultVisible: false`
and lives in the picker. Numbers, dates and phone are mono; the two counts are right-aligned.
`—` is kept where §08 draws `–` — the rule is *"never blank"*, which is satisfied, and the em dash is
what the rest of this app uses.

**No sorting.** Setting `sortKey` would make this the app's first `sortBy`/`dir` consumer, which
`BACKEND-REVISIONS.md` classes as a feature needing its own spec (and a default branch for an unknown
key). Headers are inert rather than offering a sort that would order one page.

### ⚠ A live crash found on the way, unrelated to this migration

`FilterChips` called `summarize()`, **a function that does not exist** — a `ReferenceError` the moment
any filter was set. `git log -S` puts its removal in `a51a3f2 "Set"`, the most recent commit on this
branch: `summarize` was split into `describeField` and the call site was not moved with it. `tsc`
catches it, so nothing type-checked after that commit.

It was **not latent**. The old owners page rendered `<FilterChips>` directly whenever a filter was set,
and `data-table.tsx:358` renders it too — so applying a filter crashed the owners screen, and would
have crashed the documents queue's band the first time anyone opened it. Fixed by calling
`describeField` and joining the two halves with a colon, which is what the split's own comment says the
plain chip should do.

### The filter band, reworked after the user rendered it — 2026-08-31

The band did not match the design in four places. Found by opening the page, not by any gate.

| Design (`Uyer-Admin-Documents-Detail.dc.html:182-245`) | Was | Now |
| --- | --- | --- |
| `repeat(4,1fr)` | `repeat(auto-fit,minmax(11rem,1fr))` — six or seven cells crammed into one row on a dashboard-width card | `sm:grid-cols-2 lg:grid-cols-4` |
| Preset pills + mono `YYYY-MM-DD → YYYY-MM-DD` | two raw `<input type="date">` | `components/ui/date-range-field.tsx` |
| Mono bounds | body face | `font-mono` on `BARE_INPUT` too |
| Ground `#F8FAFC` | `bg-muted/30` | unchanged — within the "don't chase every hex" rule |

⚠ **The native date input was not merely off-system.** `<input type="date">` prints in the **browser's**
locale, not the page's, so a German admin on an en-US browser read `mm/dd/yy` on a German screen — the
same class of defect as `055ccf1`'s hardcoded German weekday list, in the other direction. CSS cannot
reach the format. The replacement prints the wire's own `YYYY-MM-DD`, which is unambiguous in both
languages, and reuses `lib/tasks/month-grid` — `monthGrid`, `weekdayLabels(locale)`, `shiftMonth` — so
there is still one month implementation in the app.

`lib/ui/date-range.ts` (+15 tests) holds the preset arithmetic. Two decisions in it:

- **"7 d" is today and the six before it** — seven calendar days. Anchoring at `today - 7` spans eight
  and returns a day more than the label promises.
- **`matchPreset` is re-derived against the current day, never stored.** The same two dates stop being
  "7 d" tomorrow, and a pill that stayed lit would name a window the query no longer describes.

**One deliberate departure from the design.** It draws the boolean dimension as a **toggle**. A toggle
carries two states; `triState` needs three — *omit the param* / `true` / `false` — and sending `false`
hides everyone who has never ordered, usually the exact group being hunted. The select stays.

#### A bug this introduced, and the pre-existing one beside it

A date preset moves **two** wire params in one gesture, and `FilterBar`'s `onChange` is per-key. Two
sequential calls against `useTableUrlState` both merge into the query captured at render, so the second
discards the first — clicking "7 d" would have landed `to` and dropped `from`. Fixed by threading an
optional **`onChangeMany`** through `FilterBar` and `FilterChips`, which the shell fills with
`state.setFilters`.

The same shape was **already** broken in `FilterChips`: clearing a range chip ran
`keysOf(field).forEach((k) => onChange(k, ""))` — two writes, so one bound survived. Fixed by the same
change. It falls back to per-key writes for callers holding values in `useState`, where successive
updates merge and nothing is lost.

### The avatar, after the user spotted it — 2026-08-31

The owners row drew `bg-muted` with a `ring-1`. It should be the treatment the documents queue already
ships and the design names: **`bg-accent` ground with `text-primary` initials, no ring**. `--accent` is
`--forest-100` (#E1EFE8), the exact value the design gives, and it inverts correctly in dark mode where
the cool grey does not. Size went 9 → 8, matching the other queue.

**And the initials underneath it were wrong.** The row printed `(fullName || "??").slice(0, 2)`, so
*"Atabek Abduakimov"* read **"AT"** — two letters of one word, which is a different person's monogram.

Chasing it found **five private copies** of this function, in three disagreeing shapes:

| Where | Multi-word | One word | No name |
| --- | --- | --- | --- |
| `queue-cells.tsx`, `subject-docs-table.tsx` (a literal duplicate) | first + last ✓ | **one** letter | `"—"` |
| `owners/hero-card.tsx`, `workers/hero-card.tsx` (`initialsOf`) | first + last ✓ | two letters ✓ | `"??"` |
| `app-sidebar.tsx` | **`slice(0, 2)`** ✗ | two letters | — |

`lib/ui/initials.ts` (+9 tests) is the union of the two that were right: first-and-last across words,
two letters from a lone word, `"—"` for no name. The three table call sites now import it; the two hero
cards and the sidebar were left alone, being different surfaces outside this work — noted so the next
person does not think the dedup is finished.

One thing the tests pin that none of the five copies handled: splitting by **code point**, not `[0]` or
`slice`. Those index UTF-16 code units, so an astral character — an emoji, or several scripts — was cut
into half a surrogate pair and rendered `�`. A name field is exactly where that arrives.

**Gates:** `tsc` ✓ · `eslint` ✓ · **461 tests ✓** (was 437; +15 preset arithmetic, +9 initials)
· `next build` ✓ · en/de 1531 = 1531.

⚠ **Not rendered.** Every gate above is blind to exactly the surface this touches, and the `summarize`
bug is the proof. What to open first at `/dashboard/owners`: **apply a filter** (the chips that just
crashed), the column picker's **drag** (`@dnd-kit`, peer range predates React 19, still never exercised),
switching `joined` on, density switching, and the country picker clearing the city.

---

## 1b · Properties on the shell — done 2026-08-31

The second of the six, and it exercised the parts owners did not: **client mode** and **no stage axis**.

`GET /api/properties` returns a bare, unpaged array and takes no query parameters, so the shell owns the
whole search → filter → sort → page pipeline. Two things follow from that:

- **The columns are genuinely sortable**, and this is the app's first table that sorts. It is safe here
  precisely because it is *not* the server-sort feature `BACKEND-REVISIONS.md` reserves for its own spec:
  every row is already in the browser, so a sort orders the table rather than one page of it. `compare`
  on all five columns; `area` puts nulls last **in both directions**, because an unknown is not a small
  value.
- The four filter dimensions stay **derived from the rows present**, unchanged and for the reason already
  documented there: an option then always matches at least one row, and a property carrying a
  *deactivated* category stays filterable — deactivation is never retroactive, so such rows exist.

### `tabs` became optional on the shell

A property has no stage. Soft-deleted ones live behind their own route, with their own permission
(`property:restore`) and their own restore action, so folding them in as an Active/Deleted tab pair would
be a feature rather than a migration. The alternative — a strip holding one "All" tab — is a control that
narrows nothing. So `DataTable` now renders row 2 only when `tabs` is non-empty. The tasks table will
need the same.

With no tabs, `state.tab` stays at its default, `isDefaultTab` is `true`, and the empty state correctly
offers no "See all" button.

### Two things removed rather than carried over

- **The `#` column.** It printed the row's 1-based position — not a fact about the property. It already
  changed under every filter, and under a sort it would change again, so it read as an id that never was
  one.
- **`hooks/use-table-filters.ts`**, deleted. The properties page was its only consumer; the sole
  remaining mention was a doc comment in `filter-menu.tsx` pointing new screens at it, which has been
  redirected to `FilterBar` + `ClientSource`. Leaving a dead hook behind is how the next person concludes
  it is still the pattern.

Also: `pr-26` on the area column is gone. The shell owns `align: "right"` on the header *and* the cells,
which is what that hand-tuned padding was compensating for. Area and Created are now mono, per §08.

**Migration standing: 3 of 6** — `owner-documents`, `owners`, `properties`. Left on the old primitive:
`(worker)/workers`, `settings/admins`, and `components/owners/weekly-work-card.tsx` (a card, not a page
table). `(worker)/worker-documents` is F3 and still on `SubjectDocsTable`; `tasks` is still a raw
`<Table>`.

**Gates:** `tsc` ✓ · `eslint` ✓ · **461 tests ✓** · `next build` ✓ (exit 0) · en/de 1533 = 1533.

⚠ **Not rendered.** What to check first at `/dashboard/properties`: **click a column header** — nothing
in this app has ever sorted, so the three-state toggle (desc → asc → default) and the chevron on the
active column only are both first-run; the four filters, which moved from local state into the URL; and
that the New-property button survived into the toolbar's `actions` slot with its `property:create_any`
gate intact.

⚠ One `next build` run failed with a transient `next/font: error` — a Google Fonts fetch, not this code.
It passed on a clean re-run with exit 0. Worth knowing if it recurs in CI.

---

## Property detail — two pre-existing layout defects, fixed 2026-08-31

Found by the user rendering the page. **Neither was caused by the table work** — the migration touched
neither file. Two unrelated causes that both happened to be invisible to `tsc`, `eslint` and the tests.

### 1. The hero put near-black text on dark forest green

`property-hero.tsx` is the last survivor of the hero pattern that `a51a3f2` replaced everywhere else with
`components/detail/identity-band.tsx` — Owner and Worker detail were both rewritten onto it; this one only
had its band swapped. Three faults compounded:

- **The band went from pale to solid.** It was
  `bg-gradient-to-r from-primary/12 via-primary/6 to-accent/10` — a 6–12% tint. `a51a3f2` swapped it for
  `dot-field`, whose own definition is `background-color: var(--forest-700)`, and whose comment says it
  was written for **the sign-in brand panel**, where the copy on it is white. The heading stayed
  `text-foreground`.
- **The heading was on the band at all.** The row carried `-mt-8` to float the icon tile over the band's
  edge — but the row is `items-end` and the text column is ~88px tall, so bottom-aligning it pushed the
  heading *above* the band's lower edge, not below. With a 6% tint nobody noticed; on solid forest the top
  third of the title is unreadable.
- **A 16px white strip above the band.** `Card` ships `py-4 gap-4`, and its `has-[>img:first-child]:pt-0`
  escape hatch fires only for a real `<img>`. The band is a decorative `<div>`, so it got the padding and
  the gap — which is also what made the `-mt-8` arithmetic land 16px off.

Fixed by **removing the overlap** rather than tuning it: `pt-0 gap-0` on the card so the band is flush,
then the band ends and the identity begins beneath it. A ring cannot rescue a straddling tile anyway — it
would have to be forest above and card-white below at once, which is exactly why `IdentityBand` has no
band. Sizes and colours now match `IdentityBand` (`size-14`, `rounded-lg`, solid `bg-primary` with
`text-primary-foreground`, `text-xl sm:text-[22px]`), so the three detail screens open the same way, while
a place keeps the cover band a person does not need.

### 2. `aspect-square` never applied to the gallery tiles

The photo strip is `flex`, which defaults to **`align-items: stretch`** — and a stretched flex item's
cross size is imposed by the container, which **overrides `aspect-ratio`**. So `TILE`'s `aspect-square`
did nothing. The row's height then came from the tallest `<img>` at its natural ratio, every tile
stretched to that, and the shorter photos sat pinned to the top of an over-tall tile with `bg-muted`
showing beneath them — which is exactly what the screenshot shows, each photo a different height.

One word: **`items-start`** on the strip. Unstretched, `aspect-ratio` resolves the height from `basis` as
the comment always claimed it did.

Swept the rest of the app for the same shape: the three other `aspect-square` uses are all either
`absolute` (out of flow) or carry `size-full`, so none of them can hit it.

**Gates:** `tsc` ✓ · `eslint` ✓ · 461 tests ✓ · `next build` ✓ (exit 0).

⚠ **Not rendered.** Both fixes are geometry, which is the one thing no gate here can see — the same blind
spot that let both defects ship in the first place.

---

## Backend asks to file (0b)

Numbering continues `BACKEND-ASKS.md`, which ends at #27.

- **#28 — `task:update_any`, or an admin accept/reject pair.** ⚠ **Hard blocker, and it strands live
  data.** REVIEW → DONE and REVIEW → ACTIVE are reachable only through PROPERTY-scoped `task:update`.
  Admins hold no `PropertyMembership`, so both fail closed, and a **walk-in** task has no human owner to
  do it instead — every walk-in order that reaches REVIEW is stuck there permanently. Same shape as
  `task_group:create_any` (110038), minted for the same reason. Either a GLOBAL `task:update_any`, or
  `/admin/accept` + `/admin/reject` routes. SUPER_ADMIN only is fine. A reason field on reject would be
  welcome and is not required.
- **#29 — a handoff guide for task media.** `TaskMedia` and `?withMedia=true` exist only in
  `index/schemas/media.md`. We need before/after photos on the admin task detail (#4), and building on
  `index/` means building on a surface with no `Revision:` and no CHANGELOG — a change would reach us as
  a bug report. Not a new endpoint; a guide for one that exists.
- **#30 — move the `revision:` dates.** Four guides changed with breaking, client-visible content in the
  08-30 pull and their frontmatter did not move: `fnd-3-table-query.md` (still 2026-08-20),
  `f-04b-worker-availability.md` (08-19), `f-05-b-agency-portal.md` (08-24),
  `onboarding-and-active-gate.md` (08-25). `BACKEND-REVISIONS.md`'s catch-up loop reads those dates to
  decide what to re-read, so a stale one makes a breaking change invisible to the process built to catch
  it. Also carry over the standing unreported bug: `bossOwnerName` on `PropertyDto` lives only in
  `index/dtos/properties.md:156`.

### An ask that came back answered

**#20 — support tickets by target user — shipped exactly as asked.** `GET /api/support-tickets/admin/all`
now takes `?requesterUserId=` **and** `?requesterUserType=`, plus `?search=` over the subject. That
retires the in-memory filter in `hooks/use-subject-tickets.ts`, which currently reads the platform's
whole ticket list to show at most six rows. Small, self-contained, and it belongs to whichever
sub-project touches worker or owner detail first. ⚠ An unrecognised `requesterUserType` is an **empty
list, not a 400**.

---

## Open questions for the user

1. **Item 1 — what is actually wrong with the documents screens?** F1/F2/F4/F5 all shipped
   **unrendered**, so "fix the docs" could be layout drift against
   `assets/Uyer-Admin-Documents-Detail.dc.html`, broken interactions (the column picker's drag is the
   prime suspect — `@dnd-kit` had never been imported in this repo and its peer range predates React 19),
   or missing data. A list, or a screenshot, decides whether item 1 is S or L. It is the one sub-project
   whose size is unknown.
2. **Item 3 — does "table change" include server-side sort and export?** Neither exists anywhere in the
   app; the backend has had both for a while. Migration-only keeps #1 to one shape repeated six times.
   Including them makes #1 two features wearing one name.
3. **Skill Requests (E) — in or out?**
4. **Item 4 — do we build the buildable half now, or wait for #28 and ship walk-in parity whole?**
   Rating and outcome override are already wired at the service layer and have no screen.

## What this document does not do

No design, no file-by-file plan, no estimates in days. Each sub-project above gets brainstormed to a
spec and then to its own implementation plan. Items 1 and 2 are the exception: they continue
`2026-08-27-documents-workspace-roadmap.md`, and that file — not a new spec — is where their phases live.
