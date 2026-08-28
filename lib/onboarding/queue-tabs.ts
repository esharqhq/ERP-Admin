import type { OnboardingStatus } from "@/lib/types/onboarding.types";

/**
 * The documents queues' tabs — **the onboarding stages, identically on both sides.**
 *
 * This is a fix for a shipped defect, not a tidy-up: the worker screen's "Approved"
 * tab used to filter `Active` while the owner screen's filtered `Approved`, so one
 * word named two different queues depending on which screen you had come from.
 * Taking the names from the stages makes that impossible to reintroduce.
 */
export const QUEUE_TABS: { key: string; status: OnboardingStatus | undefined }[] = [
  { key: "all", status: undefined },
  { key: "review", status: "Review" },
  { key: "approved", status: "Approved" },
  { key: "contract", status: "Contract" },
  { key: "active", status: "Active" },
  { key: "rejected", status: "Rejected" },
];

export const DEFAULT_QUEUE_TAB = "all";

export function statusForTab(key: string): OnboardingStatus | undefined {
  return QUEUE_TABS.find((t) => t.key === key)?.status;
}

/**
 * Whether a row belongs to a tab. An unknown tab key shows everything rather than
 * nothing — a hand-edited or stale `?tab=` in a shared link should degrade to the
 * full list, not to an empty table that reads as "nobody has submitted".
 */
export function inTab(status: OnboardingStatus, key: string): boolean {
  const wanted = statusForTab(key);
  if (!wanted) return true;
  return status === wanted;
}

/**
 * How many rows sit under each tab, from the **whole** list.
 *
 * Only meaningful over an unnarrowed set. The owner queue reads its endpoint
 * unfiltered — it is a bare array and takes no other parameter, so one request is
 * both the cheapest option and the only one that can count these. The worker queue
 * holds one page of 25 and so ships its tabs without counts; counting the page
 * would put a number beside a tab that describes neither the tab nor the page.
 */
export function countByTab(rows: { onboardingStatus: OnboardingStatus }[]): Record<
  string,
  number
> {
  const counts: Record<string, number> = {};
  for (const { key } of QUEUE_TABS) counts[key] = 0;
  for (const row of rows) {
    counts[DEFAULT_QUEUE_TAB] += 1;
    for (const { key, status } of QUEUE_TABS) {
      if (status && row.onboardingStatus === status) counts[key] += 1;
    }
  }
  return counts;
}
