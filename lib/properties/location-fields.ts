/**
 * The property's country + city on the two write doors the panel uses (F-07 ·9b,
 * `f-02c-property-rework.md` §4.1a): `POST /api/admin/properties` and
 * `PUT /api/properties/{id}`. Both fields are optional `Guid?`, and **what an
 * omitted pair means flips between the doors** — which is why this is a builder
 * with a test rather than two spreads inside the dialogs:
 *
 * - **create:** omitted → the **target owner's** own country + city (never the
 *   admin's). A city alone brings its own country.
 * - **edit:** omitted → **keep the stored pair, untouched**. It is never
 *   re-defaulted from the BOSS, and validation (incl. the active check) runs only
 *   when the pair changes — so a property keeps a city deactivated after it was set.
 *
 * On both, a country without a city is `400 city_required`; it is refused here
 * first, where the admin can still fix it.
 */

/** The form's draft — all strings so every Select stays controlled; `""` is "none". */
export interface LocationDraft {
  countryId: string;
  cityId: string;
}

/** What goes into the request body. An empty object means "send neither". */
export interface LocationFields {
  countryId?: string;
  cityId?: string;
}

export type LocationRefusal =
  /** A country with no city — the server's `city_required`. */
  | "cityRequired"
  /** Edit: blanking a stored pair. There is no "clear" on the wire — omitted means "keep". */
  | "cannotClear";

export type LocationResult =
  | { ok: true; fields: LocationFields }
  | { ok: false; reason: LocationRefusal };

function picked(draft: LocationDraft): LocationFields {
  return draft.countryId
    ? { countryId: draft.countryId, cityId: draft.cityId }
    : { cityId: draft.cityId };
}

/**
 * Create. Both blank → send neither, and the server defaults from the owner.
 *
 * ⚠ Whether that owner *has* a city is not known here: neither owner read this
 * dialog already holds (`GET /api/admin/kyc` rows, `OwnerSummaryDto`) carries a
 * location. An owner without one is answered `400 city_required`, which
 * `propertyLocationErrorKey` words as "this owner has no city — pick one".
 */
export function buildCreateLocation(draft: LocationDraft): LocationResult {
  if (draft.cityId) return { ok: true, fields: picked(draft) };
  if (draft.countryId) return { ok: false, reason: "cityRequired" };
  return { ok: true, fields: {} };
}

/**
 * Edit. Unchanged → send neither, which is what keeps a since-deactivated city
 * valid. Changed → send both.
 *
 * `stored` comes from `PropertyDto.country?.id` / `.city?.id`; both are `null`
 * for the walk-in placeholder and for a property whose BOSS had no location.
 */
export function buildEditLocation(
  draft: LocationDraft,
  stored: { countryId: string | null; cityId: string | null },
): LocationResult {
  const unchanged =
    draft.countryId === (stored.countryId ?? "") && draft.cityId === (stored.cityId ?? "");
  if (unchanged) return { ok: true, fields: {} };
  if (draft.cityId) return { ok: true, fields: picked(draft) };
  if (draft.countryId) return { ok: false, reason: "cityRequired" };
  // Both blank, and different from what is stored — so something was stored.
  return { ok: false, reason: "cannotClear" };
}

/**
 * A country or city name for the current locale — `nameDe` on `de`, else
 * `nameEn`, falling back to the other when one is blank. `null` in, `null` out,
 * so the caller decides what an absent location renders as (`–` on detail).
 */
export function locationName(
  ref: { nameDe: string; nameEn: string } | null | undefined,
  locale: string,
): string | null {
  if (!ref) return null;
  const [preferred, fallback] = locale.startsWith("de")
    ? [ref.nameDe, ref.nameEn]
    : [ref.nameEn, ref.nameDe];
  return preferred || fallback || null;
}

/** Whether a sent body named a location — decides how an error is worded. */
export function sentLocation(body: LocationFields | undefined): boolean {
  return Boolean(body?.countryId || body?.cityId);
}

/**
 * The six §4.1a codes → a key under `properties.locationErrors`. All six arrive
 * as a bare `400 { error }` with no `detail`, so the code alone decides.
 *
 * `sent` is whether the request carried a pair. When it did not (create, left
 * blank), the failing pair is the **owner's default** — `city_required` means the
 * owner has no city, and the `_inactive` pair means theirs was deactivated —
 * so the copy has to say "pick one for this property", not "choose another"
 * about a choice the admin never made.
 *
 * Returns `null` for any other code, so the caller falls through to its chain.
 */
export function propertyLocationErrorKey(
  code: string | null,
  { sent }: { sent: boolean },
): string | null {
  switch (code) {
    case "city_not_found":
      return "cityNotFound";
    case "country_not_found":
      return "countryNotFound";
    case "city_country_mismatch":
      return "cityCountryMismatch";
    case "city_required":
      return sent ? "cityRequired" : "ownerHasNoCity";
    case "city_inactive":
      return sent ? "cityInactive" : "ownerCityInactive";
    case "country_inactive":
      return sent ? "countryInactive" : "ownerCountryInactive";
    default:
      return null;
  }
}
