# Phase 4 — Lookups, Admin-Initiated Ticket, Notification Deep Links — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins CRUD over the three configurable lookups, let them open a support ticket on a user's behalf, and make every new notification type land on the right screen.

**Architecture:** Three unrelated deliverables that share one property — each is a thin surface over an endpoint that already exists, so the work is almost entirely correctness-of-detail. FND-1's details are unusual enough to be the main risk: **no delete endpoint exists anywhere in that domain**, `code` and `countryId` are immutable after create, update DTOs are all-nullable meaning "leave unchanged", and `includeInactive` is silently ignored rather than refused for callers without the `:update` permission. FND-2's owner-side literal is unconfirmed and is isolated behind one constant. Notification routing must branch on `metadata.sourceKey`, not on `entityType`.

**Tech Stack:** Next.js 16 App Router, next-intl, TanStack react-query v5, Tailwind v4, vitest.

**Depends on:** Phase 1 Close (all 8 tasks). Runs on **G4 only** — independent of Phases 2 and 3. **G6 blocks Task 6 only.**

---

## What Phase 0 already built

The roadmap's Phase 4 outline lists "notification types 44/47/48/51/52/54/56 + entity types" as task 7.
**That is done.** `lib/types/notification.types.ts:7-13` already declares all seven admin-facing types,
`:17-24` already includes `OwnerContract`, `WorkerContract`, `SupportTicket` and `Onboarding`, and the
union ends in `(string & {})` so an unknown type renders rather than crashing.

`lib/notifications/route.ts` also exists and already handles the entity types. What it does **not** do
is branch on `metadata.sourceKey` — it routes on `entityType` alone, which spec §10 `:687` says lands
the admin on the wrong screen. That correction is Task 7 below, and it is the whole of the
notification work.

---

## Global Constraints

1. **FND-1 has no delete endpoint. Anywhere.** Spec §8 `:633`, confirmed at
   `Backend/docs/handoff/fnd-1-configurable-lookups.md:90`: *"No delete endpoint exists anywhere in
   this domain. Set `isActive=false` on update to deactivate; `true` to reactivate."* The UI must
   offer **Deactivate**, never Delete, and must not render a trash icon. The existing
   `settings/professions` screen is the pattern for *layout* only — professions **do** have a delete
   endpoint, and copying its `Trash2` affordance here would build a button with no endpoint behind it.
2. **`code` is immutable; so is `countryId`.** Both are accepted only on create and **silently
   ignored** on update (`fnd-1:88-89`). A form that sends them on edit does not error — it just has no
   effect, which is worse. Render `code` read-only when editing.
3. **Update DTOs are all-nullable, meaning "leave unchanged".** Send only what actually changed
   (`fnd-1:91`). Sending the full object on every save is not equivalent: it is the difference between
   "no change" and "set to the same value", and future server-side change tracking will read them
   differently.
4. **Deactivating a country does not cascade to its cities.** Spec §8 `:638`. The UI must not imply it
   does, must not show a confirmation claiming it will, and must not deactivate cities itself.
5. **Deactivating never breaks existing references.** A property tagged `HOTEL` keeps rendering
   "Hotel"; only new-selection pickers hide inactive rows. Do not warn about breaking data.
6. **`includeInactive=true` is honoured only for callers holding that entity's `:update` permission,
   and is silently ignored — not 403 — otherwise** (`fnd-1:635`). So a "show inactive" toggle can
   appear to do nothing with no error anywhere. Gate the toggle on the permission so it is never
   shown to someone it will silently ignore.
7. **Names render by locale from `nameDe` / `nameEn`. There is no `?lang=`.** Spec §8 `:641`.
8. **FND-2's owner-side literal is unconfirmed.** Spec §9 `:653`: the guide's prose says `"Owner"`
   while its own error catalog says `OwnerUser`. This is **gate G6** and needs one live call. It lives
   behind a single exported constant so flipping it is a one-line change.
9. **On the FND-2 response, `requesterUserId`/`requesterUserType` are the *recipient*, not the
   admin.** `assignedAdminId` is the caller (spec §9 `:658`). Never assume `requesterUserId == me`.
   And `requesterUserType` is SCREAMING_SNAKE (`WORKER` / `OWNER_USER`) while `status`, `category`
   and `priority` on the same object are PascalCase — do not write one comparison helper for all four.
10. **`X-Idempotency-Key` is required on the ticket create.** Mint it once per dialog opening, reuse
    it across retries of that attempt, and never regenerate per submit — a retry must replay, not
    open a second ticket. `contracts/page.tsx:89` already does exactly this for renewals; follow it.
11. **Route the expiry alert on `metadata.sourceKey`, not `entityType`.** Spec §10 `:687`.
12. **Permission-aware rendering.** FND-1 create/update codes: `property_category:create` (160001) /
    `:update` (160002), `country:create` (160011) / `:update` (160012), `city:create` (160021) /
    `:update` (160022). FND-2: `support_ticket:create_for_user` (120015).
13. **en/de parity exact.** The lookup DTOs themselves carry `nameDe` — German is not an afterthought
    in this domain, it is in the schema.
14. **Gates:** `npm run test` green, `npx tsc --noEmit` 0, `npm run lint` **0**, `npm run build`
    compiles.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `lib/types/lookup.types.ts` | **New.** Three DTOs, create/update requests, permission map | 1 |
| `lib/services/lookup.service.ts` | **New.** Six endpoints across three entities | 1 |
| `hooks/use-lookups.ts` | **New.** Queries + create/update mutations, per entity | 1 |
| `lib/lookups/localized-name.ts` | **New.** `nameDe`/`nameEn` by locale | 2 |
| `lib/lookups/localized-name.test.ts` | **New.** | 2 |
| `lib/lookups/changed-fields.ts` | **New.** "Send only what changed" diff | 2 |
| `lib/lookups/changed-fields.test.ts` | **New.** | 2 |
| `components/lookups/lookup-table.tsx` | **New.** Shared CRUD table — no delete affordance | 3 |
| `components/lookups/lookup-form-dialog.tsx` | **New.** `nameDe`/`nameEn`, create-only `code` | 3 |
| `app/[locale]/dashboard/settings/property-categories/page.tsx` | **New.** | 4 |
| `app/[locale]/dashboard/settings/countries/page.tsx` | **New.** Cities nested per country row | 4 |
| `lib/nav-items.ts` | Two `navExtraGates` entries | 4 |
| `lib/services/support.service.ts` | `openForUser` with the idempotency header | 5 |
| `components/support/admin-ticket-dialog.tsx` | **New.** | 5 |
| `lib/notifications/route.ts` | Branch on `metadata.sourceKey` | 7 |
| `lib/notifications/route.test.ts` | **New.** | 7 |

