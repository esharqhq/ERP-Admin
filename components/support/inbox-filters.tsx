"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Inbox, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterMenu, type FilterGroup } from "@/components/ui/filter-menu";
import { useHasAnyPermission } from "@/hooks/use-current-permissions";
import {
  SUPPORT_STATUS_FILTERS,
  type SupportInboxQuery,
  type SupportInboxScope,
  type SupportTicketStatusName,
} from "@/lib/types/support.types";

const PRIORITIES = ["Low", "Normal", "High", "Urgent"];
const CATEGORIES = ["Payment", "Task", "Property", "Technical", "Account", "Other"];

interface Props {
  value: SupportInboxQuery;
  onChange: (q: SupportInboxQuery) => void;
}

export function InboxFilters({ value, onChange }: Props) {
  const t = useTranslations("supportInbox");
  // "Mine" needs to know who I am; "All" needs a broad list permission.
  const canListAll = useHasAnyPermission([
    "conversation:list_any",
    "support_ticket:list_any",
  ]);

  const [searchInput, setSearchInput] = useState(value.search ?? "");

  // Keep refs current after each commit (not during render) so the debounce
  // timeout below always reads the latest value/onChange, never a stale closure.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  // Resync the input when value.search changes externally (e.g. filters reset).
  const [prevSearch, setPrevSearch] = useState(value.search);
  if (prevSearch !== value.search) {
    setPrevSearch(value.search);
    setSearchInput(value.search ?? "");
  }

  useEffect(() => {
    const id = setTimeout(() => {
      const normalized = searchInput || undefined;
      if (normalized === valueRef.current.search) return;
      onChangeRef.current({ ...valueRef.current, search: normalized });
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const filterGroups: FilterGroup[] = [
    {
      key: "status",
      label: t("filters.status"),
      options: SUPPORT_STATUS_FILTERS.filter((s) => s !== "all").map((s) => ({
        label: s,
        value: s,
      })),
    },
    {
      key: "priority",
      label: t("filters.priority"),
      options: PRIORITIES.map((p) => ({ label: p, value: p })),
    },
    {
      key: "category",
      label: t("filters.category"),
      options: CATEGORIES.map((c) => ({ label: c, value: c })),
    },
  ];

  const filterValues: Record<string, string> = {
    status: value.status ?? "",
    priority: value.priority ?? "",
    category: value.category ?? "",
  };

  const handleFilterChange = (key: string, v: string) => {
    const next = v || undefined;
    if (key === "status") {
      onChange({ ...value, status: next as SupportTicketStatusName | undefined });
    } else if (key === "priority") {
      onChange({ ...value, priority: next });
    } else {
      onChange({ ...value, category: next });
    }
  };

  return (
    <div className="flex flex-col gap-2.5 border-b border-border bg-background px-3 pb-3 pt-3.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h1 className="font-heading text-lg font-bold leading-none tracking-tight">
          {t("title")}
        </h1>
        <FilterMenu
          groups={filterGroups}
          values={filterValues}
          onChange={handleFilterChange}
          allLabel={t("filters.all")}
        />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("filters.searchPlaceholder")}
          className="rounded-full bg-muted/50 pl-9"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <Tabs
        value={value.scope}
        onValueChange={(v) =>
          onChange({ ...value, scope: v as SupportInboxScope })
        }
      >
        <TabsList className="w-full">
          {canListAll ? (
            <TabsTrigger value="all">
              <Inbox />
              {t("tabs.all")}
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="mine">
            <UserRound />
            {t("tabs.mine")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
