import { describe, expect, it } from "vitest";
import {
  WORKER_SUMMARY_TILES,
  isTileActive,
  toggleTileFilter,
} from "@/lib/workers/summary";
import { buildWorkerFilterQuery } from "@/lib/workers/worker-filter-query";

describe("WORKER_SUMMARY_TILES", () => {
  /*
    The one that matters. A tile counts one population and narrows to another the
    moment those two are written down separately — this asserts they are the same
    set, by pushing the tile's filter through the real query builder.
  */
  it("gives every tile a filter that reproduces its own count", () => {
    for (const tile of WORKER_SUMMARY_TILES) {
      expect(buildWorkerFilterQuery(tile.filter), tile.id).toEqual({
        ok: true,
        query: tile.query,
      });
    }
  });

  it("writes only keys the filter builder recognises", () => {
    for (const tile of WORKER_SUMMARY_TILES) {
      const built = buildWorkerFilterQuery(tile.filter);
      expect(built.ok, tile.id).toBe(true);
      // A key the builder drops would be a tile that narrows nothing.
      expect(Object.keys(built.ok ? built.query : {}).length, tile.id).toBe(
        Object.keys(tile.filter).length,
      );
    }
  });

  it("keeps the four the design draws, in strip order", () => {
    expect(WORKER_SUMMARY_TILES.map((t) => t.id)).toEqual([
      "review",
      "blocked",
      "lapsed",
      "neverSeen",
    ]);
  });
});

describe("isTileActive", () => {
  const blocked = WORKER_SUMMARY_TILES.find((t) => t.id === "blocked")!;

  it("lights only for its own value", () => {
    expect(isTileActive(blocked, { status: "Blocked" })).toBe(true);
    expect(isTileActive(blocked, { status: "Lapsed" })).toBe(false);
    expect(isTileActive(blocked, {})).toBe(false);
  });
});

describe("toggleTileFilter", () => {
  const review = WORKER_SUMMARY_TILES.find((t) => t.id === "review")!;

  it("sets the filter when the tile is dark", () => {
    expect(toggleTileFilter(review, {})).toEqual({ onboardingStatus: "Review" });
  });

  /* The lit tile is the only way back out of the narrowing it caused. */
  it("clears every key it owns when the tile is lit", () => {
    expect(toggleTileFilter(review, { onboardingStatus: "Review" })).toEqual({
      onboardingStatus: "",
    });
  });
});
