"use client";

import { useCallback, useState } from "react";

export type SignedPdfKind = "preview" | "document";

export interface SignedPdfState {
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

  const open = useCallback(async () => {
    if (!url) return;
    setIsOpening(true);
    setMissing(false);
    try {
      // A HEAD is enough to learn whether the signature is still valid, and it
      // avoids opening a tab onto an error page. Verified against FilesController:
      // it is GET-only, but ASP.NET Core's routing matches HEAD to a GET action by
      // default, and its FileStreamResult skips the body (not the status/headers)
      // for a HEAD request — so a HEAD reports the same 200/404 a GET would, without
      // downloading the PDF. CORS (`AllowAnyMethod`) covers the cross-origin HEAD too.
      if (await reachable(url)) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      const fresh = await refetch();
      if (fresh && (await reachable(fresh))) {
        window.open(fresh, "_blank", "noopener,noreferrer");
        return;
      }
      setMissing(true);
    } finally {
      setIsOpening(false);
    }
  }, [url, refetch]);

  return { open, isOpening, missing };
}

/**
 * The signed URL is absolute and served by the backend's own file route, so this
 * is a cross-origin request. It needs no credentials — the signature *is* the
 * authorization — so a plain fetch is right; a failure to reach it at all is
 * treated the same as an expiry, because the next step (re-read and retry) is
 * the correct response either way.
 */
async function reachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}
