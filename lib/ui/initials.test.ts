import { describe, expect, it } from "vitest";
import { initials } from "@/lib/ui/initials";

describe("initials", () => {
  it("takes the first and last word — not the first two letters", () => {
    expect(initials("Atabek Abduakimov")).toBe("AA");
  });

  // The bug this replaced: `name.slice(0, 2)` renders "AT" for the row above,
  // which is two letters of one word and reads as a different person's monogram.
  it("skips the middle names", () => {
    expect(initials("Anna Maria Schmidt")).toBe("AS");
  });

  /**
   * A one-word name gets **two** letters, not one. A single letter in a circle
   * is a decoration rather than a monogram, and two rows whose only names are
   * "Gulirano" and "Gulnora" would both read "G".
   */
  it("takes two letters from a single-word name", () => {
    expect(initials("Gulirano")).toBe("GU");
  });

  it("takes the whole of a one-letter name rather than padding it", () => {
    expect(initials("X")).toBe("X");
  });

  it("ignores surrounding and repeated whitespace", () => {
    expect(initials("  Sardor   Aliyev  ")).toBe("SA");
  });

  it("upper-cases a lower-cased name", () => {
    expect(initials("sardor aliyev")).toBe("SA");
  });

  // Every row DTO on both admin tables types `fullName` as nullable.
  it("returns an em dash for a missing name", () => {
    expect(initials(null)).toBe("—");
    expect(initials("")).toBe("—");
    expect(initials("   ")).toBe("—");
  });

  /**
   * `[0]` on a string indexes UTF-16 code units, so an emoji or any astral
   * character would be sliced into half a surrogate pair and render as `�`.
   * Naming is exactly where non-Latin input arrives.
   */
  it("keeps a non-Latin name whole", () => {
    expect(initials("Ökay Şahin")).toBe("ÖŞ");
    expect(initials("Владимир Петров")).toBe("ВП");
    expect(initials("🙂 Anonymous")).toBe("🙂A");
  });

  it("keeps an astral single-word name whole", () => {
    expect(initials("𝒜urora")).toBe("𝒜U");
  });
});
