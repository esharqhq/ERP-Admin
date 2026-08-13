import { describe, expect, it } from "vitest";
import { readWalkInTab } from "@/lib/tasks/walk-in-tab";

describe("readWalkInTab", () => {
  it("selects orders when the param is exactly orders", () => {
    expect(readWalkInTab("orders")).toBe("orders");
  });

  it("selects create when the param is exactly create", () => {
    expect(readWalkInTab("create")).toBe("create");
  });

  it("falls back to create when the param is absent", () => {
    expect(readWalkInTab(null)).toBe("create");
  });

  it("falls back to create when the param is empty", () => {
    expect(readWalkInTab("")).toBe("create");
  });

  it("falls back to create for an unrecognised value instead of crashing", () => {
    expect(readWalkInTab("nonsense")).toBe("create");
  });
});