---

## A note on detail density

Tasks 1, 2 and 7 carry complete code — types, pure helpers, and routing logic, all decidable here.
**Tasks 3, 4 and 5 specify constraints and copy rather than markup.** Each is a
`general-purpose + frontend-design` task per the roadmap's agent-assignment table
(`2026-08-04-v2-migration-roadmap.md:47`), so the layout is that skill's to choose.

What those three tasks do fix is every detail a wrong choice would get wrong, and each is a review
rejection if missed: no delete affordance anywhere, `code` read-only on edit, the country deactivation
copy stating that cities are untouched, `includeInactive` gated on the update permission, the
idempotency key held in a ref across retries, and the full en/de copy verbatim. Those are the parts
that come from the backend's behaviour rather than from taste, and they are the parts a designer
cannot derive.

---

## Task 1: Lookup types, service, hooks

**Files:**
- Create: `lib/types/lookup.types.ts`, `lib/services/lookup.service.ts`, `hooks/use-lookups.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface PropertyCategoryDto { id: string; code: string; nameEn: string; nameDe: string; isActive: boolean }
  export interface CountryDto { id: string; code: string; nameEn: string; nameDe: string; isActive: boolean }
  export interface CityDto { id: string; countryId: string; nameEn: string; nameDe: string; isActive: boolean }
  /** `code` accepted only here. */
  export interface CreateLookupRequest { code?: string; nameEn: string; nameDe: string }
  /** Every field optional = "leave unchanged". `code` and `countryId` are ignored if sent. */
  export interface UpdateLookupRequest { nameEn?: string; nameDe?: string; isActive?: boolean }
  export type LookupEntity = "propertyCategory" | "country" | "city";
  export const LOOKUP_PERMISSIONS: Record<LookupEntity, { create: string; update: string }>;
  ```

- [ ] **Step 1: Read the DTO field names from the backend before writing anything**

Do not infer them from the spec summary. Read the guide's own response examples:

```bash
sed -n '107,160p' "D:/projekts/ERP-Uyer/Backend/docs/handoff/fnd-1-configurable-lookups.md"
```

Confirm four things and write each into a comment in the type file: the exact casing of `nameEn` /
`nameDe`, whether `CityDto` carries `countryId` or a nested country object, whether the list response
is a bare array or an envelope, and whether `code` exists on `City` at all — spec §8 `:631` says
`code` is create-only for `PropertyCategory` and `Country`, and `fnd-1:89` names `countryId` as the
immutable field on `City`, which suggests City has **no** code.

- [ ] **Step 2: Write the types**

```ts
// lib/types/lookup.types.ts

/**
 * FND-1 configurable lookups. Three entities, one shape, and one rule that
 * shapes the whole UI: **there is no delete endpoint anywhere in this domain**
 * (`Backend/docs/handoff/fnd-1-configurable-lookups.md:90`). `isActive` is the
 * only lifecycle field.
 */
export interface PropertyCategoryDto {
  id: string;
  /** Normalized `Trim().ToUpperInvariant()` at create. Immutable afterwards. */
  code: string;
  nameEn: string;
  nameDe: string;
  isActive: boolean;
}

export interface CountryDto {
  id: string;
  code: string;
  nameEn: string;
  nameDe: string;
  isActive: boolean;
}

export interface CityDto {
  id: string;
  /** Immutable after create — a city cannot be moved to another country. */
  countryId: string;
  nameEn: string;
  nameDe: string;
  isActive: boolean;
}

export type LookupDto = PropertyCategoryDto | CountryDto | CityDto;

/** `code` is accepted **only** on create; sending it on update is silently ignored. */
export interface CreateLookupRequest {
  code?: string;
  nameEn: string;
  nameDe: string;
}

/**
 * Every field optional, meaning **"leave unchanged"**. Send only what changed:
 * omitting a field is not the same as setting it to its current value, and the
 * server distinguishes them.
 */
export interface UpdateLookupRequest {
  nameEn?: string;
  nameDe?: string;
  isActive?: boolean;
}

export type LookupEntity = "propertyCategory" | "country" | "city";

/** Permission codes from `Backend/index/controllers/lookups.md` (160000s family). */
export const LOOKUP_PERMISSIONS: Record<
  LookupEntity,
  { create: string; update: string }
> = {
  propertyCategory: {
    create: "property_category:create", // 160001
    update: "property_category:update", // 160002
  },
  country: {
    create: "country:create", // 160011
    update: "country:update", // 160012
  },
  city: {
    create: "city:create", // 160021
    update: "city:update", // 160022
  },
};
```

- [ ] **Step 3: Write the service**

Note the asymmetry: a city is **created** under its country but **updated** at a top-level path.

