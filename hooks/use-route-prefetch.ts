"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Prefetch a route when the pointer or the keyboard reaches its link, rather
 * than when the link renders.
 *
 * The App Router's default is to prefetch every `<Link>` that enters the
 * viewport, which is right for a page with a few links and wrong for the two
 * places this console puts many on screen at once: the sidebar, which shows 17
 * nav rows on every page, and a table, which draws one row-link per row. Opening
 * the dashboard fired a wave of prefetches for routes nobody had asked for — the
 * network panel full of `?_rsc=` requests that prompted this.
 *
 * ⚠ **`prefetch={false}` alone is not the fix, it is half of it.** In the App
 * Router that value disables prefetching *"both on entering the viewport and on
 * hover"* (Next 16 `<Link>` docs), so used by itself it trades a request storm
 * for a slower click on every navigation. Pairing it with this hook moves the
 * prefetch to the moment it is actually predictive: a pointer settling on a row
 * precedes the click by a few hundred milliseconds, which is the whole window a
 * prefetch needs.
 *
 * `components/support/inbox-row.tsx` already prefetches its *query* on
 * `onMouseEnter`; this is the same instinct applied to the route.
 *
 * `useRouter` comes from `@/i18n/navigation`, so the href passed here is the
 * unprefixed app path (`/dashboard/owners`) and next-intl localises it before
 * the request. Passing an already-prefixed path would produce `/en/en/…`.
 */
export function useRoutePrefetch() {
  const router = useRouter();

  /*
    A pointer crossing a sidebar takes the same route in and out, and a table row
    is hovered again on the way to the one below it. Without this, one sweep down
    the nav would re-issue every prefetch it passed. A ref rather than state: this
    is a log of what has been asked for, and nothing renders from it.
  */
  const asked = useRef<Set<string>>(new Set());

  return useCallback(
    (href: string) => {
      if (!href || asked.current.has(href)) return;
      asked.current.add(href);
      router.prefetch(href);
    },
    [router],
  );
}
