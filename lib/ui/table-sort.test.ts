import { describe, expect, it } from "vitest";
import { cycleSort } from "@/lib/ui/table-sort";

describe("cycleSort", () => {
  it("starts a new column descending", () => {
    expect(cycleSort(null, "date")).toEqual({ key: "date", dir: "desc" });
    expect(cycleSort({ key: "time", dir: "asc" }, "date")).toEqual({ key: "date", dir: "desc" });
  });

  it("turns the same column ascending on the second click", () => {
    expect(cycleSort({ key: "date", dir: "desc" }, "date")).toEqual({ key: "date", dir: "asc" });
  });

  it("returns to the default order on the third click", () => {
    expect(cycleSort({ key: "date", dir: "asc" }, "date")).toBeNull();
  });
});
