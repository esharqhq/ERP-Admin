import { notFound } from "next/navigation"

/**
 * Bridges unmatched URLs to `app/[locale]/not-found.tsx`.
 *
 * Without this, nothing under `[locale]` renders the styled 404. Next's docs
 * name this exact shape: a root layout built on a "top-level dynamic segment
 * (e.g. `app/[country]/layout.tsx`)" cannot compose a global 404 from
 * `layout.js` + `not-found.js`, so an unmatched path falls through to Next's
 * built-in page instead. The documented fix is `global-not-found.js`, but that
 * is experimental AND bypasses the layout — meaning no next-intl provider, so
 * the 404 could not be translated.
 *
 * A catch-all that simply calls `notFound()` gets both: the real
 * `not-found.tsx` renders INSIDE `[locale]/layout.tsx`, with messages and fonts
 * intact, and no experimental flag is turned on in a production console.
 *
 * Catch-all segments are the lowest-priority match in App Router, so this
 * cannot shadow a real route — it only ever sees what nothing else claimed.
 *
 * NOTE for whoever adds the first `notFound()` to a detail page: this catch-all
 * lives OUTSIDE `dashboard/layout.tsx`, so the 404 it reaches is a full-page
 * takeover with no sidebar. That is right for an unmatched URL and wrong for a
 * missing record. To keep the console chrome around a record-level 404, add a
 * `not-found.tsx` inside that subtree (e.g. `dashboard/workers/[id]/`) — the
 * nearest one wins, and it renders inside its own layout.
 */
export default function CatchAllNotFound(): never {
  notFound()
}
