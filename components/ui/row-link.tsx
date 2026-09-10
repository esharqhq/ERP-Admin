"use client";

import { Link } from "@/i18n/navigation";
import { useRoutePrefetch } from "@/hooks/use-route-prefetch";

/**
 * Full-row navigation overlay for clickable table rows. Drop it as the first
 * child of the first cell in a `relative` table row to turn the entire row into
 * a real link — clicking any column navigates, and right-click / open-in-new-tab
 * keep working. Pair with `className="relative ... cursor-pointer"` on the row.
 *
 * ⚠ **Prefetch is on hover, not on render**, and this is the component where
 * that matters most. One of these is drawn per row, so a 25-row owners page
 * asked the server for 25 detail routes the moment it painted — for rows the
 * admin was still reading. The App Router's viewport default is right for a page
 * with a handful of links and wrong for a list.
 *
 * A row is hovered on the way to being clicked, so `useRoutePrefetch` still
 * warms the route before the click lands. `onFocus` carries the keyboard, where
 * there is no pointer to hover with.
 */
export function RowLink({ href, label }: { href: string; label?: string }) {
  const prefetch = useRoutePrefetch();
  return (
    <Link
      href={href}
      aria-label={label}
      prefetch={false}
      onMouseEnter={() => prefetch(href)}
      onFocus={() => prefetch(href)}
      className="absolute inset-0 z-[1] rounded-[inherit]"
    />
  );
}
