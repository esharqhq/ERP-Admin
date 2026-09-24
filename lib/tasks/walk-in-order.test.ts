import { describe, expect, it } from "vitest";
import {
  buildWalkInOrder,
  type WalkInOrderDraft,
} from "@/lib/tasks/walk-in-order";

const PROPERTY = "87c9fa97-bc61-4629-9372-84a573dfc8d0";
const BERLIN = "5b1f2c3d-0000-4000-8000-000000000001";
/** Pinned so every fixture date below is in the future, whatever day the suite runs. */
const NOW = new Date("2026-08-15T10:00:00Z");

function draft(over: Partial<WalkInOrderDraft> = {}): WalkInOrderDraft {
  return {
    title: "Apartment clean",
    customer: "Frau Weber",
    dates: ["2026-08-18", "2026-08-19"],
    startTime: "09:00",
    hasDeadline: false,
    deadline: "",
    workerLimit: "1",
    instructions: "Hauptstr. 5. Ring twice.",
    ownerProvidesTools: false,
    addOnNote: "",
    countryId: "de",
    cityId: BERLIN,
    location: { lat: 53.550341, long: 9.992196 },
    ...over,
  };
}

function build(over: Partial<WalkInOrderDraft> = {}) {
  return buildWalkInOrder(draft(over), PROPERTY, NOW);
}

function request(over: Partial<WalkInOrderDraft> = {}) {
  const result = build(over);
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.request;
}

function ok(over: Partial<WalkInOrderDraft> = {}) {
  return request(over).body;
}

function refused(over: Partial<WalkInOrderDraft>) {
  const result = build(over);
  return result.ok ? "ok" : result.error;
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
    expect(refused({ title: "   " })).toBe("titleRequired");
  });
});

describe("dates and the route", () => {
  it("files several dates as a booking", () => {
    const req = request({ dates: ["2026-08-18", "2026-08-19", "2026-08-20"] });
    expect(req.kind).toBe("booking");
    if (req.kind !== "booking") return;
    expect(req.body.dates).toEqual(["2026-08-18", "2026-08-19", "2026-08-20"]);
  });

  it("files a single date as a single task — the walk-in route included", () => {
    // `POST /api/tasks/admin/single` takes the walk-in property too, with the
    // same `lat`/`long` and `cityId` requirements (task-lifecycle.md §0f·3).
    const req = request({ dates: ["2026-08-18"] });
    expect(req.kind).toBe("single");
    if (req.kind !== "single") return;
    expect(req.body.date).toBe("2026-08-18");
  });

  it("refuses an empty selection", () => {
    expect(refused({ dates: [] })).toBe("datesRequired");
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
    expect(refused({ startTime: "" })).toBe("startTimeRequired");
  });

  it("refuses a start that has already passed", () => {
    expect(refused({ dates: ["2026-08-15"], startTime: "09:00" })).toBe("startInPast");
  });
});

describe("deadline", () => {
  it("omits the key entirely when the toggle is off", () => {
    expect("defaultDeadline" in ok({ hasDeadline: false })).toBe(false);
  });

  it("sends a padded deadline when the toggle is on", () => {
    expect(ok({ hasDeadline: true, deadline: "18:00" }).defaultDeadline).toBe("18:00:00");
  });

  it("refuses the toggle being on with no time set", () => {
    expect(refused({ hasDeadline: true, deadline: "" })).toBe("deadlineRequired");
  });

  it("ignores a stale deadline value once the toggle is off", () => {
    expect("defaultDeadline" in ok({ hasDeadline: false, deadline: "18:00" })).toBe(false);
  });

  it("refuses a deadline earlier than the start — night jobs do not work", () => {
    expect(refused({ hasDeadline: true, deadline: "07:00", startTime: "09:00" })).toBe(
      "deadlineNotAfterStart",
    );
  });
});

describe("worker limit", () => {
  it("parses a whole number", () => {
    expect(ok({ workerLimit: "3" }).defaultWorkerLimit).toBe(3);
  });

  it.each(["", "0", "-1", "1.5", "abc"])("refuses %s", (workerLimit) => {
    expect(refused({ workerLimit })).toBe("workerLimitInvalid");
  });
});

describe("description, tools answer and add-on note (F-07 ·7)", () => {
  it("refuses a blank description", () => {
    expect(refused({ instructions: "   " })).toBe("instructionsRequired");
  });

  it("trims and includes the description", () => {
    expect(ok({ instructions: "  Ring twice.  " }).instructions).toBe("Ring twice.");
  });

  it("refuses an unanswered tools question", () => {
    expect(refused({ ownerProvidesTools: null })).toBe("toolsRequired");
  });

  it("sends the tools answer", () => {
    expect(ok({ ownerProvidesTools: true }).ownerProvidesTools).toBe(true);
  });

  it("sends a trimmed add-on note", () => {
    expect(ok({ addOnNote: "  post-construction  " }).addOnNote).toBe("post-construction");
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

  it("never sends countryId — the route takes a city only", () => {
    expect("countryId" in ok()).toBe(false);
  });
});

describe("city — required since F-07 ·9b (2026-09-23)", () => {
  it("sends the city on a booking", () => {
    expect(ok().cityId).toBe(BERLIN);
  });

  it("sends the city on a single task", () => {
    expect(ok({ dates: ["2026-08-18"] }).cityId).toBe(BERLIN);
  });

  it("refuses an order with no city picked", () => {
    // Without this the route answers `400 walkin_city_required`.
    expect(refused({ cityId: "" })).toBe("cityRequired");
  });

  it("refuses a country picked without its city", () => {
    expect(refused({ countryId: "de", cityId: "" })).toBe("cityRequired");
  });
});

describe("location — required since F-06c (2026-08-26)", () => {
  it("sends both coordinates on the wire", () => {
    const body = ok({ location: { lat: 53.550341, long: 9.992196 } });
    expect(body.lat).toBe(53.550341);
    expect(body.long).toBe(9.992196);
  });

  it("sends them on a single task too", () => {
    const body = ok({ dates: ["2026-08-18"] });
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
    expect(refused({ location: null })).toBe("locationRequired");
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

describe("refusal order", () => {
  it("reports the title before the dates", () => {
    expect(refused({ title: "", dates: [] })).toBe("titleRequired");
  });

  it("reports the dates before the start time", () => {
    expect(refused({ dates: [], startTime: "" })).toBe("datesRequired");
  });

  it("reports the deadline before the worker limit", () => {
    expect(refused({ hasDeadline: true, deadline: "", workerLimit: "0" })).toBe(
      "deadlineRequired",
    );
  });

  it("reports every shared field before the city", () => {
    expect(refused({ ownerProvidesTools: null, cityId: "" })).toBe("toolsRequired");
  });

  it("reports the city before the map — the map is checked last", () => {
    // The picker sits at the bottom of the form and is the most expensive
    // thing to redo, so the admin fixes every typed field first.
    expect(refused({ cityId: "", location: null })).toBe("cityRequired");
  });

  it("reports a typed field before sending the admin back to the map", () => {
    expect(refused({ workerLimit: "0", location: null })).toBe("workerLimitInvalid");
  });

  it("still reports the title first", () => {
    expect(refused({ title: "", location: null })).toBe("titleRequired");
  });
});
