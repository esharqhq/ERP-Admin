import { afterEach, describe, expect, it, vi } from "vitest";
import { reachable } from "@/hooks/use-signed-pdf";

/**
 * The probe behind the "Open contract PDF" button.
 *
 * It shipped sending `HEAD`, on a comment that claimed ASP.NET Core falls back to
 * the `GET` action. It does not: `FilesController.Get` is `[HttpGet("{**storageKey}")]`,
 * attribute routing attaches an HTTP-method constraint, and a HEAD fails it — the
 * framework answers **405** before the action runs. (The HEAD→GET fallback that comment
 * was thinking of lives in `StaticFileMiddleware`, not in MVC.)
 *
 * Observed live, 2026-08-10:
 *   HEAD https://germany-erp.esharq.com/files/contracts/owner/…/contract.pdf?exp=…&sig=…
 *   → 405 Method Not Allowed
 *
 * So `reachable()` answered `false` for **every** URL, valid or expired, and every click
 * burned a contract re-read and then told the admin the document was missing. The button
 * had never worked.
 *
 * The first test below is the one that matters: it pins the **verb**, so it fails on the
 * shipped code and passes on the fix. The others pin behaviours the fix must not break —
 * in particular that releasing the response body cannot turn a reachable document into a
 * missing one.
 */

function response(init: { ok: boolean; status: number; cancel?: () => Promise<void> }): Response {
  return {
    ok: init.ok,
    status: init.status,
    body: { cancel: init.cancel ?? (async () => {}) },
  } as unknown as Response;
}

/**
 * The parameter list is declared even though every stub below ignores it: it is what
 * gives the mock a call tuple of `[input, init]`, so the two assertions that read
 * `calls[0][1]` — the ones that actually discriminate the fix — type-check.
 */
function stubFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const mock = vi.fn(impl);
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reachable", () => {
  /**
   * The regression guard. A mock that only checks `{ok: true}` passes with `HEAD` too,
   * which is how the original defect survived a green suite — so this asserts the verb
   * itself, and is red on the code that shipped.
   */
  it("probes with GET, because the file route refuses HEAD with a 405", async () => {
    const fetchMock = stubFetch(async () => response({ ok: true, status: 200 }));

    await reachable("https://api.example.com/files/contracts/owner/c1/contract.pdf");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "GET" });
  });

  /**
   * The probe asks whether the signature is valid *now*. A 200 served from the HTTP cache
   * minutes after minting would answer for an instant that has passed, so the request must
   * bypass the cache. `cache` is a fetch option rather than a header, so this stays a simple
   * request and triggers no CORS preflight.
   */
  it("bypasses the HTTP cache, so an expired signature cannot answer from a stale 200", async () => {
    const fetchMock = stubFetch(async () => response({ ok: true, status: 200 }));

    await reachable("https://api.example.com/files/contracts/owner/c1/contract.pdf");

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  /**
   * The trap the fix could introduce while removing the original one. Cancelling a stream
   * that is already settled or locked throws; if that throw were caught by the same handler
   * as a network failure, a perfectly good document would report as missing — the shipped
   * bug over again, from the other side.
   */
  it("stays reachable when releasing the body throws", async () => {
    stubFetch(async () =>
      response({
        ok: true,
        status: 200,
        cancel: async () => {
          throw new TypeError("ReadableStream is already locked");
        },
      }),
    );

    await expect(
      reachable("https://api.example.com/files/contracts/owner/c1/contract.pdf"),
    ).resolves.toBe(true);
  });

  /** A 404 is the real "expired signature or missing artifact" answer the caller acts on. */
  it("is not reachable on a 404", async () => {
    stubFetch(async () => response({ ok: false, status: 404 }));

    await expect(
      reachable("https://api.example.com/files/contracts/owner/c1/contract.pdf"),
    ).resolves.toBe(false);
  });

  /** Belt and braces: whatever else the route ever answers, only 2xx counts as reachable. */
  it("is not reachable on a 405", async () => {
    stubFetch(async () => response({ ok: false, status: 405 }));

    await expect(
      reachable("https://api.example.com/files/contracts/owner/c1/contract.pdf"),
    ).resolves.toBe(false);
  });

  /**
   * A network failure is deliberately indistinguishable from an expiry here: the caller's
   * next step — re-read the contract for a fresh URL and try once — is the right response
   * to either.
   */
  it("is not reachable when the request itself fails", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(
      reachable("https://api.example.com/files/contracts/owner/c1/contract.pdf"),
    ).resolves.toBe(false);
  });
});