```ts
// lib/services/lookup.service.ts
import { apiClient } from "@/lib/http/client";
import type {
  CityDto, CountryDto, CreateLookupRequest, PropertyCategoryDto, UpdateLookupRequest,
} from "@/lib/types/lookup.types";

/**
 * `includeInactive=true` is honoured **only** for callers holding that entity's
 * `:update` permission, and is **silently ignored** otherwise — not 403
 * (`fnd-1:635`). So a "show inactive" toggle can appear broken with no error
 * anywhere. Gate the toggle on the permission rather than debugging the request.
 */
export const lookupService = {
  listPropertyCategories: async (includeInactive = false): Promise<PropertyCategoryDto[]> => {
    const { data } = await apiClient.get<PropertyCategoryDto[]>("/api/property-categories", {
      params: includeInactive ? { includeInactive: true } : {},
    });
    return data;
  },
  createPropertyCategory: async (body: CreateLookupRequest): Promise<PropertyCategoryDto> => {
    const { data } = await apiClient.post<PropertyCategoryDto>("/api/property-categories", body);
    return data;
  },
  updatePropertyCategory: async (
    id: string, body: UpdateLookupRequest,
  ): Promise<PropertyCategoryDto> => {
    const { data } = await apiClient.put<PropertyCategoryDto>(`/api/property-categories/${id}`, body);
    return data;
  },

  listCountries: async (includeInactive = false): Promise<CountryDto[]> => {
    const { data } = await apiClient.get<CountryDto[]>("/api/countries", {
      params: includeInactive ? { includeInactive: true } : {},
    });
    return data;
  },
  createCountry: async (body: CreateLookupRequest): Promise<CountryDto> => {
    const { data } = await apiClient.post<CountryDto>("/api/countries", body);
    return data;
  },
  updateCountry: async (id: string, body: UpdateLookupRequest): Promise<CountryDto> => {
    const { data } = await apiClient.put<CountryDto>(`/api/countries/${id}`, body);
    return data;
  },

  listCities: async (countryId: string, includeInactive = false): Promise<CityDto[]> => {
    const { data } = await apiClient.get<CityDto[]>(`/api/countries/${countryId}/cities`, {
      params: includeInactive ? { includeInactive: true } : {},
    });
    return data;
  },
  /** Created **under** its country… */
  createCity: async (countryId: string, body: CreateLookupRequest): Promise<CityDto> => {
    const { data } = await apiClient.post<CityDto>(`/api/countries/${countryId}/cities`, body);
    return data;
  },
  /** …but updated at a **top-level** path (`fnd-1:173`). Not a typo. */
  updateCity: async (id: string, body: UpdateLookupRequest): Promise<CityDto> => {
    const { data } = await apiClient.put<CityDto>(`/api/cities/${id}`, body);
    return data;
  },
};
```

- [ ] **Step 4: Write the hooks**

Follow `hooks/use-professions.ts` exactly — same query-key and invalidate shape. **No delete hook**
for any entity.

```ts
export const LOOKUP_KEYS = {
  propertyCategories: (inc: boolean) => ["property-categories", inc] as const,
  countries: (inc: boolean) => ["countries", inc] as const,
  cities: (countryId: string, inc: boolean) => ["cities", countryId, inc] as const,
};
```

`includeInactive` belongs in the key: the two lists are different data, and sharing a key would show
inactive rows after the toggle is turned off.

**Export exactly these nine hook names.** Tasks 3 and 4 refer to them by name, so they are part of
the interface, not a detail:

```ts
export function usePropertyCategories(includeInactive?: boolean): UseQueryResult<PropertyCategoryDto[]>;
export function useCreatePropertyCategory(): UseMutationResult<…>;
export function useUpdatePropertyCategory(): UseMutationResult<…>;

export function useCountries(includeInactive?: boolean): UseQueryResult<CountryDto[]>;
export function useCreateCountry(): UseMutationResult<…>;
export function useUpdateCountry(): UseMutationResult<…>;

/** `enabled` so cities load only for an expanded country row. */
export function useCities(
  countryId: string, includeInactive?: boolean, enabled?: boolean,
): UseQueryResult<CityDto[]>;
export function useCreateCity(): UseMutationResult<…>;
export function useUpdateCity(): UseMutationResult<…>;
```

`enabled` is positional on `useCities`, matching `hooks/use-workers.ts:13` and
`hooks/use-contracts.ts` rather than introducing a second convention.

**There is no `useDeleteX` for any of the three.** No delete endpoint exists.

Deactivating a country invalidates `["countries"]` only — **not** its cities. Constraint 4: there is no
cascade, so invalidating cities would imply one.

- [ ] **Step 5: Gates and commit**

```bash
npx tsc --noEmit && npm run lint && npm run build
git add lib/types/lookup.types.ts lib/services/lookup.service.ts hooks/use-lookups.ts
git commit -m "$(cat <<'EOF'
feat(lookups): FND-1 types, service and hooks — no delete anywhere

There is no delete endpoint in this domain at all; isActive is the only
lifecycle field. No delete hook exists here so no screen can reach for one.

Two shapes worth flagging in code. A city is created under its country
(/api/countries/{id}/cities) but updated at a top-level path (/api/cities/{id}).
And includeInactive is silently ignored — not refused — for callers without the
entity's :update permission, so it belongs in the query key and behind a
permission check rather than in a bug report.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Two pure helpers — localized names, and "send only what changed"

**Files:**
- Create: `lib/lookups/localized-name.ts` + `.test.ts`
- Create: `lib/lookups/changed-fields.ts` + `.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function localizedName(row: { nameEn: string; nameDe: string }, locale: string): string;
  export function changedFields<T extends Record<string, unknown>>(before: T, after: T): Partial<T>;
  ```

- [ ] **Step 1: Write both failing tests**

```ts
// lib/lookups/localized-name.test.ts
import { describe, expect, it } from "vitest";
import { localizedName } from "@/lib/lookups/localized-name";

describe("localizedName", () => {
  const row = { nameEn: "Hotel", nameDe: "Hotel Betrieb" };

  it("picks German for de and any de-* locale", () => {
    expect(localizedName(row, "de")).toBe("Hotel Betrieb");
    expect(localizedName(row, "de-AT")).toBe("Hotel Betrieb");
    expect(localizedName(row, "de-CH")).toBe("Hotel Betrieb");
  });

  it("picks English for anything else", () => {
    expect(localizedName(row, "en")).toBe("Hotel");
    expect(localizedName(row, "en-GB")).toBe("Hotel");
    expect(localizedName(row, "fr")).toBe("Hotel");
  });

  it("falls back to the other language rather than rendering an empty cell", () => {
    expect(localizedName({ nameEn: "Hotel", nameDe: "" }, "de")).toBe("Hotel");
    expect(localizedName({ nameEn: "", nameDe: "Hotel Betrieb" }, "en")).toBe("Hotel Betrieb");
  });

  it("returns an em dash when both are blank", () => {
    expect(localizedName({ nameEn: "", nameDe: "   " }, "de")).toBe("—");
  });
});
```

```ts
// lib/lookups/changed-fields.test.ts
import { describe, expect, it } from "vitest";
import { changedFields } from "@/lib/lookups/changed-fields";

