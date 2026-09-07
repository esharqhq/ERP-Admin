import { describe, expect, it } from "vitest";
import {
  CATEGORY_FALLBACK_COLOR,
  isHexColor,
  normalizeHexColor,
  resolveCategoryColor,
} from "@/lib/properties/category-color";
import type { PropertyCategoryDto } from "@/lib/types/lookup.types";

function category(over: Partial<PropertyCategoryDto> = {}): PropertyCategoryDto {
  return {
    id: "cat-1",
    code: "APARTMENT",
    nameDe: "Wohnblock",
    nameEn: "Apartment block",
    icon: null,
    color: "#2F6FED",
    description: null,
    isActive: true,
    ...over,
  };
}

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

describe("resolveCategoryColor", () => {
  it("falls back for a null categoryId", () => {
    expect(resolveCategoryColor(null, [category()])).toBe(CATEGORY_FALLBACK_COLOR);
  });

  it("falls back when the id has no match in the list", () => {
    expect(resolveCategoryColor("missing", [category({ id: "cat-1" })])).toBe(
      CATEGORY_FALLBACK_COLOR,
    );
  });

  it("falls back for a retired (isActive: false) category", () => {
    const cats = [category({ id: "cat-1", isActive: false })];
    expect(resolveCategoryColor("cat-1", cats)).toBe(CATEGORY_FALLBACK_COLOR);
  });

  it("falls back when the stored colour is not a hex colour", () => {
    const cats = [category({ id: "cat-1", color: "not-a-hex" })];
    expect(resolveCategoryColor("cat-1", cats)).toBe(CATEGORY_FALLBACK_COLOR);
  });

  it("resolves the normalized hex colour for a valid, active match", () => {
    const cats = [category({ id: "cat-1", color: "#2f6fed" })];
    expect(resolveCategoryColor("cat-1", cats)).toBe("#2f6fed");
  });

  it("normalizes an uppercase-hex colour through the same path — regression guard", () => {
    const cats = [category({ id: "cat-1", color: "#2F6FED" })];
    expect(resolveCategoryColor("cat-1", cats)).toBe("#2f6fed");
  });
});
