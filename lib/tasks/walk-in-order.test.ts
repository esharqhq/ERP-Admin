import { describe, expect, it } from "vitest";
import {
  buildWalkInOrder,
  type WalkInOrderDraft,
} from "@/lib/tasks/walk-in-order";

const PROPERTY = "87c9fa97-bc61-4629-9372-84a573dfc8d0";

function draft(over: Partial<WalkInOrderDraft> = {}): WalkInOrderDraft {
  return {
    title: "Apartment clean",
    customer: "Frau Weber",
    dates: ["2026-08-18"],
    startTime: "09:00",
    hasDeadline: false,
    deadline: "",
    workerLimit: "1",
    instructions: "",
    location: { lat: 53.550341, long: 9.992196 },
    ...over,
  };
}

function ok(over: Partial<WalkInOrderDraft> = {}) {
  const result = buildWalkInOrder(draft(over), PROPERTY);
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.body;
}

describe("title composition", () => {
  it("joins the job name and the customer with an em dash", () => {
    expect(ok().title).toBe("Apartment clean — Frau Weber");
  });

  it("uses the job name alone when no customer is given", () => {
    expect(ok({ customer: "" }).title).toBe("Apartment clean");
  });

  it("trims both halves before joining", () => {
    expect(ok({ title: "  Office wash  ", customer: "  Herr Klein  " }).title).toBe(
      "Office wash — Herr Klein",
    );
  });

  it("refuses a blank job name even when a customer is present", () => {
    const result = buildWalkInOrder(draft({ title: "   " }), PROPERTY);
    expect(result).toEqual({ ok: false, error: "titleRequired" });
  });
});

describe("dates", () => {
  it("passes several dates straight through", () => {
    expect(ok({ dates: ["2026-08-18", "2026-08-19", "2026-08-20"] }).dates).toEqual([
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
    ]);
  });

  it("still accepts a single date", () => {
    expect(ok({ dates: ["2026-08-18"] }).dates).toEqual(["2026-08-18"]);
  });

  it("refuses an empty selection", () => {
    const result = buildWalkInOrder(draft({ dates: [] }), PROPERTY);
    expect(result).toEqual({ ok: false, error: "datesRequired" });
  });
});

describe("times", () => {
  it("pads HH:mm to HH:mm:ss", () => {
    expect(ok({ startTime: "09:00" }).defaultStartTime).toBe("09:00:00");
  });

  it("leaves an already-padded HH:mm:ss alone", () => {
    expect(ok({ startTime: "09:00:00" }).defaultStartTime).toBe("09:00:00");
  });

  it("refuses a missing start time", () => {
    const result = buildWalkInOrder(draft({ startTime: "" }), PROPERTY);
    expect(result).toEqual({ ok: false, error: "startTimeRequired" });
  });
});

describe("deadline", () => {
  it("omits the key entirely when the toggle is off", () => {
    expect("defaultDeadline" in ok({ hasDeadline: false })).toBe(false);
  });

  it("sends a padded deadline when the toggle is on", () => {
    const body = ok({ hasDeadline: true, deadline: "18:00" });
    expect(body.defaultDeadline).toBe("18:00:00");
  });

  it("refuses the toggle being on with no time set", () => {
    const result = buildWalkInOrder(
      draft({ hasDeadline: true, deadline: "" }),
      PROPERTY,
    );
    expect(result).toEqual({ ok: false, error: "deadlineRequired" });
  });

  it("ignores a stale deadline value once the toggle is off", () => {
    expect("defaultDeadline" in ok({ hasDeadline: false, deadline: "18:00" })).toBe(false);
  });

  it("allows a deadline earlier than the start time", () => {
    // Deliberate: the server's behaviour here is unverified and may well mean
    // "next day". Inventing a refusal the API does not have would be worse.
    const body = ok({ hasDeadline: true, deadline: "07:00", startTime: "09:00" });
    expect(body.defaultDeadline).toBe("07:00:00");
  });
});

describe("worker limit", () => {
  it("parses a whole number", () => {
    expect(ok({ workerLimit: "3" }).defaultWorkerLimit).toBe(3);
  });

  it.each(["", "0", "-1", "1.5", "abc"])("refuses %s", (workerLimit) => {
    const result = buildWalkInOrder(draft({ workerLimit }), PROPERTY);
    expect(result).toEqual({ ok: false, error: "workerLimitInvalid" });
  });
});

describe("instructions", () => {
  it("omits the key when blank", () => {
    expect("instructions" in ok({ instructions: "   " })).toBe(false);
  });

  it("trims and includes it when present", () => {
    expect(ok({ instructions: "  Ring twice.  " }).instructions).toBe("Ring twice.");
  });
});

describe("refusal order", () => {
  it("reports the title before the dates", () => {
    const result = buildWalkInOrder(draft({ title: "", dates: [] }), PROPERTY);
    expect(result).toEqual({ ok: false, error: "titleRequired" });
  });

  it("reports the dates before the start time", () => {
    const result = buildWalkInOrder(draft({ dates: [], startTime: "" }), PROPERTY);
    expect(result).toEqual({ ok: false, error: "datesRequired" });
  });

  it("reports the deadline before the worker limit", () => {
    const result = buildWalkInOrder(
      draft({ hasDeadline: true, deadline: "", workerLimit: "0" }),
      PROPERTY,
    );
    expect(result).toEqual({ ok: false, error: "deadlineRequired" });
  });
});

describe("propertyId", () => {
  it("is copied from the argument, never from the draft", () => {
    expect(ok().propertyId).toBe(PROPERTY);
  });
});

describe("no company or note fields reach the wire", () => {
  it("never sends internalNote — it cannot be read back", () => {
    expect("internalNote" in ok()).toBe(false);
  });
});

describe("location — required since F-06c (2026-08-26)", () => {
  it("sends both coordinates on the wire", () => {
    const body = ok({ location: { lat: 53.550341, long: 9.992196 } });
    expect(body.lat).toBe(53.550341);
    expect(body.long).toBe(9.992196);
  });

  it("names the field `long`, not `lng`", () => {
    // The check-in doors use `lng`; the group and property doors use `long`.
    // That inconsistency is the contract, so the wrong one is a silent 400.
    const body = ok();
    expect("lng" in body).toBe(false);
    expect("long" in body).toBe(true);
  });

  it("refuses an order with no point picked", () => {
    // Without this the route answers `400 walkin_location_required` and the
    // form could not file an order at all — which is what shipped.
    const result = buildWalkInOrder(draft({ location: null }), PROPERTY);
    expect(result).toEqual({ ok: false, error: "locationRequired" });
  });

  it("passes a negative and a zero coordinate through unchanged", () => {
    // A falsy 0 must not be read as "not set" — the prime meridian is a place.
    const body = ok({ location: { lat: -33.8688, long: 0 } });
    expect(body.lat).toBe(-33.8688);
    expect(body.long).toBe(0);
  });

  it("does not round or reformat the picked point", () => {
    const body = ok({ location: { lat: 52.5200066, long: 13.404954 } });
    expect(body.lat).toBe(52.5200066);
    expect(body.long).toBe(13.404954);
  });
});

describe("refusal order — location is checked last", () => {
  it("reports a typed field before sending the admin back to the map", () => {
    const result = buildWalkInOrder(
      draft({ workerLimit: "0", location: null }),
      PROPERTY,
    );
    expect(result).toEqual({ ok: false, error: "workerLimitInvalid" });
  });

  it("still reports the title first", () => {
    const result = buildWalkInOrder(draft({ title: "", location: null }), PROPERTY);
    expect(result).toEqual({ ok: false, error: "titleRequired" });
  });
});
