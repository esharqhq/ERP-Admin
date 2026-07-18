"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useHasAnyPermission } from "@/hooks/use-current-permissions";
import {
  SUPPORT_STATUS_FILTERS,
  type SupportInboxQuery,
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

  const selectCls =
    "rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <div className="flex flex-col gap-3 border-b border-border p-3">
      <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
        {(["all", "mine"] as const).map((scope) => {
          if (scope === "all" && !canListAll) return null;
          return (
            <button
              key={scope}
              onClick={() => onChange({ ...value, scope })}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                value.scope === scope
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`tabs.${scope}`)}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className={selectCls}
          value={value.status ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              status: (e.target.value || undefined) as
                | SupportTicketStatusName
                | undefined,
            })
          }
        >
          <option value="">{t("filters.status")}</option>
          {SUPPORT_STATUS_FILTERS.filter((s) => s !== "all").map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          className={selectCls}
          value={value.priority ?? ""}
          onChange={(e) =>
            onChange({ ...value, priority: e.target.value || undefined })
          }
        >
          <option value="">{t("filters.priority")}</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          className={selectCls}
          value={value.category ?? ""}
          onChange={(e) =>
            onChange({ ...value, category: e.target.value || undefined })
          }
        >
          <option value="">{t("filters.category")}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder={t("filters.searchPlaceholder")}
          className="pl-8"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>
    </div>
  );
}
