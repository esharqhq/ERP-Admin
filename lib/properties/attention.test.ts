import { describe, expect, it } from "vitest";
import { STALE_PHOTO_DAYS, derivePropertyAttention } from "@/lib/properties/attention";
import type { PropertyAttentionInput } from "@/lib/properties/attention";

const COPY: PropertyAttentionInput["copy"] = {
  unassignedTitle: ({ when, what }) => `${when} ${what} unassigned`,
  unassignedDetail: ({ count }) => `${count} short`,
  unassignedAction: () => "Assign",
  visitsUnknown: () => "Visit state unknown",
  visitsUnknownDetail: () => "cannot read tasks",

  coverExpiredTitle: () => "Owner's contract has expired",
  coverExpiredDetail: () => "expired",
  coverEndingTitle: ({ days }) => `Owner's contract expires in ${days} days`,
  coverEndingDetail: () => "renewal not started",
  coverAction: () => "Renew",
  coverUnknown: () => "Cover unknown",
  coverUnknownDetail: () => "cannot read contracts",

  stalePhotosTitle: ({ months }) => `Newest photo is ${months} months old`,
  stalePhotosDetail: ({ count }) => `${count} photos`,
  noPhotosTitle: () => "No photos at all",
  noPhotosDetail: () => "workers arrive blind",
  photosAction: () => "View",
};

const NOW = Date.parse("2026-09-01T00:00:00Z");

function input(over: Partial<PropertyAttentionInput> = {}): PropertyAttentionInput {
  return {
    visits: [],
    visitsPending: false,
    visitsForbidden: false,
    media: [],
    cover: { canRead: true, isPending: false, cover: null },
    today: NOW,
    copy: COPY,
    ...over,
  };
}

describe("derivePropertyAttention", () => {
  it("is all clear when nothing is waiting", () => {
    const s = derivePropertyAttention(
      input({ media: [{ createdAt: "2026-08-30T00:00:00Z" }] as never }),
    );
    expect(s.flags).toEqual([]);
    expect(s.unknowns).toEqual([]);
  });

  it("flags an unassigned upcoming visit", () => {
    const s = derivePropertyAttention(
      input({
        media: [{ createdAt: "2026-08-30T00:00:00Z" }] as never,
        visits: [
          {
            task: { id: "t", scheduledAt: "2026-09-03T06:00:00Z" } as never,
            title: "Stairwell clean",
            unassigned: true,
          },
        ],
      }),
    );
    expect(s.flags.map((f) => f.id)).toEqual(["unassigned"]);
    expect(s.flags[0].action?.label).toBe("Assign");
  });

  it("does not flag a fully staffed visit", () => {
    const s = derivePropertyAttention(
      input({
        media: [{ createdAt: "2026-08-30T00:00:00Z" }] as never,
        visits: [
          {
            task: { id: "t", scheduledAt: "2026-09-03T06:00:00Z" } as never,
            title: "x",
            unassigned: false,
          },
        ],
      }),
    );
    expect(s.flags).toEqual([]);
  });

  /**
   * A refused read is not a clear one. An admin without `task:list` must be told
   * the slot is unreadable rather than shown a clean strip.
   */
  it("reports visits as unknown when the read is refused", () => {
    const s = derivePropertyAttention(
      input({
        visitsForbidden: true,
        media: [{ createdAt: "2026-08-30T00:00:00Z" }] as never,
      }),
    );
    expect(s.unknowns.map((u) => u.id)).toEqual(["visits"]);
    expect(s.flags).toEqual([]);
  });

  it("reports neither flag nor unknown while the read is in flight", () => {
    const s = derivePropertyAttention(
      input({
        visitsPending: true,
        media: [{ createdAt: "2026-08-30T00:00:00Z" }] as never,
      }),
    );
    expect(s.flags).toEqual([]);
    expect(s.unknowns.map((u) => u.id)).toEqual(["visits"]);
  });

  it("flags an expiring owner contract as a warning", () => {
    const s = derivePropertyAttention(
      input({
        media: [{ createdAt: "2026-08-30T00:00:00Z" }] as never,
        cover: {
          canRead: true,
          isPending: false,
          cover: { from: "2025-01-01", to: "2026-10-05", phase: "InForce" },
        },
      }),
    );
    expect(s.flags.map((f) => f.id)).toEqual(["cover"]);
    expect(s.flags[0].tone).toBe("warning");
    expect(s.flags[0].blocking).toBeFalsy();
  });

  // An expired contract stops work rather than warning about it.
  it("flags an expired owner contract as blocking and critical", () => {
    const s = derivePropertyAttention(
      input({
        media: [{ createdAt: "2026-08-30T00:00:00Z" }] as never,
        cover: {
          canRead: true,
          isPending: false,
          cover: { from: "2024-01-01", to: "2026-08-01", phase: "Expired" },
        },
      }),
    );
    expect(s.flags[0].tone).toBe("critical");
    expect(s.flags[0].blocking).toBe(true);
  });

  it("says nothing about cover that is comfortably in force", () => {
    const s = derivePropertyAttention(
      input({
        media: [{ createdAt: "2026-08-30T00:00:00Z" }] as never,
        cover: {
          canRead: true,
          isPending: false,
          cover: { from: "2025-01-01", to: "2027-01-01", phase: "InForce" },
        },
      }),
    );
    expect(s.flags).toEqual([]);
  });

  it("reports cover as unknown when contracts cannot be read", () => {
    const s = derivePropertyAttention(
      input({
        media: [{ createdAt: "2026-08-30T00:00:00Z" }] as never,
        cover: { canRead: false, isPending: false, cover: null },
      }),
    );
    expect(s.unknowns.map((u) => u.id)).toEqual(["cover"]);
  });

  it("flags a stale gallery", () => {
    const s = derivePropertyAttention(
      input({ media: [{ createdAt: "2026-01-14T00:00:00Z" }] as never }),
    );
    expect(s.flags.map((f) => f.id)).toEqual(["photos"]);
  });

  it("flags an empty gallery as its own finding", () => {
    const s = derivePropertyAttention(input({ media: [] }));
    expect(s.flags.map((f) => f.id)).toEqual(["photos"]);
    expect(s.flags[0].title).toBe("No photos at all");
  });

  /**
   * ⚠ `media: null` is "not fetched", not "no photos". Flagging it would accuse
   * every property the moment someone drops `?withMedia=true`.
   */
  it("reports photos as unknown when the gallery was never fetched", () => {
    const s = derivePropertyAttention(input({ media: null }));
    expect(s.unknowns.map((u) => u.id)).toEqual(["photos"]);
    expect(s.flags).toEqual([]);
  });

  it("orders critical before warning", () => {
    const s = derivePropertyAttention(
      input({
        media: [],
        cover: {
          canRead: true,
          isPending: false,
          cover: { from: "2024-01-01", to: "2026-08-01", phase: "Expired" },
        },
      }),
    );
    expect(s.flags[0].id).toBe("cover");
    expect(s.flags[0].tone).toBe("critical");
  });

  it("holds every source as unknown before the clock is known", () => {
    const s = derivePropertyAttention(input({ today: 0, media: [] }));
    expect(s.unknowns.length).toBe(3);
    expect(s.flags).toEqual([]);
  });

  it("keeps the stale threshold where the copy expects it", () => {
    expect(STALE_PHOTO_DAYS).toBe(180);
  });
});
