"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

/**
 * The skill-request queue's toolbar — the shell's own controls, **without a search
 * box.**
 *
 * ⚠ **That absence is the whole reason this component exists.** The shell's default
 * toolbar always renders a search input (`data-table.tsx:475`), and
 * `GET /api/admin/worker-skill-requests` **takes no `search` parameter** — there is
 * nothing for `buildSkillRequestQuery` to send it to. In server mode the shell
 * narrows nothing itself, so that box would write `?q=` to the URL and change not a
 * single row: a control that quietly does nothing, which is precisely what
 * `data-table.tsx`'s own header rules out. `toolbar` is the sanctioned escape hatch
 * and three screens already take it.
 *
 * A worker or a skill is reached through the filter band instead, which posts real
 * `workerId` / `professionId` params.
 */
export function SkillRequestsToolbar({
  heading,
  total,
  filtersTrigger,
  columnPicker,
  density,
}: {
  heading: string;
  /** The count for the current tab, from the shell's own source. */
  total: number;
  filtersTrigger: ReactNode;
  columnPicker: ReactNode;
  density: ReactNode;
}) {
  const t = useTranslations("skillRequests");

  return (
    <div className="flex flex-wrap items-center gap-2.5 px-4 py-3.5 sm:px-5">
      <span className="whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em]">
        {heading}
      </span>
      <span className="flex h-5 items-center whitespace-nowrap rounded-md bg-accent px-2 font-mono text-[10px] font-semibold text-primary">
        {t("toolbar.count", { total })}
      </span>

      <div className="flex-1" />

      {filtersTrigger}
      {columnPicker}
      {density}
    </div>
  );
}
