import { describe, expect, it } from "vitest";
import {
  KIND_MESSAGE,
  TOOLS_MESSAGE,
  closureTally,
  kindKey,
  toolsAnswerKey,
} from "@/lib/tasks/order-facts";
import en from "@/messages/en.json";
import de from "@/messages/de.json";

describe("toolsAnswerKey", () => {
  it("reads true as the owner providing them", () => {
    expect(toolsAnswerKey(true)).toBe("owner");
  });

  it("reads false as the company bringing them", () => {
    expect(toolsAnswerKey(false)).toBe("company");
  });

  it("reads null as unspecified — never as a no", () => {
    expect(toolsAnswerKey(null)).toBe("unspecified");
  });

  it("reads an absent field as unspecified too", () => {
    expect(toolsAnswerKey(undefined)).toBe("unspecified");
  });
});

describe("kindKey", () => {
  it("names the two known kinds", () => {
    expect(kindKey("Booking")).toBe("booking");
    expect(kindKey("SingleTask")).toBe("single");
  });

  it("returns null for a word it does not know, or none", () => {
    expect(kindKey("Subscription")).toBeNull();
    expect(kindKey("booking")).toBeNull();
    expect(kindKey("")).toBeNull();
    expect(kindKey(null)).toBeNull();
    expect(kindKey(undefined)).toBeNull();
  });
});

describe("closureTally", () => {
  const closed = {
    ownerAccepted: 2,
    autoAccepted: 1,
    closedForced: 0,
    closedReplacement: 1,
  };

  it("lists the four reasons in a fixed order, zeros kept", () => {
    expect(closureTally(closed, 4)?.rows).toEqual([
      { key: "ownerAccepted", count: 2 },
      { key: "autoAccepted", count: 1 },
      { key: "closedForced", count: 0 },
      { key: "closedReplacement", count: 1 },
    ]);
  });

  it("counts the done days no reason covers", () => {
    expect(closureTally(closed, 6)?.unexplained).toBe(2);
    expect(closureTally(closed, 4)?.unexplained).toBe(0);
  });

  it("never reports a negative remainder", () => {
    expect(closureTally(closed, 1)?.unexplained).toBe(0);
    expect(closureTally(closed, undefined)?.unexplained).toBe(0);
  });

  it("is null without counts, or when every count is zero", () => {
    expect(closureTally(undefined, 3)).toBeNull();
    expect(
      closureTally(
        { ownerAccepted: 0, autoAccepted: 0, closedForced: 0, closedReplacement: 0 },
        3,
      ),
    ).toBeNull();
  });

  it("treats a missing counter as zero rather than dropping its row", () => {
    const partial = { ownerAccepted: 1 } as unknown as Parameters<typeof closureTally>[0];
    expect(closureTally(partial, 1)?.rows.map((r) => r.count)).toEqual([1, 0, 0, 0]);
  });
});

describe("message maps", () => {
  it("point at orderFields keys both locales carry", () => {
    for (const key of [...Object.values(TOOLS_MESSAGE), ...Object.values(KIND_MESSAGE)]) {
      expect(en.orderFields[key]).toBeTruthy();
      expect(de.orderFields[key]).toBeTruthy();
    }
  });
});
