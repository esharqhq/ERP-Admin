import { describe, expect, it } from "vitest";
import { canonicalTaskStatus } from "@/lib/tasks/status-vocab";

describe("canonicalTaskStatus", () => {
  it("reads the two words F-07 ·0 renamed on 2026-09-17", () => {
    expect(canonicalTaskStatus("CheckedIn")).toBe("checkedIn");
    expect(canonicalTaskStatus("InReview")).toBe("inReview");
  });

  it("still reads the words they replaced", () => {
    // A cached response or a fixture can still carry them; dropping them buys
    // nothing and costs a stale-cache bug.
    expect(canonicalTaskStatus("Active")).toBe("checkedIn");
    expect(canonicalTaskStatus("Review")).toBe("inReview");
  });

  it("leaves the three unchanged words alone", () => {
    expect(canonicalTaskStatus("Pending")).toBe("pending");
    expect(canonicalTaskStatus("Done")).toBe("done");
    expect(canonicalTaskStatus("Cancelled")).toBe("cancelled");
  });

  it("ignores casing and surrounding space", () => {
    expect(canonicalTaskStatus(" checkedin ")).toBe("checkedIn");
    expect(canonicalTaskStatus("INREVIEW")).toBe("inReview");
  });

  it("answers null for a word it does not know", () => {
    // ·5 adds a disputed state. `null` is a real answer, not a failure.
    expect(canonicalTaskStatus("Disputed")).toBeNull();
    expect(canonicalTaskStatus("")).toBeNull();
    expect(canonicalTaskStatus(null)).toBeNull();
    expect(canonicalTaskStatus(undefined)).toBeNull();
  });
});
