import { describe, expect, it } from "vitest";
import {
  countRows,
  deriveKind,
  deriveRows,
  lateBy,
  matchesTab,
  refusalReasonKey,
  type AttendanceKind,
} from "@/lib/attendance/status";
import type { AttendanceRowDto } from "@/lib/types/attendance.types";

/**
 * The status grammar is the one part of this screen that real data cannot
 * exercise: a live day will never contain all seven kinds at once, and the two
 * that matter most — `overdue` against `noshow` — differ only by fields a
 * screenshot cannot vary. So the table below is the design's §02 spec, restated as
 * assertions.
 */

const SCHEDULED = "2026-09-10T10:00:00Z";
const SCHED_MS = Date.parse(SCHEDULED);
const MIN = 60_000;

function row(over: Partial<AttendanceRowDto> = {}): AttendanceRowDto {
  return {
    taskId: "tsk_1061",
    taskGroupId: "grp_0f19",
    taskGroupTitle: "Endreinigung",
    propertyId: "prp_9c02",
    propertyName: "Villa Grunewald",
    workerId: "wkr_c93a",
    workerName: "Nilufar Yusupova",
    scheduledDate: "2026-09-10",
    scheduledAt: SCHEDULED,
    taskStatus: "CheckedIn",
    present: false,
    checkinAt: null,
    checkinLat: null,
    checkinLng: null,
    checkoutAt: null,
    submittedAt: null,
    outcome: "Pending",
    refusedCheckinCount: 0,
    lastRefusalReason: null,
    lastRefusalAt: null,
    lastRefusalDistanceMeters: null,
    ...over,
  };
}

/** A check-in `n` minutes after the scheduled start. */
const checkedIn = (n: number): Partial<AttendanceRowDto> => ({
  present: true,
  checkinAt: new Date(SCHED_MS + n * MIN).toISOString(),
});

