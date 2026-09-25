import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import {
  buildCloneOrder,
  classifyCloneError,
  cloneDraftFrom,
  copiedDeadlineFallsBack,
  isWalkInSource,
  type CloneDraft,
  type CloneSource,
} from "@/lib/tasks/clone-order";

const BERLIN = "5b1f2c3d-0000-4000-8000-000000000001";
const HAMBURG = "5b1f2c3d-0000-4000-8000-000000000002";
const WALK_IN_OWNER = "0f0f0f0f-0000-4000-8000-00000000000a";
/** Pinned so every fixture date below is in the future, whatever day the suite runs. */
const NOW = new Date("2026-09-26T10:00:00Z");

/** A complete, post-·7 ordinary booking: nothing is a gap. */
function source(over: Partial<CloneSource> = {}): CloneSource {
  return {
    ownerId: "11111111-0000-4000-8000-000000000001",
    title: "Treppenhaus wöchentlich",
    instructions: "Key from the caretaker",
    ownerProvidesTools: false,
    defaultStartTime: "08:00:00",
    defaultDeadline: "12:00:00",
    cityId: null,
    ...over,
  };
}

function draft(src: CloneSource = source(), over: Partial<CloneDraft> = {}): CloneDraft {
  return { ...cloneDraftFrom(src), dates: ["2026-10-06", "2026-10-07"], ...over };
}

function build(
  over: Partial<CloneDraft> = {},
  src: CloneSource = source(),
  isWalkIn = false,
) {
  return buildCloneOrder(draft(src, over), src, isWalkIn, NOW);
}

function ok(over: Partial<CloneDraft> = {}, src: CloneSource = source(), isWalkIn = false) {
  const result = build(over, src, isWalkIn);
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.body;
}

function refused(over: Partial<CloneDraft>, src: CloneSource = source(), isWalkIn = false) {
  const result = build(over, src, isWalkIn);
  return result.ok ? "ok" : result.error;
}

describe("cloneDraftFrom", () => {
  it("pre-fills the times the copy will get, as HH:mm for the time inputs", () => {
    const d = cloneDraftFrom(source());
    expect(d.startTime).toBe("08:00");
    expect(d.hasDeadline).toBe(true);
    expect(d.deadline).toBe("12:00");
  });

  it("starts with no dates, no gap answers and no address change", () => {
    const d = cloneDraftFrom(source());
    expect(d.dates).toEqual([]);
    expect(d.title).toBe("");
    expect(d.instructions).toBe("");
    expect(d.ownerProvidesTools).toBeNull();
    expect(d.cityId).toBe("");
    expect(d.moveAddress).toBe(false);
    expect(d.location).toBeNull();
  });

  it("leaves the deadline off when the source has none", () => {
    const d = cloneDraftFrom(source({ defaultDeadline: null }));
    expect(d.hasDeadline).toBe(false);
    expect(d.deadline).toBe("");
  });
});

describe("dates and the kind", () => {
  it("sends the distinct dates", () => {
    expect(ok({ dates: ["2026-10-06", "2026-10-06", "2026-10-07"] }).dates).toEqual([
      "2026-10-06",
      "2026-10-07",
    ]);
  });

  it("refuses no dates at all", () => {
    expect(refused({ dates: [] })).toBe("datesRequired");
  });
});

describe("the start time", () => {
  it("is omitted when unchanged — the server copies the source's", () => {
    expect(ok()).not.toHaveProperty("defaultStartTime");
  });

  it("is sent as HH:mm:ss when changed", () => {
    expect(ok({ startTime: "10:00" }).defaultStartTime).toBe("10:00:00");
  });

  it("refuses an emptied start time", () => {
    expect(refused({ startTime: "" })).toBe("startTimeRequired");
  });

  it("refuses a start already past, judged in UTC like the server", () => {
    expect(refused({ dates: ["2026-09-26"], startTime: "09:00", hasDeadline: false }, source({ defaultDeadline: null }))).toBe(
      "startInPast",
    );
    expect(refused({ dates: ["2026-09-26"], startTime: "11:00", deadline: "15:00" })).toBe("ok");
  });

  it("judges the past with the SOURCE's start when the time is left alone", () => {
    // 08:00 UTC today is already over at NOW (10:00 UTC).
    expect(refused({ dates: ["2026-09-26"] })).toBe("startInPast");
  });
});

