# Properties — list and detail, to the design

**Design:** `D:/projekts/ERP-Uyer/assets/Uyer-Admin-Properties.dc.html` (2026-08-31, 5 sections, 2 screens
at 1440px). It is the **newest** design file in `assets/` — four days after
`Uyer-Admin-Documents-Detail.dc.html`, which matters for one decision below.

**Decided in session by the user:** match the design **1:1**, and do both screens with the **table
first**.

## Goal in one line

The list gains the summary strip that tells an admin *which* of 86 addresses is missing something, and the
detail is rebuilt into the shape Owner and Worker detail already use — attention band, identity card, deep
material behind tabs, side column — replacing a hero that put its heading on a dark green band.

---

## What the design asks for that already has a data source

Verified against `index/`, the handoff guides and this repo's own hooks. **Nothing here needs a new
endpoint.**

| Piece of the design | Source | Note |
| --- | --- | --- |
| Photos column + "12 with no photos" | `GET /api/properties?withMedia=true` | One call fills a photo count for **every** row. `property.service.ts` does not send the param yet — a one-line addition. |
| Team with access | `GET /api/properties/{id}/memberships` | ⚠ `membership:list` is PROPERTY-scoped, but the route **short-circuits to `property:list`** for an admin (`index/controllers/properties.md:21`) — the permission they already hold to read the page. |
| Attention band · Next visits · Visits 90 d | `taskService.getAdminTaskGroups(undefined, propertyId)` | Already implemented and already takes `propertyId`. `TaskGroupDto.tasks[]` carries `scheduledAt`, `status`, `requiredWorkerCount` and `workers[]`, so **"Unassigned" = `workers.length < requiredWorkerCount`**. |
| History tab | `useAccountLog` | Keys on `(targetEntity, targetId)`. Property create / deactivate / restore are audited event types. ⚠ Carry over that hook's standing rule: it records what an **admin** did, so the card must name what it excludes. |
| Per-photo date | `PropertyMediaDto.createdAt` | Present. |
| "2 on a retired category" | Category code absent from `usePropertyCategories()` | That list is active-only, so "not in it" **is** the retired predicate. |
| Owner card "Contract in force" | `useOwnerContractCover` | The same hook owner detail uses. |
| Attention band, identity card, fact tiles | `components/detail/` | `AttentionStrip`, `summariseAttention`, `IdentityBand`, `FactTile`, `BandStat` all exist. The design's own subtitle says *"built to the same shape as Owner and Worker detail"* — this is the reuse it is pointing at. |

### Tones come from tokens, not the design's hexes

The strip's amber (`#FEF6E7` / `#9A5E00`) and red (`#FDECEC` / `#B22B2B`) are `FactTile`'s `warning` and
`critical` tones — `--status-pending-tint` / `--status-pending-deep` and `--status-cancelled-*`, which
`globals.css` ships as AA-checked pairs with dark values. Matching the hexes literally would fork the
palette and break dark mode, so the rule already recorded in the documents roadmap applies: **large
neutral grounds take the tokens; do not chase every hex.**

---

## Four things the design draws with no source — cuts

Each is a stated cut, not an oversight.

1. **"· D. Krüger"** on the identity card's *added* line. Blocked twice over: `PropertyDto` carries no
   `createdBy` at all, and **ask #25** already records that no route resolves an admin id to a name. The
   date half ships; the name half does not. → the existing ask #25 covers it.
2. **"4 min from U Gneisenaustraße"** under the map. There is no transit or walking-distance data anywhere
   in this API. Not asked for either — it would be a third-party geocoding dependency.
3. **Export CSV** in the page header. No export endpoint is called anywhere in this app;
   `BACKEND-REVISIONS.md` already classes export as *"a new feature, not a migration"* needing its own
   spec, with the rule that an export must be read **by header name, not column position**. Cut here.
4. **"1 older than 90 d"** inside the bin tile. `PropertyDto` exposes `isDeleted` and no `deletedAt`, so
   the age of a deletion is unknowable. The tile ships as **"4 in the bin · restorable"**. → new ask.

### The design's own two asks, to be filed

Section 05 names them and they are right: **a paged, searchable properties list** (the shape owners and
workers already have) and **an owner name on `PropertyDto`**, so the Owner column stops being a second
request that can fail on its own. Both go to `BACKEND-ASKS.md`; neither blocks this work.

---

## The one architectural decision

**The design's toolbar is not the shell's toolbar, and the shell must gain a slot rather than fork.**

