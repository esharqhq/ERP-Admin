"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { routeAccess } from "@/lib/route-access";

/**
 * Sends an admin who opens a page they hold no grant for to the 403 page that
 * names the grant. The sidebar hides those pages; this covers a typed URL, a
 * bookmark, or a link from a role they no longer have.
 *
 * Only list pages are gated (`resolveRouteGate`, exact match), and the
 * redirect waits for the server's grant set (`routeAccess`). The page itself
 * is not rendered until the answer is `allow`, so a denied page never fires
 * its requests or flashes before it leaves.
 */
export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { permissions, source } = useCurrentPermissions();
  const access = routeAccess(pathname, permissions, source);
  const deniedTo = access.kind === "deny" ? access.href : null;

  useEffect(() => {
    // `replace`, so Back does not land on the page that bounced you here.
    if (deniedTo) router.replace(deniedTo);
  }, [deniedTo, router]);

  if (access.kind !== "allow") return <ListPageSkeleton />;
  return <>{children}</>;
}

/** The shape every gated page shares: a title block over a table card. */
function ListPageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-[480px] w-full rounded-xl" />
    </div>
  );
}