describe("changedFields", () => {
  it("returns only what differs", () => {
    const before = { nameEn: "Hotel", nameDe: "Hotel", isActive: true };
    const after = { nameEn: "Hostel", nameDe: "Hotel", isActive: true };
    expect(changedFields(before, after)).toEqual({ nameEn: "Hostel" });
  });

  it("returns an empty object when nothing changed", () => {
    const same = { nameEn: "Hotel", nameDe: "Hotel", isActive: true };
    expect(changedFields(same, { ...same })).toEqual({});
  });

  it("includes a boolean flipped to false", () => {
    // A falsy value must not be mistaken for "absent" — deactivating is the
    // only lifecycle action this domain has, and dropping it would make the
    // one button that matters do nothing.
    expect(
      changedFields({ isActive: true }, { isActive: false }),
    ).toEqual({ isActive: false });
  });

  it("includes a field cleared to an empty string", () => {
    expect(changedFields({ nameDe: "Hotel" }, { nameDe: "" })).toEqual({ nameDe: "" });
  });

  it("ignores keys absent from the after object", () => {
    expect(changedFields({ nameEn: "Hotel", code: "HOTEL" }, { nameEn: "Hotel" })).toEqual({});
  });
});
```

- [ ] **Step 2: Run both and watch them fail**

Run: `npm run test`

- [ ] **Step 3: Write both modules**

```ts
// lib/lookups/localized-name.ts

/**
 * Lookup names come as `nameEn` + `nameDe` on the DTO — there is no `?lang=`
 * parameter, so the client picks (spec §8 `:641`).
 *
 * Falls back to the other language rather than rendering an empty cell: a
 * half-translated lookup is common while the catalogue is being filled in, and a
 * blank row tells an admin nothing about which row it is.
 */
export function localizedName(
  row: { nameEn: string; nameDe: string },
  locale: string,
): string {
  const preferGerman = locale.toLowerCase().startsWith("de");
  const first = preferGerman ? row.nameDe : row.nameEn;
  const second = preferGerman ? row.nameEn : row.nameDe;
  return first?.trim() || second?.trim() || "—";
}
```

```ts
// lib/lookups/changed-fields.ts

/**
 * The fields that actually differ, for FND-1's all-nullable update DTOs where an
 * omitted field means "leave unchanged" (`fnd-1:91`).
 *
 * Sending the whole object instead is **not** equivalent. "Unchanged" and "set to
 * the same value" are different statements, and the server distinguishes them.
 *
 * Compares with `!==`, so `false` and `""` count as changes — dropping a falsy
 * value would make Deactivate, the only lifecycle action this domain has, do
 * nothing at all.
 */
export function changedFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
): Partial<T> {
  const diff: Partial<T> = {};
  for (const key of Object.keys(after) as (keyof T)[]) {
    if (after[key] !== before[key]) diff[key] = after[key];
  }
  return diff;
}
```

- [ ] **Step 4: Run and watch both pass, then commit**

```bash
npm run test && npx tsc --noEmit
git add lib/lookups/
git commit -m "$(cat <<'EOF'
feat(lookups): localized names, and a diff for the all-nullable update DTOs

FND-1 update DTOs treat an omitted field as "leave unchanged", so sending the
whole object is not equivalent to sending the change. changedFields compares
with !== so that false and "" count — dropping a falsy value would make
Deactivate, the only lifecycle action this domain has, silently do nothing.

localizedName falls back to the other language rather than rendering a blank
cell, because a half-translated catalogue is the normal state while it is being
filled in.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Shared lookup table and form

**Files:**
- Create: `components/lookups/lookup-table.tsx`, `components/lookups/lookup-form-dialog.tsx`
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Consumes: `localizedName`, `changedFields`, `LOOKUP_PERMISSIONS`, `useHasPermission`.
- Produces:
  ```tsx
  export function LookupTable<T extends LookupDto>({
    title, subtitle, rows, isLoading, error,
    showInactive, onShowInactiveChange,
    canCreate, canUpdate,
    onCreate, onEdit, onToggleActive,
    /** Optional expanding sub-row, used by countries for their cities. */
    renderExpanded,
    /** True when `code` applies to this entity — false for City. */
    hasCode,
  }: { … }): React.ReactElement;

  export function LookupFormDialog({
    mode, row, hasCode, onSubmit, onClose, isPending, errorCode,
  }: { … }): React.ReactElement;
  ```

- [ ] **Step 1: Build the table — Deactivate, never Delete**

Layout follows `app/[locale]/dashboard/settings/professions/page.tsx`, with one deliberate divergence
stated in a comment at the top of the file:

```tsx
/**
 * Shared CRUD table for the three FND-1 lookups.
 *
 * Modelled on the professions screen for layout, with **one deliberate
 * difference: there is no delete affordance.** FND-1 has no delete endpoint for
 * any of its three entities (`fnd-1:90`) — `isActive` is the entire lifecycle.
 * Copying the professions screen's Trash2 button would build a control with no
 * endpoint behind it.
 *
 * Deactivating is also **not** destructive and must not be worded as though it
 * were: a property already tagged `HOTEL` keeps rendering "Hotel"; only
 * new-selection pickers hide the row (spec §8 `:639`). So the confirm copy says
 * what actually changes, and there is no "this cannot be undone" — it can, by
 * reactivating.
 */
```

Columns: name (localized), `code` when `hasCode`, status, actions (Edit, Deactivate/Reactivate).
Inactive rows render at reduced emphasis with a muted badge — not struck through, which reads as
deleted.

The "show inactive" switch is gated on `canUpdate`, per constraint 6:

```tsx
{/* Gated on the update permission because the server SILENTLY ignores
    includeInactive for callers without it — an ungated toggle would appear
    broken with no error anywhere to explain why. */}
{canUpdate ? (
  <div className="flex items-center gap-2">
    <Switch checked={showInactive} onCheckedChange={onShowInactiveChange} />
    <span className="text-sm text-muted-foreground">{t("showInactive")}</span>
  </div>
) : null}
```

