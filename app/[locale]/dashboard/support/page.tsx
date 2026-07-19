"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessagesSquare } from "lucide-react";
import { InboxList } from "@/components/support/inbox-list";
import { TicketDetailPane } from "@/components/support/ticket-detail-pane";

export default function SupportInboxPage() {
  const t = useTranslations("supportInbox");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("ticket");

  const select = useCallback(
    (ticketId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("ticket", ticketId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const clearSelection = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("ticket");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  return (
    <div className="grid h-[calc(100vh-7.5rem)] min-h-[30rem] grid-cols-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm md:grid-cols-[21rem_1fr]">
      {/* Left pane: hidden on mobile once a ticket is selected */}
      <div
        className={`min-h-0 border-border md:border-r ${
          selectedId ? "hidden md:block" : "block"
        }`}
      >
        <InboxList selectedId={selectedId} onSelect={select} />
      </div>

      {/* Right pane */}
      <div
        className={`min-h-0 min-w-0 ${
          selectedId ? "flex flex-col" : "hidden md:flex md:flex-col"
        }`}
      >
        {selectedId ? (
          <TicketDetailPane ticketId={selectedId} onBack={clearSelection} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/30 p-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MessagesSquare className="size-7" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-base font-medium">{t("detail.emptyTitle")}</p>
              <p className="text-sm text-muted-foreground">
                {t("detail.emptyHint")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
