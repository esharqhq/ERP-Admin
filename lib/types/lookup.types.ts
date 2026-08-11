/**
 * FND-1 configurable lookups. Only `PropertyCategory` is modelled here: the
 * Country/City lookups in the same backend family are **not** referenced by
 * `Property` at all (it carries a free-text `address` and no city/country FK —
 * verified in `GermanyERP.Domain/Models/Properties/PropertyEntities.cs`), so
 * building a city picker for a property would wire up a relationship the API
 * does not have.
 */

/**
 * The full admin-facing category, from `GET /api/property-categories`.
 *
 * The read is open to **any authenticated user** — it carries no
 * `[RequirePermission]`. Only the mutations are gated (`property_category:create`
 * 160001 / `property_category:update` 160002, both SUPER_ADMIN).
 */
export interface PropertyCategoryDto {
  id: string;
  /** Immutable after creation — `PUT` silently ignores it. Unique; a clash is `400 code_exists`. */
  code: string;
  nameDe: string;
  nameEn: string;
  /** Free-text icon name, max 100 chars. Admin-authored, so never assume a fixed set. */
  icon: string | null;
  color: string | null;
  description: string | null;
  isActive: boolean;
}

/**
 * The slim projection `PropertyDto.category` carries — deliberately **not** the
 * full DTO above. Note what is missing: `icon`, `color`, `description` and
 * `isActive`. A screen that wants a category's colour or icon must resolve it
 * against the categories list; it cannot read it off a property.
 */
export interface PropertyCategoryRefDto {
  id: string;
  code: string;
  nameDe: string;
  nameEn: string;
}
