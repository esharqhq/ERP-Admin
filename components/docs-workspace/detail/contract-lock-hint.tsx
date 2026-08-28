"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * The right rail's placeholder for the contract, shown only while the centre
 * column cannot hold it yet.
 *
 * It exists to answer *where*, not *why*. The blocker sentence — three of them,
 * one per status — belongs to `ContractPanel` and is already written there; this
 * card says the contract opens **in the centre column**, which is the one thing an
 * admin looking at a file viewer has no way to guess. Design §03 draws it as the
 * third block at Review and drops it entirely once approval lands, because by then
 * the centre column is showing the answer.
 */
export function ContractLockHint() {
  const t = useTranslations("docsWorkspace.detail");

  return (
    <section className="flex items-start gap-2.5 rounded-xl border border-dashed border-border bg-muted/30 p-3.5">
      <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-inset ring-border">
        <Lock className="size-3" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("contractLockedTitle")}
        </span>
        <span className="text-[11.5px] leading-snug text-ink-soft text-pretty">
          {t("contractLockedHint")}
        </span>
      </span>
    </section>
  );
}
