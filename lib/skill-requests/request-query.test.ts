import { describe, expect, it } from "vitest";
import {
  DECIDED_SKILL_REQUEST_STATUSES,
  OPEN_SKILL_REQUEST_STATUSES,
  SKILL_REQUEST_STATUSES,
  SKILL_REQUEST_TABS,
} from "@/lib/types/skill-request.types";
import { buildSkillRequestQuery } from "@/lib/skill-requests/request-query";

const BASE = {
  filters: {} as Record<string, string>,
  tab: "open",
  page: 1,
  pageSize: 25,
};

describe("buildSkillRequestQuery", () => {
  /**
   * The whole design turns on this. `status` is a single enum and omitting it
   * filters to Pending + InfoRequested (`WorkerProfessionRequestService.cs:371`),
   * so the open tab is the ABSENCE of the param. Sending `status=open` would be a
   * 400 and blank the queue.
   */
  it("omits status entirely on the open tab", () => {
    expect(buildSkillRequestQuery(BASE).status).toBeUndefined();
    expect("status" in buildSkillRequestQuery(BASE)).toBe(false);
  });

  it("sends each decided tab as its own status", () => {
    for (const status of DECIDED_SKILL_REQUEST_STATUSES) {
      expect(buildSkillRequestQuery({ ...BASE, tab: status }).status).toBe(status);
    }
  });

  /**
   * Disjoint AND complete: the open tab covers exactly two statuses and the three
   * decided tabs cover one each, so the four reads together cover all five once.
   * That is what lets the worker-history card merge four pages without a dedupe.
   * Asserting only "each tab sends its status" would pass while a fifth status was
   * unreachable from every tab.
   */
  it("covers all five statuses exactly once across the four tabs", () => {
    const covered = SKILL_REQUEST_TABS.flatMap((tab) => {
      const { status } = buildSkillRequestQuery({ ...BASE, tab });
      return status ? [status] : [...OPEN_SKILL_REQUEST_STATUSES];
    });
    expect([...covered].sort()).toEqual([...SKILL_REQUEST_STATUSES].sort());
  });

  /** The URL is user-editable and outlives the tab that wrote it. */
  it("treats an unknown tab as the open tab rather than sending it", () => {
    expect(buildSkillRequestQuery({ ...BASE, tab: "all" }).status).toBeUndefined();
    expect(
      buildSkillRequestQuery({ ...BASE, tab: "garbage" }).status,
    ).toBeUndefined();
  });

  it("passes paging through", () => {
    const q = buildSkillRequestQuery({ ...BASE, page: 3, pageSize: 50 });
    expect(q.page).toBe(3);
    expect(q.pageSize).toBe(50);
  });

  it("sends non-blank filters and omits blank ones", () => {
    const q = buildSkillRequestQuery({
      ...BASE,
      filters: { workerId: "w-1", professionId: "  " },
    });
    expect(q.workerId).toBe("w-1");
    expect(q.professionId).toBeUndefined();
  });
});
