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
   * warning — types 58–60 (`WorkerAgencyLink`) are live today and deliberately
   * unrouted, since their destination is the links screen phase 4 builds.
   */
  it("leaves an unknown entity type non-clickable", () => {
    expect(
      notificationRoute(
        "WorkerAgencyLink" as Parameters<typeof notificationRoute>[0],
        "b8e6856f",
      ),
    ).toBeNull();
  });

  it("needs both halves before it will route anything", () => {
    expect(notificationRoute("AgencyApplication", null)).toBeNull();
    expect(notificationRoute(null, "b8e6856f")).toBeNull();
  });
});
