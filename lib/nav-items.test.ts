import { describe, expect, it } from "vitest";
import { LayoutDashboard } from "lucide-react";
import { canSeeNavItem, navGroups, visibleNavGroups, type NavGroup } from "@/lib/nav-items";

const item = (url: string, gate: { permission?: string; anyOf?: string[] } = {}) => ({
  title: url,
  labelKey: `nav.${url}`,
  url,
  icon: LayoutDashboard,
  ...gate,
});

const groups: NavGroup[] = [
  { id: "dashboard", label: "Dashboard", labelKey: "nav.dashboard", items: [item("/dashboard")] },
  {
    id: "owner",
    label: "Owner",
    labelKey: "nav.owner",
    items: [item("/owners", { permission: "owner:list" }), item("/properties", { permission: "property:list" })],
  },
  {
    id: "agency",
    label: "Agency",
    labelKey: "nav.agency",
    items: [item("/agencies", { permission: "agency:read" })],
  },
  {
    id: "system",
    label: "System",
    labelKey: "nav.system",
    items: [item("/support", { anyOf: ["conversation:list_any", "support_ticket:list_any"] })],
  },
];

const urls = (gs: NavGroup[]) => gs.map((g) => [g.id, g.items.map((i) => i.url)]);

describe("canSeeNavItem", () => {
  it("shows an ungated row to every admin", () => {
    expect(canSeeNavItem(item("/dashboard"), new Set())).toBe(true);
  });

  it("needs the row's one permission", () => {
    const owners = item("/owners", { permission: "owner:list" });
    expect(canSeeNavItem(owners, new Set(["owner:list"]))).toBe(true);
    expect(canSeeNavItem(owners, new Set(["owner:read"]))).toBe(false);
  });

  it("needs any one of an anyOf row's permissions", () => {
    const support = item("/support", { anyOf: ["a", "b"] });
    expect(canSeeNavItem(support, new Set(["b"]))).toBe(true);
    expect(canSeeNavItem(support, new Set(["c"]))).toBe(false);
  });
});

describe("visibleNavGroups", () => {
  it("drops the rows the admin may not open", () => {
    expect(urls(visibleNavGroups(groups, new Set(["owner:list"])))).toEqual([
      ["dashboard", ["/dashboard"]],
      ["owner", ["/owners"]],
    ]);
  });

  it("drops a group whose every row is denied, so no header stands over nothing", () => {
    const ids = visibleNavGroups(groups, new Set(["conversation:list_any"])).map((g) => g.id);
    expect(ids).toEqual(["dashboard", "system"]);
  });

  it("keeps everything for an admin who holds every grant", () => {
    const all = new Set(["owner:list", "property:list", "agency:read", "support_ticket:list_any"]);
    expect(urls(visibleNavGroups(groups, all))).toEqual(urls(groups));
  });

  it("leaves the input untouched", () => {
    visibleNavGroups(groups, new Set());
    expect(groups[1].items).toHaveLength(2);
  });

  it("always keeps Overview in the real nav, whatever the grants", () => {
    const first = visibleNavGroups(navGroups, new Set())[0];
    expect(first.items.map((i) => i.url)).toEqual(["/dashboard"]);
  });
});
