"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { QUEUE_TABS, statusForTab } from "@/lib/onboarding/queue-tabs";

/**
 * The stage vocabulary moved to `lib/onboarding/queue-tabs.ts` when the owner
 * queue was rebuilt on the shared table shell, so one list serves the new queue
 * and this one. Re-exported here for the worker screen, which still renders this
 * component until F3 replaces it.
 */
export { statusForTab };
export const DOCS_TABS = QUEUE_TABS;

export function DocsFilterBar({
  tab,
  onTabChange,
  search,
  onSearchChange,
}: {
  tab: string;
  onTabChange: (key: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const t = useTranslations("docsWorkspace");
  const tOnboarding = useTranslations("onboarding");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="tablist"
        aria-label={t("filterLabel")}
        className="flex flex-wrap rounded-lg border border-border bg-muted/50 p-0.5"
      >
        {DOCS_TABS.map((tb) => (
          <button
            key={tb.key}
            type="button"
            role="tab"
            aria-selected={tab === tb.key}
            onClick={() => onTabChange(tb.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === tb.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tb.key === "all"
              ? t("allTab")
              : tOnboarding(`status.${tb.key}`)}
          </button>
        ))}
      </div>
      <div className="relative min-w-[200px] max-w-sm flex-1">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          className="pl-8"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
