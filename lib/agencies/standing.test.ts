import { describe, expect, it } from "vitest";
import {
  compareContractEnd,
  contractDays,
  standingRank,
  standingTone,
} from "@/lib/agencies/standing";

const TODAY = Date.parse("2026-09-08T00:00:00.000Z");

describe("standingTone", () => {
  it("marks the only value that can log in as success", () => {
    expect(standingTone("Active")).toBe("success");
  });

  it("marks a missing paper contract as work someone owns", () => {
    expect(standingTone("AwaitingContract")).toBe("warning");
  });

  it("marks a scheduled future start as informational, not a problem", () => {
    expect(standingTone("NotYetActive")).toBe("info");
  });

  it("marks a lapsed partnership as danger", () => {
    expect(standingTone("Expired")).toBe("danger");
  });

  /**
   * The default branch. A fifth value must render as a neutral chip carrying its
   * own raw name, never fall through to nothing.
   */
  it("falls back to neutral for a standing this build does not recognise", () => {
    expect(standingTone("Suspended")).toBe("neutral");
  });
});

describe("standingRank", () => {
  it("brings work to the top rather than sorting alphabetically", () => {
    const order = (["Active", "Expired", "NotYetActive", "AwaitingContract"] as const)
      .slice()
      .sort((a, b) => standingRank(a) - standingRank(b));
    expect(order).toEqual([
      "AwaitingContract",
      "Expired",
      "NotYetActive",
      "Active",
    ]);
  });

  it("puts an unrecognised standing last", () => {
    expect(standingRank("Suspended")).toBeGreaterThan(standingRank("Active"));
  });
});

describe("contractDays", () => {
  it("counts the days to a future start and a future end", () => {
    expect(
      contractDays(
        { signedOn: "2026-09-18T00:00:00Z", validUntil: "2026-09-28T00:00:00Z" },
        TODAY,
      ),
    ).toEqual({ untilStart: 10, untilEnd: 20 });
  });

  it("returns negatives once a date has passed", () => {
    expect(
      contractDays(
        { signedOn: "2026-09-01T00:00:00Z", validUntil: "2026-09-06T00:00:00Z" },
        TODAY,
      ),
    ).toEqual({ untilStart: -7, untilEnd: -2 });
  });

  it("returns null for each date that is absent", () => {
    expect(contractDays({ signedOn: null, validUntil: null }, TODAY)).toEqual({
      untilStart: null,
      untilEnd: null,
    });
  });

  it("reports an open-ended contract as a start with no end", () => {
    expect(
      contractDays({ signedOn: "2026-09-01T00:00:00Z", validUntil: null }, TODAY),
    ).toEqual({ untilStart: -7, untilEnd: null });
  });

  /**
   * ⚠ The guard that matters. `standing` is server-derived and
   * `AwaitingContract` outranks `Expired`; a client-side phase would eventually
   * disagree with it. This asserts the shape carries **no phase**, so a later
   * refactor cannot quietly add one.
   */
  it("returns day counts only — never a phase", () => {
    const result = contractDays(
      { signedOn: "2026-09-01T00:00:00Z", validUntil: "2026-09-28T00:00:00Z" },
      TODAY,
    );
    expect(Object.keys(result).sort()).toEqual(["untilEnd", "untilStart"]);
  });
});

describe("compareContractEnd", () => {
  const dated = { signedOn: "2026-01-01T00:00:00Z", validUntil: "2027-01-01T00:00:00Z" };
  const later = { signedOn: "2026-01-01T00:00:00Z", validUntil: "2028-01-01T00:00:00Z" };
  const openEnded = { signedOn: "2026-01-01T00:00:00Z", validUntil: null };
  const noDates = { signedOn: null, validUntil: null };

  it("orders real end dates soonest first", () => {
    expect(compareContractEnd(dated, later)).toBeLessThan(0);
  });

  /**
   * ⚠ The reason this is not a plain nulls-last compare. Both of these have a
   * null `validUntil` and they mean opposite things — unlimited access against
   * cannot sign in at all — so they must not interleave.
   */
  it("puts open-ended before no-dates-at-all", () => {
    expect(compareContractEnd(openEnded, noDates)).toBeLessThan(0);
    expect(compareContractEnd(noDates, openEnded)).toBeGreaterThan(0);
  });

  it("puts both null cases after every real end date", () => {
    expect(compareContractEnd(later, openEnded)).toBeLessThan(0);
    expect(compareContractEnd(later, noDates)).toBeLessThan(0);
  });

  it("sorts a mixed column into dated, open-ended, then undated", () => {
    const rows = [noDates, later, openEnded, dated];
    expect(rows.slice().sort(compareContractEnd)).toEqual([
      dated,
      later,
      openEnded,
      noDates,
    ]);
  });
});
