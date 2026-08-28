import { describe, expect, it } from "vitest";
import { buildOrder, toWireTime, type OrderDraft } from "@/lib/tasks/order";

const PROPERTY = "87c9fa97-bc61-4629-9372-84a573dfc8d0";

function draft(over: Partial<OrderDraft> = {}): OrderDraft {
  return {
    title: "Treppenhaus wöchentlich",
    dates: ["2026-08-25"],
    startTime: "08:00",
    hasDeadline: false,
    deadline: "",
    workerLimit: "2",
    instructions: "",
    ...over,
  };
}

function ok(over: Partial<OrderDraft> = {}) {
  const result = buildOrder(draft(over), PROPERTY);
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.body;
}

describe("title", () => {
  it("goes on the wire as typed, with no customer folded in", () => {
    expect(ok().title).toBe("Treppenhaus wöchentlich");
  });

  it("is trimmed", () => {
    expect(ok({ title: "  Office wash  " }).title).toBe("Office wash");
  });

  it("refuses a title that is only whitespace", () => {
    expect(buildOrder(draft({ title: "   " }), PROPERTY)).toEqual({
      ok: false,
      error: "titleRequired",
    });
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
    expect(ok({ dates: ["2026-08-25", "2026-08-27", "2026-08-29"] }).dates).toEqual([
      "2026-08-25",
      "2026-08-27",
      "2026-08-29",
    ]);
  });

  it("refuses an empty list — a range is never inferred", () => {
    expect(buildOrder(draft({ dates: [] }), PROPERTY)).toEqual({
      ok: false,
      error: "datesRequired",
    });
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
    expect(buildOrder(draft({ startTime: "" }), PROPERTY)).toEqual({
      ok: false,
      error: "startTimeRequired",
    });
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
    expect(
      buildOrder(draft({ hasDeadline: true, deadline: "" }), PROPERTY),
    ).toEqual({ ok: false, error: "deadlineRequired" });
  });

  it("is not compared against the start time — the server's meaning is unverified", () => {
    expect(ok({ hasDeadline: true, deadline: "06:00" }).defaultDeadline).toBe(
      "06:00:00",
    );
  });
});

describe("workers per task", () => {
  it("goes on the wire as a number", () => {
    expect(ok({ workerLimit: "3" }).defaultWorkerLimit).toBe(3);
  });

  for (const value of ["", "0", "-1", "1.5", "abc"]) {
    it(`refuses ${JSON.stringify(value)}`, () => {
      expect(buildOrder(draft({ workerLimit: value }), PROPERTY)).toEqual({
        ok: false,
        error: "workerLimitInvalid",
      });
    });
  }
});

describe("instructions", () => {
  it("are omitted entirely when blank", () => {
    expect(Object.keys(ok({ instructions: "   " }))).not.toContain("instructions");
  });

  it("are trimmed when present", () => {
    expect(ok({ instructions: "  Key from the caretaker  " }).instructions).toBe(
      "Key from the caretaker",
    );
  });
});

describe("refusal order", () => {
  it("reports the title before the dates when both are wrong", () => {
    expect(buildOrder(draft({ title: "", dates: [] }), PROPERTY)).toEqual({
      ok: false,
      error: "titleRequired",
    });
  });

  it("reports the dates before the start time when both are wrong", () => {
    expect(buildOrder(draft({ dates: [], startTime: "" }), PROPERTY)).toEqual({
      ok: false,
      error: "datesRequired",
    });
  });
});
