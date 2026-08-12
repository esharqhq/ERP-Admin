# Admin table filters — one panel, four control kinds

**Status:** approved 2026-08-12
**Backend contract:** `f-02-4-owner-table-filters.md` (Revision 2026-08-12),
`f-02a-1-admin-task-list-filters.md` (2026-08-10), `fnd-3-table-query.md` (2026-08-12),
`fnd-1-configurable-lookups.md` (city lookup). All `affects: [admin-panel]`.

## Problem

Three unrelated gaps share one cause — there is nowhere on an admin table to put a filter that is not a
single-select.

1. **F-02 #4 is unbuilt.** Six new params on `GET /api/admin/owners` (`companyCityId`,
   `lastOrderedFrom`, `lastOrderedTo`, `neverOrdered`, `taskCountMin`, `taskCountMax`), three new
   response columns, three new sort keys, three appended export columns.
2. **Four already-modelled owner filters have no UI.** `OwnerListQuery` has carried
   `registeredFrom`/`registeredTo` and `propertyCountMin`/`propertyCountMax` for some time; the owners
   page sends only the tab's `onboardingStatus`/`ownerType`, `search` and paging. Ten server filters
   will exist and the screen exposes none of them.
3. **F-02a·1 is unbuilt.** `propertyId`, `scheduledFrom`, `scheduledTo` and a repeatable `status` on
   `GET /api/tasks/admin`. Because the dispatch page sends no date window, its row cap is 500 rather
   than 5,000, and truncation has no signal.

`FilterBar` renders single-selects only. Every filter above that is a date range, a number range or a
tri-state has therefore been impossible to add without a bespoke control per screen.

## Two filtering worlds — the constraint that shapes the component

| | Owners, Workers | Properties, Tasks |
|---|---|---|
| Where filtering happens | **server** (FND-3 paged) | **client** (`useTableFilters`) |
| Where options come from | a lookup endpoint or a fixed enum | derived from the rows present |
| Consequence | options **cannot** be derived from visible rows — page 1 of 40 is not the vocabulary | a group with no options renders nothing |

One component can serve both only by staying **pure presentation**: values in, `onChange` out, no
knowledge of where filtering happens. `FilterBar` already has that shape and keeps state in the caller.

## Decisions

- **Extend `components/ui/filter-bar.tsx` in place.** `kind` defaults to `"select"`, so its four current
  consumers (properties, docs-workspace, `data-table-card`, worker-documents) keep working untouched.
  One component, which is the requirement. Accepted risk: every filtered screen depends on this file, so
  its tests carry more weight than usual.
- **Support is out of scope.** `components/support/inbox-filters.tsx` is not touched, not migrated, not
  read. Explicitly excluded by the requester.
- **The values bag stays flat `Record<string, string>`.** One entry per **wire param**, named after the
  param. No magic suffixing: a range field names both of its keys explicitly, so the mapping from bag to
  query is 1:1 and greppable.

## The component contract

```ts
export type FilterField =
  | { kind?: "select";      key: string;    label: string; options: FilterOption[]; hint?: string }
  | { kind: "dateRange";    fromKey: string; toKey: string; label: string; hint?: string; disabled?: boolean }
  | { kind: "numberRange";  minKey: string;  maxKey: string; label: string; hint?: string }
  | { kind: "triState";     key: string;    label: string; anyLabel: string; trueLabel: string; falseLabel: string };
```

- **Every value is a string, and `""` means "omit this param".** That is the existing `FilterBar`
  convention and the one the tri-state depends on (below).
- **`disabled` is computed by the page, not the panel.** The panel stays dumb; the owners page passes
  `disabled: values.neverOrdered === "true"` on the last-ordered field. Keeping the rule at the call
  site is what stops the shared component from growing per-screen conditionals.
- **A `select` group with no options still renders nothing** — unchanged behaviour, and correct for
  client-side screens whose vocabulary comes from the rows.