describe("deriveKind", () => {
  const cases: [AttendanceKind, string, Partial<AttendanceRowDto>, number][] = [
    ["in", "checked in on time", checkedIn(-2), SCHED_MS + 60 * MIN],
    ["in", "checked in exactly on the grace boundary", checkedIn(5), SCHED_MS + 60 * MIN],
    ["late", "checked in one minute past grace", checkedIn(6), SCHED_MS + 60 * MIN],
    ["await", "not due yet", {}, SCHED_MS - 30 * MIN],
    ["overdue", "absent, past due, task still CheckedIn", {}, SCHED_MS + 30 * MIN],
    ["overdue", "absent, past due, task still Pending", { taskStatus: "Pending" }, SCHED_MS + 30 * MIN],
    ["noshow", "outcome says so", { outcome: "NoShow" }, SCHED_MS + 30 * MIN],
    ["noshow", "task finished without them", { taskStatus: "Done" }, SCHED_MS + 30 * MIN],
    ["noshow", "task submitted for review without them", { taskStatus: "InReview" }, SCHED_MS + 30 * MIN],
    ["removed", "taken off the task", { outcome: "Removed" }, SCHED_MS + 30 * MIN],
    ["cancelled", "task cancelled", { taskStatus: "Cancelled" }, SCHED_MS + 30 * MIN],
    ["cancelled", "outcome cancelled", { outcome: "Cancelled" }, SCHED_MS + 30 * MIN],
  ];

  for (const [expected, label, over, now] of cases) {
    it(`${expected} — ${label}`, () => {
      expect(deriveKind(row(over), now)).toBe(expected);
    });
  }

  it("calls a no-show on a handed-in day a no-show, not overdue", () => {
    // The server says `InReview` since 2026-09-17. While that word was unknown,
    // the `status === "review"` arm did not match and the row fell through to the
    // clock, reading `overdue` — a worker who simply never arrived looked late.
    expect(
      deriveKind(
        row({ taskStatus: "InReview", present: false, checkinAt: null }),
        SCHED_MS + 30 * MIN,
      ),
    ).toBe("noshow");
  });

  it("does the same for a CheckedIn day that has not ended", () => {
    expect(
      deriveKind(
        row({ taskStatus: "CheckedIn", present: false, checkinAt: null }),
        SCHED_MS + 30 * MIN,
      ),
    ).toBe("overdue");
  });

  // The precedence cases. Each one is a pair of fields that both have a claim on
  // the row, and getting the order wrong is invisible to a typecheck.

  it("removed wins over a real check-in", () => {
    expect(deriveKind(row({ ...checkedIn(1), outcome: "Removed" }), SCHED_MS + 60 * MIN)).toBe(
      "removed",
    );
  });

  it("cancelled wins over a real check-in", () => {
    expect(
      deriveKind(row({ ...checkedIn(1), taskStatus: "Cancelled" }), SCHED_MS + 60 * MIN),
    ).toBe("cancelled");
  });

  it("cancelled wins over removed", () => {
    expect(
      deriveKind(
        row({ taskStatus: "Cancelled", outcome: "Removed" }),
        SCHED_MS + 60 * MIN,
      ),
    ).toBe("cancelled");
  });

  it("a check-in wins over a Done task, which alone would read noshow", () => {
    expect(deriveKind(row({ ...checkedIn(1), taskStatus: "Done" }), SCHED_MS + 60 * MIN)).toBe(
      "in",
    );
  });

  it("a refusal count alone never changes the kind", () => {
    const refused = { refusedCheckinCount: 3, lastRefusalReason: "OutsideGeofence" as const };
    expect(deriveKind(row(refused), SCHED_MS - 30 * MIN)).toBe("await");
    expect(deriveKind(row({ ...refused, ...checkedIn(40) }), SCHED_MS + 60 * MIN)).toBe("late");
  });

  // Robustness against the wire, where both fields are plain strings.

  it("matches the status enums case-insensitively", () => {
    expect(deriveKind(row({ taskStatus: "DONE" }), SCHED_MS + 30 * MIN)).toBe("noshow");
    expect(deriveKind(row({ outcome: "noshow" }), SCHED_MS + 30 * MIN)).toBe("noshow");
  });

  it("treats an unknown status as no signal rather than a red row", () => {
    // An unrecognised value must not short-circuit into a kind of its own; the
    // clock still decides, exactly as it does for a plain Active task.
    // (`Rejected` no longer qualifies — F-07 ·5 taught the vocabulary that word.)
    expect(deriveKind(row({ taskStatus: "Escalated" }), SCHED_MS - 30 * MIN)).toBe("await");
    expect(deriveKind(row({ taskStatus: "Escalated" }), SCHED_MS + 30 * MIN)).toBe("overdue");
  });

  it("reads an undecided absence as await while the clock is unknown", () => {
    // `useClock()` returns 0 on the server pass. Zero must not mean "1970", which
    // would make every absence on the screen overdue for one paint.
    expect(deriveKind(row(), 0)).toBe("await");
  });

  it("degrades to in when the check-in is real but the schedule is unparseable", () => {
    expect(
      deriveKind(row({ ...checkedIn(600), scheduledAt: "not-a-date" }), SCHED_MS),
    ).toBe("in");
  });

  it("never claims present without a check-in timestamp", () => {
    // `present` is documented as `checkinAt != null`, but it is a separate wire
    // field and the badge must not outrun the timestamp it would render.
    expect(deriveKind(row({ present: true, checkinAt: null }), SCHED_MS + 30 * MIN)).toBe(
      "overdue",
    );
  });

  it("resolves a past day's absences without a special case", () => {
    // The whole point of comparing instants rather than minutes-since-midnight.
    const lastWeek = SCHED_MS + 7 * 24 * 60 * MIN;
    expect(deriveKind(row(), lastWeek)).toBe("overdue");
    expect(deriveKind(row({ taskStatus: "Done" }), lastWeek)).toBe("noshow");
  });

  it("resolves a future day to a calm wall of await", () => {
    const yesterday = SCHED_MS - 24 * 60 * MIN;
    expect(deriveKind(row(), yesterday)).toBe("await");
    expect(deriveKind(row({ taskStatus: "Pending" }), yesterday)).toBe("await");
  });
});

describe("lateBy", () => {
  const now = SCHED_MS + 80 * MIN;
  const derive = (over: Partial<AttendanceRowDto>) => deriveRows([row(over)], now)[0]!;

  it("is the signed delta for a check-in", () => {
    expect(lateBy(derive(checkedIn(22)), now, true)).toBe(22);
    expect(lateBy(derive(checkedIn(-4)), now, true)).toBe(-4);
  });

  it("is the age of the miss for an overdue row today", () => {
    expect(lateBy(derive({}), now, true)).toBe(80);
  });

  it("is silent for an overdue row on any other day", () => {
    // `+2847m` on last Tuesday is noise: the number answers "how late right now".
    expect(lateBy(derive({}), now, false)).toBeNull();
  });

  it("is silent for a row that is not yet due", () => {
    const early = SCHED_MS - 30 * MIN;
    expect(lateBy(deriveRows([row()], early)[0]!, early, true)).toBeNull();
  });

  it("is silent for a no-show, which has no delta to report", () => {
    expect(lateBy(derive({ outcome: "NoShow" }), now, true)).toBeNull();
  });
});

