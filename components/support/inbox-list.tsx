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
    <div className="flex h-full flex-col">
      <InboxFilters value={query} onChange={setQuery} />

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
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

      <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {isLoading ? t("list.loading") : t("list.count", { count: rows.length })}
      </div>
    </div>
  );
}
