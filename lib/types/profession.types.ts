// ── Profession types ───────────────────────────────────────────────────────
// Guide: ../Backend/docs/handoff/profession-fnd1-retrofit.md
//
// ⚠ FND-1 turned this into a lookup and the change was BREAKING on the one route
// every client reads: `GET /api/professions` renamed `name` to `nameEn` and added
// `nameDe` and `isActive`. A client still reading `.name` gets `undefined` — no
// error, just a blank label. `DELETE /api/professions/{id}` is **gone (405)**;
// deactivating is `PUT { "isActive": false }`, and `profession:delete` (140003)
// was retired as a permission.

export interface ProfessionDto {
  id: string;
  /** UPPER_SNAKE machine handle. **Immutable** — safe to key logic on. */
  code: string;
  /** German label. Never null or empty on a seeded row. */
  nameDe: string;
  /** English label. **This is the old `name`, renamed** — same values. */
  nameEn: string;
  /**
   * ⚠ Genuinely unpredictable across environments — rows seeded before
   * 2026-08-14 carry a legacy auto-generated string, later ones `null`. Both are
   * correct. Treat it as optional free text; do not code against it.
   */
  description: string | null;
  /**
   * `false` is the retrofit's "deleted". Inactive rows are hidden from every
   * picker and are only returned to an admin who asks with `?includeInactive=true`.
   */
  isActive: boolean;
}

/**
 * Create body. `code`, `nameDe` and `nameEn` are all **required** — a missing one
 * is ASP.NET model validation, so it comes back as problem-details rather than
 * the usual `{error, detail}`. `code` is trimmed and upper-cased server-side.
 * New rows are always born active; you cannot set `isActive` here.
 */
export interface CreateProfessionRequest {
  code: string;
  nameDe: string;
  nameEn: string;
  description?: string | null;
}

/**
 * Update body — `code` is immutable, so it is not here. Every field is optional
 * and a present one replaces that value.
 *
 * `isActive` is the deactivate/reactivate switch, and reactivation is lossless.
 * ⚠ Deactivating `GENERAL` is `400 profession_protected`: it is the default skill
 * every worker is registered with and it cannot be removed.
 */
export interface UpdateProfessionRequest {
  nameDe?: string;
  nameEn?: string;
  description?: string | null;
  isActive?: boolean;
}

/** The code the backend protects — see `profession_protected`. */
export const PROTECTED_PROFESSION_CODE = "GENERAL";

/** The label for the reading locale. One place, so no screen picks its own. */
export function professionLabel(p: ProfessionDto, locale: string): string {
  return locale === "de" ? p.nameDe : p.nameEn;
}