describe("countRows", () => {
  const now = SCHED_MS + 30 * MIN;
  const rows = deriveRows(
    [
      row(checkedIn(-2)), // in
      row(checkedIn(1)), // in
      row(checkedIn(20)), // late
      row({}), // overdue
      row({ outcome: "NoShow" }), // noshow
      row({ scheduledAt: new Date(now + 60 * MIN).toISOString() }), // await
      row({ outcome: "Removed" }), // removed
      row({ taskStatus: "Cancelled" }), // cancelled
      row({ ...checkedIn(2), refusedCheckinCount: 1 }), // in, and refused
    ],
    now,
  );
  const counts = countRows(rows);

  it("counts each kind", () => {
    expect(counts.all).toBe(9);
    expect(counts.in).toBe(3);
    expect(counts.late).toBe(1);
  });

  it("groups the three ways of not having arrived", () => {
    expect(counts.missing).toBe(3); // overdue + noshow + await
  });

  it("counts refusals on a separate axis from the kinds", () => {
    // The refused row is also counted as `in`. This is the design's "Refused,
    // then in": the count is history, `present` is now.
    expect(counts.refused).toBe(1);
    expect(counts.in).toBe(3);
  });

  it("does not add up to the total, because removed and cancelled are neither", () => {
    expect(counts.in + counts.late + counts.missing).toBe(7);
    expect(counts.all).toBe(9);
  });

  it("reports arrived as the numerator of 'n / total'", () => {
    expect(counts.arrived).toBe(4);
  });

  it("counts an empty day as zero rather than throwing", () => {
    expect(countRows([])).toMatchObject({ all: 0, arrived: 0, missing: 0 });
  });
});

describe("matchesTab", () => {
  const now = SCHED_MS + 30 * MIN;
  const one = (over: Partial<AttendanceRowDto>) => deriveRows([row(over)], now)[0]!;

  it("puts all three missing kinds behind one tab", () => {
    for (const over of [{}, { outcome: "NoShow" }, { taskStatus: "Pending" }]) {
      expect(matchesTab(one(over), "missing")).toBe(true);
    }
  });

  it("keeps removed and cancelled out of missing", () => {
    expect(matchesTab(one({ outcome: "Removed" }), "missing")).toBe(false);
    expect(matchesTab(one({ taskStatus: "Cancelled" }), "missing")).toBe(false);
  });

  it("selects refusals regardless of whether the worker later arrived", () => {
    const refusedAndIn = one({ ...checkedIn(1), refusedCheckinCount: 2 });
    expect(matchesTab(refusedAndIn, "refused")).toBe(true);
    expect(matchesTab(refusedAndIn, "in")).toBe(true);
  });

  it("keeps every row on the all tab", () => {
    expect(matchesTab(one({ taskStatus: "Cancelled" }), "all")).toBe(true);
  });
});

describe("a disputed day (F-07 ·5)", () => {
  it("reads an absent worker as noshow — the day was handed in", () => {
    expect(
      deriveKind(row({ taskStatus: "Rejected", present: false }), SCHED_MS + 600 * MIN),
    ).toBe("noshow");
  });

  it("still reads a present worker as in", () => {
    expect(
      deriveKind(
        row({ taskStatus: "Rejected", present: true, checkinAt: SCHEDULED }),
        SCHED_MS + 600 * MIN,
      ),
    ).toBe("in");
  });
});

describe("refusalReasonKey", () => {
  it("maps the three documented reasons", () => {
    expect(refusalReasonKey("OutsideGeofence")).toBe("outsideGeofence");
    expect(refusalReasonKey("GpsRequired")).toBe("gpsRequired");
    expect(refusalReasonKey("GeofenceTargetMissing")).toBe("targetMissing");
  });

  it("drops a reason it does not recognise instead of rendering a dangling separator", () => {
    // The DTO documents TitleCase but the wire field is a plain string, so the
    // union is our assertion about it, not a guarantee.
    expect(refusalReasonKey("SomethingNew")).toBeNull();
    expect(refusalReasonKey(null)).toBeNull();
    expect(refusalReasonKey("")).toBeNull();
  });
});
