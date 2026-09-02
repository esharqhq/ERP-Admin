import { describe, expect, it } from "vitest";
import { categoryName, ownerNameById } from "@/lib/properties/table-rows";

describe("categoryName", () => {
  const cat = { id: "c1", code: "OFFICE", nameDe: "Büro", nameEn: "Office" };

  it("picks the German name for the de locale", () => {
    expect(categoryName(cat, "de")).toBe("Büro");
  });

  it("picks the English name for every other locale", () => {
    expect(categoryName(cat, "en")).toBe("Office");
  });

  // The backend marks both names [Required], so this can only happen if that
  // changes or a row predates the constraint — falling back beats rendering "".
  it("falls back to the other name when the locale's own is blank", () => {
    expect(categoryName({ ...cat, nameDe: "" }, "de")).toBe("Office");
    expect(categoryName({ ...cat, nameEn: "  " }, "en")).toBe("Büro");
  });

  it("falls back to the code when both names are blank", () => {
    expect(categoryName({ ...cat, nameDe: "", nameEn: "" }, "de")).toBe("OFFICE");
  });
});

describe("ownerNameById", () => {
  it("maps owner id to display name", () => {
    const map = ownerNameById([
      { id: "a", fullName: "Hans Schmidt" },
      { id: "b", fullName: "Maria Weber" },
    ]);
    expect(map.get("a")).toBe("Hans Schmidt");
    expect(map.get("b")).toBe("Maria Weber");
  });

  it("returns an empty map for no owners, so callers can render a dash", () => {
    expect(ownerNameById([]).size).toBe(0);
    expect(ownerNameById(undefined).size).toBe(0);
  });

  // A blank name would render as an empty cell that looks like a layout bug;
  // the caller's ?? fallback only fires on a genuine miss, so drop blanks here.
  it("skips owners with no usable name", () => {
    const map = ownerNameById([
      { id: "a", fullName: "   " },
      { id: "b", fullName: "Real Name" },
    ]);
    expect(map.has("a")).toBe(false);
    expect(map.get("b")).toBe("Real Name");
  });
});
