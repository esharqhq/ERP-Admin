import type { PropertyCategoryRefDto } from "@/lib/types/lookup.types";

/**
 * Property media row (F-02c). Owner-side apps create these through
 * presign → upload → confirm; **this app can only read them** —
 * `property:media:upload` (50020) and `property:media:delete` (50021) are
 * PROPERTY-scoped OWNER_USER permissions with no admin branch in
 * `FileUploadsController` (lines 118 / 161), so an admin attempting either gets
 * a bare 403 with no body. There is deliberately no upload/delete method in
 * `property.service.ts`.
 *
 * ⚠ `url` is `/files/{storageKey}` served with **no** `[Authorize]` — only the
 * `contracts/` prefix is signature-protected. The permission gates who can
 * *list* a gallery, not who can *fetch* an image once they hold its URL.
 */
export interface PropertyMediaDto {
  id: string;
  propertyId: string;
  /** `"PropertyImage"` in practice — `"Video"` exists in the enum but confirm refuses it. */
  type: string;
  url: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

/**
 * Body for `PUT /api/properties/{id}` (UpdatePropertyRequest).
 *
 * ⚠ `propertyCategoryId` is **required**, and its `[Required]` attribute is
 * documentation only: a non-nullable `Guid` is never "missing" to the model
 * validator, so omitting it binds to `Guid.Empty`, which then fails the
 * service-layer lookup as `400 property_category_not_found`
 * (`PropertyService.cs:112-127`). Always send a real id.
 *
 * There is no `ownerUserId` here and no other route that moves a property —
 * **a property's owner is fixed at creation and cannot be changed.**
 */
export interface UpdatePropertyRequest {
  name: string;
  address: string;
  lat: number;
  long: number;
  propertyCategoryId: string;
  entryInstructions: string;
  /** `[Range(0, 500)]`, nullable since F-02c. */
  floorCount: number | null;
  /** `[Range(0, 1000)]`, new in F-02c. */
  roomCount: number | null;
  /** `[Range(0, 1000000)]`, new in F-02c. */
  areaSqm: number | null;
}

/**
 * Body for `POST /api/admin/properties` — admin creates a property on behalf of
 * a BOSS owner. `ownerUserId` is the target BOSS.
 *
 * ⚠ The gate lands on the **target owner**, not the caller: they must be a BOSS
 * holding a signed, in-period contract, else `403 onboarding_incomplete` /
 * `contract_expired` / `contract_not_yet_active`. A non-BOSS target is
 * `400 target_owner_must_be_boss`; an unknown one is `400 owner_not_found`
 * (400, not 404 — this controller routes every `InvalidOperationException`
 * through `BadRequest`).
 */
export interface CreateAdminPropertyRequest extends UpdatePropertyRequest {
  ownerUserId: string;
}

/**
 * `GET /api/properties` → `PropertyDto[]`.
 *
 * ⚠ **Unpaginated.** Owners and Workers got FND-3 paged tables; properties did
 * not. There is no server-side search, sort, filter or export — the list arrives
 * whole, ordered by `name`, and every one of those is the client's job.
 *
 * `?ownerUserId=` filters on **`BossOwnerUserId`** (`PropertyService.cs:193`),
 * so it returns the properties an owner *owns*, never the ones they merely hold
 * a MANAGER / PROPERTY_ADMIN membership on. The filter is also read only on the
 * admin branch; a non-admin caller sending it is silently given their own
 * membership-scoped list instead.
 */
export interface PropertyDto {
  id: string;
  /** ⚠ Id only — no owner name. Resolve against `GET /api/admin/owners/bosses`. */
  bossOwnerUserId: string;
  name: string;
  address: string;
  lat: number;
  long: number;
  /** Replaced the retired `type` enum in F-02c. Always present. */
  category: PropertyCategoryRefDto;
  entryInstructions: string;
  floorCount: number | null;
  roomCount: number | null;
  areaSqm: number | null;
  createdAt: string;
  /**
   * Soft-delete flag. Exposed on the wire for the restore view; only returned
   * as `true` when listing with `?includeDeleted=true` (honored solely for
   * callers holding `property:restore`).
   */
  isDeleted: boolean;
  /** Populated only when the request carried `?withMedia=true`; otherwise `null`. */
  media: PropertyMediaDto[] | null;
}
