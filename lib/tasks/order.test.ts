import { describe, expect, it } from "vitest";
import {
  buildOrder,
  toWireTime,
  type OrderDraft,
  type OrderRequest,
} from "@/lib/tasks/order";

const PROPERTY = "87c9fa97-bc61-4629-9372-84a573dfc8d0";
/** Pinned so every fixture date below is in the future, whatever day the suite runs. */
const NOW = new Date("2026-08-20T10:00:00Z");

function draft(over: Partial<OrderDraft> = {}): OrderDraft {
  return {
    title: "Treppenhaus wöchentlich",
    dates: ["2026-08-25", "2026-08-26"],
    startTime: "08:00",
    hasDeadline: false,
    deadline: "",
    workerLimit: "2",
    instructions: "Key from the caretaker",
    ownerProvidesTools: false,
    addOnNote: "",
    ...over,
  };
}

function build(over: Partial<OrderDraft> = {}) {
  return buildOrder(draft(over), PROPERTY, NOW);
}

function request(over: Partial<OrderDraft> = {}): OrderRequest {
  const result = build(over);
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.request;
}

/** The body, whichever route it is bound for. */
function ok(over: Partial<OrderDraft> = {}) {
  return request(over).body;
}

/** The refusal key, or `"ok"`. */
function refused(over: Partial<OrderDraft>) {
  const result = build(over);
  return result.ok ? "ok" : result.error;
}

describe("title", () => {
  it("goes on the wire as typed, with no customer folded in", () => {
    expect(ok().title).toBe("Treppenhaus wöchentlich");
  });

  it("is trimmed", () => {
    expect(ok({ title: "  Office wash  " }).title).toBe("Office wash");
  });

  it("refuses a title that is only whitespace", () => {
    expect(refused({ title: "   " })).toBe("titleRequired");
  });
});

describe("the property", () => {
  it("is carried on the body, and no owner id is sent with it", () => {
    const body = ok();
    expect(body.propertyId).toBe(PROPERTY);
    expect(Object.keys(body)).not.toContain("ownerUserId");
  });
});

describe("dates", () => {
  it("passes every explicit date through, in order", () => {
    const req = request({ dates: ["2026-08-25", "2026-08-27", "2026-08-29"] });
    expect(req.kind).toBe("booking");
    if (req.kind !== "booking") return;
    expect(req.body.dates).toEqual(["2026-08-25", "2026-08-27", "2026-08-29"]);
  });

  it("refuses an empty list — a range is never inferred", () => {
    expect(refused({ dates: [] })).toBe("datesRequired");
  });
});

describe("which route — F-07 ·12 (task-lifecycle.md §0f)", () => {
  it("files one date as a single task, with `date` and no `dates`", () => {
    const req = request({ dates: ["2026-08-25"] });
    expect(req.kind).toBe("single");
    if (req.kind !== "single") return;
    expect(req.body.date).toBe("2026-08-25");
    expect("dates" in req.body).toBe(false);
  });

  it("files two or more dates as a booking, with `dates` and no `date`", () => {
    const req = request({ dates: ["2026-08-25", "2026-08-26"] });
    expect(req.kind).toBe("booking");
    if (req.kind !== "booking") return;
    expect(req.body.dates).toEqual(["2026-08-25", "2026-08-26"]);
    expect("date" in req.body).toBe(false);
  });

  it("counts DISTINCT dates — the same day twice is one date", () => {
    // The booking door counts distinct dates and refuses a duplicate pair with
    // `booking_needs_two_or_more_dates`, so it must go to the single door.
    const req = request({ dates: ["2026-08-25", "2026-08-25"] });
    expect(req.kind).toBe("single");
  });

  it("sends a duplicate-free list on a booking", () => {
    const req = request({ dates: ["2026-08-25", "2026-08-26", "2026-08-25"] });
    if (req.kind !== "booking") throw new Error("expected a booking");
    expect(req.body.dates).toEqual(["2026-08-25", "2026-08-26"]);
  });

  it("carries the same fields on both routes", () => {
    const shared = (b: object) =>
      Object.keys(b)
        .filter((k) => k !== "date" && k !== "dates")
        .sort();
    expect(shared(ok({ dates: ["2026-08-25"] }))).toEqual(
      shared(ok({ dates: ["2026-08-25", "2026-08-26"] })),
    );
  });
});

describe("times", () => {
  it("pads HH:mm to the HH:mm:ss the API requires", () => {
    expect(ok({ startTime: "08:00" }).defaultStartTime).toBe("08:00:00");
    expect(toWireTime("17:30")).toBe("17:30:00");
  });

  it("leaves an already-full HH:mm:ss alone", () => {
    expect(ok({ startTime: "08:00:00" }).defaultStartTime).toBe("08:00:00");
  });

  it("refuses a missing start time", () => {
    expect(refused({ startTime: "" })).toBe("startTimeRequired");
  });
});

describe("a start that has already passed — F-07 ·12 (task-lifecycle.md §0f·2)", () => {
  // The server reads `date + defaultStartTime` as UTC and refuses one at or
  // before now with `task_date_in_past`. Mirrored exactly, UTC included.
  it("is refused when the start is before now", () => {
    expect(refused({ dates: ["2026-08-20"], startTime: "09:59" })).toBe("startInPast");
  });

  it("is refused when the start is exactly now", () => {
    expect(refused({ dates: ["2026-08-20"], startTime: "10:00" })).toBe("startInPast");
  });

  it("is accepted later today", () => {
    expect(refused({ dates: ["2026-08-20"], startTime: "10:01" })).toBe("ok");
  });

  it("is refused when any one of several dates has passed", () => {
    expect(refused({ dates: ["2026-08-19", "2026-08-25"] })).toBe("startInPast");
  });
});

