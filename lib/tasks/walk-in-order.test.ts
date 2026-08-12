import { describe, expect, it } from "vitest";
import {
  buildWalkInOrder,
  type WalkInOrderDraft,
} from "@/lib/tasks/walk-in-order";

const PROPERTY = "87c9fa97-bc61-4629-9372-84a573dfc8d0";

function draft(over: Partial<WalkInOrderDraft> = {}): WalkInOrderDraft {
  return {
    title: "Phone order — Frau Weber",
    date: "2026-08-18",
    startTime: "09:00",
    workerLimit: "2",
    instructions: "Ring twice. Keys with the neighbour.",
    ...over,
  };
}

describe("buildWalkInOrder — the body it sends", () => {
  it("widens the time input to the seconds the API requires", () => {
    const r = buildWalkInOrder(draft(), PROPERTY);
    expect(r.ok && r.body.defaultStartTime).toBe("09:00:00");
  });

  it("leaves an already-widened time alone", () => {
    const r = buildWalkInOrder(draft({ startTime: "09:30:00" }), PROPERTY);
    expect(r.ok && r.body.defaultStartTime).toBe("09:30:00");
  });

  it("sends the one date as an array, because the wire field is one", () => {
    const r = buildWalkInOrder(draft(), PROPERTY);
    expect(r.ok && r.body.dates).toEqual(["2026-08-18"]);
  });

  it("trims the title and coerces the worker count to a number", () => {
    const r = buildWalkInOrder(draft({ title: "  Phone order  ", workerLimit: "3" }), PROPERTY);
    expect(r.ok && r.body.title).toBe("Phone order");
    expect(r.ok && r.body.defaultWorkerLimit).toBe(3);
  });

  it("omits blank instructions rather than sending an empty string", () => {
    const r = buildWalkInOrder(draft({ instructions: "   " }), PROPERTY);
    expect(r.ok && "instructions" in r.body).toBe(false);
  });

  it("sends none of the five optional fields the form does not collect", () => {
    const r = buildWalkInOrder(draft(), PROPERTY);
    expect(r.ok && Object.keys(r.body).sort()).toEqual([
      "dates",
      "defaultStartTime",
      "defaultWorkerLimit",
      "instructions",
      "propertyId",
      "title",
    ]);
  });
});

describe("buildWalkInOrder — what it refuses locally", () => {
  /**
   * These four are `[Required]` server-side and come back as ASP.NET
   * problem-details, a different envelope from this API's `{error}` — cheaper to
   * refuse here than to render two error shapes.
   */
  it("refuses a blank or whitespace title", () => {
    expect(buildWalkInOrder(draft({ title: "" }), PROPERTY)).toEqual({
      ok: false,
      error: "titleRequired",
    });
    expect(buildWalkInOrder(draft({ title: "   " }), PROPERTY)).toEqual({
      ok: false,
      error: "titleRequired",
    });
  });

  it("refuses a missing date", () => {
    expect(buildWalkInOrder(draft({ date: "" }), PROPERTY)).toEqual({
      ok: false,
      error: "dateRequired",
    });
  });

  it("refuses a missing start time", () => {
    expect(buildWalkInOrder(draft({ startTime: "" }), PROPERTY)).toEqual({
      ok: false,
      error: "startTimeRequired",
    });
  });

  it("refuses a worker count below one, blank, or not a number", () => {
    for (const workerLimit of ["0", "-1", "", "abc", "1.5"]) {
      expect(buildWalkInOrder(draft({ workerLimit }), PROPERTY)).toEqual({
        ok: false,
        error: "workerLimitInvalid",
      });
    }
  });

  /**
   * No fifth error key for a missing property: the page does not render the form
   * without one, so an empty `propertyId` cannot reach here. The builder passes
   * it through rather than inventing a rule nothing enforces.
   */
  it("passes an empty property through, because the page never renders the form without one", () => {
    const r = buildWalkInOrder(draft(), "");
    expect(r.ok && r.body.propertyId).toBe("");
  });
});
