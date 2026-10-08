import { resolveRouteGate, type RouteGate } from "@/lib/nav-items";

/**
 * What the dashboard should do with the page at `path` (locale stripped).
 *
 * - `allow`: render it.
 * - `wait`: render a skeleton. The answer is not known yet.
 * - `deny`: replace the URL with `href`, the 403 page.
 *
 * The guard is UX, not protection: the API answers 403 to an admin without
 * the grant either way. So it errs toward letting a page render, and it only
 * redirects on a grant set the server sent this session. Cached grants come
 * from localStorage and can be a role behind: an admin just given a section
 * would be bounced from it, and a redirect cannot be taken back.
 */
export type RouteAccess = { kind: "allow" } | { kind: "wait" } | { kind: "deny"; href: string };

/**
 * Where the grant set in hand came from: fetched this session (`server`),
 * seeded from storage (`cache`), or the fetch failed (`failed`).
 */
export type GrantSource = "server" | "cache" | "failed";

export function routeAccess(
  path: string,
  permissions: ReadonlySet<string> | null,
  source: GrantSource,
): RouteAccess {
  const gate = resolveRouteGate(path);
  if (!gate) return { kind: "allow" };
  if (!permissions) return source === "failed" ? { kind: "allow" } : { kind: "wait" };

  const held = gate.anyOf
    ? gate.anyOf.some((p) => permissions.has(p))
    : !gate.permission || permissions.has(gate.permission);
  if (held) return { kind: "allow" };

  if (source === "server") return { kind: "deny", href: forbiddenHref(gate) };
  return source === "failed" ? { kind: "allow" } : { kind: "wait" };
}

/**
 * The 403 page for a gate. An `anyOf` gate has no single scope to name, so it
 * gets the generic copy rather than one of several requirements.
 */
export function forbiddenHref(gate: RouteGate): string {
  return gate.anyOf || !gate.permission
    ? "/forbidden"
    : `/forbidden?permission=${encodeURIComponent(gate.permission)}`;
}
