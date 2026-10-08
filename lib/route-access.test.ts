import { describe, expect, it } from "vitest";
import { forbiddenHref, routeAccess } from "@/lib/route-access";
import { resolveRouteGate } from "@/lib/nav-items";

const none = new Set<string>();

describe("resolveRouteGate", () => {
  it("gates a list page by its own nav permission", () => {
    expect(resolveRouteGate("/dashboard/agencies")).toEqual({ permission: "agency:read" });
    expect(resolveRouteGate("/dashboard/agencies/")).toEqual({ permission: "agency:read" });
  });

  it("does not hand a list's gate to its detail pages, which the backend gates differently", () => {
    // Task detail needs task:read_any, not task:list_any; worker detail needs
    // worker:read, not worker:list (TasksController.GetTask, AdminWorkersController).
    expect(resolveRouteGate("/dashboard/tasks/0b7c")).toBeNull();
    expect(resolveRouteGate("/dashboard/workers/0b7c")).toBeNull();
    expect(resolveRouteGate("/dashboard/workers/deleted")).toBeNull();
  });

  it("leaves pages without a nav entry ungated", () => {
    for (const path of ["/dashboard", "/dashboard/profile", "/dashboard/notifications", "/dashboard/chat"]) {
      expect(resolveRouteGate(path)).toBeNull();
    }
  });

  it("gives a settings sub-page its own gate rather than the settings anyOf", () => {
    expect(resolveRouteGate("/dashboard/settings/audit")).toEqual({ permission: "system:audit:read" });
  });

  it("opens the profession and category editors to either write grant", () => {
    // The backend serves both lists to any signed-in admin; gating on one grant
    // locked out an admin who held only the other.
    const professions = new Set(["profession:update"]);
    const categories = new Set(["property_category:create"]);
    expect(routeAccess("/dashboard/settings/professions", professions, "server")).toEqual({ kind: "allow" });
    expect(routeAccess("/dashboard/settings/property-categories", categories, "server")).toEqual({
      kind: "allow",
    });
  });
});

describe("routeAccess", () => {
  it("allows an ungated page without waiting for permissions", () => {
    expect(routeAccess("/dashboard", null, "cache")).toEqual({ kind: "allow" });
  });

  it("waits while the grant set is unknown", () => {
    expect(routeAccess("/dashboard/agencies", null, "cache")).toEqual({ kind: "wait" });
  });

  it("allows a held gate straight from the cache", () => {
    expect(routeAccess("/dashboard/agencies", new Set(["agency:read"]), "cache")).toEqual({
      kind: "allow",
    });
  });

  it("denies a missing gate once the server has answered, naming the permission", () => {
    expect(routeAccess("/dashboard/agencies", none, "server")).toEqual({
      kind: "deny",
      href: "/forbidden?permission=agency%3Aread",
    });
  });

  it("does not deny on cached grants alone — a role may have gained the section since", () => {
    expect(routeAccess("/dashboard/agencies", none, "cache")).toEqual({ kind: "wait" });
  });

  it("lets the page render when the permission fetch failed — the API still answers 403", () => {
    expect(routeAccess("/dashboard/agencies", none, "failed")).toEqual({ kind: "allow" });
  });

  it("denies an anyOf gate to the generic 403, since no single scope is the requirement", () => {
    expect(routeAccess("/dashboard/support", none, "server")).toEqual({
      kind: "deny",
      href: "/forbidden",
    });
    expect(
      routeAccess("/dashboard/support", new Set(["support_ticket:list_any"]), "server"),
    ).toEqual({ kind: "allow" });
  });

  it("never blocks a detail page", () => {
    expect(routeAccess("/dashboard/tasks/0b7c", none, "server")).toEqual({ kind: "allow" });
  });
});

describe("forbiddenHref", () => {
  it("names a single permission and stays generic for anyOf", () => {
    expect(forbiddenHref({ permission: "admin:list" })).toBe("/forbidden?permission=admin%3Alist");
    expect(forbiddenHref({ anyOf: ["a", "b"] })).toBe("/forbidden");
  });
});
