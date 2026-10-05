import { describe, expect, it } from "vitest";
import { pickDefaultDay, resolveSelectedDay, sortDays } from "@/lib/tasks/detail/select-day";
import { at, day, worker } from "@/lib/tasks/detail/fixtures";

const NOW = at("2026-10-05T09:00:00");
const TODAY = "2026-10-05";

const done = day({ id: "d29", scheduledDate: "2026-09-29", scheduledAt: "2026-09-29T08:00:00", status: "Done" });
const disputed = day({ id: "d02", scheduledDate: "2026-10-02", scheduledAt: "2026-10-02T08:00:00", status: "Rejected" });
const review = day({ id: "d03", scheduledDate: "2026-10-03", scheduledAt: "2026-10-03T08:00:00", status: "InReview" });
const todayLate = day({
  id: "d05",
  status: "CheckedIn",
  workers: [worker({ checkinAt: null })],
});
const todayOk = day({ id: "d05", status: "Pending" });
const next = day({ id: "d06", scheduledDate: "2026-10-06", scheduledAt: "2026-10-06T08:00:00" });

describe("sortDays", () => {
  it("orders by scheduledDate without touching the input", () => {
    const input = [next, done];
    expect(sortDays(input).map((t) => t.id)).toEqual(["d29", "d06"]);
    expect(input.map((t) => t.id)).toEqual(["d06", "d29"]);
  });
});

describe("pickDefaultDay — spec §3", () => {
  it("opens a disputed day first", () => {
    expect(pickDefaultDay([done, todayLate, disputed, next], NOW, TODAY)).toBe("d02");
  });
  it("then a late checked-in day", () => {
    expect(pickDefaultDay([done, review, todayLate, next], NOW, TODAY)).toBe("d05");
  });
  it("then an in-review day", () => {
    expect(pickDefaultDay([done, review, todayOk, next], NOW, TODAY)).toBe("d03");
  });
  it("then today", () => {
    expect(pickDefaultDay([done, todayOk, next], NOW, TODAY)).toBe("d05");
  });
  it("then the next upcoming day", () => {
    expect(pickDefaultDay([done, next], NOW, TODAY)).toBe("d06");
  });
  it("then the last day", () => {
    expect(pickDefaultDay([done], NOW, TODAY)).toBe("d29");
  });
  it("skips today/next while the date is unknown, landing on the last day", () => {
    expect(pickDefaultDay([todayOk, next], 0, "")).toBe("d06");
  });
  it("answers null for no days", () => {
    expect(pickDefaultDay([], NOW, TODAY)).toBeNull();
  });
});

describe("resolveSelectedDay", () => {
  it("honours a ?day= that belongs to the booking", () => {
    expect(resolveSelectedDay([done, next], "d29", NOW, TODAY)?.id).toBe("d29");
  });
  it("falls back to the default for a ?day= not in the booking", () => {
    expect(resolveSelectedDay([done, next], "stale-id", NOW, TODAY)?.id).toBe("d06");
  });
  it("is null with no days", () => {
    expect(resolveSelectedDay([], "d29", NOW, TODAY)).toBeNull();
  });
});