- [ ] **Step 2: Build the form dialog**

- `nameEn` and `nameDe` both **required** (spec §8 `:631`).
- `code`: an editable input on create; a **read-only** field with a note when editing, because sending
  it on update is silently ignored rather than refused (constraint 2). Absent entirely when
  `hasCode` is false.
- On submit in edit mode, send `changedFields(row, draft)`. If the diff is empty, close without a
  request — there is nothing to say.
- Error codes: `code_exists` and `name_exists` map to the relevant field, not a banner.
  `name_exists` is **per country** for cities, so its message must say so or it reads as a global
  clash.

- [ ] **Step 3: Add the copy, both locales**

```json
// messages/en.json — new "lookups" namespace
"lookups": {
  "nameEn": "Name (English)",
  "nameDe": "Name (German)",
  "code": "Code",
  "codeHelp": "Set once when the entry is created. It cannot be changed afterwards.",
  "codeReadOnly": "The code is fixed and cannot be edited.",
  "showInactive": "Show inactive",
  "active": "Active",
  "inactive": "Inactive",
  "create": "Add entry",
  "edit": "Edit",
  "deactivate": "Deactivate",
  "reactivate": "Reactivate",
  "deactivateTitle": "Deactivate this entry?",
  "deactivateBody": "It stops appearing in pickers for new selections. Anything already using it keeps its current label, and you can reactivate it at any time.",
  "deactivateCountryBody": "The country stops appearing in pickers for new selections. Its cities are not affected and stay as they are.",
  "errors": {
    "code_exists": "That code is already in use.",
    "name_exists": "A city with that name already exists in this country.",
    "country_not_found": "That country no longer exists. Reload and try again."
  },
  "empty": "No entries yet.",
  "loadError": "Couldn't load the list."
}
```
```json
// messages/de.json — new "lookups" namespace
"lookups": {
  "nameEn": "Name (Englisch)",
  "nameDe": "Name (Deutsch)",
  "code": "Code",
  "codeHelp": "Wird beim Anlegen einmalig festgelegt und kann danach nicht geändert werden.",
  "codeReadOnly": "Der Code ist fest und nicht bearbeitbar.",
  "showInactive": "Inaktive anzeigen",
  "active": "Aktiv",
  "inactive": "Inaktiv",
  "create": "Eintrag hinzufügen",
  "edit": "Bearbeiten",
  "deactivate": "Deaktivieren",
  "reactivate": "Reaktivieren",
  "deactivateTitle": "Diesen Eintrag deaktivieren?",
  "deactivateBody": "Er erscheint nicht mehr in Auswahllisten für neue Einträge. Bereits zugeordnete Datensätze behalten ihre Bezeichnung, und Sie können ihn jederzeit reaktivieren.",
  "deactivateCountryBody": "Das Land erscheint nicht mehr in Auswahllisten für neue Einträge. Seine Städte sind davon nicht betroffen und bleiben unverändert.",
  "errors": {
    "code_exists": "Dieser Code wird bereits verwendet.",
    "name_exists": "In diesem Land existiert bereits eine Stadt mit diesem Namen.",
    "country_not_found": "Dieses Land existiert nicht mehr. Bitte neu laden und erneut versuchen."
  },
  "empty": "Noch keine Einträge.",
  "loadError": "Die Liste konnte nicht geladen werden."
}
```

`deactivateCountryBody` exists separately from `deactivateBody` for constraint 4: the country case must
state that cities are untouched, because a cascade is exactly what an admin will assume.

- [ ] **Step 4: Parity, gates, commit**

```bash
npm run test && npx tsc --noEmit && npm run lint && npm run build
git add components/lookups/ messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
feat(lookups): shared CRUD table and form, with no delete affordance

FND-1 has no delete endpoint for any of its three entities, so this table has
no delete button — copying the professions screen wholesale would have built a
control with nothing behind it.

Deactivating is not destructive and the copy says what actually happens: the
row leaves new-selection pickers, records already using it keep their label, and
it can be reactivated. The country case gets its own sentence because
deactivating a country does not cascade to its cities, and a cascade is exactly
what an admin will assume.

code renders read-only when editing. Sending it on update is silently ignored
rather than refused, which is worse than an error.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: The two lookup screens and their nav gates

**Files:**
- Create: `app/[locale]/dashboard/settings/property-categories/page.tsx`
- Create: `app/[locale]/dashboard/settings/countries/page.tsx`
- Modify: `lib/nav-items.ts`
- Modify: `messages/en.json`, `messages/de.json`

- [ ] **Step 1: Property categories — the simple case**

Thin page: `usePropertyCategories(showInactive)`, `useCreatePropertyCategory`,
`useUpdatePropertyCategory`, permission booleans from `LOOKUP_PERMISSIONS.propertyCategory`, and
`LookupTable` with `hasCode` true. Mirrors `settings/professions/page.tsx` in structure — and
diverges from it in having no delete path, per Task 3's header comment.

- [ ] **Step 2: Countries, with cities nested per row**

Expanding a country row reveals that country's cities (spec §8 `:628`). Points that must hold:

- Cities load **lazily**, on expand — one `useCities(countryId, showInactive)` per expanded row, with
  `enabled` on the expanded state. Prefetching every country's cities is a request per country.
- The city form has **no** `code` field (`hasCode` false) and no country selector — `countryId` is
  immutable after create (constraint 2), so an edit form offering to move a city is offering something
  the server ignores.
- Deactivating the country uses `deactivateCountryBody`. It does **not** touch cities and does **not**
  invalidate the cities query.
- `country_not_found` on a city create means the country was deactivated or removed under the admin;
  refetch the countries list rather than showing a raw error.

- [ ] **Step 3: Add the nav gates**

`lib/nav-items.ts:119` shows the pattern. Add both, gated on the **create** permission to match how
`professions` is gated:

```ts
  { prefix: "/dashboard/settings/property-categories", permission: "property_category:create" },
  { prefix: "/dashboard/settings/countries",           permission: "country:create" },
