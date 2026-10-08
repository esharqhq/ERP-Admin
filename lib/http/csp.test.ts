import { describe, expect, it } from "vitest";
import { buildCsp, originOf } from "@/lib/http/csp";

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [name, ...values] = d.split(/\s+/);
        return [name, values] as const;
      }),
  );
}

const prod = {
  nonce: "abc123",
  apiUrl: "https://api.uyer.app",
  healthUrl: "https://status.uyer.app/health",
  dev: false,
};

describe("originOf", () => {
  it("keeps only the origin of an absolute url", () => {
    expect(originOf("https://api.uyer.app/api/x?y=1")).toBe("https://api.uyer.app");
    expect(originOf("http://localhost:5156")).toBe("http://localhost:5156");
  });

  it("answers null for a missing or relative value instead of throwing", () => {
    expect(originOf(undefined)).toBeNull();
    expect(originOf("")).toBeNull();
    expect(originOf("/health")).toBeNull();
  });
});

describe("buildCsp", () => {
  it("lets scripts run only with this request's nonce", () => {
    const script = directives(buildCsp(prod)).get("script-src")!;
    expect(script).toContain("'nonce-abc123'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });

  it("allows eval in development only, where React needs it for error stacks", () => {
    expect(directives(buildCsp({ ...prod, dev: true })).get("script-src")).toContain(
      "'unsafe-eval'",
    );
  });

  it("keeps inline styles working, which a nonce in style-src would switch off", () => {
    const style = directives(buildCsp(prod)).get("style-src")!;
    expect(style).toContain("'unsafe-inline'");
    expect(style.some((v) => v.startsWith("'nonce-"))).toBe(false);
  });

  it("lets the browser reach the API over https and the SignalR hub over wss", () => {
    const connect = directives(buildCsp(prod)).get("connect-src")!;
    expect(connect).toContain("https://api.uyer.app");
    expect(connect).toContain("wss://api.uyer.app");
  });

  it("maps a plain-http local backend to ws", () => {
    const connect = directives(
      buildCsp({ ...prod, apiUrl: "http://localhost:5156", dev: true }),
    ).get("connect-src")!;
    expect(connect).toContain("http://localhost:5156");
    expect(connect).toContain("ws://localhost:5156");
  });

  it("allows the health probe's origin, which the header chip fetches from the browser", () => {
    expect(directives(buildCsp(prod)).get("connect-src")).toContain(
      "https://status.uyer.app",
    );
  });

  it("frames file previews from the API origin only", () => {
    const frame = directives(buildCsp(prod)).get("frame-src")!;
    expect(frame).toContain("https://api.uyer.app");
    expect(frame).not.toContain("https:");
  });

  it("names the service worker source, which strict-dynamic would otherwise block", () => {
    expect(directives(buildCsp(prod)).get("worker-src")).toEqual(["'self'"]);
  });

  it("shuts plugins, base-tag hijacks and foreign framing", () => {
    const d = directives(buildCsp(prod));
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
    expect(d.get("frame-ancestors")).toEqual(["'self'"]);
  });

  it("still produces a policy when the API and health urls are unset", () => {
    const d = directives(buildCsp({ nonce: "n", dev: false }));
    expect(d.get("connect-src")).toContain("'self'");
    expect(d.get("frame-src")).toEqual(["'self'"]);
  });
});
