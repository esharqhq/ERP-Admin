import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import {
  canRateTeam,
  ratingErrorKey,
  teamRatingTargets,
} from "@/lib/tasks/team-rating";
import type { TaskWorkerDto } from "@/lib/types/task.types";

function worker(workerId: string, outcome: string): TaskWorkerDto {
  return {
    id: `tw-${workerId}`,
    taskId: "t1",
    workerId,
    workerName: workerId.toUpperCase(),
    outcome,
    starRating: null,
    assignedAt: "2026-09-26T08:00:00Z",
    checkinAt: null,
    submittedAt: null,
    checkoutAt: null,
    checkinLat: null,
    checkinLng: null,
    checkinDoor: null,
  };
}

function day(status: string, workers?: TaskWorkerDto[]) {
  return { status, workers: workers as TaskWorkerDto[] };
}

const MIXED = [
  worker("a", "Completed"),
  worker("b", "NoShow"),
  worker("c", "Completed"),
  worker("d", "Removed"),
  worker("e", "Cancelled"),
  worker("f", "Pending"),
];

describe("teamRatingTargets", () => {
  it("keeps only the Completed workers, in the day's order", () => {
    expect(teamRatingTargets(day("Done", MIXED)).map((w) => w.workerId)).toEqual([
      "a",
      "c",
    ]);
  });

  it("reads the outcome case-insensitively", () => {
    const workers = [worker("a", "completed"), worker("b", " COMPLETED ")];
    expect(teamRatingTargets(day("Done", workers))).toHaveLength(2);
  });

  it("is empty when the day carries no workers list", () => {
    expect(teamRatingTargets(day("Done"))).toEqual([]);
  });
});

describe("canRateTeam", () => {
  it("is true on a Done day with at least one Completed worker", () => {
    expect(canRateTeam(day("Done", MIXED))).toBe(true);
    expect(canRateTeam(day("done", [worker("a", "Completed")]))).toBe(true);
  });

  it("is false on a Done day where nobody completed — all no-shows or removed", () => {
    const workers = [worker("a", "NoShow"), worker("b", "Removed")];
    expect(canRateTeam(day("Done", workers))).toBe(false);
    expect(canRateTeam(day("Done", []))).toBe(false);
    expect(canRateTeam(day("Done"))).toBe(false);
  });

  it("is false on every other day state, even with Completed rows", () => {
    const workers = [worker("a", "Completed")];
    for (const status of [
      "Pending",
      "CheckedIn",
      "Active",
      "InReview",
      "Review",
      "Rejected",
      "Cancelled",
    ]) {
      expect(canRateTeam(day(status, workers))).toBe(false);
    }
  });

  it("is false on a state word it does not know", () => {
    expect(canRateTeam(day("Paused", [worker("a", "Completed")]))).toBe(false);
  });
});

function apiError(status: number, data: unknown): AxiosError {
  const err = new AxiosError("failed");
  // @ts-expect-error — a minimal response is all the reader touches.
  err.response = { status, data };
  return err;
}

describe("ratingErrorKey", () => {
  it.each([
    [409, "no_completed_workers"],
    [409, "task_worker_not_completed"],
    [404, "task_worker_not_found"],
  ])("names a %i %s by its own key", (status, code) => {
    expect(ratingErrorKey(apiError(status, { error: code }))).toBe(code);
  });

  it("reads an empty-bodied 403 as a permission refusal", () => {
    expect(ratingErrorKey(apiError(403, ""))).toBe("forbidden");
  });

  it("returns null for problem-details, unknown codes and network failures", () => {
    const problem = { title: "One or more validation errors occurred.", errors: { Stars: ["x"] } };
    expect(ratingErrorKey(apiError(400, problem))).toBeNull();
    expect(ratingErrorKey(apiError(400, { error: "stars_out_of_range" }))).toBeNull();
    expect(ratingErrorKey(new Error("network"))).toBeNull();
  });
});
