"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The three ways a card can have nothing to show, told apart in words.
 *
 * Both design files state the rule the same way: *a refusal is not an
 * emptiness.* "Nothing here", "you may not see this" and "this could not be
 * loaded" are three different facts about three different things, and only the
 * first is a fact about the subject. Collapsing them into one dim line is what
 * lets a screen tell an admin without `kyc:review` that an owner has no
 * documents.
 *
 * `note` is the provenance — `200 · empty list`, `403 · missing kyc:review`.
 * It is deliberately not translated: it names a wire outcome, and an admin
 * reporting a screen is quoting it to an engineer.
 */
export function CardState({
  icon,
  title,
  hint,
  note,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-2 py-7 text-center">
      <span className="text-muted-foreground/40">{icon}</span>
      <span className="text-[13px] leading-snug text-foreground/80">
        {title}
      </span>
      {hint ? (
        <span className="max-w-[28ch] text-[11px] leading-snug text-muted-foreground">
          {hint}
        </span>
      ) : null}
      {note ? (
        <span className="mt-1 font-mono text-[10px] text-muted-foreground/70">
          {note}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Rows, not a spinner. The card keeps its height while its source resolves, so
 * the column below does not jump once the rows land.
 */
export function CardRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-[46px] w-full rounded-lg" />
      ))}
    </div>
  );
}
