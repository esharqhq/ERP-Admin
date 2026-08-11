# Owner Detail Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Owner Detail the admin name-edit it never had (`PUT /api/owners/{id}`, F-02b·7) and stop it offering Edit and Delete on the permanent walk-in account, which the server always refuses (F-02b·6).

**Architecture:** Three reads feed one pure decision function (`ownerDetailActions`) that returns what the screen may offer; the page renders no actions until both new reads settle. The edit dialog stays presentational — `OwnerActions` owns the mutation and the error mapping, matching `PropertyActions`/`PropertyEditDialog`.

**Tech Stack:** Next.js 16 App Router · React 19.2.4 · TypeScript · TanStack Query · next-intl (en/de) · Vitest (node env, no jsdom) · axios

**Spec:** `docs/superpowers/specs/2026-08-11-owner-detail-actions-design.md`

## Global Constraints

- **Vitest covers `lib/**` and `hooks/**` only** — node environment, no jsdom, no component tests. Logic that must be verified belongs in `lib/`.
- **next-intl throws on a missing key.** Every key must exist in **both** `messages/en.json` and `messages/de.json` before the component that reads it renders.
- **`""` means "leave unchanged", never "clear"** on `PUT /api/owners/{id}`. A body of blanks is a silent no-op that still returns `200`.
- **Do not use `ErrorNotice`/`describeApiError` for these routes.** The shared catalog maps `owner_profile_not_found` → `subjectNotFound` ("subject does not exist"), which is wrong here. Reuse `isPermissionDenied` only.
- **`403` on these routes carries an empty body.** `getApiErrorCode` returns `null`; use `isPermissionDenied` from `lib/onboarding/errors.ts`.
- **Both routes are SUPER_ADMIN-only.** Edit gates on `owner:profile:update_any`, Delete on `owner:soft_delete`.
- Commit after every task. Run `npx tsc --noEmit` and `npx vitest run` before each commit.

---

### Task 1: The decision function and the body builder

Pure logic, no React. This is the only part of the section that vitest can reach, so every rule that can be stated as a function lives here.

**Files:**
- Create: `lib/owners/detail-actions.ts`
- Test: `lib/owners/detail-actions.test.ts`

**Interfaces:**
- Consumes: `AdminUpdateOwnerProfileRequest` from Task 2 — but to keep this task self-contained, declare the return type structurally here and let Task 2's interface satisfy it. The body builder returns `{ firstName?: string; lastName?: string; reason: string } | null`.
- Produces: `ownerDetailActions(input) → OwnerDetailActions`, `buildOwnerUpdateBody(input) → OwnerUpdateBody | null`, and the exported types `KycRead`, `NameLock`, `OwnerDetailActions`, `OwnerUpdateBody`.

- [x] **Step 1: Write the failing test**