- **`hint` exists for one specific reason:** §2.1 of the F-02 #4 guide requires the city filter to say
  *"only owners with a company address on file"*, because a city filter can reach neither private
  individuals nor companies with a blank city.

### The tri-state is the subtle one

| Control state | Value in the bag | Sent |
|---|---|---|
| Any | `""` | **nothing** |
| Never ordered | `"true"` | `neverOrdered=true` |
| Has ordered | `"false"` | `neverOrdered=false` |

Omitting is **not** the same as sending `false`: `false` returns *only* owners who have ordered, which
silently hides the group an admin is usually hunting for. A checkbox cannot express this, which is why
the control is a three-option select rather than a checkbox.

## Per-page adoption

### Owners — the full set (server-driven)

Ten filters: onboarding status, account status, owner type, **company city** (see below),
**registered** (`dateRange`), **last ordered** (`dateRange`), **never ordered** (`triState`),
**property count** (`numberRange`), **task count** (`numberRange`).

#### The city filter is two controls, and one of them sends nothing

**There is no flat "all cities" endpoint** — `fnd-1-configurable-lookups.md` §5.3 says cities are always
fetched scoped to a country (`GET /api/countries/{countryId}/cities`), and an unknown `countryId` is a
`404`. So the panel gets a **country** select *and* a **city** select:

- **Country maps to no wire param.** It scopes which cities are offered and nothing else. Picking a
  country alone filters nothing — which is correct, and worth a hint so it does not read as broken.
- **City is `disabled` until a country is chosen**, reusing the same page-computed `disabled` the
  last-ordered range uses. Its options come from the chosen country's cities.
- Do **not** collapse this by fetching every country's cities and merging. Only Germany and Austria are
  seeded *today*; building against that count is the hard-coded-enumeration trap that has already bitten
  this app twice.
- ⚠ **An unrecognised `companyCityId` returns an empty page, not an error** — the backend assumes the id
  came from that dropdown. A stale id therefore looks like "no matches" rather than a fault, so the city
  value must be cleared whenever the country changes.

This needs a lookup surface the app does not have. `lib/types/lookup.types.ts` models
`PropertyCategory` only, and says so deliberately: Country/City were skipped because `Property` carries a
free-text `address` and no city FK. That reasoning still holds for properties and does not extend to
owners, whose **company** does have a city. So `CountryDto` / `CityDto` (`{ id, countryId, nameDe,
nameEn, isActive }`), their reads, and `useCountries()` / `useCities(countryId)` are part of this work.
Labels are locale-picked from `nameDe`/`nameEn`; City has **no `code`** and is referenced by id.

Tabs stay as they are — they are a coarse axis over `onboardingStatus`/`ownerType` and remain the
primary navigation. Where a tab and a filter address the same param, **the tab wins** and that filter is
omitted from the panel on that tab; mixing them silently would produce a query neither control explains.

Three new columns, and each has a labelling rule that is not optional:

- `companyCity` — **render including blanks.** The blank rows are exactly the ones a city filter can
  never return, so a short filtered list explains itself on screen. Hiding the column makes the filter
  silently misleading.
- `lastOrderedAt` — label **"Last order"**, never "Last activity". It measures ordering, not sign-in;
  there is no login-recency data anywhere in this API for any user type.
- `taskCount` — a real count, `0` when none.

#### The sort keys and the export columns are **not** absorbable here — and that is a finding

The changelog entry lists "three sort keys and three export columns" as part of F-02 #4. Neither can be
absorbed as a change, because **neither surface exists anywhere in this app**:

- **No admin table sorts.** `DataTableColumn` is `{ label, className }` — there is no sort affordance, no
  `sortBy`/`dir` in any page's query, on any screen. The owners page sends tab + search + paging only.
- **No admin table exports.** Nothing in the app calls any export route: no `?format=`, no `/export`, no
  `downloadCsv` outside the attendance screen's client-side CSV.

