"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GAP, pageCountFor, pageRange, pageWindow } from "@/lib/ui/pagination";
import { cn } from "@/lib/utils";

/**
 * The queue's footer: what this page covers, how big a page is, and where to go.
 *
 * Its own component rather than the shared `TablePagination`, which four other
 * screens render and which has no page numbers. The design gives this table
 * numbered pages with a gap — an operator working a review backlog goes back to
 * page 1 or straight to the end, and a Previous/Next pair makes both a run of
 * clicks.
 */
export function TableFooter({
  page,
  pageSize,
  total,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const t = useTranslations("common.pagination");
  const pageCount = pageCountFor(total, pageSize);
  const { from, to } = pageRange(page, pageSize, total);

  /**
   * `items` is what lets `SelectValue` print the chosen option's **label** in the
   * trigger. Without it the trigger falls back to the raw value and the control
   * reads "25" where it should read "25 / page".
   */
  const sizeItems = pageSizeOptions.map((n) => ({
    value: String(n),
    label: t("perPage", { count: n }),
  }));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {t("showing", { from, to, total })}
        </span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
          items={sizeItems}
        >
          <SelectTrigger
            size="sm"
            className="h-[30px] w-auto gap-1.5 rounded-md px-2.5 font-mono text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav className="flex items-center gap-2" aria-label={t("previous")}>
        <Step
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3"
        >
          {t("previous")}
        </Step>

        {pageWindow(page, pageCount).map((slot, i) =>
          slot === GAP ? (
            <span
              key={`gap-${i}`}
              aria-hidden
              className="px-0.5 text-[13px] text-muted-foreground"
            >
              …
            </span>
          ) : (
            <button
              key={slot}
              type="button"
              aria-current={slot === page ? "page" : undefined}
              onClick={() => onPageChange(slot)}
              className={cn(
                "flex size-8 items-center justify-center rounded-md text-[13px] tabular-nums transition-colors",
                slot === page
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "text-foreground/80 hover:bg-accent",
              )}
            >
              {slot}
            </button>
          ),
        )}

        <Step
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="px-3.5"
        >
          {t("next")}
        </Step>
      </nav>
    </div>
  );
}

/**
 * Previous / Next. A usable step is a ringed control; an unusable one drops the
 * ring and goes grey, rather than staying a button-shaped thing that ignores a
 * click — the design draws exactly that difference on page 1.
 */
function Step({
  disabled,
  onClick,
  className,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center rounded-md text-[13px] transition-colors",
        disabled
          ? "cursor-default text-muted-foreground"
          : "border border-border font-semibold text-foreground/90 hover:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}
