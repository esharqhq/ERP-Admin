import { describe, expect, it } from "vitest";
import {
  candidateQuery,
  filterCandidates,
  occupiedBy,
  orderCandidates,
  ratingLabel,
} from "@/lib/tasks/assign-candidates";
import type { TaskItemDto } from "@/lib/types/task.types";
import type { WorkerRowDto } from "@/lib/types/worker.types";

function worker(over: Partial<WorkerRowDto> = {}): WorkerRowDto {
  return {
    id: "w-1",
    fullName: "Dilnoza Karimova",
    email: "dilnoza@example.com",
    rating: 4.8,
    booked: false,
    skills: ["General Worker"],
    completedTasks: 128,
    ...over,
  } as WorkerRowDto;
}

function task(workers: { workerId: string; outcome: string }[]): TaskItemDto {
  return { id: "t-1", workers } as TaskItemDto;
}

describe("candidateQuery", () => {
  it("asks the server for a real rating order", () => {
    expect(candidateQuery("rating")).toEqual({ sortBy: "rating", dir: "Desc" });
  });

  it("asks the server for a real name order", () => {
    expect(candidateQuery("name")).toEqual({ sortBy: "fullName", dir: "Asc" });
  });

  it("borrows the rating order for free-first, which has no server key", () => {
    // `booked` is a filter on the workers route, never a sort column.
    expect(candidateQuery("free")).toEqual({ sortBy: "rating", dir: "Desc" });
  });
});

describe("orderCandidates", () => {
  const free1 = worker({ id: "a", rating: 4.8 });
  const booked1 = worker({ id: "b", rating: 4.5, booked: true });
  const free2 = worker({ id: "c", rating: 4.2 });
  const booked2 = worker({ id: "d", rating: 3.9, booked: true });

  it("leaves a server rating order untouched", () => {
    const input = [free1, booked1, free2, booked2];
    expect(orderCandidates(input, "rating")).toBe(input);
  });

  it("leaves a server name order untouched", () => {
    const input = [free1, booked1];
    expect(orderCandidates(input, "name")).toBe(input);
  });

  it("puts unbooked workers first", () => {
    const out = orderCandidates([booked1, free1, booked2, free2], "free");
    expect(out.map((w) => w.id)).toEqual(["a", "c", "b", "d"]);
  });

  it("keeps the server's rating order inside each group — the sort is stable", () => {
    const out = orderCandidates([free1, booked1, free2, booked2], "free");
    expect(out.map((w) => w.id)).toEqual(["a", "c", "b", "d"]);
  });

  it("does not mutate the array it was given", () => {
    const input = [booked1, free1];
    orderCandidates(input, "free");
    expect(input.map((w) => w.id)).toEqual(["b", "a"]);
  });

  it("handles an all-booked list without reordering it", () => {
    const out = orderCandidates([booked1, booked2], "free");
    expect(out.map((w) => w.id)).toEqual(["b", "d"]);
  });

  it("handles an empty list", () => {
    expect(orderCandidates([], "free")).toEqual([]);
  });
});

describe("occupiedBy", () => {
  it("counts a worker with a live outcome as occupying a seat", () => {
    expect(occupiedBy(task([{ workerId: "w-1", outcome: "Pending" }]))).toEqual(
      new Set(["w-1"]),
    );
  });

  it("counts a Completed worker — a finished worker still held the seat", () => {
    expect(occupiedBy(task([{ workerId: "w-1", outcome: "Completed" }]))).toEqual(
      new Set(["w-1"]),
    );
  });

  it.each(["Removed", "Cancelled", "NoShow"])(
    "frees the seat of a %s worker, so they can be offered again",
    (outcome) => {
      expect(occupiedBy(task([{ workerId: "w-1", outcome }]))).toEqual(new Set());
    },
  );

  it("matches outcomes case-insensitively", () => {
    expect(occupiedBy(task([{ workerId: "w-1", outcome: "removed" }]))).toEqual(
      new Set(),
    );
  });

  it("returns an empty set for a task with no workers", () => {
    expect(occupiedBy(task([]))).toEqual(new Set());
  });

  it("returns an empty set when the task is not loaded", () => {
    // The sheet can open before its task is in the cache.
    expect(occupiedBy(undefined)).toEqual(new Set());
  });
});

describe("filterCandidates", () => {
  const a = worker({ id: "a", fullName: "Dilnoza Karimova", email: "d@x.com" });
  const b = worker({ id: "b", fullName: "Sardor Aliyev", email: "s@x.com" });

  it("keeps everyone on an empty query", () => {
    expect(filterCandidates([a, b], new Set(), "")).toHaveLength(2);
  });

  it("keeps everyone on a whitespace-only query", () => {
    expect(filterCandidates([a, b], new Set(), "   ")).toHaveLength(2);
  });

  it("matches a name case-insensitively", () => {
    expect(filterCandidates([a, b], new Set(), "SARDOR")).toEqual([b]);
  });

  it("matches an email", () => {
    expect(filterCandidates([a, b], new Set(), "d@x")).toEqual([a]);
  });

  it("ignores surrounding whitespace", () => {
    expect(filterCandidates([a, b], new Set(), "  sardor ")).toEqual([b]);
  });

  it("drops a worker already on the task, even with an empty query", () => {
    expect(filterCandidates([a, b], new Set(["a"]), "")).toEqual([b]);
  });

  it("drops a worker already on the task even when they match the search", () => {
    expect(filterCandidates([a, b], new Set(["b"]), "sardor")).toEqual([]);
  });

  it("survives a null name and a null email", () => {
    const nameless = worker({ id: "c", fullName: null, email: null });
    expect(filterCandidates([nameless], new Set(), "x")).toEqual([]);
    expect(filterCandidates([nameless], new Set(), "")).toEqual([nameless]);
  });
});

describe("ratingLabel", () => {
  it("prints a rating to one decimal", () => {
    expect(ratingLabel(worker({ rating: 4.8 }))).toEqual({
      isNew: false,
      text: "4.8",
    });
  });

  it("pads a whole rating to one decimal", () => {
    expect(ratingLabel(worker({ rating: 5 })).text).toBe("5.0");
  });

  it("reads an unrated worker as New rather than as 0.0", () => {
    expect(ratingLabel(worker({ rating: 0 }))).toEqual({ isNew: true, text: "" });
  });
});
