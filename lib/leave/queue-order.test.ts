import { describe, expect, it } from "vitest";
import { orderQueue } from "@/lib/leave/queue-order";
import type { WorkerLeaveRequestDto } from "@/lib/types/leave.types";

function req(
  id: string,
  soonestAffectedAt: string | null,
  createdAt = "2026-09-01T00:00:00.000Z",
): WorkerLeaveRequestDto {
  return {
    id,
    workerId: "w-1",
    workerName: "Dilnoza Karimova",
    targetType: "TaskGroup",
    taskId: null,
    taskGroupId: "g-1",
    reason: "Family emergency",
    status: "Pending",
    supportTicketId: "st-1",
    decidedByAdminId: null,
    decidedAt: null,
    decisionNote: null,
    createdAt,
    soonestAffectedAt,
  };
}

const ids = (rows: WorkerLeaveRequestDto[]) => rows.map((r) => r.id);

describe("orderQueue", () => {
  it("puts the soonest shift first", () => {
    expect(
      ids(
        orderQueue([
          req("next-month", "2026-10-08T08:00:00.000Z"),
          req("in-4h", "2026-09-08T16:00:00.000Z"),
          req("tomorrow", "2026-09-09T08:00:00.000Z"),
        ]),
      ),
    ).toEqual(["in-4h", "tomorrow", "next-month"]);
  });

  // A Task-targeted request carries its date unfiltered, so an already-started
  // shift is a past timestamp. It cannot be approved and has to be rejected and
  // refilled — burying it under next month's request is the failure to avoid.
  it("sorts an already-started shift above every future one", () => {
    expect(
      ids(
        orderQueue([
          req("in-4h", "2026-09-08T16:00:00.000Z"),
          req("already-started", "2026-09-08T06:00:00.000Z"),
        ]),
      ),
    ).toEqual(["already-started", "in-4h"]);
  });

  it("puts rows with nothing left to protect last", () => {
    expect(
      ids(
        orderQueue([
          req("decided", null),
          req("next-month", "2026-10-08T08:00:00.000Z"),
        ]),
      ),
    ).toEqual(["next-month", "decided"]);
  });

  it("orders the null block newest-request-first", () => {
    expect(
      ids(
        orderQueue([
          req("older", null, "2026-09-01T00:00:00.000Z"),
          req("newer", null, "2026-09-07T00:00:00.000Z"),
        ]),
      ),
    ).toEqual(["newer", "older"]);
  });

  it("treats an unparseable date as unorderable rather than throwing", () => {
    expect(
      ids(orderQueue([req("junk", "not-a-date"), req("real", "2026-09-09T08:00:00.000Z")])),
    ).toEqual(["real", "junk"]);
  });

  it("does not mutate its input", () => {
    const rows = [req("b", "2026-10-01T08:00:00.000Z"), req("a", "2026-09-09T08:00:00.000Z")];
    orderQueue(rows);
    expect(ids(rows)).toEqual(["b", "a"]);
  });

  it("handles an empty queue", () => {
    expect(orderQueue([])).toEqual([]);
  });
});