So they are **new features, not migrations**, and they belong to their own spec — column sorting in
particular touches every table in the panel's blast radius and would double this change. What this spec
does instead is leave the door open: the six params include the two range pairs that make a sorted view
useful, and `BACKEND-REVISIONS.md` records the sort keys and export columns as still outstanding so they
are not mistaken for done.

When they are built, two rules from the guide apply and are worth carrying forward now: the `sortBy`
whitelist needs a **default branch** (an unknown key must not fall through), and the export must be read
**by header name, not column position** — it has gone 9 → 10 → 13, so an exact-column-count assertion
breaks for the second time.

### Workers — its own server params, same panel

No new backend surface; this is adoption only, so the workers page stops filtering client-side over one
page of a paged result. Its current tabs behave as the owners tabs do.

### Properties and Tasks — same panel, client and server respectively

Properties keeps `useTableFilters` and simply renders through the extended panel. Tasks moves its four
params server-side, which also raises its row cap from 500 to 5,000 **whenever both date bounds are
sent** — a half-open range stays at 500, so `ADMIN_TASKS_CAP` becomes a function of the query rather
than a constant.

## Validation and error handling

Client-side, before the request, because each of these is a `400` the user can see coming:

| Rule | Why |
|---|---|
| `from ≤ to` on every date range | `invalid_filter_value` |
| `min ≤ max`, neither negative, on every number range | `invalid_filter_value` |
| `neverOrdered=true` disables both date inputs | the combination is a contradiction, refused as `invalid_filter_value` |

Server-side, `invalid_filter_value` and `invalid_sort_column` are already in the error map and stay
mapped to a toast. An unparseable value (`?taskCountMin=abc`) is a **binding** failure and returns
`application/problem+json`, not `{error, detail}` — the shape the existing problem-details handling
covers. Number inputs are typed and validated, so the app should never produce one.

## Testing strategy

The panel is presentational; the logic worth testing is the mapping and the validation, so both live in
plain functions beside their page — the shape `buildWalkInOrder` established.

- `lib/owners/owner-filter-query.ts` — bag → `OwnerListQuery`. Tests: empties dropped rather than sent
  as blanks; `neverOrdered` omitted when `""` and sent when `"false"`; numbers coerced, non-integers
  refused; a tab's param beating the panel's.
- `lib/tasks/admin-task-query.ts` — bag → task query, plus `capFor(query)` returning 5,000 only on a
  fully-closed window.
- `lib/ui/filter-validation.ts` — the three rules above, table-driven.
- The city/country pairing: changing the country **clears** the city value. Tested on the mapper, since a
  stale `companyCityId` returns an empty page rather than an error and would otherwise look like a
  legitimately empty result.

## Sequencing

Two phases, because the first is a shippable feature and the second is adoption:

- **Phase A — the component and Owners.** Extend `FilterBar` with the three kinds, add the
  country/city lookup surface, wire the owners page's ten filters and its three new columns. This closes
  the *filterable* half of F-02 #4 — the half that is absorbable.
- **Phase B — adoption.** Workers, Properties and Tasks move onto the panel; Tasks additionally moves its
  four filters server-side and turns `ADMIN_TASKS_CAP` into a function of the query.

Phase A must land before Phase B starts: three pages adopting a component whose contract is still moving
is how a shared component ends up with per-screen conditionals.

## Out of scope

- Support inbox filters — untouched, by instruction.
- **Column sorting** and **CSV export** on any admin table. Neither exists today (see above); both are new
  features needing their own spec, and both are recorded as outstanding in `BACKEND-REVISIONS.md`.
- Server-side paging for the two unpaginated contract lists (`contract-lifecycle.md` §7.7 flags it as a
  future need).
- Saved or shareable filter state in the URL. Worth doing later; it is not required by any of the three
  gaps and would double the surface of this change.
