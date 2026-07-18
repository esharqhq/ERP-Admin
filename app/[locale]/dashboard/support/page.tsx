"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid h-[calc(100vh-13rem)] grid-cols-1 overflow-hidden rounded-xl border border-border md:grid-cols-[22rem_1fr]">
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
          className={`min-h-0 overflow-y-auto ${
            selectedId ? "block" : "hidden md:block"
          }`}
        >
          {selectedId ? (
            <TicketDetailPane ticketId={selectedId} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-base font-medium">{t("detail.emptyTitle")}</p>
              <p className="text-sm text-muted-foreground">
                {t("detail.emptyHint")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
