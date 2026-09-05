/**
 * Deterministic per-property colour, for chips whose label set is unbounded.
 *
 * The design's own `propertyTint(place)` (`Uyer Admin Workers Table.dc (1).html`)
 * maps a small, hardcoded set of demo property names to hand-picked hues — fine
 * for a mock with nine fixed properties, not for a real deployment's property
 * list. This hashes an arbitrary seed to a hue instead: the same seed always
 * returns the same three tones, and a brand-new property gets a stable colour
 * the moment it exists, with no map to maintain or extend.
 *
 * `bg`/`fg` reuse the design's own `mix()` ratio exactly — a hue's light and
 * dark derivatives read as one family the way the design's did — just fed a
 * computed hue instead of a table lookup. The design's `mix()` returns
 * `rgb(...)`; this returns hex for all three tones, so a caller never branches
 * on which format a given tone comes back in.
 */
export interface PropertyTint {
  /** Full-saturation hex — the chip's dot. */
  dot: string;
  /** `dot` mixed 12% away from white — the chip's own light background. */
  bg: string;
  /** `dot` mixed past its own saturation toward black — the chip's readable text tone. */
  fg: string;
}

const HUE_SATURATION = 55;
const HUE_LIGHTNESS = 45;

/**
 * djb2 — a small, stable string hash. Not cryptographic; only needs to spread
 * unrelated property names across the hue wheel, not resist collisions.
 */
function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** HSL (s/l as 0-100) → hex. The standard conversion — not worth a dependency for one call. */
function hslToHex(h: number, s: number, l: number): string {
  const sf = s / 100;
  const lf = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sf * Math.min(lf, 1 - lf);
  const f = (n: number) => lf - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/**
 * The design's own `mix(hex, amt)` ratio, reimplemented to return hex.
 *
 * `amt <= 1` blends toward white: `0` is pure white, `1` is the untouched hue.
 * `amt > 1` blends toward black past the hue itself — the design's own way of
 * deriving a readable dark tone from the same seed colour, not a second palette.
 */
function mix(hex: string, amt: number): string {
  const v = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  const f = (n: number) =>
    Math.max(0, Math.min(255, Math.round(amt <= 1 ? n + (255 - n) * (1 - amt) : n * (2 - amt))));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${channels.map((n) => toHex(f(n))).join("")}`;
}

/**
 * A stable tint for any seed string (a property id, or its name — whichever a
 * caller has to hand). No seed is ever looked up in a table.
 */
export function propertyTint(seed: string): PropertyTint {
  const hue = hashSeed(seed) % 360;
  const dot = hslToHex(hue, HUE_SATURATION, HUE_LIGHTNESS);
  return {
    dot,
    bg: mix(dot, 0.12),
    fg: mix(dot, 1.75),
  };
}
