import type { WorkerListQuery } from "@/lib/types/worker.types";

/**
 * The four numbers above the workers table, and the filter each of them isolates.
 *
 * **There is no counts endpoint.** `fnd-3-table-query.md` ships filtering and
 * export and nothing else, so a count is a list read whose only useful field is
 * `total` — `page=1&pageSize=1` is one row of payload for one number. That is
 * design §09 *Asks back to backend* #1, filed; until it is answered these four
 * probes are the honest way to draw the strip.
 *
 * **Each tile's probe query IS the filter its click writes.** They are one object,
 * not two that have to agree: a tile that counted one population and narrowed to a
 * different one is the exact bug this shape makes unspellable, and the test asserts
 * the round-trip through `buildWorkerFilterQuery`.
 */
export interface WorkerSummaryTile {
  id: string;
  /** The probe. Sent with `page: 1, pageSize: 1`; only `total` is read. */
  query: Partial<WorkerListQuery>;
  /** The URL filter bag the tile writes when clicked. */
  filter: Record<string, string>;
  tone: "warning" | "critical" | "neutral";
}

export const WORKER_SUMMARY_TILES: readonly WorkerSummaryTile[] = [
  /*
    The review queue. `?onboardingStatus=Review` **is** the queue — the same URL
    the tab writes and the same one the header shortcut writes, so the three can
    never drift into three different sets.
  */
  {
    id: "review",
    query: { onboardingStatus: "Review" },
    filter: { onboardingStatus: "Review" },
    tone: "warning",
  },
  /*
    An admin sanction, and the newest of the five account states — `Blocked` meant
    "contract ran out" until 2026-08-28, when that population became `Lapsed`. Red,
    because somebody did something.
  */
  {
    id: "blocked",
    query: { status: "Blocked" },
    filter: { status: "Blocked" },
    tone: "critical",
  },
  /*
    Cover ended, account intact. Amber in the design and **never red**: nobody did
    anything wrong, the calendar simply moved.
  */
  {
    id: "lapsed",
    query: { status: "Lapsed" },
    filter: { status: "Lapsed" },
    tone: "neutral",
  },
  /*
    Registered and never once seen. `neverLoggedIn` is three-state, so the tile
    writes the string `"true"` — an empty value would mean "no opinion" and count
    the whole table.
  */
  {
    id: "neverSeen",
    query: { neverLoggedIn: true },
    filter: { neverLoggedIn: "true" },
    tone: "neutral",
  },
] as const;

/** Ids in strip order, for a caller that wants to key its copy off them. */
export type WorkerSummaryTileId = (typeof WORKER_SUMMARY_TILES)[number]["id"];

/** The counts, in the same order as the tiles. `0` for a probe that never landed. */
export type WorkerSummaryCounts = Record<string, number>;

/**
 * Whether a tile's narrowing is currently the one on screen.
 *
 * Every key the tile owns must match, so `status=Blocked` does not light up while
 * the table is showing `status=Lapsed`, and a tile whose filter is a subset of a
 * wider selection stays dark rather than claiming credit for it.
 */
export function isTileActive(
  tile: WorkerSummaryTile,
  values: Record<string, string>,
): boolean {
  return Object.entries(tile.filter).every(([k, v]) => (values[k] ?? "") === v);
}

/**
 * The bag after clicking a tile — **a toggle**, not a set.
 *
 * A tile is the only thing on screen saying why the list below is short, so
 * clicking the lit one has to be the way back out. Off clears every key the tile
 * owns, never just the first.
 */
export function toggleTileFilter(
  tile: WorkerSummaryTile,
  values: Record<string, string>,
): Record<string, string> {
  const off = isTileActive(tile, values);
  return Object.fromEntries(
    Object.entries(tile.filter).map(([k, v]) => [k, off ? "" : v]),
  );
}