```

Then add the two nav items to the settings group. **Do not touch the `agency` group** at `:71-79` —
its two links 404 today and the product owner deliberately left them out of scope on 2026-08-07.

- [ ] **Step 4: Gates and browser check**

Run all four gates, then `npm run dev` and open both screens.

These are the **first screens in this whole migration that can be exercised without admin
credentials**, because FND-1 reads are open to any authenticated user (`fnd-1:30`). Writes still need
the permissions. So confirm at minimum: both lists load, the localized name column shows German on
`/de`, expanding a country issues exactly one cities request, and collapsing/re-expanding does not
re-request (react-query cache).

Record what the reads actually returned — this is the one place real data is reachable.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/dashboard/settings/property-categories app/\[locale\]/dashboard/settings/countries lib/nav-items.ts messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
feat(settings): property-category and country lookup screens

Cities load lazily per expanded country — prefetching would be one request per
country for data nobody asked for.

The city form has no country selector, because countryId is immutable after
create and offering to move a city would offer something the server ignores.
Deactivating a country does not cascade and does not invalidate its cities.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Admin-initiated ticket — service and dialog

**Files:**
- Modify: `lib/services/support.service.ts`
- Create: `components/support/admin-ticket-dialog.tsx`
- Modify: `messages/en.json`, `messages/de.json`

**Interfaces:**
- Produces:
  ```ts
  /**
   * ⚠ GATE G6 — unconfirmed. The FND-2 guide's prose says "Owner" while its own
   * error catalog says "OwnerUser" (spec §9 `:653`). One live call settles it.
   * It is a single constant so the fix is one line.
   */
  export const OWNER_TARGET_USER_TYPE = "Owner";
  export type TicketTargetUserType = "Worker" | typeof OWNER_TARGET_USER_TYPE;
  export interface OpenTicketForUserRequest {
    targetUserId: string;
    targetUserType: TicketTargetUserType;
    subject: string;
    description: string;
    category: "Payment" | "Task" | "Property" | "Technical" | "Account" | "Other";
    priority?: "Low" | "Normal" | "High" | "Urgent";
  }
  openForUser(body: OpenTicketForUserRequest, idempotencyKey: string): Promise<SupportTicketDto>;
  ```

- [ ] **Step 1: Add the service call**

```ts
  /**
   * FND-2 — open a ticket **on a user's behalf**. Spec §9.
   *
   * `X-Idempotency-Key` is **required**. The caller mints it once per dialog
   * opening and reuses it across retries, so a retry replays instead of opening
   * a second ticket.
   *
   * ⚠ On the response, `requesterUserId`/`requesterUserType` are the
   * **recipient**, not the admin; `assignedAdminId` is the caller. Never assume
   * `requesterUserId == me` on this route.
   *
   * ⚠ `requesterUserType` is SCREAMING_SNAKE (`WORKER` / `OWNER_USER`) while
   * `status`, `category` and `priority` on the same object are PascalCase.
   *
   * The ticket is born `InProgress` with `assignedAdminId` already set. There is
   * no origin flag — "admin-initiated" is recognized by exactly that birth shape.
   *
   * Onboarding state is never a barrier: messaging a worker who has submitted
   * nothing is a supported use case.
   */
  openForUser: async (
    body: OpenTicketForUserRequest,
    idempotencyKey: string,
  ): Promise<SupportTicketDto> => {
    const { data } = await apiClient.post<SupportTicketDto>(
      "/api/support-tickets/admin/for-user",
      body,
      { headers: { "X-Idempotency-Key": idempotencyKey } },
    );
    return data;
  },
```

Confirm the path first — spec §9 `:651` says `/api/support-tickets/admin/for-user` while
`Backend/index/controllers/support.md:21` says `POST /admin/for-user` relative to the controller.
Read the controller route attribute and use what the code says; note the disagreement in a comment.

- [ ] **Step 2: Build the dialog**

```tsx
// Mint once per opening, reuse across retries of that attempt. Regenerating per
// submit would turn a retry into a second ticket — the same reason
// contracts/page.tsx:89 holds its renewal key in a ref.
const idempotencyKeyRef = useRef<string | null>(null);
useEffect(() => {
  if (open && !idempotencyKeyRef.current) {
    idempotencyKeyRef.current = crypto.randomUUID();
  }
  if (!open) idempotencyKeyRef.current = null;
}, [open]);
```

Fields: subject (required), description (required, textarea), category (select, six values), priority
(select, default `Normal`). The recipient is passed in by the entry point, never chosen here — every
entry point already knows who it is talking about.

Copy must make the direction unmistakable. The admin is **opening a ticket for someone else**, and the
resulting thread shows that person as the requester. Say so above the form, or an admin will read
their own name in the thread as a bug.

On success, navigate straight to the conversation thread in the existing inbox (spec §9 `:666`).

Errors: `invalid_target_type` → the G6 problem, so its message must be actionable for a developer as
well as a user; `404 target_not_found` → the user was deleted or does not exist, refetch and close.

- [ ] **Step 3: Gate the dialog on the permission**

`support_ticket:create_for_user` (120015). No permission → no entry point rendered anywhere.

- [ ] **Step 4: Copy, both locales, then gates**

Include a line stating the ticket opens already assigned to the acting admin — that is its birth shape
and it is how an admin recognises their own tickets later.

- [ ] **Step 5: Commit**

```bash
git add lib/services/support.service.ts components/support/admin-ticket-dialog.tsx messages/en.json messages/de.json
git commit -m "$(cat <<'EOF'
feat(support): open a ticket on a user's behalf

The idempotency key is minted once per dialog opening and held in a ref, so a
retry replays rather than opening a second ticket.

Two response shapes are documented at the call site because both invite a wrong
assumption: requesterUserId is the RECIPIENT and assignedAdminId is the caller,
and requesterUserType is SCREAMING_SNAKE while status, category and priority on
the same object are PascalCase.

The owner-side targetUserType literal is behind one exported constant. The
FND-2 guide's prose says "Owner" and its own error catalog says "OwnerUser";
gate G6 settles it with one live call, and this keeps the fix to one line.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Three entry points — **blocked on G6**

**Gate: G6.** The owner-side `targetUserType` literal is unconfirmed. The worker side is certain
(`"Worker"`), so the worker entry points are safe; **the owner entry point would 400 on every attempt
if the literal is wrong.**

