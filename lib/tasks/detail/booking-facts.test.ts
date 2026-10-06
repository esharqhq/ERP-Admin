import { describe, expect, it } from "vitest";
import {
  bookingCancelledAt,
  datesFact,
  headerPlace,
  isNothingLeftToRun,
  isSingleDay,
  legendCounts,
  windowFact,
  windowSubKey,
  workersFact,
} from "@/lib/tasks/detail/booking-facts";
import { at, booking, day } from "@/lib/tasks/detail/fixtures";
import type { TaskItemDto } from "@/lib/types/task.types";

const d = (id: string, date: string, over: Partial<TaskItemDto> = {}) =>
  day({ id, scheduledDate: date, scheduledAt: `${date}T08:00:00`, deadline: `${date}T12:00:00`, ...over });

describe("isSingleDay", () => {
  it("is a SingleTask, or a booking with one day", () => {
    expect(isSingleDay(booking({ kind: "SingleTask" }))).toBe(true);
    expect(isSingleDay(booking({ tasks: [d("a", "2026-10-05")] }))).toBe(true);
    expect(isSingleDay(booking({ tasks: [d("a", "2026-10-05"), d("b", "2026-10-06")] }))).toBe(false);
  });
});

describe("legendCounts", () => {
  it("counts days per state and drops unknown words", () => {
    const c = legendCounts([
      d("a", "2026-10-01", { status: "Done" }),
      d("b", "2026-10-02", { status: "Done" }),
      d("c", "2026-10-03", { status: "Paused" }),
    ]);
    expect(c.done).toBe(2);
    expect(c.pending).toBe(0);
    expect(Object.values(c).reduce((s, n) => s + n, 0)).toBe(2);
  });
});

describe("isNothingLeftToRun — spec §7", () => {
  const days = (over: object) => ({
    days: { total: 3, pending: 0, checkedIn: 0, inReview: 0, done: 2, cancelled: 1, rejected: 0, ...over },
  });
  it("is true with a cancelled day and nothing open", () => {
    expect(isNothingLeftToRun(days({}))).toBe(true);
  });
  it("is false while any day is open or disputed, or nothing was cancelled", () => {
    expect(isNothingLeftToRun(days({ pending: 1 }))).toBe(false);
    expect(isNothingLeftToRun(days({ rejected: 1 }))).toBe(false);
    expect(isNothingLeftToRun(days({ cancelled: 0, done: 3 }))).toBe(false);
  });
});

describe("windowFact — times from instants, never the wall-clock defaults", () => {
  it("is one window when every live day shares it", () => {
    expect(windowFact([d("a", "2026-10-05"), d("b", "2026-10-06")])).toEqual({
      kind: "same",
      start: at("2026-10-05T08:00:00"),
      end: at("2026-10-05T12:00:00"),
    });
  });
  it("ignores cancelled days when live ones exist", () => {
    const odd = d("b", "2026-10-06", { status: "Cancelled", scheduledAt: "2026-10-06T10:00:00" });
    expect(windowFact([d("a", "2026-10-05"), odd]).kind).toBe("same");
  });
  it("still answers from cancelled days when every day is cancelled", () => {
    expect(windowFact([d("a", "2026-10-05", { status: "Cancelled" })]).kind).toBe("same");
  });
  it("varies when two live days differ", () => {
    expect(
      windowFact([d("a", "2026-10-05"), d("b", "2026-10-06", { scheduledAt: "2026-10-06T09:00:00" })]).kind,
    ).toBe("varies");
  });
  it("keeps a null end when there is no deadline", () => {
    expect(windowFact([d("a", "2026-10-05", { deadline: null })])).toEqual({
      kind: "same",
      start: at("2026-10-05T08:00:00"),
      end: null,
    });
  });
  it("is none with no days", () => {
    expect(windowFact([])).toEqual({ kind: "none" });
  });
});

