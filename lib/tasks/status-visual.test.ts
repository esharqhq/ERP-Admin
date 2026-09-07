import { describe, expect, it } from "vitest";
import type { DerivedTaskStatus } from "@/lib/tasks/derived-status";
import { TASK_STATUS_VISUAL, taskStatusRail } from "@/lib/tasks/status-visual";

const ALL_STATUSES: DerivedTaskStatus[] = [
  "Open",
  "Scheduled",
  "Running",
  "Review",
  "Done",
  "Unstaffed",
  "Overdue",
  "Cancelled",
];

describe("TASK_STATUS_VISUAL", () => {
  it("has an entry for every DerivedTaskStatus value", () => {
    for (const status of ALL_STATUSES) {
      expect(TASK_STATUS_VISUAL[status]).toBeDefined();
    }
  });

  it("gives Unstaffed the red rail", () => {
    expect(taskStatusRail("Unstaffed")).toBe("#DC3B3B");
  });

  it("gives every other status a null rail", () => {
    for (const status of ALL_STATUSES) {
      if (status === "Unstaffed") continue;
      expect(taskStatusRail(status)).toBeNull();
    }
  });

  it("gives only Overdue a ring", () => {
    for (const status of ALL_STATUSES) {
      if (status === "Overdue") {
        expect(TASK_STATUS_VISUAL[status].ring).not.toBeNull();
      } else {
        expect(TASK_STATUS_VISUAL[status].ring).toBeNull();
      }
    }
  });

  it("keeps Cancelled's background transparent — history stays quiet", () => {
    expect(TASK_STATUS_VISUAL.Cancelled.bg).toBe("transparent");
  });
});