Create `lib/owners/detail-actions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildOwnerUpdateBody,
  ownerDetailActions,
} from "@/lib/owners/detail-actions";

const WALK_IN = "00000000-0000-0000-0000-00000000dead";
const REGULAR = "11111111-1111-1111-1111-111111111111";

describe("ownerDetailActions", () => {
  it("refuses everything on the walk-in account, and wins over the KYC read", () => {
    // The server returns owner_is_system ahead of every other check, so a
    // 404 from the KYC read must not reclassify this as a sub-account.
    expect(
      ownerDetailActions({
        ownerId: WALK_IN,
        walkInId: WALK_IN,
        kycRead: "absent",
        onboardingStatus: null,
      }),
    ).toEqual({
      isWalkIn: true,
      canEdit: false,
      canDelete: false,
      nameLock: "system",
    });
  });

  it("hides edit but keeps delete when no profile row exists", () => {
    expect(
      ownerDetailActions({
        ownerId: REGULAR,
        walkInId: WALK_IN,
        kycRead: "absent",
        onboardingStatus: null,
      }),
    ).toEqual({
      isWalkIn: false,
      canEdit: false,
      canDelete: true,
      nameLock: "no-profile",
    });
  });

  it("hides edit with no message when the KYC read is forbidden", () => {
    // Without the read there is nothing to prefill and no way to know whether
    // the name is editable, so there is nothing truthful to say.
    expect(
      ownerDetailActions({
        ownerId: REGULAR,
        walkInId: WALK_IN,
        kycRead: "forbidden",
        onboardingStatus: null,
      }),
    ).toEqual({
      isWalkIn: false,
      canEdit: false,
      canDelete: true,
      nameLock: null,
    });
  });

  it.each(["Kyc", "Rejected"])(
    "locks the name at %s because the owner can still fix it themselves",
    (status) => {
      expect(
        ownerDetailActions({
          ownerId: REGULAR,
          walkInId: WALK_IN,
          kycRead: "visible",
          onboardingStatus: status,
        }),
      ).toEqual({
        isWalkIn: false,
        canEdit: true,
        canDelete: true,
        nameLock: "self-editable",
      });
    },
  );

  it.each(["Review", "Approved", "Contract", "Active"])(
    "opens the name at %s, where the owner is frozen out",
    (status) => {
      expect(
        ownerDetailActions({
          ownerId: REGULAR,
          walkInId: WALK_IN,
          kycRead: "visible",
          onboardingStatus: status,
        }),
      ).toEqual({
        isWalkIn: false,
        canEdit: true,
        canDelete: true,
        nameLock: null,
      });
    },
  );

  it("still hides edit for the walk-in account when walkInId is unknown", () => {
    // The lookup 403s or the environment is unseeded. The walk-in account has
    // no onboarding record either way, so the KYC 404 catches it — Edit stays
    // hidden with a message that is still true. Only Delete is exposed.
    const a = ownerDetailActions({
      ownerId: WALK_IN,
      walkInId: null,
      kycRead: "absent",
      onboardingStatus: null,
    });
    expect(a.canEdit).toBe(false);
    expect(a.nameLock).toBe("no-profile");
    expect(a.canDelete).toBe(true);
  });

  it("treats an unrecognised status as editable", () => {
    // The two locking stages are a closed, named set. A stage added later is
    // far likelier to be a later one, where admin edit is legal — and the
    // server still refuses with 409 if that guess is wrong.
    expect(
      ownerDetailActions({
        ownerId: REGULAR,
        walkInId: WALK_IN,
        kycRead: "visible",
        onboardingStatus: "SomethingNew",
      }).nameLock,
    ).toBeNull();
  });
});

describe("buildOwnerUpdateBody", () => {
  it("sends both names with the reason", () => {
    expect(
      buildOwnerUpdateBody({ firstName: "Hans", lastName: "Schmidt", reason: "Ticket #4412" }),
    ).toEqual({ firstName: "Hans", lastName: "Schmidt", reason: "Ticket #4412" });
  });

  it("omits a blank field rather than sending an empty string", () => {
    // "" is read as "leave unchanged", so sending it is harmless — but omitting
    // it keeps the request honest about what is being changed.
    expect(
      buildOwnerUpdateBody({ firstName: "Hans", lastName: "   ", reason: "typo" }),
    ).toEqual({ firstName: "Hans", reason: "typo" });
  });

  it("trims before deciding a field is blank", () => {
    expect(
      buildOwnerUpdateBody({ firstName: "  Hans  ", lastName: "", reason: "  typo  " }),
    ).toEqual({ firstName: "Hans", reason: "typo" });
  });

  it("refuses a blank reason", () => {
    // Validated in the service, not by model attributes — a blank one is a
    // 400 reason_required. Refuse before the round trip.
    expect(
      buildOwnerUpdateBody({ firstName: "Hans", lastName: "Schmidt", reason: "  " }),
    ).toBeNull();
  });

  it("refuses a body with no name at all", () => {
    // Two blanks would change nothing, write no audit entry, and still return
    // 200 — a silent no-op that reads as success.
    expect(
      buildOwnerUpdateBody({ firstName: "", lastName: "", reason: "typo" }),
    ).toBeNull();
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/owners/detail-actions.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/owners/detail-actions"`

- [x] **Step 3: Write the implementation**

Create `lib/owners/detail-actions.ts`:

```ts
/**
 * What Owner Detail may offer, derived from three reads that arrive separately.
 *
 * This lives in `lib/` rather than inside the component because vitest in this
 * repo runs node-only over `lib/**` and `hooks/**` — logic left in a component
 * is logic left unverified, and every rule below is one the server enforces.
 */

/**
 * The three outcomes of `GET /api/admin/kyc/owner/{id}`, which are three
 * different facts and must not be collapsed into a boolean:
 *
 * - `visible`   — 200. The owner has an `OwnerProfile`. Its `identity` fields
 *                 may still be all null; an unfilled profile is still a profile.
 * - `absent`    — 404. No profile row. This is the state behind the endpoint's
 *                 `400 owner_profile_not_found`.
 * - `forbidden` — 403, or any other failure. Says nothing about the owner.
 */
export type KycRead = "visible" | "forbidden" | "absent";

/** Why the legal-name fields are not writable. Three reasons, three messages. */
export type NameLock = "self-editable" | "no-profile" | "system" | null;

export interface OwnerDetailActions {
  isWalkIn: boolean;
  canEdit: boolean;
  canDelete: boolean;
  nameLock: NameLock;
}

export interface OwnerUpdateBody {
  firstName?: string;
  lastName?: string;
  reason: string;
}

/**
 * The only two stages where the owner can still write their own legal name via
 * `PUT /api/kyc/identity`. The admin endpoint and the owner endpoint are exact
 * complements — exactly one party can write at any moment — so these are the
 * two stages where the admin route answers `409 owner_can_self_edit`.
 */
const SELF_EDITABLE = new Set(["Kyc", "Rejected"]);

export function ownerDetailActions(input: {
  ownerId: string;
  walkInId: string | null;
  kycRead: KycRead;
  /** Meaningful only when `kycRead === "visible"`. */
  onboardingStatus: string | null;
}): OwnerDetailActions {
  const { ownerId, walkInId, kycRead, onboardingStatus } = input;

  // First, mirroring the server: owner_is_system is returned ahead of the
  // subject lookup on both routes, so it wins over everything below.
  if (walkInId !== null && ownerId === walkInId) {
    return { isWalkIn: true, canEdit: false, canDelete: false, nameLock: "system" };
  }

  if (kycRead === "absent") {
    return { isWalkIn: false, canEdit: false, canDelete: true, nameLock: "no-profile" };
  }

  // Nothing to prefill and no way to know whether the name is writable, so the
  // button is hidden rather than opened on a guess.
  if (kycRead === "forbidden") {
    return { isWalkIn: false, canEdit: false, canDelete: true, nameLock: null };
  }

  const locked = onboardingStatus !== null && SELF_EDITABLE.has(onboardingStatus);
  return {
    isWalkIn: false,
    canEdit: true,
    canDelete: true,
    nameLock: locked ? "self-editable" : null,
  };
}