describe("the deadline", () => {
  it("is omitted when unchanged — the server copies the source's", () => {
    expect(ok()).not.toHaveProperty("defaultDeadline");
  });

  it("is sent when changed", () => {
    expect(ok({ deadline: "14:30" }).defaultDeadline).toBe("14:30:00");
  });

  it("refuses a changed deadline at or before the start", () => {
    expect(refused({ deadline: "08:00" })).toBe("deadlineNotAfterStart");
    expect(refused({ deadline: "07:00" })).toBe("deadlineNotAfterStart");
  });

  it("refuses an emptied deadline when the source has one — it cannot be removed", () => {
    expect(refused({ deadline: "" })).toBe("deadlineRequired");
  });

  it("treats the switch as on when the source has a deadline — off would still copy it", () => {
    // `null`/omitted means "copy" on this route, so there is no way to send
    // "no deadline". A draft that says off is judged as the copied value.
    expect(ok({ hasDeadline: false })).not.toHaveProperty("defaultDeadline");
    expect(refused({ hasDeadline: false, startTime: "13:00" })).toBe("ok");
  });

  it("omits an untouched copied deadline that the new start has passed — the server falls back to 8 h", () => {
    const body = ok({ startTime: "13:00" });
    expect(body.defaultStartTime).toBe("13:00:00");
    expect(body).not.toHaveProperty("defaultDeadline");
  });

  it("does not refuse a night-job source whose copied deadline is before its start", () => {
    const night = source({ defaultStartTime: "22:00:00", defaultDeadline: "06:00:00" });
    expect(refused({}, night)).toBe("ok");
    expect(ok({}, night)).not.toHaveProperty("defaultDeadline");
  });

  it("with no source deadline: off sends nothing, on requires and sends one", () => {
    const open = source({ defaultDeadline: null });
    expect(ok({}, open)).not.toHaveProperty("defaultDeadline");
    expect(refused({ hasDeadline: true, deadline: "" }, open)).toBe("deadlineRequired");
    expect(ok({ hasDeadline: true, deadline: "11:00" }, open).defaultDeadline).toBe("11:00:00");
    expect(refused({ hasDeadline: true, deadline: "08:00" }, open)).toBe("deadlineNotAfterStart");
  });
});

describe("copiedDeadlineFallsBack", () => {
  it("is true only when an untouched copied deadline is not after the effective start", () => {
    const src = source();
    expect(copiedDeadlineFallsBack(draft(src), src)).toBe(false);
    expect(copiedDeadlineFallsBack(draft(src, { startTime: "12:00" }), src)).toBe(true);
    // Changed — it is sent and judged, never silently dropped.
    expect(copiedDeadlineFallsBack(draft(src, { startTime: "12:00", deadline: "11:00" }), src)).toBe(false);
  });

  it("is false when the source has no deadline", () => {
    const src = source({ defaultDeadline: null });
    expect(copiedDeadlineFallsBack(draft(src), src)).toBe(false);
  });

  it("is true for a night-job source left as it is", () => {
    const src = source({ defaultStartTime: "22:00:00", defaultDeadline: "06:00:00" });
    expect(copiedDeadlineFallsBack(draft(src), src)).toBe(true);
  });
});

describe("gap-fill fields", () => {
  it("never sends a value the source already has", () => {
    const body = ok({ title: "Other", instructions: "Other", ownerProvidesTools: true });
    expect(body).not.toHaveProperty("title");
    expect(body).not.toHaveProperty("instructions");
    expect(body).not.toHaveProperty("ownerProvidesTools");
  });

  it("requires and sends a missing title, trimmed", () => {
    const src = source({ title: null });
    expect(refused({ title: "   " }, src)).toBe("titleRequired");
    expect(ok({ title: "  Office wash  " }, src).title).toBe("Office wash");
  });

  it("treats a blank source title as missing, as the server does", () => {
    expect(ok({ title: "Office wash" }, source({ title: "  " })).title).toBe("Office wash");
  });

  it("requires and sends missing instructions, trimmed", () => {
    const src = source({ instructions: null });
    expect(refused({}, src)).toBe("instructionsRequired");
    expect(ok({ instructions: " Ring twice " }, src).instructions).toBe("Ring twice");
    expect(ok({ instructions: "x" }, source({ instructions: "" })).instructions).toBe("x");
  });

  it("requires and sends a missing tools answer — false is an answer", () => {
    const src = source({ ownerProvidesTools: null });
    expect(refused({}, src)).toBe("toolsRequired");
    expect(ok({ ownerProvidesTools: false }, src).ownerProvidesTools).toBe(false);
    expect(ok({ ownerProvidesTools: true }, src).ownerProvidesTools).toBe(true);
  });

  it("treats an absent tools field as missing", () => {
    const { ownerProvidesTools: _, ...rest } = source();
    void _;
    expect(refused({}, rest as CloneSource)).toBe("toolsRequired");
  });
});

