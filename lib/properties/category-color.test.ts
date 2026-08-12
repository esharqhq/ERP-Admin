import { describe, expect, it } from "vitest";
import { isHexColor, normalizeHexColor } from "@/lib/properties/category-color";

describe("isHexColor", () => {
  it("accepts the three-digit and six-digit forms", () => {
    expect(isHexColor("#abc")).toBe(true);
    expect(isHexColor("#AABBCC")).toBe(true);
  });

  it("tolerates surrounding whitespace, since the value is typed by hand", () => {
    expect(isHexColor("  #aabbcc  ")).toBe(true);
  });

  it("rejects anything that is not one of those two forms", () => {
    for (const v of ["aabbcc", "#ab", "#abcd", "#aabbccdd", "rebeccapurple", "", "#", "#gggggg"]) {
      expect(isHexColor(v)).toBe(false);
    }
  });

  // The column is free text with MaxLength(32), so a stored value may be
  // anything at all — including a CSS expression. Treating it as a colour would
  // let a stored string reach a style attribute unchecked.
  it("rejects a CSS function even though it is a valid colour", () => {
    expect(isHexColor("rgb(1,2,3)")).toBe(false);
    expect(isHexColor("var(--primary)")).toBe(false);
  });
});

describe("normalizeHexColor", () => {
  it("expands the three-digit form, which <input type=color> will not accept", () => {
    expect(normalizeHexColor("#abc")).toBe("#aabbcc");
  });

  it("lowercases and trims so equal colours compare equal", () => {
    expect(normalizeHexColor("  #AABBCC ")).toBe("#aabbcc");
  });

  it("returns null for a value that is not a hex colour", () => {
    expect(normalizeHexColor("rebeccapurple")).toBeNull();
    expect(normalizeHexColor("")).toBeNull();
    expect(normalizeHexColor(null)).toBeNull();
  });
});
