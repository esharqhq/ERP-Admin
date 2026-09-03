/**
 * A person's monogram for an avatar fallback.
 *
 * One implementation, because there were **five** private copies of this across
 * the app and they did not agree. Two shapes had grown up:
 *
 * - `initials` in the two documents queues — first and last letter, but a
 *   single-word name got **one** letter and a missing name got `"—"`.
 * - `initialsOf` in the two hero cards — same, except a single-word name got
 *   **two** letters and a missing name got `"??"`.
 * - the sidebar's `name.slice(0, 2)`, which is neither: "Atabek Abduakimov"
 *   reads **"AT"**.
 *
 * This is the union of the two that were right: first-and-last across words, two
 * letters from a lone word, `"—"` when there is no name — the dash the tables
 * already print for every other absent value. The hero cards keep `"??"` for now;
 * they are a different surface and were not part of the table work.
 */

/**
 * First letter of the first and last word — `"Anna Maria Schmidt"` → `"AS"`. A
 * single word yields its first two letters, `"Gulirano"` → `"GU"`. No name at all
 * yields `"—"`.
 *
 * Split by **code point**, not by `[0]` / `slice`, which index UTF-16 code units:
 * an astral character — an emoji, or one of several scripts — would be cut into
 * half a surrogate pair and render as `�`. A name field is exactly where that
 * input turns up.
 */
export function initials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";

  const chars = (word: string) => Array.from(word);

  if (words.length === 1) {
    return chars(words[0]).slice(0, 2).join("").toUpperCase();
  }

  const first = chars(words[0])[0] ?? "";
  const last = chars(words[words.length - 1])[0] ?? "";
  return (first + last).toUpperCase();
}
