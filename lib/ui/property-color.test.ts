import { describe, expect, it } from "vitest";
import { propertyTint } from "@/lib/ui/property-color";

const HEX = /^#[0-9a-f]{6}$/i;

/** The design's own nine demo property names, plus one — real seeds, not synthetic ones. */
const SEEDS = [
  "Sonnenhof",
  "Altbau K.12",
  "Büro Mitte",
  "Villa Grunewald",
  "Lager Spandau",
  "Hostel Neukölln",
  "Ferienwohnung",
  "Praxis Charl.",
  "Arte Hotel",
  "Esharq Office",
];

describe("propertyTint", () => {
  it("is deterministic — the same seed always returns the same three tones", () => {
    for (const seed of SEEDS) {
      expect(propertyTint(seed)).toEqual(propertyTint(seed));
    }
  });

  it("gives every different seed a different dot", () => {
    const pairs: [string, string][] = [
      ["Sonnenhof", "Altbau K.12"],
      ["Büro Mitte", "Villa Grunewald"],
      ["Lager Spandau", "Hostel Neukölln"],
      ["Ferienwohnung", "Praxis Charl."],
      ["Arte Hotel", "Esharq Office"],
    ];
    for (const [a, b] of pairs) {
      expect(propertyTint(a).dot).not.toBe(propertyTint(b).dot);
    }
  });

  it("returns hex strings for dot, bg and fg", () => {
    for (const seed of SEEDS) {
      const tint = propertyTint(seed);
      expect(tint.dot).toMatch(HEX);
      expect(tint.bg).toMatch(HEX);
      expect(tint.fg).toMatch(HEX);
    }
  });
});
