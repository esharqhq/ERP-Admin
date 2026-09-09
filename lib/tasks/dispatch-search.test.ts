import { describe, expect, it } from "vitest";
import { matchesDispatchSearch, propertyLabel } from "@/lib/tasks/dispatch-search";
import type { TaskItemDto } from "@/lib/types/task.types";

function task(over: Partial<TaskItemDto> = {}): TaskItemDto {
  return {
    id: "9F3C21AA-0000-0000-0000-000000000001",
    groupId: "11111111-1111-1111-1111-111111111111",
    propertyId: "abcdef12-3456-7890-abcd-ef1234567890",
    propertyName: "Sonnenhof",
    scheduledDate: "2026-09-03",
    scheduledAt: "2026-09-03T08:00:00Z",
    deadline: null,
    status: "Pending",
    requiredWorkerCount: 3,
    workers: [],
    ...over,
  } as TaskItemDto;
}

describe("propertyLabel", () => {
  it("prints the name the row already carries", () => {
    expect(propertyLabel(task())).toBe("Sonnenhof");
  });

  it("falls back to a truncated id when the name is null", () => {
    expect(propertyLabel(task({ propertyName: null }))).toBe("abcdef12");
  });

  it("falls back to a truncated id when the name is empty", () => {
    expect(propertyLabel(task({ propertyName: "" }))).toBe("abcdef12");
  });

  it("treats a whitespace-only name as absent rather than rendering a blank", () => {
    expect(propertyLabel(task({ propertyName: "   " }))).toBe("abcdef12");
  });

  it("keeps a name's own inner spacing", () => {
    expect(propertyLabel(task({ propertyName: "Altbau K.12" }))).toBe("Altbau K.12");
  });
});

describe("matchesDispatchSearch", () => {
  it("matches everything on an empty query", () => {
    expect(matchesDispatchSearch(task(), "")).toBe(true);
  });

  it("matches everything on a whitespace-only query rather than hiding rows", () => {
    expect(matchesDispatchSearch(task(), "   ")).toBe(true);
  });

  it("matches the property name case-insensitively", () => {
    expect(matchesDispatchSearch(task(), "SONNEN")).toBe(true);
  });

  it("matches a property whose name fell back to the id", () => {
    expect(matchesDispatchSearch(task({ propertyName: null }), "abcdef")).toBe(true);
  });

  it("matches a whole scheduled date", () => {
    expect(matchesDispatchSearch(task(), "2026-09-03")).toBe(true);
  });

  it("matches a month prefix, which is the only way to search a month", () => {
    expect(matchesDispatchSearch(task(), "2026-09")).toBe(true);
  });

  it("matches the task id case-insensitively", () => {
    expect(matchesDispatchSearch(task(), "9f3c21aa")).toBe(true);
  });

  it("ignores surrounding whitespace in the query", () => {
    expect(matchesDispatchSearch(task(), "  Sonnenhof  ")).toBe(true);
  });

  it("does not match an unrelated term", () => {
    expect(matchesDispatchSearch(task(), "villa")).toBe(false);
  });

  it("does not match a date the task is not on", () => {
    expect(matchesDispatchSearch(task(), "2026-10")).toBe(false);
  });
});
