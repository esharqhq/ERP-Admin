import { describe, expect, it } from "vitest";
import { notificationRoute } from "@/lib/notifications/route";

/**
 * The bell's deep links. Only the cases whose *absence* would be a visible bug
 * are pinned here — a row that should be clickable and is not, or one that routes
 * somewhere that does not exist.
 */
describe("notificationRoute", () => {
  /**
   * Type 61 `AgencyApplicationSubmitted` has been arriving since 2026-08-23 and
   * landing on a **non-clickable** row, because until phase 3 there was no screen
   * to send it to. `entityId` is the application id, which is what the detail
   * route is keyed on.
   */
  it("routes an agency application to its detail", () => {
    expect(notificationRoute("AgencyApplication", "b8e6856f")).toBe(
      "/dashboard/agency-requests/b8e6856f",
    );
  });

  /**
   * ⚠ The rule this file states about itself: an unknown type must degrade to a
   * non-clickable row, never to a broken route. The wire enum grows without
   * warning, so this case has to be held by a name nothing has claimed.
   *
   * ⚠ It used to be held by `WorkerAgencyLink`, with a comment saying types
   * 58–60 were live and deliberately unrouted until the links screen existed.
   * Phase 4 built that screen, so the example was consumed by the very change it
   * was documenting — hence a deliberately fictional entity here instead.
   */
  it("leaves an unknown entity type non-clickable", () => {
    expect(
      notificationRoute(
        "SomethingNobodyHasBuilt" as Parameters<typeof notificationRoute>[0],
        "b8e6856f",
      ),
    ).toBeNull();
  });

  it("needs both halves before it will route anything", () => {
    expect(notificationRoute("AgencyApplication", null)).toBeNull();
    expect(notificationRoute(null, "b8e6856f")).toBeNull();
  });
});

describe("notificationRoute — agency links", () => {
  /**
   * ⚠ **`entityId` is the LINK id** (`WorkerAgencyLinkService.cs:182-183`,
   * `WorkerAgencyLinkWriter.cs:74-75`), and nothing in this app is keyed on one
   * — there is no `GET /api/admin/agency-links/{id}` and no link detail route.
   * So the destination is the **queue**, which `notification-bell.md:233`
   * sanctions in as many words, and the tab is what makes it land usefully.
   */
  it("sends a worker's claim to the Proposed tab", () => {
    expect(
      notificationRoute("WorkerAgencyLink", "83a1754f", "AgencyLinkProposedByWorker"),
    ).toBe("/dashboard/agency-links?tab=Proposed");
  });

  /**
   * ⚠ **No `?tab=Disputed`, deliberately.** `useTableUrlState.setTab` **deletes**
   * the param when the value equals `defaultTab` (an empty value removes the
   * key), and `Disputed` *is* this screen's default. Emitting the param would
   * mean two different URLs for one view, and the first control an admin touched
   * would silently rewrite the address to drop it. A bare path is the same
   * destination and the canonical spelling of it.
   */
  it("sends a dispute to the queue's own default tab, with no param", () => {
    expect(
      notificationRoute("WorkerAgencyLink", "83a1754f", "AgencyLinkDisputed"),
    ).toBe("/dashboard/agency-links");
  });

  /**
   * ⚠ Type 58 goes to the **worker**, not to an admin. Routing it here would
   * build a destination for a row this app never receives.
   */
  it("does not route the notice that goes to the worker", () => {
    expect(
      notificationRoute("WorkerAgencyLink", "83a1754f", "AgencyLinkProposedByAdmin"),
    ).toBeNull();
  });

  /** An unrecognised type on this entity still has a sensible home. */
  it("falls back to the queue for an unknown type on this entity", () => {
    expect(notificationRoute("WorkerAgencyLink", "83a1754f", "SomethingNew")).toBe(
      "/dashboard/agency-links",
    );
  });

  it("still routes without a type at all", () => {
    expect(notificationRoute("WorkerAgencyLink", "83a1754f")).toBe(
      "/dashboard/agency-links",
    );
  });

  /**
   * F-06a types 62 `SkillRequestSubmitted` and 66 `SkillRequestResponded` are the
   * two skill notifications that reach an ADMIN — 63, 64, 65 and 67 go to the
   * worker. Both carry the request id, which the detail route is keyed on, so
   * unlike `WorkerAgencyLink` no `type` argument is needed to tell them apart:
   * one audience, one destination.
   */
  it("routes a skill request to its decision screen", () => {
    expect(notificationRoute("WorkerProfessionRequest", "3f1c9a2e")).toBe(
      "/dashboard/skill-requests/3f1c9a2e",
    );
  });

  it("leaves a skill request with no id unrouted", () => {
    expect(notificationRoute("WorkerProfessionRequest", null)).toBeNull();
  });
});