`DataTable` renders three fixed rows: identity + actions · stage tabs · search + Filters + Columns +
density, with the filter **band** inside the card. This design renders **two**: title + count pill +
search + Columns, then a `FILTER` row of four dropdown pills + Clear + a `Sorted by` control. No band, no
tabs, no density toggle.

- **Rejected: a bespoke table for properties.** It would throw away the column registry and picker, the
  URL state, the client pipeline, the four notice states (empty / filtered-to-nothing / error / 403) and
  the row-height system — all of which this design also needs and none of which it redesigns.
- **Chosen: an optional `toolbar` render-prop on `DataTable`.** When passed, it replaces rows 1–3 and
  receives the shell's own state (`state`, `fields`, `page.total`, the column-picker handle) so the caller
  can draw the design's two rows with real controls. When absent, every existing consumer is untouched.
  `tabs` is already optional as of the properties migration; this is the same generalization one layer up.

### The filter idiom — resolved 2026-09-01, back to the band

The pill row shipped first, 1:1 with the drawing. Seeing it rendered, the user asked for the filters to sit
behind a **`Filters` button** with the in-card band, *"like owners"* — so there is now **one filter idiom
across every table**, which is what the earlier note held out as the convergence target.

What changed in the shell: the band and the chip row moved **out** of the default-toolbar branch, so a
custom toolbar no longer replaces them, and the `Filters` trigger joined `columnPicker` and `density` as a
shared control the slot receives. One band, one trigger, whichever toolbar opens it.

`PropertiesToolbar` keeps only what the design draws and the shell does not offer: the **filtered heading**,
the `n of m` pill and the `Sorted by` control. It collapsed from two rows to one.

**This closed a real hole rather than only changing a look.** The three summary tiles write `noPhotos` /
`noArea` / `retired` into the filter bag, and under the pill row nothing rendered them — no chip, and no
count on any badge, because `countActiveFields` and `FilterChips` both read `fields`. A tile click narrowed
the table with no control able to show or clear it. They are now `triState` **fields**: the tile and the
band's own control are the same act, the badge counts it, and a chip clears it. `triState` rather than a
checkbox because the third state is *omit the param*, and `false` is a real question — *"which properties
DO have photos"*.

### The band's controls — reworked 2026-09-01 to the design's kinds

The four dimensions had shipped as **selects** (two of them over fixed buckets). The user pointed at the
design's own filter panel — searchable checkbox lists, preset date pills, real bounds, switches — so each
dimension moved to the control its data actually wants:

| Dimension | Was | Now |
| --- | --- | --- |
| Owner | select | `multiSelect`, **searchable**, with per-option counts |
| Category | select | `multiSelect` chips, with counts |
| Added | select over 5 age buckets | `dateRange` with **7 / 30 / 90-day** presets + Custom |
| Floor area | select over 5 size bands | `numberRange`, real bounds |
| The three defects | `triState` selects | **switches** (`boolean`) |

Two new things in `filter-bar.tsx`: a **`boolean` kind** (a switch), and the `searchable` flag now picks
the *shape* as well as the search box — a bordered **checkbox list** with right-aligned counts, as drawn,
instead of a scrolling chip row. Chips are unreadable past a dozen options; a list of four wastes the box.

**`boolean` vs `triState` is a real distinction, not a simplification.** `triState` exists where `false` is
a genuine query and differs from omitting the param — the owners table's `neverOrdered` ("owners who HAVE
ordered") stays one. A property's `noPhotos` is a **defect** filter: its `false` would mean "only the ones
with photos", which nobody asked for and a switch cannot express. Off clears the param rather than writing
`"false"`.

**Buckets deleted, not left beside the new controls.** `areaBucket`, `createdBucket`, `AREA_BUCKETS`,
`CREATED_BUCKETS` and both label maps had no consumer left, so they are gone along with their tests and
their `areaBands` / `createdBands` copy. A bucket could only answer the four or five questions somebody
picked in advance; a range answers those and the rest. Nothing on the wire changed either way —
`GET /api/properties` takes no date or size parameter, so both were always client-side.

New: `lib/ui/filter-predicates.ts` (+17 tests) — `matchesAny`, `withinDay`, `withinNumber`. Every
client-mode table needs these three and each has a rule that fails quietly rather than loudly: an absent
filter narrows nothing (and `0` is **not** absent), a null row value drops out of any bound, and a date
range compares **calendar days** rather than instants — 12 Aug – 12 Aug must keep a row stamped 14:30.

