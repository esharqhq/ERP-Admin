// lib/tasks/walk-in-tab.ts

/**
 * Extracted out of the walk-in page so it is a pure function the suite can
 * test directly, rather than something only exercisable by mounting the page
 * (a "use client" component wired to `next/navigation`, `next-intl`, and five
 * other components). The project tests pure functions only.
 */
export const WALK_IN_TABS = ["create", "orders"] as const;
export type WalkInTabKey = (typeof WALK_IN_TABS)[number];

/**
 * Reads the `?tab=` search param. Anything absent or unrecognised — including
 * `null`, `""`, and values that predate this page's two tabs — falls back to
 * `"create"` rather than throwing or rendering nothing.
 */
export function readWalkInTab(value: string | null): WalkInTabKey {
  return WALK_IN_TABS.includes(value as WalkInTabKey) ? (value as WalkInTabKey) : "create";
}