/**
 * Build the PUT body, or `null` when it must not be sent.
 *
 * Two refusals, both because the endpoint would otherwise accept the request
 * and do nothing: a blank `reason` is `400 reason_required` (validated in the
 * service, not by model attributes), and a body whose every name is blank is a
 * silent no-op — `""` means "leave unchanged", so it changes nothing, writes no
 * audit entry, and still returns `200`.
 */
export function buildOwnerUpdateBody(input: {
  firstName: string;
  lastName: string;
  reason: string;
}): OwnerUpdateBody | null {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const reason = input.reason.trim();

  if (!reason) return null;
  if (!firstName && !lastName) return null;

  return {
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    reason,
  };
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/owners/detail-actions.test.ts`
Expected: PASS, 12 tests

- [x] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add lib/owners/detail-actions.ts lib/owners/detail-actions.test.ts
git commit -m "feat(owners): the rules for what Owner Detail may offer, as tested logic"
```

---

### Task 2: Types, services and the contract gate

**Files:**
- Modify: `lib/types/owner.types.ts`
- Modify: `lib/services/owner.service.ts`
- Modify: `lib/services/kyc.service.ts`
- Modify: `scripts/verify-v2.mjs:36-50`

**Interfaces:**
- Consumes: `OwnerUpdateBody` from Task 1.
- Produces: `AdminUpdateOwnerProfileRequest`, `AdminOwnerProfileDto`; `ownerService.updateOwner(ownerUserId, body) → Promise<AdminOwnerProfileDto>`; `kycService.getProfileByOwner(ownerUserId) → Promise<KycProfileDto>`.

- [x] **Step 1: Add the two DTOs**

Append to `lib/types/owner.types.ts`:

```ts
/**
 * Body of `PUT /api/owners/{id}` (F-02b·7).
 *
 * Every field is optional and an omitted or blank one means **leave
 * unchanged** — there is deliberately no way to clear a value here. `reason`
 * is typed as required because the service validates it and answers
 * `400 reason_required` for a blank, even though the schema marks it optional.
 */
export interface AdminUpdateOwnerProfileRequest {
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  reason: string;
}

/**
 * Response of `PUT /api/owners/{id}`.
 *
 * `fullName` is the display name the owner chose at registration; it is
 * returned for context and is **not** editable here, and it is deliberately
 * never reconciled with the legal `firstName`/`lastName` pair. Expect the two
 * to differ legitimately.
 *
 * `firstName`, `lastName` and `onboardingStatus` are `null` for a sub-account,
 * which has no identity record at all.
 */
export interface AdminOwnerProfileDto {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  /** Serialized by name (`"Kyc"` … `"Active"`), never as a number. */
  onboardingStatus: string | null;
  updatedAt: string | null;
}
```

- [x] **Step 2: Add the two service calls**

In `lib/services/owner.service.ts`, add after `deleteOwner`:

```ts
  /**
   * Admin corrects an owner's **legal** name (F-02b·7). SUPER_ADMIN-only
   * (`owner:profile:update_any`, 30005).
   *
   * A `200` does not prove anything changed: a no-op edit returns the current
   * values and writes no audit entry.
   */
  updateOwner: async (
    ownerUserId: string,
    body: AdminUpdateOwnerProfileRequest,
  ): Promise<AdminOwnerProfileDto> => {
    const { data } = await apiClient.put<AdminOwnerProfileDto>(
      `/api/owners/${ownerUserId}`,
      body,
    );
    return data;
  },
```

Add `AdminOwnerProfileDto` and `AdminUpdateOwnerProfileRequest` to the existing type import at the top of the file.

In `lib/services/kyc.service.ts`, add after `getProfile`:

```ts
  /**
   * ⚠ Takes the **OwnerUser** id, not the KYC profile id — `getProfile` above
   * takes the other one and hits a different route. The two ids are different
   * values and confusing them has shipped a bug in this repo before (`0872669`).
   *
   * `404` means the owner has no profile row (a sub-account, or the walk-in
   * account). `403` means the caller lacks `kyc:review` (40011), which
   * `owner:profile:update_any` (30005) does not imply.
   */
  getProfileByOwner: async (ownerUserId: string): Promise<KycProfileDto> => {
    const { data } = await apiClient.get<KycProfileDto>(
      `/api/admin/kyc/owner/${ownerUserId}`,
    );
    return data;
  },
```

- [x] **Step 3: Assert the new shapes in the contract gate**

In `scripts/verify-v2.mjs`, inside `EXPECTED_FIELDS`, add `"identity"` to the existing `KycProfileDto` line and add two entries:

```js
  KycProfileDto: ["ownerProfileId", "ownerUserId", "onboardingStatus",
    "onboardingRejectReason", "onboardingReviewedAt", "documents", "identity"],
  // F-02b·7. The panel had no client for this route at all until 2026-08-11,
  // so neither shape was ever asserted here.
  AdminOwnerProfileDto: ["id", "fullName", "firstName", "lastName",
    "profilePictureUrl", "onboardingStatus", "updatedAt"],
  AdminUpdateOwnerProfileRequest: ["firstName", "lastName", "profilePictureUrl", "reason"],
```

- [x] **Step 4: Run the gates**

```bash
npx tsc --noEmit
node scripts/verify-v2.mjs
```
Expected: `tsc` silent; verify-v2 `ALL PASS`, including three new lines for the DTOs above.

If `AdminOwnerProfileDto` is reported missing from live swagger, stop and report it — that means the deployed API is older than PR #62 and the rest of this plan cannot be verified against it.

- [x] **Step 5: Commit**

```bash
git add lib/types/owner.types.ts lib/services/owner.service.ts lib/services/kyc.service.ts scripts/verify-v2.mjs
git commit -m "feat(owners): client for PUT /api/owners/{id} and the by-owner KYC read"
```

---

### Task 3: Hooks, and the stale invalidation key

**Files:**
- Modify: `hooks/use-owners.ts`

**Interfaces:**
- Consumes: `ownerService.updateOwner`, `ownerService.getOwners`, `kycService.getProfileByOwner` (Task 2).
- Produces: `useOwnerKyc(id)`, `useWalkInOwnerId()`, `useUpdateOwner()`.

- [x] **Step 1: Add the three hooks**

Add to `hooks/use-owners.ts`. Import `kycService` from `@/lib/services/kyc.service` and the two new types.

```ts
/**
 * The owner's KYC profile, keyed on the **OwnerUser** id. Supplies two things
 * Owner Detail otherwise has no source for: `onboardingStatus`, which decides
 * whether the legal name is admin-editable, and `identity`, which prefills the
 * edit form.
 *
 * `retry: false` because the two interesting outcomes are both terminal — a
 * `404` (no profile row) and a `403` (no `kyc:review`) are answers, not
 * failures, and retrying them only delays the guard.
 */
export function useOwnerKyc(ownerUserId: string) {
  return useQuery({
    queryKey: ["owner-kyc", ownerUserId],
    queryFn: () => kycService.getProfileByOwner(ownerUserId),
    enabled: !!ownerUserId,
    retry: false,
  });
}

/**
 * The id of the permanent "Walk-in / Manual Orders" account, or `null`.
 *
 * `GET /api/owners/{id}` carries no `ownerType`/`isSystem`, and the owners
 * table has no id filter, so this is the only way the detail page can
 * recognise that account today. **Temporary** — delete this hook and read the
 * field directly once the backend adds it to `OwnerSummaryDto`.
 *
 * `staleTime: Infinity` because a bootstrap account id cannot change under a
 * running session; this costs one request per session, not one per owner.
 *
 * Returns `null` rather than throwing when the lookup is refused
 * (`owner:list` missing) or the environment is unseeded. Both leave the guard
 * inert, which is why the field is worth asking the backend for.
 */
export function useWalkInOwnerId() {
  return useQuery({
    queryKey: ["walk-in-owner-id"],
    queryFn: async () => {
      const page = await ownerService.getOwners({ ownerType: "Default", pageSize: 1 });
      return page.items[0]?.id ?? null;
    },
    staleTime: Infinity,
    retry: false,
  });
}

/**
 * The admin legal-name correction.
 *
 * The `200` body already carries the three fields that changed, so it is
 * merged into the cached KYC profile rather than invalidating it. Invalidating
 * would refetch a route that needs `kyc:review` (40011) — a permission
 * `owner:profile:update_any` (30005) does not imply — so an admin holding only
 * 30005 would save successfully and then be shown a 403 where the result
 * belongs.
 *
 * `["owners-table"]` is deliberately untouched: the table renders `fullName`,
 * which this endpoint never writes.
 */
export function useUpdateOwner(ownerUserId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminUpdateOwnerProfileRequest) =>
      ownerService.updateOwner(ownerUserId, body),
    onSuccess: (updated) => {
      qc.setQueryData<KycProfileDto>(["owner-kyc", ownerUserId], (prev) =>
        prev
          ? {
              ...prev,
              onboardingStatus: (updated.onboardingStatus ??
                prev.onboardingStatus) as KycProfileDto["onboardingStatus"],
              identity: {
                ...prev.identity,
                firstName: updated.firstName,
                lastName: updated.lastName,
              },
            }
          : prev,
      );
    },
  });
}
```

- [x] **Step 2: Fix the stale invalidation key**

In `useSoftDeleteOwner`, replace the `onSuccess` body and its comment:

```ts
    // Invalidate the list only — never the still-mounted ["owner", id] detail
    // observer (delete-then-navigate: removing/invalidating it would refetch
    // the now-deleted id → 404). The caller router.push()es back to the list;
    // the detail query GCs on unmount.
    //
    // Both list keys are named. c4458ee moved the owners page from the unpaged
    // picker onto ["owners-table"] and left this pointing at the old key, so a
    // deleted owner stayed on screen for the 60s global staleTime.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-directory"] });
      qc.invalidateQueries({ queryKey: ["owners-table"] });
    },
```

- [x] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: silent. If `KycProfileDto["onboardingStatus"]` complains, confirm the import of `KycProfileDto` from `@/lib/types/kyc.types` is present.

- [x] **Step 4: Commit**

```bash
git add hooks/use-owners.ts
git commit -m "feat(owners): detail-page reads for the edit guard, and fix a dead invalidation key"
```

---

### Task 4: Copy, in both locales

next-intl throws on a missing key, so every string the next three tasks read must exist first.

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/de.json`

- [x] **Step 1: Add the English keys**

In `messages/en.json`, inside `owners`, add an `edit` block beside the existing `delete` block, and two keys under `account`:

```json
"edit": {
  "action": "Edit name",
  "title": "Correct the legal name",
  "description": "This is the name on the owner's passport. It is separate from the display name they chose, and the two are not reconciled.",
  "firstName": "Legal first name",
  "lastName": "Legal last name",
  "reasonLabel": "Reason",
  "reasonPlaceholder": "Why is this being corrected? Recorded in the audit log.",
  "reasonRequired": "A reason is required.",
  "nothingToSave": "Enter at least one name.",
  "confirm": "Save",
  "locks": {
    "selfEditable": "The owner can correct this themselves at this stage, so admin edits are refused. This becomes editable once their documents go to review.",
    "noProfile": "This account has no identity record, so there is no legal name to correct."
  },
  "errors": {
    "reasonRequired": "A reason is required.",
    "noProfile": "This account has no identity record, so there is no legal name to correct.",
    "canSelfEdit": "The owner can correct this themselves right now, so the admin route is refused.",
    "isSystem": "The permanent walk-in account cannot be edited.",
    "notFound": "Owner not found.",
    "forbidden": "You do not have permission to edit owner names.",
    "generic": "Could not save this change. Please try again."
  }
},
```

Under `owners.account`, add:

```json
"legalName": "Legal name",
"legalNameHint": "From the passport — separate from the display name above",
```

- [x] **Step 2: Add the German keys**

Add the same structure to `messages/de.json` under `owners`:

```json
"edit": {
  "action": "Namen bearbeiten",
  "title": "Rechtlichen Namen korrigieren",
  "description": "Dies ist der Name im Reisepass des Eigentümers. Er ist getrennt vom selbst gewählten Anzeigenamen; beide werden nicht abgeglichen.",
  "firstName": "Rechtlicher Vorname",
  "lastName": "Rechtlicher Nachname",
  "reasonLabel": "Grund",
  "reasonPlaceholder": "Warum wird dies korrigiert? Wird im Audit-Log erfasst.",
  "reasonRequired": "Ein Grund ist erforderlich.",
  "nothingToSave": "Geben Sie mindestens einen Namen ein.",
  "confirm": "Speichern",
  "locks": {
    "selfEditable": "In dieser Phase kann der Eigentümer dies selbst korrigieren, daher werden Admin-Änderungen abgelehnt. Bearbeitbar, sobald die Dokumente zur Prüfung gehen.",
    "noProfile": "Dieses Konto hat keinen Identitätsdatensatz, es gibt also keinen rechtlichen Namen zu korrigieren."
  },
  "errors": {
    "reasonRequired": "Ein Grund ist erforderlich.",
    "noProfile": "Dieses Konto hat keinen Identitätsdatensatz, es gibt also keinen rechtlichen Namen zu korrigieren.",
    "canSelfEdit": "Der Eigentümer kann dies derzeit selbst korrigieren, daher wird die Admin-Route abgelehnt.",
    "isSystem": "Das dauerhafte Walk-in-Konto kann nicht bearbeitet werden.",
    "notFound": "Eigentümer nicht gefunden.",
    "forbidden": "Sie haben keine Berechtigung, Eigentümernamen zu bearbeiten.",
    "generic": "Änderung konnte nicht gespeichert werden. Bitte erneut versuchen."
  }
},
```

Under `owners.account` in `messages/de.json`:

```json
"legalName": "Rechtlicher Name",
"legalNameHint": "Aus dem Reisepass — getrennt vom Anzeigenamen oben",
```

- [x] **Step 3: Verify both files parse and match**

```bash
node -e "
const en=require('./messages/en.json'), de=require('./messages/de.json');
const keys=o=>Object.keys(o).sort().join(',');
console.log('en.edit:', keys(en.owners.edit));
console.log('de.edit:', keys(de.owners.edit));
console.log('match:', keys(en.owners.edit)===keys(de.owners.edit));
console.log('errors match:', keys(en.owners.edit.errors)===keys(de.owners.edit.errors));
console.log('locks match:', keys(en.owners.edit.locks)===keys(de.owners.edit.locks));
"
```
Expected: three `true` lines.

- [x] **Step 4: Commit**

```bash
git add messages/en.json messages/de.json
git commit -m "i18n(owners): copy for the admin name edit and its three refusals"
```

---

### Task 5: The edit dialog

Presentational only — no mutation, no query. It receives what it may do and reports what the admin typed, matching `PropertyEditDialog`.

**Files:**
- Create: `components/owners/owner-edit-dialog.tsx`

**Interfaces:**
- Consumes: `NameLock`, `OwnerUpdateBody`, `buildOwnerUpdateBody` (Task 1); the `owners.edit` copy (Task 4).
- Produces: `<OwnerEditDialog open onClose identity nameLock pending error onSubmit />` where `onSubmit: (body: OwnerUpdateBody) => void`.

- [x] **Step 1: Write the component**

Create `components/owners/owner-edit-dialog.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildOwnerUpdateBody } from "@/lib/owners/detail-actions";
import type { NameLock, OwnerUpdateBody } from "@/lib/owners/detail-actions";

