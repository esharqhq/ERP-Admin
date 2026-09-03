"use client";

import { FileText, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** What the centre column is showing. */
export type CentrePane = "file" | "contract";

/**
 * The one control that is not in the design, and the reason it is here.
 *
 * Design §04 swaps the centre column from the file viewer to the contract once
 * approval unlocks it, and §03's files rail promises in words that *"files stay
 * readable after approval"* — but it draws no way back. Clicking a file in the
 * rail is one direction and is discoverable; returning to a half-written contract
 * had none, so this is the return path, made symmetric rather than hidden as a
 * lone "back" button.
 *
 * It renders **only when both panes exist** — while the contract is still locked
 * the centre column has nothing to switch to, and a two-segment control with one
 * dead segment is worse than no control. That keeps the Review screen exactly as
 * drawn.
 */
export function PaneSwitch({
  pane,
  onChange,
}: {
  pane: CentrePane;
  onChange: (pane: CentrePane) => void;
}) {
  const t = useTranslations("docsWorkspace.detail");

  return (
    <div
      role="tablist"
      aria-label={t("paneSwitch")}
      className="flex shrink-0 items-center gap-0.5 self-start rounded-[10px] bg-muted p-0.5"
    >
      <Segment
        selected={pane === "file"}
        onClick={() => onChange("file")}
        icon={<FileText className="size-3.5" />}
        label={t("paneDocument")}
      />
      <Segment
        selected={pane === "contract"}
        onClick={() => onChange("contract")}
        icon={<ScrollText className="size-3.5" />}
        label={t("paneContract")}
      />
    </div>
  );
}

function Segment({
  selected,
  onClick,
  icon,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "flex h-[30px] items-center gap-1.5 rounded-[8px] px-2.5 text-[12.5px] font-medium transition-colors",
        selected
          ? "bg-card text-foreground shadow-card"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