- [ ] **Step 1: Confirm G6 with one live call, or stop here**

```bash
curl -s -X POST "$BASE/api/support-tickets/admin/for-user" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"targetUserId":"<a real owner user id>","targetUserType":"Owner","subject":"gate check","description":"gate check","category":"Other"}' \
  -w '\n%{http_code}\n'
```

`400 invalid_target_type` → the literal is `OwnerUser`; change `OWNER_TARGET_USER_TYPE` and re-run.
Any other response → `"Owner"` is correct.

**This call creates a real ticket for a real user.** Do not run it against a production owner. It needs
G2 credentials *and* a test owner account, which is G3. **Both are unmet as of 2026-08-07, so this
task does not start.**

- [ ] **Step 2: When unblocked — wire the three entry points**

Docs detail (ask before rejecting), owner/worker detail, and the support inbox ("New ticket").
Spec §9 `:648`.

- [ ] **Step 3: Ship the worker entry points alone if G6 stays blocked**

If the owner literal cannot be confirmed but the feature is wanted, ship the **worker** entry points
only and leave the owner ones out. A hidden entry point is better than one that 400s every time.
Record this as the chosen outcome rather than shipping both on a guess.

---

## Task 7: Notification deep links route on `sourceKey`

`lib/notifications/route.ts` already handles every entity type. What it cannot do is route the expiry
alert correctly, because it never sees `metadata`.

Spec §10 `:687`, the exact problem: the ladder counts down to the earliest of three dates and
`sourceKey` says which fired — `"contract"` | `"license"` | `"passport"`. **But the warning row still
carries the contract as its `entityType`/`entityId` even when a licence fired it.** So routing on
`entityType` alone sends an admin to a contract screen for a passport problem.

**Files:**
- Modify: `lib/notifications/route.ts`
- Create: `lib/notifications/route.test.ts`
- Modify: every caller (`notifications/page.tsx`, `components/layout/dashboard-header.tsx`)

**Interfaces:**
- Produces:
  ```ts
  export function notificationRoute(
    entityType: NotificationEntityType | null,
    entityId: string | null,
    /** New third argument. `metadata.sourceKey` decides the expiry-alert target. */
    metadata?: Record<string, string> | null,
    type?: NotificationType | null,
  ): string | null;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// lib/notifications/route.test.ts
import { describe, expect, it } from "vitest";
import { notificationRoute } from "@/lib/notifications/route";

describe("notificationRoute — existing behaviour must not regress", () => {
  it("routes a worker and an owner profile", () => {
    expect(notificationRoute("Worker", "w1")).toBe("/dashboard/workers/w1");
    expect(notificationRoute("OwnerProfile", "p1")).toBe("/dashboard/owner-documents/p1");
  });

  it("returns null for a missing type or id", () => {
    expect(notificationRoute(null, "x")).toBeNull();
    expect(notificationRoute("Worker", null)).toBeNull();
  });

  it("returns null for an entity type the backend added later", () => {
    expect(notificationRoute("SomethingNew" as never, "x")).toBeNull();
  });
});

describe("notificationRoute — expiry alert routes on sourceKey, not entityType", () => {
  const type = "OnboardingExpiryAdminAlert";

  it("sends a contract-sourced alert to the contract path", () => {
    expect(
      notificationRoute("OwnerContract", "c1", { sourceKey: "contract" }, type),
    ).toBe("/dashboard/contracts");
  });

  it("sends a licence-sourced alert to the subject's Docs detail, not the contract", () => {
    // The row carries the CONTRACT as its entity even though a licence fired it.
    // Routing on entityType would land the admin on a contract screen for a
    // document problem.
    expect(
      notificationRoute(
        "OwnerContract",
        "c1",
        { sourceKey: "license", ownerProfileId: "p1" },
        type,
      ),
    ).toBe("/dashboard/owner-documents/p1");
  });

  it("sends a passport-sourced worker alert to the worker Docs detail", () => {
    expect(
      notificationRoute(
        "WorkerContract",
        "c1",
        { sourceKey: "passport", workerId: "w1" },
        type,
      ),
    ).toBe("/dashboard/worker-documents/w1");
  });

  it("falls back to the contract path when sourceKey says document but no subject id is present", () => {
    // Better a slightly wrong screen than a dead row.
    expect(
      notificationRoute("OwnerContract", "c1", { sourceKey: "passport" }, type),
    ).toBe("/dashboard/contracts");
  });

  it("ignores an unrecognised sourceKey rather than returning null", () => {
    expect(
      notificationRoute("OwnerContract", "c1", { sourceKey: "moonphase" }, type),
    ).toBe("/dashboard/contracts");
  });
});

describe("notificationRoute — Onboarding", () => {
  it("stays non-clickable: the id is a subject id and the side is unknowable", () => {
    expect(notificationRoute("Onboarding", "s1")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch the sourceKey cases fail**

Run: `npm run test`

Expected: the "existing behaviour" block passes (the function already does that), the sourceKey block
fails on arity. That split is the point — the regression tests are written before the change.

- [ ] **Step 3: Extend the function**

Keep the existing switch intact and add the `sourceKey` branch **before** it, since it overrides the
entity-based answer:

```ts
export function notificationRoute(
  entityType: NotificationEntityType | null,
  entityId: string | null,
  metadata?: Record<string, string> | null,
  type?: NotificationType | null,
): string | null {
  if (!entityType || !entityId) return null;

  // The expiry ladder counts down to the earliest of the contract's cover end,
  // the subject's passport expiry, and a licence expiry. `metadata.sourceKey`
  // says which fired — but the row carries the CONTRACT as its entity either
  // way, so routing on entityType alone sends the admin to a contract screen
  // for a document problem (spec §10 `:687`).
  if (type === "OnboardingExpiryAdminAlert") {
    const source = metadata?.sourceKey;
    if (source === "license" || source === "passport") {
      const ownerProfileId = metadata?.ownerProfileId;
      if (ownerProfileId) return `/dashboard/owner-documents/${ownerProfileId}`;
      const workerId = metadata?.workerId;
      if (workerId) return `/dashboard/worker-documents/${workerId}`;
      // No subject id in the metadata: fall through to the contract path. A
      // slightly wrong screen beats a row that does nothing.
    }
  }

  switch (entityType) {
    /* …existing cases, unchanged… */
  }
}
```

- [ ] **Step 4: Update every caller to pass the new arguments**

```bash
rg -n 'notificationRoute' --glob '!lib/notifications/route.ts' --glob '!*.test.ts' .
```

Both extra parameters are optional, so `tsc` will not force the update — **this is the one change in
this plan the compiler cannot catch.** Every call site must be visited by hand and pass
`n.metadata` and `n.type`. A missed one silently keeps the old wrong routing.

- [ ] **Step 5: Surface `metadata.eligibleTo` in the bell row**

Spec §10 `:683`: contract notifications carry `metadata["eligibleTo"]`, so a bell row can show the new
end date without a second call. Add it as a secondary line on contract-type rows, formatted with the
same named-month helper the tables use.

- [ ] **Step 6: Gates and commit**

```bash
npm run test && npx tsc --noEmit && npm run lint && npm run build
git add lib/notifications/ app/\[locale\]/dashboard/notifications components/layout/dashboard-header.tsx
git commit -m "$(cat <<'EOF'
fix(notifications): the expiry alert routes on sourceKey, not entityType

