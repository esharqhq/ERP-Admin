import { describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "@/proxy";

// next-intl's ESM build imports `next/server` without an extension, which node
// cannot resolve outside Next. Only the matcher is under test here.
vi.mock("next-intl/middleware", () => ({ default: () => () => null }));

/**
 * Which requests `proxy.ts` sees. Whatever it skips gets neither the login
 * redirect nor the Content-Security-Policy.
 *
 * The matcher used to skip every path containing a dot, which was meant for
 * public files but also caught panel pages whose dynamic segment holds one:
 * `/en/dashboard/tasks/abc.x` rendered with a 200, no redirect to login, and no
 * CSP (measured against admin.uyer.app, 2026-10-08).
 */
const runs = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("proxy matcher", () => {
  it.each([
    "/",
    "/en",
    "/de",
    "/en/login",
    "/en/dashboard",
    "/en/dashboard/tasks/3f2b1c9e-0000-4000-8000-000000000000",
    "/en/dashboard/tasks/abc.x",
    "/de/dashboard/workers/a.b.c",
    "/en/dashboard/support/x.png",
    "/en/forbidden",
  ])("runs on panel page %s", (url) => {
    expect(runs(url)).toBe(true);
  });

  it.each([
    "/_next/static/chunks/main.js",
    "/_next/image",
    "/favicon.ico",
    "/favicon.png",
    "/uyer-mark.png",
    "/cleaning-crew.png",
    "/onesignal/OneSignalSDKWorker.js",
  ])("skips static file %s", (url) => {
    expect(runs(url)).toBe(false);
  });
});
