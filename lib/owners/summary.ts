import type { OwnerListQuery } from "@/lib/types/owner.types";

/**
 * The four numbers above the owners table, and the filter each of them isolates.
 *
 * The mirror of `lib/workers/summary.ts`, and built the same way for the same
 * reason: **there is no counts endpoint**, so a count is a list read whose only
 * useful field is `total` — `page=1&pageSize=1` is one row of payload for one
 * number.
 *
 * **Each tile's probe query IS the filter its click writes.** They are one
 * object, not two that have to agree: a tile that counted one population and
 * narrowed to a different one is the exact bug this shape makes unspellable.
 *
 * ⚠ **Every probe pins `ownerType: "Regular"`**, exactly as the table's tabs do.
 * Without it the permanent "Walk-in / Manual Orders" system account would be
 * counted in a strip that sits above a table which excludes it, and the tile
 * would disagree with the list it narrows.
 */
export interface OwnerSummaryTile {
  id: string;
  /** The probe. Sent with `page: 1, pageSize: 1`; only `total` is read. */
  query: Partial<OwnerListQuery>;
  /** The URL filter bag the tile writes when clicked. */
  filter: Record<string, string>;
  tone: "warning" | "critical" | "neutral";
}

export const OWNER_SUMMARY_TILES: readonly OwnerSummaryTile[] = [
  /*
    The review queue. `?onboardingStatus=Review` **is** the queue — the same URL
    the "In review" tab writes, so the two can never drift into two different sets.
  */
  {
    id: "review",
    query: { onboardingStatus: "Review", ownerType: "Regular" },
    filter: { onboardingStatus: "Review" },
    tone: "warning",
  },
  /*
    Registered, but nothing submitted yet. The owner's own move, not the admin's —
    amber rather than red, because nobody is late until somebody chased them.
  */
  {
    id: "awaitingDocs",
    query: { onboardingStatus: "Kyc", ownerType: "Regular" },
    filter: { onboardingStatus: "Kyc" },
    tone: "warning",
  },
  /*
    Cover ended, account intact. ⚠ `Lapsed` was called `Blocked` until 2026-08-28
    — same rows, new word — and the owner table has no administrative block at
    all, so there is no `Blocked` tile here to mirror the workers strip's.
  */
  {
    id: "lapsed",
    query: { status: "Lapsed", ownerType: "Regular" },
    filter: { status: "Lapsed" },
    tone: "neutral",
  },
  /*
    Registered and never ordered once — the owner-side reading of the workers
    strip's "never signed in".

    ⚠ `neverOrdered` is a boolean the server **refuses** alongside
    `lastOrderedFrom` / `lastOrderedTo` (`invalid_filter_value`). The tile writes
    only its own key, so clicking it cannot build that pair by itself — but a
    date range already in the bag would. `buildOwnerFilterQuery` refuses the
    combination client-side before it is ever sent.
  */
  {
    id: "neverOrdered",
    query: { neverOrdered: true, ownerType: "Regular" },
    filter: { neverOrdered: "true" },
    tone: "neutral",
  },
] as const;

/** Ids in strip order, for a caller that wants to key its copy off them. */
export type OwnerSummaryTileId = (typeof OWNER_SUMMARY_TILES)[number]["id"];

/** The counts, in the same order as the tiles. `0` for a probe that never landed. */
export type OwnerSummaryCounts = Record<string, number>;