**The band is one row.** Three separate `boolean` fields each took a grid cell with its own column
heading, spreading a short list across the whole band — so they became one **`booleanGroup`**: one heading,
label left and switch right, and **one** dimension in the `Filters · n` badge (the same way a range owning
two params counts as one). The single `boolean` kind was then deleted: a one-item group covers it, and a
kind with no consumer is one the next person picks by mistake.

The grid then took **one column per dimension**, capped at six, instead of a fixed four — properties' five
dimensions had been landing four-up with the fifth alone on a second row. Not `auto-fit`, which picks the
count from a min-width and so wraps at a width nobody chose. Owners' seven still take two rows, which is
right: past six, a cell is too narrow for a date range to hold two bounds. The count is a static class from
a lookup, because Tailwind scans source text and an interpolated `grid-cols-${n}` is never generated.

⚠ **Deferred: the two-thumb slider** the design draws beside the numeric bounds. The `≥ n` / `≤ n` boxes
are the honest half and carry the whole meaning; the slider is a new primitive and would be its own piece
of work.

### The `#` column comes back — as a default-on registered column

It was removed during the migration on the reasoning that a row's 1-based position is not a fact about the
property. The design draws it, so it returns. But the design itself puts it behind a
`rowNumbers` prop defaulting to true — so registering it as a column with `defaultVisible: true` is both
1:1 with what is drawn **and** faithful to the design's own intent that it be switchable. The column
picker then owns it.

---

## Phase A — the list — ✅ SHIPPED 2026-09-01

| File | What |
| --- | --- |
| `lib/properties/summary.ts` (+17 tests) | The four predicates and the tile filter. |
| `components/properties/summary-strip.tsx` | The strip. Tones from `--status-*` tokens, not the design's hexes. |
| `components/properties/properties-toolbar.tsx` | The design's two rows — filtered heading, `n of m` pill, 300px search, `FILTER` pill strip, Clear, `Sorted by`. |
| `components/ui/data-table/data-table.tsx` | New `toolbar` slot; `columnPicker`/`density` hoisted so both toolbars share one instance; `cell(row, index)`. |
| `hooks/use-table-url-state.ts` | New `setSort` — a dropdown names a pair outright, which `toggleSort` cannot express. |
| `lib/services/property.service.ts`, `hooks/use-properties.ts` | `withMedia`, **in the query key** — a cache entry fetched without it holds `media: null` on every row. |
| `app/…/properties/page.tsx` | Header actions, strip, toolbar slot, the design's 8 columns. |

Two things worth not relearning:

- **`media: null` ≠ no photos.** Null means the request omitted `withMedia`. `summarise` only counts an
  array that actually arrived, so dropping the param can never report the whole table as gallery-less.
  Pinned by a test.
- **An empty active-category set means the lookup has not landed**, not that every category is retired.
  Answering 0 until it does is the only safe reading. Also pinned.

**A bug caught before it shipped:** the `#` column's cell first returned `null` with a comment claiming
the shell filled the index. It did not — `DataColumn.cell` took only the row. Fixed by passing the row's
1-based position, offset by the page, so `#` counts 26–50 on page two rather than restarting.

**Gates:** `tsc` ✓ · `eslint` ✓ · **478 tests ✓** (was 461) · `next build` ✓ (exit 0) · en/de 1558 = 1558.

⚠ **Not rendered.** First things to check: a tile click narrowing the table and the tile showing pressed;
the `Sorted by` dropdown and a column header agreeing; the Photos column against a property with no
gallery (amber, `0`); and `Deleted (n)` appearing only for `property:restore`.

---

## Phase A — the list (as specified)

Against the design's measured geometry, in the order the screen reads.

**A1 · The page header.** Title + subtitle, and a right-hand action group: a `Deleted (n)` link to the
existing `/properties/deleted` route, then `New property` behind `property:create_any` (unchanged). The
count needs `useDeletedProperties`, which is already gated on `property:restore` — no count and no link
for an admin without it. **Export CSV is not rendered** (cut 3).

**A2 · The summary strip.** Its own card above the table — `rounded-2xl`, a left cell (`ON THE PLATFORM` /
`86 properties`, mono, with a right hairline) and four equal tiles at 44px:

| Tile | Predicate | Tone | Action |
| --- | --- | --- | --- |
| *n* with no photos | `media` empty — needs `withMedia=true` | warning | filters the table to them |
| *n* missing floor area | `areaSqm === null` | critical | filters the table to them |
| *n* in the bin · restorable | `useDeletedProperties().length` | neutral | opens `/properties/deleted` |
| *n* on a retired category | `category.code` not in the active list | neutral | filters the table to them |

