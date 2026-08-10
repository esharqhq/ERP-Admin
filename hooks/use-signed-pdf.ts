"use client";

import { useCallback, useRef, useState } from "react";

export interface SignedPdfState {
  /**
   * Never rejects — every terminal path either opens a tab or sets `missing`.
   * Safe to call from an `onClick` without an `await`/`.catch()`.
   */
  open(): void;
  isOpening: boolean;
  /** Set when the artifact is genuinely missing after one refresh. */
  missing: boolean;
}

/**
 * Open a contract PDF whose URL is short-lived.
 *
 * `previewUrl`/`documentUrl` are HMAC-signed and expire in ~300 s, so a link
 * rendered when the panel mounted is very often dead by the time anyone clicks it.
 * The rule from the roadmap's Phase 1 constraint 8: follow it, never persist it,
 * and on a 404 re-read the contract **once** for a fresh URL before giving up.
 *
 * A second 404 with a freshly minted URL means the artifact is genuinely missing —
 * a real backend problem — so it stops there. No retry loops.
 *
 * `refetch` must return the contract fresh from the server (bound to a react-query
 * `refetch()` on the contract's own single-row query), never cached data — a cache
 * hit would hand back the very URL that just failed.
 */
export function useSignedPdf(
  url: string | null,
  refetch: () => Promise<string | null>,
): SignedPdfState {
  const [isOpening, setIsOpening] = useState(false);
  const [missing, setMissing] = useState(false);
  /**
   * Re-entrancy guard. A `useRef` rather than reading `isOpening` in the closure:
   * a state read can be stale (state updates are async/batched), so two
   * synchronous calls to `open()` in the same tick could both observe
   * `isOpening === false` and both proceed. A ref mutates immediately, so the
   * second call in the same tick sees it already held. `disabled={isOpening}`
   * on the button covers today's only caller; this guard is defense-in-depth
   * for whichever caller doesn't gate on it next.
   */
  const openingRef = useRef(false);

  const open = useCallback(() => {
    if (!url || openingRef.current) return;
    openingRef.current = true;
    setIsOpening(true);
    setMissing(false);

    // `open()` is declared `(): void`, not `(): Promise<void>` — it is fired from
    // an `onClick` with no `await`/`.catch()`, so it must never reject. Every
    // branch below is guarded (`reachable()` catches its own errors; `refetch()`
    // is guarded explicitly just below) so this IIFE always resolves, never
    // rejects, and `void` is safe here rather than papering over a real bug.
    void (async () => {
      try {
        // Probe first, so an expired signature refreshes silently instead of opening a
        // tab onto an error page. The probe is a GET whose body is discarded — see
        // `reachable` for why it cannot be a HEAD. CORS (`AllowAnyMethod`) covers the
        // cross-origin request.
        if (await reachable(url)) {
          window.open(url, "_blank", "noopener,noreferrer");
          return;
        }

        let fresh: string | null = null;
        try {
          fresh = await refetch();
        } catch {
          // A failed re-read is indistinguishable, from here, from a genuinely
          // missing document: either way there is no fresh URL to follow, and the
          // admin needs to be told rather than left with a button that silently
          // did nothing (a contract deleted between mount and click, or a
          // transient 500 on the re-read, both land here).
          setMissing(true);
          return;
        }

        if (fresh && (await reachable(fresh))) {
          window.open(fresh, "_blank", "noopener,noreferrer");
          return;
        }
        setMissing(true);
      } finally {
        setIsOpening(false);
        openingRef.current = false;
      }
    })();
  }, [url, refetch]);

  return { open, isOpening, missing };
}

/**
 * The signed URL is absolute and served by the backend's own file route, so this
 * is a cross-origin request. It needs no credentials — the signature *is* the
 * authorization — so a plain fetch is right; a failure to reach it at all is
 * treated the same as an expiry, because the next step (re-read and retry) is
 * the correct response either way.
 *
 * **Must be `GET`.** This shipped as `HEAD` on the belief that ASP.NET Core routes a
 * HEAD to the matching GET action. It does not: `FilesController.Get` is
 * `[HttpGet("{**storageKey}")]`, attribute routing attaches an HTTP-method constraint,
 * and a HEAD matches the route template but fails that constraint — so the framework
 * answers **405 before the action runs**, which is what a live probe returned on
 * 2026-08-10. (The HEAD→GET fallback that belief came from lives in
 * `StaticFileMiddleware`, not in MVC.) A 405 is not `res.ok`, so the probe reported
 * *every* URL unreachable — valid or expired — and the button never once opened a PDF.
 *
 * Exported for `use-signed-pdf.test.ts`, whose first case pins the verb: a mock that
 * only returns `{ok: true}` passes with either verb, which is how the defect survived a
 * green suite in the first place.
 */
export async function reachable(url: string): Promise<boolean> {
  let res: Response;
  try {
    // `cache: "no-store"` because the question is whether the signature is valid *now* —
    // a 200 replayed from the HTTP cache would answer for an instant that has passed.
    // It is a fetch option rather than a header, so this stays a simple request and
    // provokes no CORS preflight.
    res = await fetch(url, { method: "GET", cache: "no-store" });
  } catch {
    return false;
  }

  // Read the verdict before releasing anything: `cancel()` throws on a stream that is
  // already settled or locked, and that throw must not be allowed to turn a reachable
  // document into a missing one — which is the shipped bug over again, from the other
  // side. Hence its own catch rather than sharing the one above.
  const ok = res.ok;
  try {
    await res.body?.cancel();
  } catch {
    /* nothing left to release — the verdict is already in hand */
  }
  return ok;
}
