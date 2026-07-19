"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { InboxFilters } from "@/components/support/inbox-filters";
import { InboxRow } from "@/components/support/inbox-row";
import { useSupportInbox } from "@/hooks/use-support-inbox";
import type { SupportInboxQuery } from "@/lib/types/support.types";

interface Props {
  selectedId: string | null;
  onSelect: (ticketId: string) => void;
}

export function InboxList({ selectedId, onSelect }: Props) {
  const t = useTranslations("supportInbox");
  const [query, setQuery] = useState<SupportInboxQuery>({ scope: "all" });
  const { rows, isLoading, isError } = useSupportInbox(query);

  return (
    <div className="flex h-full flex-col bg-background">
      <InboxFilters value={query} onChange={setQuery} />

      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <div className="flex flex-col gap-1 px-3 py-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <Skeleton className="size-11 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-destructive">
            {t("list.error")}
          </p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t("list.empty")}
          </p>
        ) : (
          rows.map((row) => (
            <InboxRow
              key={row.ticketId}
              row={row}
              selected={row.ticketId === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
