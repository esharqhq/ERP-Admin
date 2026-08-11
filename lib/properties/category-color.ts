/**
 * `PropertyCategory.color` is a free-text column (`MaxLength(32)`) with no
 * server-side format check, so a stored value can be anything an admin typed —
 * or anything a future importer writes. These two guards are what stands
 * between that column and a `style` attribute.
 *
 * Only `#rgb` and `#rrggbb` are accepted. Named colours and CSS functions are
 * refused rather than passed through: `var(--x)` and `rgb(...)` are valid CSS
 * but let a stored string reach into the page's own token space.
 */

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string | null | undefined): boolean {
  return typeof value === "string" && HEX.test(value.trim());
}

/**
 * The canonical `#rrggbb` form, lowercased — or `null` if the value is not a
 * hex colour. The three-digit form is expanded because `<input type="color">`
 * silently resets to black when handed one.
 */
export function normalizeHexColor(value: string | null | undefined): string | null {
  if (!isHexColor(value)) return null;

  const hex = (value as string).trim().toLowerCase();
  if (hex.length === 7) return hex;

  const [, r, g, b] = hex;
  return `#${r}${r}${g}${g}${b}${b}`;
}