interface Props {
  open: boolean;
  onClose: () => void;
  identity: { firstName: string | null; lastName: string | null };
  /** Non-null means the fields are read-only and this is why. */
  nameLock: NameLock;
  pending: boolean;
  /** Localized parent-mutation error. */
  error?: string | null;
  onSubmit: (body: OwnerUpdateBody) => void;
}

/**
 * Corrects the owner's **legal** name — the passport pair, not the display
 * name. Opens even when the fields are locked: at `Kyc`/`Rejected` the owner
 * can still fix it themselves, and an admin who finds no Edit button has no
 * way to learn that. The dialog is where the answer lives.
 */
export function OwnerEditDialog({
  open,
  onClose,
  identity,
  nameLock,
  pending,
  error,
  onSubmit,
}: Props) {
  const t = useTranslations("owners");
  const tCommon = useTranslations("common");

  const [firstName, setFirstName] = useState(identity.firstName ?? "");
  const [lastName, setLastName] = useState(identity.lastName ?? "");
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset on every open: the dialog is mounted by the parent and would
  // otherwise keep a previous attempt's text after a cancel.
  useEffect(() => {
    if (!open) return;
    setFirstName(identity.firstName ?? "");
    setLastName(identity.lastName ?? "");
    setReason("");
    setLocalError(null);
  }, [open, identity.firstName, identity.lastName]);

  const locked = nameLock !== null;

  function handleSubmit() {
    setLocalError(null);
    const body = buildOwnerUpdateBody({ firstName, lastName, reason });
    if (!body) {
      // The builder refuses exactly two things; say which.
      setLocalError(
        reason.trim() ? t("edit.nothingToSave") : t("edit.reasonRequired"),
      );
      return;
    }
    onSubmit(body);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>{t("edit.description")}</DialogDescription>
        </DialogHeader>

        {locked ? (
          <p className="rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
            {nameLock === "self-editable"
              ? t("edit.locks.selfEditable")
              : t("edit.locks.noProfile")}
          </p>
        ) : null}

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="owner-first-name">{t("edit.firstName")}</Label>
            <Input
              id="owner-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={locked || pending}
              readOnly={locked}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="owner-last-name">{t("edit.lastName")}</Label>
            <Input
              id="owner-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={locked || pending}
              readOnly={locked}
            />
          </div>
        </div>

        {!locked ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="owner-edit-reason">{t("edit.reasonLabel")}</Label>
            <textarea
              id="owner-edit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("edit.reasonPlaceholder")}
              disabled={pending}
              className="min-h-[72px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ) : null}

        {localError || error ? (
          <p className="text-sm text-destructive">{localError ?? error}</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={locked || pending}>
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("edit.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [x] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit
npx next lint
```
Expected: both silent. If `Label` has no `htmlFor` prop, check `components/ui/label.tsx` and use its equivalent.

- [x] **Step 3: Commit**

```bash
git add components/owners/owner-edit-dialog.tsx
git commit -m "feat(owners): the legal-name edit dialog, which opens even when locked"
```

---

### Task 6: Wire Edit into OwnerActions

**Files:**
- Modify: `components/owners/owner-actions.tsx`

**Interfaces:**
- Consumes: `OwnerDetailActions` (Task 1), `useUpdateOwner` (Task 3), `OwnerEditDialog` (Task 5).
- Produces: `<OwnerActions owner actions identity />`.

- [x] **Step 1: Change the props and add the Edit button**

Replace the component's signature and add the edit state. The existing delete dialog and its `mapError` stay as they are; add a second dialog beside it.

New imports to add:

```tsx
import { Pencil } from "lucide-react";
import { useUpdateOwner } from "@/hooks/use-owners";
import { OwnerEditDialog } from "@/components/owners/owner-edit-dialog";
import { isPermissionDenied } from "@/lib/onboarding/errors";
import type { OwnerDetailActions } from "@/lib/owners/detail-actions";
import type { OwnerUpdateBody } from "@/lib/owners/detail-actions";
```

Replace the signature:

```tsx
export function OwnerActions({
  owner,
  actions,
  identity,
}: {
  owner: OwnerSummaryDto;
  actions: OwnerDetailActions;
  identity: { firstName: string | null; lastName: string | null };
}) {
```

Add beside the existing delete state:

```tsx
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const update = useUpdateOwner(owner.id);
```

Add the edit error mapper beside `mapError`:

```tsx
  /**
   * Mapped here rather than through `ErrorNotice`/`describeApiError`: the
   * shared catalog maps `owner_profile_not_found` to "subject not found",
   * which is right on the contract routes it was written for and wrong here,
   * where it means "this account has no identity record" about an owner the
   * admin is looking at. The guide tables these errors per route for exactly
   * this reason. The catalog also has no entry for `reason_required` or
   * `owner_can_self_edit`.
   */
  function mapEditError(err: unknown): string {
    // 403 on this route carries an empty body, so there is no code to read.
    if (isPermissionDenied(err)) return t("edit.errors.forbidden");
    const code = getApiErrorCode(err);
    if (code === "reason_required") return t("edit.errors.reasonRequired");
    if (code === "owner_profile_not_found") return t("edit.errors.noProfile");
    if (code === "owner_can_self_edit") return t("edit.errors.canSelfEdit");
    if (code === "owner_is_system") return t("edit.errors.isSystem");
    if (code === "owner_not_found") return t("edit.errors.notFound");
    return t("edit.errors.generic");
  }

  function handleEditSubmit(body: OwnerUpdateBody) {
    setEditError(null);
    update.mutate(body, {
      onSuccess: () => setEditOpen(false),
      onError: (err) => setEditError(mapEditError(err)),
    });
  }
```

Wrap the returned fragment so both actions render, each behind its own permission **and** its own guard:

```tsx
  return (
    <div className="flex items-center gap-1">
      {actions.canEdit ? (
        <Can permission="owner:profile:update_any">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setEditError(null);
              setEditOpen(true);
            }}
          >
            <Pencil className="size-4" />
            {t("edit.action")}
          </Button>
          <OwnerEditDialog
            open={editOpen}
            onClose={() => !update.isPending && setEditOpen(false)}
            identity={identity}
            nameLock={actions.nameLock}
            pending={update.isPending}
            error={editError}
            onSubmit={handleEditSubmit}
          />
        </Can>
      ) : null}

      {actions.canDelete ? (
        <Can permission="owner:soft_delete">
          {/* the existing Delete button and its Dialog, unchanged */}
        </Can>
      ) : null}
    </div>
  );
```

Move the existing `<Button …Delete…>` and its `<Dialog>` inside the `actions.canDelete` branch, keeping the existing `<Can permission="owner:soft_delete">` wrapper that already surrounds them.

- [x] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit
npx next lint
```
Expected: `tsc` will now fail at the one call site in `app/[locale]/dashboard/(owner)/owners/[id]/page.tsx`, which Task 7 fixes. Lint must be clean.

- [x] **Step 3: Commit**

```bash
git add components/owners/owner-actions.tsx
git commit -m "feat(owners): Edit beside Delete, each behind its own guard"
```

Note: this commit leaves `tsc` failing at one call site. That is resolved by the next task; do not skip it.

---

### Task 7: Wire the page, and stop offering what the server refuses

**Files:**
- Modify: `components/owners/info-row.tsx`
- Modify: `components/owners/contact-card.tsx`
- Modify: `components/owners/hero-card.tsx`
- Modify: `app/[locale]/dashboard/(owner)/owners/[id]/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1, 3, 6.

- [x] **Step 1: Give InfoRow an optional hint**

`InfoRow` currently takes `icon`, `label`, `value`, `mono` and has no way to qualify a value. The legal name needs one — a bare "Legal name" beside a different name in the hero card invites the reading that one of them is stale.

In `components/owners/info-row.tsx`, add the prop and render it:

```tsx
export function InfoRow({
  icon,
  label,
  value,
  mono = false,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
  /** One line under the value, for when the label alone is ambiguous. */
  hint?: string
}) {
```

Directly after the `value` span, still inside the flex column:

```tsx
        {hint ? (
          <span className="text-[11px] leading-snug text-muted-foreground">{hint}</span>
        ) : null}
```

- [x] **Step 2: Add the legal-name row to ContactCard**

Without this the feature's result is invisible — the edit writes the legal name and every surface on this screen shows the display name.

Change the props and add one row. New import: `IdCard` from `lucide-react`.

```tsx
export function ContactCard({
  owner,
  identity,
}: {
  owner: OwnerSummaryDto;
  /** `null` when the KYC read 404'd or was refused. */
  identity: { firstName: string | null; lastName: string | null } | null;
}) {
```

Insert directly after the phone `InfoRow`:

```tsx
        {identity && (identity.firstName || identity.lastName) ? (
          <InfoRow
            icon={<IdCard className="size-3.5" />}
            label={t("account.legalName")}
            value={[identity.firstName, identity.lastName].filter(Boolean).join(" ")}
            hint={t("account.legalNameHint")}
          />
        ) : null}
```

- [x] **Step 3: Suppress the dead mailto on the walk-in account**

In `components/owners/hero-card.tsx`, change the props and the button condition:

```tsx
export function HeroCard({
  owner,
  isWalkIn = false,
}: {
  owner: OwnerSummaryDto;
  isWalkIn?: boolean;
}) {
```

```tsx
          {/* The walk-in account's address is a bootstrap config value on an
              account that cannot log in and receives no mail. */}
          {owner.email && !isWalkIn && (
```

- [x] **Step 4: Wire the page**

In `app/[locale]/dashboard/(owner)/owners/[id]/page.tsx`:

Add imports:

```tsx
import { Info } from "lucide-react";
import { useOwner, useOwnerKyc, useOwnerProperties, useOwnerTaskGroups, useWalkInOwnerId } from "@/hooks/use-owners";
import { ownerDetailActions } from "@/lib/owners/detail-actions";
import type { KycRead } from "@/lib/owners/detail-actions";
```

Add the two reads beside the existing ones:

```tsx
  const kyc = useOwnerKyc(id);
  const walkIn = useWalkInOwnerId();
```

Derive the guard input and the actions:

```tsx
  /**
   * Anything other than a 404 resolves to "forbidden" — a 403 is the real
   * case, and failing closed on a 500 or a dropped connection hides a button
   * that might have worked rather than offering one that will not.
   */
  const kycRead: KycRead = kyc.isSuccess
    ? "visible"
    : (kyc.error as { response?: { status?: number } })?.response?.status === 404
      ? "absent"
      : "forbidden";

  const actions = ownerDetailActions({
    ownerId: id,
    walkInId: walkIn.data ?? null,
    kycRead,
    onboardingStatus: kyc.data?.onboardingStatus ?? null,
  });

  const identity = kyc.data?.identity ?? null;

  // Both guards must settle before any action renders. OwnerActions would
  // otherwise appear as soon as useOwner resolves, showing Edit and Delete on
  // the walk-in account — clickable — for as long as these take. A guard that
  // is only usually applied is not a guard.
  const guardsReady = !kyc.isPending && !walkIn.isPending;
```

Extend the existing loading condition so the skeleton covers the guards too:

```tsx
  if (isLoading || !guardsReady) {
```

Replace the action row and hero:

```tsx
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backButton}
        <OwnerActions owner={owner} actions={actions} identity={identity ?? { firstName: null, lastName: null }} />
      </div>

      {actions.isWalkIn ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("systemHint")}</p>
        </div>
      ) : null}

      <HeroCard owner={owner} isWalkIn={actions.isWalkIn} />
```

And pass identity to the contact card:

```tsx
          <ContactCard owner={owner} identity={identity} />
```

- [x] **Step 5: Run every gate**

```bash
npx tsc --noEmit
npx next lint
npx vitest run
npm run build
node scripts/verify-v2.mjs
```
Expected: `tsc` silent · lint 0 errors · vitest all pass (84 existing + 12 new) · build succeeds · verify-v2 `ALL PASS`.

- [x] **Step 6: Commit**

```bash
git add components/owners/info-row.tsx "app/[locale]/dashboard/(owner)/owners/[id]/page.tsx" components/owners/contact-card.tsx components/owners/hero-card.tsx
git commit -m "feat(owners): Owner Detail stops offering what the server always refuses"
```

---

### Task 8: Verify in a browser

> **Steps 1-3 confirmed by the user on 2026-08-11**, not by an agent — the Chrome
> extension never reconnected. Recorded as the user reported it: the three
> read-only checks render as designed.

Static gates cannot see any of this. The last five commits on this branch are already unverified visually because the Chrome extension has been disconnected since 2026-08-11 — do not add a sixth.

- [x] **Step 1: Check the walk-in account**

Open `/dashboard/owners`, switch to the **Walk-in** tab, click the row. Confirm: no Edit button, no Delete button, no email button, and the banner is present.

- [x] **Step 2: Check a regular Active owner**

Open any owner from the **Active** tab. Confirm: Edit and Delete both present, the legal-name row shows in the contact card (or is absent if that owner never filled it), and the dialog opens prefilled with editable fields.

- [x] **Step 3: Check a locked owner**

Open an owner in the **In review** tab whose stage is `Kyc` or `Rejected`. Confirm: Edit is present, the dialog opens, the name fields are read-only, the explanation is shown, and Save is disabled.

- [ ] **Step 4: Save a real edit**

On a regular `Active` or `Review` owner, change one name, enter a reason, save. Confirm the dialog closes and the contact card's legal-name row updates **without a page reload** — that proves the `setQueryData` merge, not a refetch.

⚠ This writes to the live backend and records an audit entry. Use an owner whose name you can restore, and restore it afterwards.

- [ ] **Step 5: Report**

State plainly which of the four checks passed and which did not. Do not describe unverified behaviour as working.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| §3 walk-in id resolved client-side | 3 (`useWalkInOwnerId`) |
| §4 data flow, three reads | 3, 7 |
| §5 `KycRead` discriminant, guard matrix, blank-field hazard | 1 |
| §6.1 locked form still opens | 5 |
| §6.2 legal name must be displayed | 7 steps 1-2 |
| §6.3 merge, do not invalidate | 3 (`useUpdateOwner`) |
| §6.4 guards are async; fail closed | 7 step 4 |
| §6.5 `buildOwnerUpdateBody` in lib; walk-in mailto | 1, 7 step 3 |
| §7 error catalog, `isPermissionDenied`, no `ErrorNotice` | 6 |
| §8 stale invalidation key | 3 step 2 |
| §10 gates incl. verify-v2 additions | 2 step 3, 7 step 5 |
| §11 partial degradation | 1 (test: "still hides edit … when walkInId is unknown") |

**Placeholder scan:** none. Every code step carries the code.

**Type consistency:** `OwnerUpdateBody` is defined in Task 1 and consumed by Tasks 5 and 6 under that name. `AdminUpdateOwnerProfileRequest` (Task 2) is structurally satisfied by it — `useUpdateOwner` takes the request type, `onSubmit` produces `OwnerUpdateBody`, and the former's fields are a superset (`profilePictureUrl` optional), so the assignment holds. `NameLock` and `OwnerDetailActions` are used under their Task 1 names throughout. `kycRead`/`walkInId`/`onboardingStatus` match between the function signature in Task 1 and the call site in Task 7.

**Known ordering cost:** Task 6 ends with `tsc` failing at one call site, resolved in Task 7. This is called out in Task 6 Step 2 rather than hidden, because splitting the component change from the page change keeps each reviewable on its own.
