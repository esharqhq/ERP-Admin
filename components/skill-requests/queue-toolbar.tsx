"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { StageTabs } from "@/components/ui/data-table";
import type { StageTab } from "@/components/ui/data-table/types";
import type { TableUrlState } from "@/hooks/use-table-url-state";

/**
 * The skill-request queue's toolbar — the shell's own controls, **without a search
 * box.**
 *
 * ⚠ **That absence is the whole reason this component exists.** The shell's default
 * toolbar always renders a search input (`data-table.tsx:472`), and
 * `GET /api/admin/worker-skill-requests` **takes no `search` parameter** — there is
 * nothing for `buildSkillRequestQuery` to send it to. In server mode the shell
 * narrows nothing itself, so that box would write `?q=` to the URL and change not a
 * single row: a control that quietly does nothing, which is precisely what
 * `data-table.tsx`'s own header rules out. `toolbar` is the sanctioned escape hatch.
 *
 * A worker or a skill is reached through the filter band instead, which posts real
 * `workerId` / `professionId` params. The band and the chip row are **not** replaced
 * by a custom toolbar, so they still come from the shell.
 *
 * ⚠ **The stage tabs are rendered HERE, not by the shell.** `toolbar` replaces rows
 * 1–3 of the default toolbar and row 2 *is* the tab strip
 * (`data-table.tsx:458-467`), so a caller that passes both `tabs` and `toolbar` gets
 * no tabs at all — the prop is silently dropped. This queue's four tabs are its only
 * way to reach a decided request, so they are drawn here explicitly. `tabs` is
 * therefore **not** passed to `DataTable`; passing it would only look like it worked.
 */
export function SkillRequestsToolbar({
  heading,
  total,
  tabs,
  tabsLabel,
  state,
  filtersTrigger,
  columnPicker,
  density,
}: {
  heading: string;
  /** The count for the current tab, from the shell's own source. */
  total: number;
  tabs: StageTab[];
  tabsLabel: string;
  /** The shell's own state, so the strip and the query cannot disagree. */
  state: TableUrlState;
  filtersTrigger: ReactNode;
  columnPicker: ReactNode;
  density: ReactNode;
}) {
  const t = useTranslations("skillRequests");

  return (
    <>
      {/* Row 1 — who this list is, and how much of it there is. */}
      <div className="flex flex-wrap items-center gap-2.5 px-4 pt-4 sm:px-5">
        <span className="font-heading text-base font-semibold tracking-tight">
          {heading}
        </span>
        <span className="flex h-[22px] items-center rounded-full bg-muted px-2 font-mono text-xs tabular-nums text-muted-foreground">
          {t("toolbar.count", { total })}
        </span>
      </div>

      {/* Row 2 — the stages, kept on their own line for the reason the shell gives:
          a single wrapping row reflows differently at every width and the tabs stop
          being findable. */}
      <div className="px-4 pt-3.5 sm:px-5">
        <StageTabs
          tabs={tabs}
          value={state.tab}
          onChange={state.setTab}
          label={tabsLabel}
        />
      </div>

      {/* Row 3 — narrow, choose columns, choose density. No search, per above. */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3.5 sm:px-5">
        {filtersTrigger}
        <div className="flex items-center gap-2 sm:ml-auto">
          {columnPicker}
          {density}
        </div>
      </div>
    </>
  );
}
