# Owner Detail — admin edit and system-owner gating (A1)

**Date:** 2026-08-11
**Backend cards consumed:** F-02b·7 (PR #62, 2026-08-10) · F-02b·6 (PR #63, 2026-08-11)
**Status:** design approved, not yet implemented

---

## 1. Why this exists

Two backend cards landed on 2026-08-10/11. Both target the Owner Detail screen, and the panel has
absorbed neither's UI half:

| Card | What shipped | What the panel does today |
|---|---|---|
| **F-02b·7** | `PUT /api/owners/{id}` — an admin corrects an owner's **legal** first/last name with a mandatory audit reason | nothing. The route has no client at all |
| **F-02b·6** | Four actions now refuse the permanent "Walk-in / Manual Orders" account with `owner_is_system` | the error codes are *mapped*, but nothing is *prevented* — the admin clicks Delete and discovers a `409` |

The second is a shipped defect, not a missing feature. `f-02b-7-admin-owner-edit.md` states the
requirement directly: hide or disable the actions rather than letting the user discover four separate
refusals.

## 2. Scope

**In:** the *actions* on Owner Detail — the new Edit dialog, and gating Edit + Delete for the walk-in
account.

**Out, deliberately** — each is its own section, sequenced after this one:

| Section | Work | Why not here |
|---|---|---|
| B | `POST /api/tasks/admin/groups` walk-in order form | a new screen; shares no code with this one |
| A2 | F-02a·1's four task-list filters + weekly bucketing | same page, different component tree (`ActivityTimeline`) |
| C | `bossOwnerName` cleanup, `(0,0)` map guard | property surface |
| D | owners CSV/XLSX export (now 10 columns) | unbuilt end to end |

**Also out:** the `Message` and `Create contract` refusals. `f-02b-6-…` §5 lists four gated actions, but
only two of them are reachable from this screen — the other two live elsewhere and Owner Detail offers no
route to them today. Gating them belongs to whichever section builds them.

## 3. The blocking constraint, and the decision taken

`GET /api/owners/{id}` returns `OwnerSummaryDto` — seven fields, verified against the backend record in
`GermanyERP.Domain/Models/DTOs/Owners/OwnerDtos.cs`. It carries **neither `ownerType` nor `isSystem`**, so
the detail page cannot tell that it is looking at the walk-in account.

Fetching the owner's *table row* is not an option: `GET /api/admin/owners` filters by free-text `search`
over name/email/phone and has no id filter.

**Decision — do both, in parallel:**

1. **Now:** resolve the walk-in id client-side with `GET /api/admin/owners?ownerType=Default&pageSize=1`,
   cached at `staleTime: Infinity`. One request per session; a bootstrap account id cannot change under a
   running session.

   This leans on the account existing at all. It does — the "Walk-in / Manual Orders" owner **and** its
   property were both observed in this panel's own data on 2026-08-11, in read-only browser checks against
   the API the panel targets, hours after PR #63 merged. The seed has run there. If a *different*
   environment is ever pointed at without the seed, the query returns `total: 0`, `walkInId` stays `null`,
   and gating is inert — see §11.
2. **Ask the backend** to add `ownerType` (or `isSystem`) to `OwnerSummaryDto`. When it lands, the lookup
   is deleted and `ownerDetailActions` takes the field directly — the pure function is the only consumer,
   so the change is one call site.

The client-side path ships first so nothing waits on the request.

## 4. Data flow

```
OwnerDetailPage(id)
├─ useOwner(id)              OwnerSummaryDto        existing
├─ useOwnerKyc(id)           KycProfileDto          NEW
│     └→ onboardingStatus · identity.firstName · identity.lastName
│        200 / 404 / 403 are three different facts — see §5
├─ useWalkInOwnerId()        string | null          NEW · staleTime: Infinity
├─ useOwnerProperties(id)                           existing
└─ useOwnerTaskGroups(id)                           existing
```

`useOwnerKyc` hits `GET /api/admin/kyc/owner/{ownerUserId}` (permission `kyc:review`, 40011) and returns
`KycProfileDto`, whose `identity` block carries the legal name pair and whose `onboardingStatus` decides
whether the name is editable.

> **Naming hazard.** `kycService.getProfile` already exists and takes an **`ownerProfileId`**, hitting
> `/api/admin/kyc/{ownerProfileId}`. The new method takes an **`ownerUserId`** and hits
> `/api/admin/kyc/owner/{ownerUserId}`. These two ids are different and have been confused in this repo
> before (commit `0872669`). The new method is therefore named `getProfileByOwner`, not an overload.

## 5. The decision function

All three sources collapse into one pure function, so the logic is testable — vitest in this repo runs in
a node environment over `lib/**` and `hooks/**` only, with no jsdom and therefore no component tests.
Logic left inside a component is logic left unverified.

```ts
// lib/owners/detail-actions.ts
export type KycRead = "visible" | "forbidden" | "absent";
export type NameLock = "self-editable" | "no-profile" | "system" | null;

export interface OwnerDetailActions {
  isWalkIn: boolean;
  canEdit: boolean;
  canDelete: boolean;
  nameLock: NameLock;
}

export function ownerDetailActions(input: {
  ownerId: string;
  walkInId: string | null;
  kycRead: KycRead;
  onboardingStatus: string | null;   // meaningful only when kycRead === "visible"
}): OwnerDetailActions;
```

`kycRead` is a three-state discriminant, not a boolean, because that one call has three distinct
outcomes and two of them are not the same fact:

| Outcome | Means |
|---|---|
| `200` | the owner has an `OwnerProfile`. Its `identity` fields may still be **all null** — `OwnerIdentityDto` is documented as "always present, its own fields null until filled" |
| `404` | no profile row at all — a `MANAGER`/`PROPERTY_ADMIN` sub-account. This is the state that produces `400 owner_profile_not_found` |
| `403` | the caller lacks `kyc:review` (40011). Says nothing about the owner |

**An empty identity is not a missing profile.** An owner at `Kyc` who has not filled the form yet returns
`200` with `firstName: null` — `owner_profile_not_found` would *not* fire for them, so their `nameLock` is
`"self-editable"` (they can fill it themselves), never `"no-profile"`. Collapsing the two into a boolean
would put the wrong message on that row.

`nameLock` is a union rather than a boolean because the three reasons need three different messages:
"the owner can correct this themselves" is not "this account has no name record" is not "this is a system
account". Collapsing them would repeat the exact mistake F-02b·7 removed — `boss_has_active_properties`
rendered a correct refusal with advice that could not help.

### Guard matrix

The walk-in check wins over everything, mirroring the server: `owner_is_system` is returned ahead of every
other check on both routes.

| State | Edit | Delete | Name fields | `nameLock` |
|---|---|---|---|---|
| Walk-in account | hidden | hidden | — | `"system"` |
| `kycRead: "absent"` — sub-account | hidden | shown | no record exists | `"no-profile"` |
| `kycRead: "forbidden"` | hidden | shown | — | `null` |
| `visible` + `Kyc` / `Rejected` | **shown** | shown | read-only | `"self-editable"` |
| `visible` + `Kyc`, identity all null | **shown** | shown | read-only, empty | `"self-editable"` |
| `visible` + `Review` / `Approved` / `Contract` / `Active` | shown | shown | editable | `null` |

`"forbidden"` hides Edit rather than showing a fourth message: without the read there is no way to
prefill the form or to know whether the name is currently editable, so opening it would be guessing.

**The blank-field hazard.** An empty string is read by the endpoint as "leave unchanged", never as
"clear". A form prefilled from a null identity and saved untouched therefore sends `""`, changes nothing,
writes no audit entry, and still returns `200` — a silent no-op that looks like success. The dialog must
send only fields that hold a non-empty value, and must refuse to submit when both are empty.

## 6. Two consequences that shape the UI

### 6.1 A locked form still opens

The form is names-only (the picture field was cut: the endpoint cannot *clear* a value, only replace one,
so avatar moderation — the only admin use for it — does not work anyway). That means at `Kyc`/`Rejected`
every field is read-only and the form has nothing to do.

The Edit button stays visible wherever an identity record exists — so at `Kyc`/`Rejected`, but still not
for a sub-account or the walk-in account, which have no name to show. The dialog opens, shows the current
legal name, states that the owner can correct it themselves at this stage, and disables Save. A hidden button would leave the admin
with no answer to "why can't I edit this?" — the same failure the walk-in banner exists to prevent.

### 6.2 The edited name must be displayed, or the edit looks like a no-op

`PUT /api/owners/{id}` writes `firstName`/`lastName` — the **legal** name from the passport. Every surface
on this screen shows `fullName`, the **display** name the owner chose at registration. The guide is
explicit that the two are deliberately never reconciled and may legitimately differ.

So without a change, an admin corrects the name, receives `200`, and sees nothing change anywhere — not in
the hero card, not in the owners table.

**Requirement:** Owner Detail must render the legal name as its own labelled row in `ContactCard`, visually
distinct from the display name. This is not optional polish; without it the feature's result is invisible.

### 6.3 The success handler merges the response; it does not refetch

`["owners-table"]` is **not** invalidated — the table renders `fullName`, which this endpoint never
touches, so a refetch would return byte-identical rows.

`["owner-kyc", id]` is **not** invalidated either. The `200` body (`AdminOwnerProfileDto`) already carries
`firstName`, `lastName` and `onboardingStatus`, so the handler merges those three into the cached
`KycProfileDto` with `setQueryData`, leaving `documents` and `company` untouched.

This is not an optimisation. Refetching that key requires `kyc:review` (40011), and §11 records that an
admin can hold `owner:profile:update_any` (30005) without it. Invalidating would mean such an admin saves
successfully and is then shown a `403` where the result should be — the edit works, and the screen says it
failed. Merging keeps the write self-sufficient.

### 6.4 The guards are async — the actions must wait for them

`OwnerActions` renders as soon as `useOwner` resolves. Both new guards arrive on their own queries, so
without a wait the walk-in account renders Edit and Delete for as long as those take, and a fast admin can
click inside that window — which is the exact defect this section exists to remove.

The actions therefore render only once **both** `walkInId` and `kycRead` have settled. A guard that is
merely *usually* applied is not a guard.

The wait is scoped to the **action row alone**, not the page. Nothing else on the screen depends on those
two reads, and blocking the hero card, properties and timeline on them would slow every owner view to buy
safety only the buttons need. The slot holds a small skeleton so the header does not jump when they land.

Anything other than `403`/`404` from the KYC read — a `500`, a dropped connection — resolves to
`"forbidden"`. Failing closed hides a button that might have worked; failing open offers one that will not.

### 6.5 Two smaller consequences

- **`buildOwnerUpdateBody` is a pure, tested function,** not inline dialog code. The `""`-means-unchanged
  rule (§5) makes body construction the one place a silent no-op can be introduced, and it is the kind of
  thing that reads correct and behaves wrong.
- **The hero card's `mailto:` should be dropped for the walk-in account.** Its address is a bootstrap
  config value on an account that cannot log in and receives no mail. Not in the guide's list of four,
  because it is our own control, not a backend route — but it is the same dead affordance.

## 7. Error handling

`PUT /api/owners/{id}`:

| Code | HTTP | Message conveys |
|---|---|---|
| `reason_required` | 400 | also blocked client-side; still handled |
| `owner_profile_not_found` | 400 | this account has no name record (sub-account) |
| `owner_can_self_edit` | 409 | the owner can correct it themselves right now |
| `owner_is_system` | 409 | system account |
| `owner_not_found` | 404 | missing, or already soft-deleted |
| *(no code)* | **403, empty body** | insufficient permission |

The `403` carries **no body**, so `getApiErrorCode` returns `null`. This does not need new code:
`isPermissionDenied` in `lib/onboarding/errors.ts` already tests `status === 403 && code === null`. Use it.

The Edit button is gated with `Can permission="owner:profile:update_any"`, but that is only the first
layer — permission 30005 can be granted to a custom role, and the gate is a UI convenience, not an
authorization boundary.

> **Do not route these through `ErrorNotice`.** The shared catalog maps `owner_profile_not_found` to
> `subjectNotFound` — "the subject does not exist" — which is correct on the *contract* routes it was
> written for and **wrong here**, where it means "this account has no identity record" about an owner the
> admin is currently looking at. `f-02b-7-admin-owner-edit.md` §7 lists its error tables per route for
> exactly this reason: the same code differs by route. The catalog also has no entry for `reason_required`
> or `owner_can_self_edit`, which would both degrade to "unknown".
>
> `OwnerActions` already owns a local `mapError`; extend it. The reuse worth taking from the shared module
> is `isPermissionDenied`, not the message catalog.

**A `200` does not prove anything changed.** A no-op edit returns `200` and writes no audit entry. The
response is not compared; the dialog closes and the two queries refetch.

## 8. A defect fixed along the way

`useSoftDeleteOwner` invalidates `["owner-directory"]`. Commit `c4458ee` (2026-08-11) moved the owners
table onto `["owners-table"]` and did not update the invalidation. With the global `staleTime` of 60 s,
deleting an owner and returning to the list shows the deleted row for up to a minute.

This is in the file the section already edits, so it is fixed here rather than left for a later sweep.

## 9. Files

| File | Change |
|---|---|
| `lib/owners/detail-actions.ts` | **new** — the pure decision function + `buildOwnerUpdateBody` |
| `lib/owners/detail-actions.test.ts` | **new** — the guard matrix and the blank-field rule |
| `lib/types/owner.types.ts` | `AdminUpdateOwnerProfileRequest`, `AdminOwnerProfileDto`. `KycProfileDto` already carries `identity` — no change there |
| `lib/services/owner.service.ts` | `updateOwner(id, body)` |
| `lib/services/kyc.service.ts` | `getProfileByOwner(ownerUserId)` |
| `hooks/use-owners.ts` | `useOwnerKyc`, `useWalkInOwnerId`, `useUpdateOwner`; fix the stale invalidation key |
| `components/owners/owner-edit-dialog.tsx` | **new** — legal name pair + mandatory reason |
| `components/owners/owner-actions.tsx` | Edit beside Delete; both driven by `ownerDetailActions` |
| `components/owners/contact-card.tsx` | legal-name row (§6.2) |
| `app/[locale]/dashboard/(owner)/owners/[id]/page.tsx` | wire the two hooks, system-owner banner, onboarding badge on the hero card |
| `messages/{en,de}.json` | dialog copy, five error messages, banner, lock reasons |
| `scripts/verify-v2.mjs` | `AdminOwnerProfileDto`, `AdminUpdateOwnerProfileRequest`, `KycProfileDto.identity` |

The onboarding stage goes on the hero card as a badge, not into the stat-card row — that grid is
`lg:grid-cols-4` with four cards, and a fifth would leave an orphan cell. A badge also matches how the
owners table renders the same fact.

## 10. Gates

`tsc` · `lint` · `vitest` · `build` · `verify-v2` against live swagger.

`verify-v2` is one-directional — it asserts that fields the client declares exist server-side, and can
never redden when the server *adds* a field. It did not catch `bossOwnerName`, and it will not catch the
next one. It is a regression gate, not a change-detection gate.

## 11. Risks

- **`walkInId` can be `null` for two unrelated reasons**, and both leave gating inert — the buttons render
  and the admin discovers the `409`, exactly the defect this section exists to fix. The causes are an
  admin holding `owner:read` but not `owner:list` (the lookup `403`s), and an unseeded environment
  (`total: 0`). The query must degrade to `null` rather than failing the page, and the degradation is
  worth logging, because a silently inert guard is indistinguishable from a working one until someone
  clicks. Both causes disappear when the backend adds `ownerType` to `OwnerSummaryDto` (§3), which is the
  real fix and the reason to ask for it rather than treat the client-side lookup as permanent.

  **It degrades partially rather than completely.** With `walkInId` null the walk-in account falls to
  `kycRead: "absent"` — it genuinely has no onboarding record — so Edit is still hidden and its message
  ("no name record on this account") is still true. Only Delete stays exposed. Half the defect survives,
  not all of it.
- **`nameLock: "no-profile"` is defensive, not a path the UI reaches.** The owners table is BOSS-only
  (`fnd-3-table-query.md` §4: sub-accounts never appear), and `SubAccountsCard` renders no links, so no
  screen navigates to a sub-account's detail page. The branch stays because the URL is hand-constructible
  and because it is what catches the walk-in account when the guard above is inert — but it should not be
  described as the sub-account experience, since there is no route to it.
- **`GET /api/admin/kyc/owner/{id}` needs `kyc:review` (40011),** which `owner:profile:update_any` (30005)
  does not imply. A custom role granted 30005 alone sees no Edit button at all — `kycRead: "forbidden"`
  hides it. That is deliberate (§5), but it means the two permissions should be granted together; worth
  saying in the role documentation rather than leaving to discovery.
- **No visual verification.** The Chrome extension has been disconnected since 2026-08-11; the last five
  commits are unverified in a browser. This section should be checked visually before it is called done.