describe("walk-in city and address", () => {
  const walkIn = source({ ownerId: WALK_IN_OWNER, cityId: BERLIN });

  it("sends neither on an ordinary source, whatever the draft holds", () => {
    const body = ok({ cityId: HAMBURG, moveAddress: true, location: { lat: 1, long: 2 } });
    expect(body).not.toHaveProperty("cityId");
    expect(body).not.toHaveProperty("lat");
    expect(body).not.toHaveProperty("long");
  });

  it("copies both when nothing is changed", () => {
    const body = ok({}, walkIn, true);
    expect(body).not.toHaveProperty("cityId");
    expect(body).not.toHaveProperty("lat");
  });

  it("requires a city when the walk-in source has none (filed before 2026-09-23)", () => {
    const old = source({ ownerId: WALK_IN_OWNER, cityId: null });
    expect(refused({}, old, true)).toBe("cityRequired");
    expect(ok({ cityId: BERLIN }, old, true).cityId).toBe(BERLIN);
  });

  it("sends a different city with an address change, and omits the same one", () => {
    const moved = { moveAddress: true, location: { lat: 53.55, long: 9.99 } };
    expect(ok({ ...moved, cityId: HAMBURG }, walkIn, true).cityId).toBe(HAMBURG);
    expect(ok({ ...moved, cityId: BERLIN }, walkIn, true)).not.toHaveProperty("cityId");
  });

  it("ignores a held city when the address change is switched off", () => {
    expect(ok({ cityId: HAMBURG, moveAddress: false }, walkIn, true)).not.toHaveProperty("cityId");
  });

  it("requires a map point once a different address is asked for", () => {
    expect(refused({ moveAddress: true }, walkIn, true)).toBe("locationRequired");
  });

  it("sends the point as a pair", () => {
    const body = ok(
      { moveAddress: true, location: { lat: 53.550341, long: 9.992196 } },
      walkIn,
      true,
    );
    expect(body.lat).toBe(53.550341);
    expect(body.long).toBe(9.992196);
  });

  it("ignores a held point when the address change is switched off", () => {
    const body = ok({ moveAddress: false, location: { lat: 1, long: 2 } }, walkIn, true);
    expect(body).not.toHaveProperty("lat");
    expect(body).not.toHaveProperty("long");
  });
});

describe("isWalkInSource", () => {
  it("is true when the order carries a city — only walk-in orders do", () => {
    expect(isWalkInSource({ ownerId: "x", cityId: BERLIN }, undefined)).toBe(true);
  });

  it("reads the owner once the walk-in account is known", () => {
    expect(isWalkInSource({ ownerId: WALK_IN_OWNER, cityId: null }, WALK_IN_OWNER)).toBe(true);
    expect(isWalkInSource({ ownerId: "x", cityId: null }, WALK_IN_OWNER)).toBe(false);
  });

  it("is false in an unseeded environment", () => {
    expect(isWalkInSource({ ownerId: "x", cityId: null }, null)).toBe(false);
  });

  it("is unknown while the walk-in lookup has not answered", () => {
    expect(isWalkInSource({ ownerId: WALK_IN_OWNER, cityId: null }, undefined)).toBeNull();
  });
});

function axiosError(status: number, data: unknown): AxiosError {
  return new AxiosError("x", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data,
  });
}

describe("classifyCloneError", () => {
  it("words the clone's own codes locally", () => {
    expect(classifyCloneError(axiosError(400, { error: "clone_title_required" }))).toEqual({
      kind: "clone",
      key: "titleRequired",
    });
    expect(classifyCloneError(axiosError(400, { error: "clone_field_already_set" }))).toEqual({
      kind: "clone",
      key: "fieldAlreadySet",
    });
    expect(classifyCloneError(axiosError(404, { error: "task_group_not_found" }))).toEqual({
      kind: "clone",
      key: "sourceGone",
    });
  });

  it("prefers the local wording over the catalog's for the walk-in codes", () => {
    // The catalog says "file it from the Walk-in page" — wrong in a dialog that
    // has the field.
    expect(
      classifyCloneError(axiosError(400, { error: "walkin_city_required", detail: "x" })),
    ).toEqual({ kind: "clone", key: "cityRequired" });
    expect(
      classifyCloneError(axiosError(400, { error: "walkin_location_required", detail: "x" })),
    ).toEqual({ kind: "clone", key: "locationRequired" });
  });

  it("words the contract gate from the shared catalog", () => {
    expect(classifyCloneError(axiosError(403, { error: "contract_expired" }))).toEqual({
      kind: "catalog",
      labelKey: "gateContractExpired",
    });
    expect(classifyCloneError(axiosError(400, { error: "task_date_beyond_contract" }))).toEqual({
      kind: "catalog",
      labelKey: "taskDateBeyondContract",
    });
  });

  it("passes a problem-details message through", () => {
    expect(
      classifyCloneError(
        axiosError(400, { title: "One or more validation errors occurred.", errors: { Lat: ["Lat out of range"] } }),
      ),
    ).toEqual({ kind: "validation", message: "Lat out of range" });
  });

  it("reads an empty 403 as permission", () => {
    expect(classifyCloneError(axiosError(403, ""))).toEqual({ kind: "permission" });
  });

  it("falls back to unknown", () => {
    expect(classifyCloneError(axiosError(400, { error: "something_new" }))).toEqual({ kind: "unknown" });
    expect(classifyCloneError(new Error("network"))).toEqual({ kind: "unknown" });
  });
});
