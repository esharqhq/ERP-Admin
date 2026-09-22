import { describe, expect, it } from "vitest";
import { describeGroupCancel } from "@/lib/tasks/cancel-outcome";
import type { TaskGroupDayCountsDto } from "@/lib/types/task.types";

const days = (p: Partial<TaskGroupDayCountsDto> = {}): TaskGroupDayCountsDto => ({
  total: 0, pending: 0, checkedIn: 0, inReview: 0,
  done: 0, cancelled: 0, rejected: 0, ...p,
});

describe("describeGroupCancel", () => {
  it("reports every day cancelled", () => {
    expect(
      describeGroupCancel(days({ total: 3, pending: 3 }), days({ total: 3, cancelled: 3 })),
    ).toEqual({ kind: "all", cancelled: 3, remaining: 0 });
  });

  it("reports a partial cancel — the case the 204 hides", () => {
    // Two days were more than three hours out and went; the third starts within
    // the window and was silently skipped.
    expect(
      describeGroupCancel(
        days({ total: 3, pending: 3 }),
        days({ total: 3, pending: 1, cancelled: 2 }),
      ),
    ).toEqual({ kind: "some", cancelled: 2, remaining: 1 });
  });

  it("reports a cancel that did nothing at all", () => {
    // ⚠ The server still answered 204 here.
    expect(
      describeGroupCancel(days({ total: 1, pending: 1 }), days({ total: 1, pending: 1 })),
    ).toEqual({ kind: "none", cancelled: 0, remaining: 1 });
  });

  it("does not count days that finished rather than cancelled", () => {
    expect(
      describeGroupCancel(
        days({ total: 2, pending: 1, checkedIn: 1 }),
        days({ total: 2, done: 1, cancelled: 1 }),
      ),
    ).toEqual({ kind: "all", cancelled: 1, remaining: 0 });
  });

  it("says unknown rather than guessing when a reading is missing", () => {
    expect(describeGroupCancel(undefined, days({ total: 1 }))).toEqual({
      kind: "unknown", cancelled: 0, remaining: 0,
    });
    expect(describeGroupCancel(days({ total: 1 }), null)).toEqual({
      kind: "unknown", cancelled: 0, remaining: 0,
    });
  });
});
