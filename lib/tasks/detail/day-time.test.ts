import { describe, expect, it } from "vitest";
import {
  AUTO_ACCEPT_MS,
  DEFAULT_WINDOW_MS,
  autoAcceptAt,
  instant,
  isStartPassed,
  lateWorkers,
  localMinuteOfDay,
  windowEndAt,
  workerInitials,
  workerLabel,
} from "@/lib/tasks/detail/day-time";
import { at, day, worker } from "@/lib/tasks/detail/fixtures";

describe("instant", () => {
  it("reads null, empty and unparseable as null", () => {
    expect(instant(null)).toBeNull();
    expect(instant("")).toBeNull();
    expect(instant("not a date")).toBeNull();
  });
  it("parses an ISO string", () => {
    expect(instant("2026-10-05T08:00:00")).toBe(at("2026-10-05T08:00:00"));
  });
});

describe("windowEndAt — task-lifecycle.md §0d", () => {
  it("is the deadline when there is one", () => {
    expect(windowEndAt(day())).toBe(at("2026-10-05T12:00:00"));
  });
  it("is 8 hours after the start without a deadline", () => {
    expect(windowEndAt(day({ deadline: null }))).toBe(at("2026-10-05T08:00:00") + DEFAULT_WINDOW_MS);
  });
});

describe("autoAcceptAt", () => {
  it("is hand-in + 5 h", () => {
    expect(autoAcceptAt(day({ completedAt: "2026-10-05T11:52:00" }))).toBe(
      at("2026-10-05T11:52:00") + AUTO_ACCEPT_MS,
    );
  });
  it("is null before hand-in", () => {
    expect(autoAcceptAt(day())).toBeNull();
  });
});

describe("localMinuteOfDay", () => {
  it("counts minutes from local midnight", () => {
    expect(localMinuteOfDay(at("2026-10-05T08:30:00"))).toBe(510);
  });
});

describe("lateWorkers", () => {
  const live = day({
    status: "CheckedIn",
    startedAt: "2026-10-05T08:02:00",
    workers: [
      worker({ id: "a", checkinAt: "2026-10-05T08:02:00" }),
      worker({ id: "b", workerName: "Jamshid Tursunov", checkinAt: null }),
      worker({ id: "c", outcome: "Removed", checkinAt: null }),
    ],
  });

  it("names the active workers not checked in once the start has passed", () => {
    expect(lateWorkers(live, at("2026-10-05T08:34:00")).map((w) => w.id)).toEqual(["b"]);
  });
  it("is empty before the start", () => {
    expect(lateWorkers(live, at("2026-10-05T07:59:00"))).toEqual([]);
  });
  it("is empty while the clock is unknown (0)", () => {
    expect(lateWorkers(live, 0)).toEqual([]);
  });
  it("is empty on any state but CheckedIn", () => {
    expect(lateWorkers({ ...live, status: "InReview" }, at("2026-10-05T09:00:00"))).toEqual([]);
  });
  it("reads the legacy word Active as CheckedIn", () => {
    expect(lateWorkers({ ...live, status: "Active" }, at("2026-10-05T09:00:00"))).toHaveLength(1);
  });
});

describe("isStartPassed", () => {
  it("is true for a Pending day after its start", () => {
    expect(isStartPassed(day(), at("2026-10-05T08:01:00"))).toBe(true);
  });
  it("is false before the start, on other states, and with no clock", () => {
    expect(isStartPassed(day(), at("2026-10-05T07:00:00"))).toBe(false);
    expect(isStartPassed(day({ status: "CheckedIn" }), at("2026-10-05T09:00:00"))).toBe(false);
    expect(isStartPassed(day(), 0)).toBe(false);
  });
});

describe("workerLabel", () => {
  it("falls back to the id's first 8 characters", () => {
    expect(workerLabel(worker({ workerName: null, workerId: "abcdef0123456" }))).toBe("abcdef01");
  });
});

describe("workerInitials", () => {
  it("skips a leading [tag] and takes the first letter of the first two words", () => {
    expect(workerInitials("[DEMO] Oliver Smith")).toBe("OS");
    expect(workerInitials("Sardor Aliyev")).toBe("SA");
    expect(workerInitials("abcdef01")).toBe("A");
  });
  it("is a dash when there is no letter", () => {
    expect(workerInitials("[x] 123")).toBe("–");
  });
});
