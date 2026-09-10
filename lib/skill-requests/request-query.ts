import {
  SKILL_REQUEST_TABS,
  type SkillRequestQuery,
  type SkillRequestTab,
} from "@/lib/types/skill-request.types";

/**
 * The filter keys the route accepts, keyed by **wire param name** so the mapping
 * below is 1:1 and greppable. `status` is absent on purpose: it is the tab's, not a
 * filter's.
 */
export const SKILL_REQUEST_FILTER_KEYS = ["workerId", "professionId"] as const;

function isTab(value: string): value is SkillRequestTab {
  return (SKILL_REQUEST_TABS as readonly string[]).includes(value);
}

/**
 * The table's URL state → the typed query. Server mode, so this is the only place
 * the screen's controls become a request.
 *
 * ⚠ **The `open` tab sends NO `status` param, and that is the only way to express
 * it.** The endpoint's `Status` is a single nullable enum whose absence means
 * exactly `Pending` + `InfoRequested` (`WorkerProfessionRequestService.cs:371`).
 * There is no value that names the pair, so there is also no `all` tab: one could
 * only send `status=all` (a `400`) or send nothing, which is `open` renamed.
 *
 * ⚠ **An unknown tab falls back to `open` rather than being sent.** The URL is
 * user-editable and outlives the tab that wrote it, so a stale bookmark would
 * otherwise answer `400` and blank the screen.
 *
 * There is deliberately no `sort` handling: this endpoint takes no sort parameter,
 * and rows arrive `createdAt` descending.
 */
export function buildSkillRequestQuery({
  filters,
  tab,
  page,
  pageSize,
}: {
  filters: Record<string, string>;
  /** The status tab. `"open"` means *no* status param, not a status of that name. */
  tab: string;
  page: number;
  pageSize: number;
}): SkillRequestQuery {
  const query: SkillRequestQuery = { page, pageSize };

  if (isTab(tab) && tab !== "open") {
    query.status = tab;
  }

  for (const key of SKILL_REQUEST_FILTER_KEYS) {
    const value = filters[key]?.trim();
    if (value) query[key] = value;
  }

  return query;
}