describe("the deadline", () => {
  it("is absent from the body when the toggle is off, not null", () => {
    expect(Object.keys(ok())).not.toContain("defaultDeadline");
  });

  it("is padded like the start time when the toggle is on", () => {
    expect(ok({ hasDeadline: true, deadline: "17:00" }).defaultDeadline).toBe(
      "17:00:00",
    );
  });

  it("is refused when the toggle is on and the field is empty", () => {
    expect(refused({ hasDeadline: true, deadline: "" })).toBe("deadlineRequired");
  });

  // F-07 ·10 (task-lifecycle.md §0i·1): the create doors refuse a deadline EQUAL
  // to the start with `deadline_not_after_start`, and accept an earlier one —
  // but an earlier one is a night job, stored on the start's own date, and it
  // does not work. The backend says not to offer night jobs, so both are
  // refused here under one key.
  it("is refused when it equals the start time", () => {
    expect(refused({ startTime: "08:00", hasDeadline: true, deadline: "08:00" })).toBe(
      "deadlineNotAfterStart",
    );
  });

  it("is refused when it is earlier than the start time — a night job", () => {
    expect(refused({ startTime: "22:00", hasDeadline: true, deadline: "06:00" })).toBe(
      "deadlineNotAfterStart",
    );
  });

  it("compares a padded start against an unpadded deadline", () => {
    expect(refused({ startTime: "08:00:00", hasDeadline: true, deadline: "08:00" })).toBe(
      "deadlineNotAfterStart",
    );
    expect(
      ok({ startTime: "08:00:00", hasDeadline: true, deadline: "08:01" }).defaultDeadline,
    ).toBe("08:01:00");
  });

  it("is not compared when the toggle is off", () => {
    expect(refused({ startTime: "22:00", hasDeadline: false, deadline: "06:00" })).toBe("ok");
  });
});

describe("workers per task", () => {
  it("goes on the wire as a number", () => {
    expect(ok({ workerLimit: "3" }).defaultWorkerLimit).toBe(3);
  });

  for (const value of ["", "0", "-1", "1.5", "abc"]) {
    it(`refuses ${JSON.stringify(value)}`, () => {
      expect(refused({ workerLimit: value })).toBe("workerLimitInvalid");
    });
  }
});

describe("instructions — required since F-07 ·7 (2026-09-23)", () => {
  it("are refused when blank", () => {
    // `[Required] string? Instructions` — a missing, empty or whitespace-only
    // value is a problem-details 400 at all four create doors.
    expect(refused({ instructions: "   " })).toBe("instructionsRequired");
  });

  it("are trimmed", () => {
    expect(ok({ instructions: "  Key from the caretaker  " }).instructions).toBe(
      "Key from the caretaker",
    );
  });
});

describe("the tools answer — required since F-07 ·7 (2026-09-23)", () => {
  it("is refused when unanswered — there is no default", () => {
    // `[Required] bool? OwnerProvidesTools`: nullable on purpose, so a missing
    // answer is refused instead of silently binding to `false`.
    expect(refused({ ownerProvidesTools: null })).toBe("toolsRequired");
  });

  it("sends false as false, not as an omitted key", () => {
    expect(ok({ ownerProvidesTools: false }).ownerProvidesTools).toBe(false);
  });

  it("sends true", () => {
    expect(ok({ ownerProvidesTools: true }).ownerProvidesTools).toBe(true);
  });
});

describe("the add-on note", () => {
  it("is omitted when blank", () => {
    expect("addOnNote" in ok({ addOnNote: "   " })).toBe(false);
  });

  it("is trimmed when present", () => {
    expect(ok({ addOnNote: "  after a flood  " }).addOnNote).toBe("after a flood");
  });

  it("accepts exactly 2,000 characters", () => {
    expect(ok({ addOnNote: "a".repeat(2000) }).addOnNote).toHaveLength(2000);
  });

  it("refuses 2,001 characters, counted before trimming as the server does", () => {
    expect(refused({ addOnNote: `${"a".repeat(1999)}  ` })).toBe("addOnNoteTooLong");
  });
});

describe("refusal order — the order the fields appear in the form", () => {
  it("reports the title before the dates when both are wrong", () => {
    expect(refused({ title: "", dates: [] })).toBe("titleRequired");
  });

  it("reports the dates before the start time when both are wrong", () => {
    expect(refused({ dates: [], startTime: "" })).toBe("datesRequired");
  });

  it("reports a past start before the worker limit", () => {
    expect(refused({ dates: ["2026-08-19"], workerLimit: "0" })).toBe("startInPast");
  });

  it("reports the worker limit before the description", () => {
    expect(refused({ workerLimit: "0", instructions: "" })).toBe("workerLimitInvalid");
  });

  it("reports the description before the tools answer", () => {
    expect(refused({ instructions: "", ownerProvidesTools: null })).toBe(
      "instructionsRequired",
    );
  });

  it("reports the tools answer before the add-on note", () => {
    expect(refused({ ownerProvidesTools: null, addOnNote: "a".repeat(2001) })).toBe(
      "toolsRequired",
    );
  });
});

describe("walk-in-only fields are never sent from the shared builder", () => {
  it("omits lat and long", () => {
    // The shared builder files against an *ordinary* property, where the route
    // refuses coordinates with `400 group_location_not_allowed` (F-06c §4.1).
    // Only `buildWalkInOrder` attaches them, and only because its property is
    // the walk-in one. There is deliberately no location field on `OrderDraft`.
    const body = ok();
    expect("lat" in body).toBe(false);
    expect("long" in body).toBe(false);
  });

  it("omits cityId", () => {
    // Same rule, F-07 ·9b: a city on any other property is
    // `400 group_city_not_allowed`.
    expect("cityId" in ok()).toBe(false);
  });
});
