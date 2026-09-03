import { describe, expect, it } from "vitest";
import type {
  AvailabilityDto,
  AvailabilityExceptionDto,
} from "@/lib/types/availability.types";
import {
  exceptionWindow,
  resolveAvailabilityWeek,
  shortTime,
  windowLabel,
} from "@/lib/workers/availability";

/** Mon 2026-08-31 → Sun 2026-09-06. */
const WEEK = [
  "2026-08-31",
  "2026-09-01",
  "2026-09-02",
  "2026-09-03",
  "2026-09-04",
  "2026-09-05",
  "2026-09-06",
];

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function dto(over: Partial<AvailabilityDto> = {}): AvailabilityDto {
  return {
    base: { startTime: "08:00:00", endTime: "16:00:00" },
    days: WEEKDAYS.map((dayOfWeek, i) => ({
      dayOfWeek,
      // Mon–Fri open, weekend off — the seeded shape.
      isAvailable: i < 5,
      startTime: i < 5 ? "08:00:00" : null,
      endTime: i < 5 ? "16:00:00" : null,
      source: "Base" as const,
    })),
    exceptions: [],
    isSet: true,
    ...over,
  };
}

function exception(
  over: Partial<AvailabilityExceptionDto> & { date: string },
): AvailabilityExceptionDto {
  return {
    isAvailable: false,
    startTime: null,
    endTime: null,
    setByAdmin: false,
    createdAt: "2026-08-20T10:00:00Z",
    updatedAt: null,
    ...over,
  };
}

describe("resolveAvailabilityWeek", () => {
  it("reads the weekday rows when nothing overrides them", () => {
    const week = resolveAvailabilityWeek(dto(), WEEK);
    expect(week[0]).toEqual({
      state: "open",
      from: "08:00:00",
      to: "16:00:00",
      source: "Base",
    });
    expect(week[5]).toEqual({ state: "closed", source: "Base" });
    expect(week[6]).toEqual({ state: "closed", source: "Base" });
  });

  it("lines the seven answers up with the seven days, Monday-first", () => {
    expect(resolveAvailabilityWeek(dto(), WEEK)).toHaveLength(7);
    // Saturday is index 5 in a Monday-first week and `getDay() === 6`.
    expect(resolveAvailabilityWeek(dto(), WEEK)[5].state).toBe("closed");
  });

  /* An exception beats the weekday row in BOTH directions. */
  it("lets an exception close a normally-open day", () => {
    const week = resolveAvailabilityWeek(
      dto({ exceptions: [exception({ date: "2026-09-02" })] }),
      WEEK,
    );
    expect(week[2]).toEqual({ state: "closed", source: "Worker" });
  });

  it("lets an exception open a normally-closed day", () => {
    const week = resolveAvailabilityWeek(
      dto({
        exceptions: [
          exception({
            date: "2026-09-05",
            isAvailable: true,
            startTime: "10:00:00",
            endTime: "14:00:00",
          }),
        ],
      }),
      WEEK,
    );
    expect(week[5]).toEqual({
      state: "open",
      from: "10:00:00",
      to: "14:00:00",
      source: "Worker",
    });
  });

  /*
    The shape mismatch: an exception has `setByAdmin`, not `source`. An admin
    override that rendered as the worker's own choice is invisible, which is the
    one thing the strip exists to prevent.
  */
  it("maps setByAdmin onto Admin, and can never call an exception Base", () => {
    const week = resolveAvailabilityWeek(
      dto({
        exceptions: [
          exception({
            date: "2026-09-03",
            isAvailable: true,
            startTime: "10:00:00",
            endTime: "18:00:00",
            setByAdmin: true,
          }),
        ],
      }),
      WEEK,
    );
    expect(week[3]).toMatchObject({ state: "open", source: "Admin" });
    expect(week[3]).not.toMatchObject({ source: "Base" });
  });

  it("keeps a hand-set weekday's own source", () => {
    const base = dto();
    base.days[0] = {
      dayOfWeek: "Monday",
      isAvailable: true,
      startTime: "06:00:00",
      endTime: "12:00:00",
      source: "Admin",
    };
    expect(resolveAvailabilityWeek(base, WEEK)[0]).toMatchObject({
      state: "open",
      source: "Admin",
      from: "06:00:00",
    });
  });

  /* Absence is unknown, not unavailable — the rule `?availableOn=` follows. */
  it("calls every day unknown when no base has ever been saved", () => {
    const week = resolveAvailabilityWeek(
      dto({ isSet: false, base: null, days: [] }),
      WEEK,
    );
    expect(week).toHaveLength(7);
    expect(week.every((d) => d.state === "unknown")).toBe(true);
  });

  it("says unknown rather than guessing when the read has not landed", () => {
    expect(resolveAvailabilityWeek(undefined, WEEK).every((d) => d.state === "unknown")).toBe(
      true,
    );
  });

  it("treats an open row missing its times as unknown, not open-ended", () => {
    const base = dto();
    base.days[1] = {
      dayOfWeek: "Tuesday",
      isAvailable: true,
      startTime: null,
      endTime: null,
      source: "Worker",
    };
    expect(resolveAvailabilityWeek(base, WEEK)[1]).toEqual({ state: "unknown" });
  });

  it("ignores an exception outside the week on screen", () => {
    const week = resolveAvailabilityWeek(
      dto({ exceptions: [exception({ date: "2026-10-01" })] }),
      WEEK,
    );
    expect(week[0].state).toBe("open");
  });
});

describe("shortTime / windowLabel", () => {
  it("drops the seconds nobody sets", () => {
    expect(shortTime("08:00:00")).toBe("08:00");
    expect(shortTime(null)).toBe("");
  });

  it("labels only an open day", () => {
    expect(
      windowLabel({ state: "open", from: "08:00:00", to: "16:00:00", source: "Base" }),
    ).toBe("08:00 – 16:00");
    expect(windowLabel({ state: "closed", source: "Base" })).toBe("");
    expect(windowLabel({ state: "unknown" })).toBe("");
  });
});

describe("exceptionWindow", () => {
  /*
    The server's default exception window is today … +90 days. A past week read
    without explicit bounds returns no exceptions and silently draws the plain
    weekday pattern — every override invisible.
  */
  it("bounds the read to the week on screen", () => {
    expect(exceptionWindow(WEEK)).toEqual({
      from: "2026-08-31",
      to: "2026-09-06",
    });
  });
});
