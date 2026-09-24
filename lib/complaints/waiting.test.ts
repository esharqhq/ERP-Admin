import { describe, expect, it } from "vitest";
import {
  ESCALATION_HOURS,
  hoursWaiting,
  isEscalated,
  sortQueue,
  type ComplaintQueueRow,
} from "@/lib/complaints/waiting";
import type { TaskItemDto } from "@/lib/types/task.types";

const NOW = new Date("2026-09-24T12:00:00Z");

function row(id: string, raisedAt: string | null | undefined, scheduledAt = "2026-09-20T09:00:00Z"): ComplaintQueueRow {
  return { task: { id, scheduledAt } as TaskItemDto, raisedAt };
}

describe("hoursWaiting", () => {
  it("counts whole hours since the complaint was raised", () => {
    expect(hoursWaiting("2026-09-24T09:30:00Z", NOW)).toBe(2);
  });

  it("is null when the moment is unknown", () => {
    expect(hoursWaiting(null, NOW)).toBeNull();
    expect(hoursWaiting(undefined, NOW)).toBeNull();
    expect(hoursWaiting("not a date", NOW)).toBeNull();
  });

  it("never goes negative on a clock skew", () => {
    expect(hoursWaiting("2026-09-24T12:30:00Z", NOW)).toBe(0);
  });
});

describe("isEscalated — the backend's 48-hour timer", () => {
  it("uses 48 hours", () => {
    expect(ESCALATION_HOURS).toBe(48);
  });

  it("is false at exactly 48 hours and true after", () => {
    expect(isEscalated("2026-09-22T12:00:00Z", NOW)).toBe(false);
    expect(isEscalated("2026-09-22T11:59:00Z", NOW)).toBe(true);
  });

  it("is false when the moment is unknown", () => {
    expect(isEscalated(null, NOW)).toBe(false);
  });
});

describe("sortQueue", () => {
  it("puts the oldest complaint first", () => {
    const out = sortQueue([
      row("b", "2026-09-23T10:00:00Z"),
      row("a", "2026-09-21T10:00:00Z"),
    ]);
    expect(out.map((r) => r.task.id)).toEqual(["a", "b"]);
  });

  it("puts rows whose moment is unknown last, ordered by their day", () => {
    const out = sortQueue([
      row("x", undefined, "2026-09-22T09:00:00Z"),
      row("a", "2026-09-23T10:00:00Z"),
      row("y", null, "2026-09-21T09:00:00Z"),
    ]);
    expect(out.map((r) => r.task.id)).toEqual(["a", "y", "x"]);
  });

  it("does not mutate its input", () => {
    const input = [row("b", "2026-09-23T10:00:00Z"), row("a", "2026-09-21T10:00:00Z")];
    sortQueue(input);
    expect(input.map((r) => r.task.id)).toEqual(["b", "a"]);
  });
});
