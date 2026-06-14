import Link from "next/link";

/**
 * Full-row navigation overlay for clickable table rows. Drop it as the first
 * child of the first cell in a `relative` table row to turn the entire row into
 * a real link — clicking any column navigates, and right-click / open-in-new-tab
 * keep working. Pair with `className="relative ... cursor-pointer"` on the row.
 */
export function RowLink({ href, label }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="absolute inset-0 z-[1] rounded-[inherit]"
    />
  );
}