The ladder counts down to the earliest of cover end, passport expiry and licence
expiry, and metadata.sourceKey says which fired — but the row carries the
CONTRACT as its entity either way. Routing on entityType sent an admin to a
contract screen for a passport problem.

Both new parameters are optional, so the compiler cannot flag an un-updated
caller. Every call site was visited by hand; the list is in the diff.

Regression tests for the existing entity routing were written before the change,
so the extension is provably additive.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Phase gate

- [ ] **Step 1: Full gate**

```bash
npm run test && npx tsc --noEmit && npm run lint && npm run build && npm run verify:api
```

- [ ] **Step 2: Prove no delete affordance reached the lookup screens**

```bash
rg -n 'Trash2|delete|remove' components/lookups/ app/\[locale\]/dashboard/settings/property-categories app/\[locale\]/dashboard/settings/countries
```

Expected: no output. FND-1 has no delete endpoint; a button would have nothing behind it.

- [ ] **Step 3: Confirm every `notificationRoute` caller passes metadata**

```bash
rg -n -A2 'notificationRoute\(' --glob '!lib/notifications/route.ts' --glob '!*.test.ts' .
```

Every call must pass four arguments. This cannot be delegated to `tsc`.

- [ ] **Step 4: Append the backend asks**

Roadmap Phase 4 task 9: append spec §16's asks to `BACKEND-ASKS.md`. Asks #7 and #8 were already filed
on 2026-08-07 — **check before appending** so they are not duplicated. Add G6 as a new ask if it is
still unconfirmed: it is a documentation defect (prose contradicts the error catalog in the same
guide) and the backend team can answer it without a live call.

- [ ] **Step 5: `simplify` pass, roadmap and INTEGRATION.md update, PR**

State in the PR body which of the three deliverables was verified against live. Realistically: the
FND-1 **reads** were (they are open to any authenticated user), and nothing else was.

---

## Assumption Ledger — verify when G2 lands

| # | Assumption | Depends on it | Breaks how |
|---|---|---|---|
| **AL-1** | `nameEn` / `nameDe` are the exact field names on all three DTOs, and `CityDto` carries a flat `countryId`. Task 1 Step 1 reads the guide but not the C# records. | Every lookup screen | Every name cell renders `—` via `localizedName`'s fallback — **looks like empty data, not like a bug** |
| **AL-2** | `CityDto` has no `code`. Inferred from `fnd-1:89` naming `countryId` as City's immutable field. | City form (`hasCode` false) | A required create field is missing → 400 on every city create |
| **AL-3** | Lookup list responses are bare arrays, not `PagedResult`. FND-1 conventions (`fnd-1:85`) say `Ok(data)` with no envelope. | All three list hooks | `.map` over an envelope object throws, breaking the screen on load |
| **AL-4** | `includeInactive` really is silently ignored rather than 403 for callers without `:update`. | The gated toggle | If it 403s, the gating is still correct — this one is safe either way |
| **AL-5** | **G6:** the owner literal is `"Owner"`, not `"OwnerUser"`. Guide prose contradicts its own error catalog. | Owner ticket entry point | Every owner-side ticket 400s. **Task 6 does not start until this is settled** |
| **AL-6** | The route is `/api/support-tickets/admin/for-user`. Spec §9 and `support.md:21` disagree on the prefix. | `openForUser` | 404 on every attempt |
| **AL-7** | The expiry-alert metadata contains `ownerProfileId` or `workerId` alongside `sourceKey`. **Not documented** — spec §10 names only `sourceKey` and `eligibleTo`. | `sourceKey` routing | Falls back to the contract path, which is the old wrong behaviour — the fix silently does nothing |
| **AL-8** | `sourceKey` values are exactly `contract` / `license` / `passport`, lower case. | `sourceKey` routing | Unrecognised value falls through to the contract path — degrades, does not break |
| **AL-9** | Every `notificationRoute` caller was updated by hand in Task 7 Step 4. Optional parameters mean the compiler cannot check this. | Deep links | A missed caller keeps routing on `entityType` — the bug survives in one surface with nothing to show it |

**AL-7 is the one that quietly wastes the whole of Task 7.** If the metadata carries only `sourceKey`
and `eligibleTo` with no subject id, every licence- and passport-sourced alert falls back to the
contract path and the routing fix accomplishes nothing. It is also the cheapest to check: read one
`OnboardingExpiryAdminAlert` row from `GET /api/notifications` and print its `metadata`. **Do that
before writing Task 7**, not after — if the subject id is absent, the ask to file is "add
`ownerProfileId`/`workerId` to the expiry alert metadata", and Task 7 shrinks to the `eligibleTo`
line in the bell row.

**AL-1 and AL-3 are the load-bearing pair for Tasks 1–4.** Both are settled by one unauthenticated
call, since FND-1 reads are open to any authenticated user: `GET /api/property-categories`. That is
the single cheapest verification in this entire plan and it unblocks four tasks.