Three of the four actions **narrow the table below**, which is why the strip sits above it and why the
toolbar title changes with the filter (the design's `Apartment blocks` / `8 of 86`). A tile whose count is
zero renders in the neutral tone with no action — a strip that vanishes tile by tile changes width as the
data improves.

⚠ Two of these predicates are **new filter dimensions** (`no photos`, `missing area`, `retired category`)
that do not exist in `OWNER_FILTER_KEYS`-style form. They join the URL as their own keys so a tile click
is a shareable link, and they belong in the pill row as well — otherwise a filter is applied that no
control can see or clear, which is the failure the filter chips exist to prevent.

**A3 · The toolbar**, via the new slot: filtered title + `n of m` pill (`bg-accent text-primary`, mono) +
300px search + Columns. Then the `FILTER` row: Owner · Category · Area · Added as dropdown pills — filled
`bg-accent` with a green ring when set, hairline when `All` — then Clear, then `Sorted by` with the current
sort. The sort control and the column headers drive the same `state.sort`, so they cannot disagree.

**A4 · The columns**, at the design's widths: `#` 30px · Property (icon + name + address) flex · Owner
(initials avatar + name) 176px · Category (colour dot + name) 168px · Area 84px right · **Photos** 74px
centre (camera + count) · Added 104px · chevron 24px. Rows are 56px, which the shell already is after the
DS row-height fix.

`initials` for the owner avatar comes from `lib/ui/initials.ts`; the avatar takes the same
`bg-accent text-primary` treatment as the owners table.

## Phase B — the detail — ✅ SHIPPED 2026-09-01

| File | What |
| --- | --- |
| `lib/properties/visits.ts` (+15 tests) | Upcoming visits, the 90-day count, newest-photo date. |
| `lib/properties/attention.ts` (+15 tests) | The three attention sources, in the owner side's three-state model. |
| `components/properties/property-identity.tsx` | `IdentityBand` + the four `FactTile`s. |
| `components/properties/property-visits-card.tsx` | Next visits, side column. |
| `components/properties/property-work-tab.tsx` | Work booked here. Reuses `TaskStatusBadge`. |
| `components/properties/property-gallery-card.tsx` | Strip → **grid** with per-photo dates, plus a `bare` mode for the tab. |
| `components/detail/identity-band.tsx` | New `icon` slot — a place gets a mark, not a monogram. |
| `hooks/use-properties.ts`, `lib/services/property.service.ts` | `usePropertyMemberships` + `PropertyMembershipDto`. |
| `app/…/properties/[id]/page.tsx` | Band · identity · tabs · side column. |

**Deleted:** `property-hero.tsx` (its band and its geometry were both wrong) and `property-info.tsx` —
the old "General Information" card, whose four facts are now the identity card's `tiles` row, so each
appears once on the page.

**One task read feeds four surfaces** — the attention band, `Visits · 90 days`, the side column and the
Work tab — so they cannot disagree about the same shift.

`dot-field` **stays**: the login page uses it as intended, on `--forest-700` with white copy. The property
hero was the misuse, not the utility.

### The identity card — three slot mistakes, fixed 2026-09-01

Rendered, it did not match the design, and all three were mine misusing `IdentityBand` rather than anything
missing:

1. **The address shared the badge row.** It went in `meta`, which `IdentityBand` renders *inside* the badge
   line — so it trailed the category and the size and read as a fourth chip rather than as where this
   place is. New **`subtitle`** slot: its own line under the name, above the badges, which is where the
   design puts it. `meta` stays for a short aside that belongs beside the chips.
2. **Team and Visits were the wrong way round.** The design draws team, divider, count. `IdentityBand`
   renders `stats` then `actions`, and Team-with-access had gone into `actions` only because that slot
   happened to be free — it is neither a number nor a button. New **`aside`** slot, rendered before
   `stats` with the same divider, and the divider became a component since there are now two of them.
3. **The entry instructions truncated.** `FactTile` truncates every value, which is right while a value is
   a date or a figure and wrong for the one free-text field on the screen: entry instructions are the text
   a worker is actually sent with, so the **tail carries information** — a door code at the end of the
   sentence is exactly what an ellipsis eats. New `wrap` prop, two lines via `line-clamp-2`, full text on
   hover, and the tile switches to `items-start` so a second line does not push the icon off its label.
   Off by default: a tile row stays even only while every value is one line.

### The Owner card — missed in the first pass, done 2026-09-01

B5 named it and Phase B reused the old card unchanged, so it shipped as a person icon, a truncated raw id
and a full-width "View Profile". Now to the design: initials avatar on the green ground, the **BOSS** role
from the directory row, the owner's **contract phase**, an **Email** + **Profile** pair, and the lock note.

- The **lock note is the point of the card**, not decoration: no route moves a property between owners, so
  the field is *absent* from the edit form rather than disabled in it. Without the sentence an admin hunts
  for a control that was never built.
- **The cover comes from the page's read**, passed down — the attention band already asked, and two reads
  could disagree on one screen. It renders **three** states: a refusal and a read in flight are both
  "unknown" and must not print as "no contract", which would be this screen asserting something it was not
  allowed to look at.
- **Email is a real `mailto:`**, which is what the design's button can honestly be. Opening a *support
  ticket* is a different act with a different audience (`MessageUserDialog`, on owner detail), so putting
  that behind a button labelled "Email" would surprise whoever pressed it.
- The phase label comes from `contractPhasePresentation().labelKey`, not from lower-casing the phase name:
  `Lapsed` and `Expired` deliberately share one label (the difference is a job artifact of up to an hour),
  and deriving the key would print two words for one state.

### Two bugs caught while wiring

- ⚠ **`useAdminTaskGroups` had no `enabled`.** Unscoped it returns **every task group on the platform**,
  and `property` is undefined on the first render — so `useAdminTaskGroups(undefined, property?.id)` would
  have fetched the whole system once before refetching scoped, and cached the unscoped answer under its
  own key. Now gated, with the reason on the hook.
- A duplicate `formatShort` was written beside the gallery's existing, identical `formatDate`. Removed.

**Gates:** `tsc` ✓ · `eslint` ✓ · **508 tests ✓** (was 478) · `next build` ✓ (exit 0) · en/de 1609 = 1609.

⚠ **Not rendered.** Check first: the attention band with a real unassigned shift; `Team with access`
(the memberships route short-circuits for an admin — this is its first ever call from this app); the
photos grid; and the tabs.

---

## Phase B — the detail (as specified)

**B1 · Attention band** via `AttentionStrip` + `summariseAttention`, three sources:
unassigned upcoming task · owner contract expiring · newest photo older than *n* months. Each an
`AttentionSource`, so "unknown" (a read refused or in flight) stays distinct from "clear" — the model
already enforces that.

**B2 · Identity card** via `IdentityBand`: building icon, name, address, badges (category · floors/rooms ·
added date), `Team with access` as the right-hand slot, `Visits · 90 days` as a `BandStat`. **This deletes
`property-hero.tsx`**, and with it the `dot-field` band whose geometry and contrast were both wrong.

**B3 · Four fact tiles** via `FactTile`: Floor area · Category · Pinned entrance (with copy-to-clipboard) ·
Entry instructions. Nullable values print an em dash, per the DS.

**B4 · Tabs** — Photos (n) · Work booked here (n) · History. The tab lives in the URL like every other
table state. **Photos becomes a grid** (4 across, per-photo date) rather than today's scrolling strip; the
design offers `Strip` as an alternative layout and the grid is its default. The strip's
`items-start`/`aspect-ratio` fix carries over to whichever survives.

⚠ **The photos tab stays read-only, and the design says why:** upload and delete are owner-scoped
permissions with no admin branch, so a button there would refuse every press. Say it in the footer, as
drawn.

**B5 · Side column** — Owner card (avatar, contract-in-force badge, Email + Profile, and the design's lock
note that ownership is fixed at creation because no route moves a property between owners) and Next visits
from the same task read as the attention band.

---

## Testing

Pure logic, tested at the `lib/` boundary — the pattern this repo already uses:

- `lib/properties/summary.ts` — the four predicates and their counts, including the zero case and the
  retired-category set difference.
- `lib/properties/attention.ts` — the three attention sources, mirroring `lib/owners/attention.ts`,
  including "unknown" when a read is refused.
- `lib/properties/visits.ts` — upcoming-visit selection and ordering, the unassigned predicate, and the
  90-day count.

Geometry is not testable here and every gate in this repo is blind to it — the two defects fixed earlier
today shipped through green gates. **Both phases need rendering before they are called done.**

## Out of scope

Server-side sort, export, and paging remain the backend asks above. Owners is **not** moved to the pill row
in this work; it is named as the convergence target.
