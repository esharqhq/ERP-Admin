import { describe, expect, it } from "vitest";
import {
  AREA_BUCKETS,
  CREATED_BUCKETS,
  areaBucket,
  categoryName,
  createdBucket,
  ownerNameById,
} from "@/lib/properties/table-rows";

const DAY = 24 * 60 * 60 * 1000;
// A fixed instant, so nothing here depends on when the suite runs.
const NOW = Date.parse("2026-08-11T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

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

describe("areaBucket", () => {
  // Rows with no area must land in a real bucket rather than vanishing: the
  // filter compares against the selector's return value, and an empty string
  // would read as "no filter" and match everything.
  it("puts a missing area in its own bucket, not in a size band", () => {
    expect(areaBucket(null)).toBe("unset");
  });

  it("bands by size", () => {
    expect(areaBucket(40)).toBe("lt100");
    expect(areaBucket(250)).toBe("from100");
    expect(areaBucket(1200)).toBe("from500");
    expect(areaBucket(5000)).toBe("gt2000");
  });

  // Bands are half-open [lower, upper) so no area can match two of them.
  it("assigns each boundary to exactly one band", () => {
    expect(areaBucket(100)).toBe("from100");
    expect(areaBucket(500)).toBe("from500");
    expect(areaBucket(2000)).toBe("gt2000");
  });

  it("treats zero as a real value, not as missing", () => {
    expect(areaBucket(0)).toBe("lt100");
  });

  it("only ever returns a declared bucket key", () => {
    for (const v of [null, 0, 99.9, 100, 499, 1999, 2000, 1e6]) {
      expect(AREA_BUCKETS).toContain(areaBucket(v));
    }
  });
});

describe("createdBucket", () => {
  it("bands by age", () => {
    expect(createdBucket(daysAgo(2), NOW)).toBe("7d");
    expect(createdBucket(daysAgo(20), NOW)).toBe("30d");
    expect(createdBucket(daysAgo(200), NOW)).toBe("365d");
    expect(createdBucket(daysAgo(500), NOW)).toBe("older");
  });

  // Bands are exclusive, so a 3-day-old row is in "7d" and NOT in "30d". The
  // filter is an equality match, so overlapping bands would make the narrower
  // selection silently drop rows the wider one showed.
  it("assigns each boundary to exactly one band", () => {
    expect(createdBucket(daysAgo(7), NOW)).toBe("30d");
    expect(createdBucket(daysAgo(30), NOW)).toBe("365d");
    expect(createdBucket(daysAgo(365), NOW)).toBe("older");
  });

  // Clock skew between the server's createdAt and the browser's clock must not
  // produce a bucket outside the declared set.
  it("puts a future timestamp in the newest band", () => {
    expect(createdBucket(new Date(NOW + 5 * DAY).toISOString(), NOW)).toBe("7d");
  });

  it("puts an unparseable timestamp in its own bucket", () => {
    expect(createdBucket("not-a-date", NOW)).toBe("unknown");
  });

  it("only ever returns a declared bucket key", () => {
    for (const iso of [daysAgo(0), daysAgo(7), daysAgo(365), daysAgo(9999), "", "x"]) {
      expect(CREATED_BUCKETS).toContain(createdBucket(iso, NOW));
    }
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