describe("workersFact / datesFact", () => {
  it("reports a range when days differ", () => {
    expect(workersFact([d("a", "2026-10-05"), d("b", "2026-10-06", { requiredWorkerCount: 2 })])).toEqual({ min: 2, max: 3 });
    expect(workersFact([])).toBeNull();
  });
  it("reports first and last date in order", () => {
    expect(datesFact([d("b", "2026-10-07"), d("a", "2026-09-29")])).toEqual({
      first: "2026-09-29",
      last: "2026-10-07",
      count: 2,
    });
    expect(datesFact([])).toBeNull();
  });
});

describe("headerPlace", () => {
  it("walk-in wins", () => {
    expect(headerPlace({ isWalkIn: true, address: "x" })).toEqual({ kind: "walkIn" });
  });
  it("address with the city appended once", () => {
    expect(headerPlace({ isWalkIn: false, address: "Torstraße 88, 10119", cityName: "Berlin" })).toEqual({
      kind: "text",
      text: "Torstraße 88, 10119 Berlin",
    });
    expect(headerPlace({ isWalkIn: false, address: "Torstraße 88, 10119 Berlin", cityName: "Berlin" })).toEqual({
      kind: "text",
      text: "Torstraße 88, 10119 Berlin",
    });
  });
  it("falls back to the property name, then none", () => {
    expect(headerPlace({ isWalkIn: null, propertyName: "Torstraße 88" })).toEqual({ kind: "text", text: "Torstraße 88" });
    expect(headerPlace({ isWalkIn: null })).toEqual({ kind: "none" });
  });
});

describe("windowSubKey", () => {
  it("only a shared window gets a sub-line", () => {
    expect(windowSubKey({ kind: "varies" }, false)).toBeNull();
    expect(windowSubKey({ kind: "none" }, false)).toBeNull();
    expect(windowSubKey({ kind: "same", start: 1, end: 2 }, false)).toBe("everyDay");
    expect(windowSubKey({ kind: "same", start: 1, end: 2 }, true)).toBe("oneDay");
    expect(windowSubKey({ kind: "same", start: 1, end: null }, false)).toBe("eightHours");
  });
});

describe("headerPlace — city in either language", () => {
  it("does not append the city when the address already names it in another language", () => {
    expect(
      headerPlace({ isWalkIn: false, address: "Marienplatz 8, 80331 München", cityName: "Munich", cityNames: ["München", "Munich"] }),
    ).toEqual({ kind: "text", text: "Marienplatz 8, 80331 München" });
  });
});

describe("bookingCancelledAt — §0k·2, read from the days", () => {
  it("is the latest cancelledAt among BookingCancelled days", () => {
    expect(
      bookingCancelledAt([
        day({ id: "a", status: "Cancelled", cancellationReason: "BookingCancelled", cancelledAt: "2026-10-03T09:00:00" }),
        day({ id: "b", status: "Cancelled", cancellationReason: "DayCancelled", cancelledAt: "2026-10-04T09:00:00" }),
        day({ id: "c", status: "Done" }),
      ]),
    ).toBe(at("2026-10-03T09:00:00"));
  });
  it("is null when no day went with the booking", () => {
    expect(
      bookingCancelledAt([day({ status: "Cancelled", cancellationReason: "AutoCancelled", cancelledAt: "2026-10-03T09:00:00" })]),
    ).toBeNull();
  });
});

describe("headerPlace — the booking's own header fields (§0k·3)", () => {
  it("a walk-in never shows the placeholder address", () => {
    expect(
      headerPlace({ isWalkIn: true, address: "Manual order — address per order", propertyName: "Walk-in / Manual Orders" }),
    ).toEqual({ kind: "walkIn" });
  });
  it("an ordinary booking shows propertyAddress as sent", () => {
    expect(headerPlace({ isWalkIn: false, address: "Am Sandtorkai 50, 20457 Hamburg", propertyName: "Harbour Hotel" })).toEqual({
      kind: "text",
      text: "Am Sandtorkai 50, 20457 Hamburg",
    });
  });
});
