/**
 * The profession `code`, kept honest while it is being typed.
 *
 * ⚠ **Two facts make this worth a function rather than an inline handler.**
 *
 * 1. The server rewrites the value — `dto.Code.Trim().ToUpperInvariant()`
 *    (`ProfessionService.cs:55`). An input left alone shows `window cleaning` and
 *    the table then shows `WINDOW CLEANING`: the field lies about its own value.
 * 2. The value is **permanent**. `code` is absent from `UpdateProfessionDto`, so no
 *    route anywhere changes it once the row exists.
 *
 * Together: the one moment a code can be got right is while it is being typed, and
 * the server will not help. `profession-fnd1-retrofit.md` calls the field an
 * UPPER_SNAKE machine handle, but **nothing server-side enforces that** — no regex,
 * no rejection — so `window cleaning` is accepted and stored as `WINDOW CLEANING`,
 * space and all, forever.
 *
 * Leading whitespace is dropped rather than encoded, because a leading underscore is
 * never what anyone meant. A **trailing** underscore survives on purpose: it is how
 * the next word gets started, and `finalizeProfessionCode` removes it at submit.
 */
export function normalizeProfessionCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/^\s+/, "")
    .replace(/\s+/g, "_");
}

/**
 * The same code at submit time: the trailing underscore that `normalizeProfessionCode`
 * left behind for typing is not part of the name, and neither is surrounding space.
 *
 * The server trims whitespace but **not** underscores, so `WINDOW_` would be stored
 * exactly like that — and could never be corrected.
 */
export function finalizeProfessionCode(code: string): string {
  return code.trim().replace(/^_+|_+$/g, "");
}
