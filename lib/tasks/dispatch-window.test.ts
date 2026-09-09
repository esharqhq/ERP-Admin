import { describe, expect, it } from "vitest";
import {
  DISPATCH_BACKSTOP_DAYS,
  DISPATCH_HORIZON_DAYS,
  dispatchWindow,
} from "@/lib/tasks/dispatch-window";
import { toLocalDateKey } from "@/lib/tasks/weekly-rows";

/**
 * The suite pins no timezone, so nothing here asserts a literal UTC string —
 * that would pass on the machine it was written on and fail in CI. Every
 * assertion is about **local-day semantics**, which is what the module promises.
 */
describe("dispatchWindow", () => {
  const now = new Date(2026, 8, 9, 14, 30, 0); // 9 Sep 2026, local

  it("starts at local midnight, not at the current time of day", () => {
    const first = new Date(dispatchWindow(now).from);
    expect(first.getHours()).toBe(0);
    expect(first.getMinutes()).toBe(0);
    expect(first.getSeconds()).toBe(0);
    expect(first.getMilliseconds()).toBe(0);
  });

  it("ends on the last millisecond of the last day, never that day's midnight", () => {
    // A bound of 00:00 would silently drop every task on the day it names.
    const last = new Date(dispatchWindow(now).to);
    expect(last.getHours()).toBe(23);
    expect(last.getMinutes()).toBe(59);
    expect(last.getSeconds()).toBe(59);
    expect(last.getMilliseconds()).toBe(999);
  });

  it("reaches back by the backstop so a just-elapsed unstaffed task stays visible", () => {
    const { fromKey } = dispatchWindow(now);
    const expected = toLocalDateKey(
      new Date(2026, 8, 9 - DISPATCH_BACKSTOP_DAYS),
    );
    expect(fromKey).toBe(expected);
  });

  it("reaches forward by the horizon", () => {
    const { toKey } = dispatchWindow(now);
    const expected = toLocalDateKey(
      new Date(2026, 8, 9 + DISPATCH_HORIZON_DAYS),
    );
    expect(toKey).toBe(expected);
  });

  it("spans backstop + horizon + today, inclusive of both ends", () => {
    const { from, to } = dispatchWindow(now);
    const days =
      (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
    // Whole days plus the final 23:59:59.999, within an hour of slack for a DST
    // shift landing inside the window.
    expect(days).toBeGreaterThan(DISPATCH_BACKSTOP_DAYS + DISPATCH_HORIZON_DAYS);
    expect(days).toBeLessThan(
      DISPATCH_BACKSTOP_DAYS + DISPATCH_HORIZON_DAYS + 1.05,
    );
  });

  it("is ordered — from is always before to", () => {
    const { from, to } = dispatchWindow(now);
    expect(new Date(from).getTime()).toBeLessThan(new Date(to).getTime());
  });

  it("rolls back over a month boundary", () => {
    const { fromKey } = dispatchWindow(new Date(2026, 8, 1, 9, 0, 0));
    expect(fromKey).toBe("2026-08-30");
  });

  it("rolls forward over a month boundary", () => {
    const { toKey } = dispatchWindow(new Date(2026, 8, 25, 9, 0, 0));
    expect(toKey).toBe("2026-10-09");
  });

  it("rolls back over a year boundary", () => {
    const { fromKey } = dispatchWindow(new Date(2027, 0, 1, 9, 0, 0));
    expect(fromKey).toBe("2026-12-30");
  });

  it("rolls forward over a year boundary", () => {
    const { toKey } = dispatchWindow(new Date(2026, 11, 25, 9, 0, 0));
    expect(toKey).toBe("2027-01-08");
  });

  it("survives a leap day without skipping it", () => {
    const { fromKey, toKey } = dispatchWindow(new Date(2028, 1, 29, 12, 0, 0));
    expect(fromKey).toBe("2028-02-27");
    expect(toKey).toBe("2028-03-14");
  });

  it("gives the same window for any time of day on the same date", () => {
    const morning = dispatchWindow(new Date(2026, 8, 9, 0, 1, 0));
    const midnightish = dispatchWindow(new Date(2026, 8, 9, 23, 59, 0));
    expect(morning).toEqual(midnightish);
  });

  it("both bounds serialize as parseable instants", () => {
    const { from, to } = dispatchWindow(now);
    expect(Number.isNaN(new Date(from).getTime())).toBe(false);
    expect(Number.isNaN(new Date(to).getTime())).toBe(false);
  });
});
