/**
 * FND-1 configurable lookups.
 *
 * `Property` still does **not** reference Country/City — it carries a free-text
 * `address` and no city/country FK (verified in
 * `GermanyERP.Domain/Models/Properties/PropertyEntities.cs`), so a city picker on
 * a property would wire up a relationship the API does not have. That reasoning
 * is unchanged and still the rule for properties.
 *
 * It does not extend to **owners**, whose *company* record does carry a city —
 * which is what F-02 #4's `companyCityId` filter selects on. Country and City are
 * therefore modelled below, for that filter and nothing else.
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

/** Body for `POST /api/property-categories` (`property_category:create`, 160001). */
export interface CreatePropertyCategoryRequest {
  /** Unique and **immutable once created** — a clash is `400 code_exists`. Max 50. */
  code: string;
  nameDe: string;
  nameEn: string;
  icon: string | null;
  color: string | null;
  description: string | null;
}

/**
 * Body for `PUT /api/property-categories/{id}` (`property_category:update`, 160002).
 *
 * Every field is nullable and **null leaves the value unchanged** — this is a
 * patch, not a replace. `code` is absent by design: it cannot be edited, and
 * sending it is silently ignored rather than refused.
 *
 * `isActive: false` is the **only** way to retire a category. There is no
 * DELETE route: a category is deactivated, never deleted, so that the
 * properties already pointing at it keep resolving.
 */
export interface UpdatePropertyCategoryRequest {
  nameDe?: string | null;
  nameEn?: string | null;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  isActive?: boolean | null;
}

// ── Country and City (FND-1 §5.2–5.3) — for the owner company-city filter ──

/**
 * `GET /api/countries`. The read carries no `[RequirePermission]` — any
 * authenticated user may call it.
 *
 * ⚠ Seeded with Germany (`DE`) and Austria (`AT`) **today**. Do not build against
 * that count or those codes: this is reference data an admin can add to, and a
 * hard-coded enumeration of it is the trap that has already cost this app twice.
 */
export interface CountryDto {
  id: string;
  code: string;
  nameDe: string;
  nameEn: string;
  currencyCode: string;
  isActive: boolean;
}

/**
 * `GET /api/countries/{countryId}/cities`.
 *
 * ⚠ **There is no flat "all cities" endpoint.** Cities are always fetched scoped
 * to a country, which is why a city filter needs a country control beside it. An
 * unknown `countryId` is `404 country_not_found`.
 *
 * City has **no `code`** — it is referenced by id. Uniqueness is
 * `(countryId, nameEn)` rather than global, so two countries may each hold a city
 * of the same name and the id is the only safe identity.
 */
export interface CityDto {
  id: string;
  countryId: string;
  nameDe: string;
  nameEn: string;
  isActive: boolean;
}
