import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { invalidateTasks } from "@/hooks/use-tasks";

/**
 * The task mutations' invalidation list, exercised against a real `QueryClient` —
 * no component render, no jsdom. Same shape as `hooks/use-contracts.test.ts`.
 *
 * `["owner-task-groups"]` is the row this shipped without: `useOwnerTaskGroups`
 * reads it, `WeeklyWorkCard` renders from it, and nothing invalidated it — so the
 * owner detail page's weekly card stayed stale after a worker was assigned from
 * Dispatching, and the walk-in page's history would have stayed stale after a
 * create.
 */
describe("invalidateTasks", () => {
  it("invalidates both admin task keys and the owner-scoped one", () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    invalidateTasks(qc);

    const keys = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(keys).toContainEqual(["admin-task-groups"]);
    expect(keys).toContainEqual(["admin-tasks"]);
    expect(keys).toContainEqual(["owner-task-groups"]);
  });

  it("invalidates the single-group detail key only when a group id is known", () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    invalidateTasks(qc, "group-1");
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toContainEqual([
      "task-group",
      "group-1",
    ]);

    spy.mockClear();
    invalidateTasks(qc);
    expect(
      spy.mock.calls.some((c) => (c[0]?.queryKey as unknown[])?.[0] === "task-group"),
    ).toBe(false);
  });
});
