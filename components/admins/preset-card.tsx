// components/admins/preset-card.tsx
"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string | null;
  /** Omit for the Custom card. */
  permCount?: number;
  selected: boolean;
  recommended?: boolean;
  system?: boolean;
  /** Renders the hand-pick variant (different icon, no count). */
  custom?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

/**
 * Selectable access-preset card for AdminForm. Mirrors the existing
 * mode-button styling (border-primary bg-primary/5 when selected).
 */
export function PresetCard({
  title, description, permCount, selected, recommended, system, custom, disabled, onSelect,
}: Props) {
  const t = useTranslations("admins.form");
  const Icon = custom ? SlidersHorizontal : ShieldCheck;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-50",
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40",
      )}
    >
      <span className="flex items-center gap-1.5">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate font-medium">{title}</span>
        {recommended && (
          <Badge variant="default" className="ml-auto shrink-0 text-[10px]">
            {t("recommended")}
          </Badge>
        )}
        {system && !recommended && (
          <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
            {t("systemBadge")}
          </Badge>
        )}
      </span>
      {description ? (
        <span className="line-clamp-2 text-[11px] text-muted-foreground">{description}</span>
      ) : null}
      {typeof permCount === "number" && (
        <span className="text-[11px] text-muted-foreground">
          {t("permCount", { count: permCount })}
        </span>
      )}
    </button>
  );
}
