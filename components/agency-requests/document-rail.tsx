"use client";

import { FileText, FileWarning } from "lucide-react";
import { useTranslations } from "next-intl";

import { docSummary } from "@/lib/agencies/application-status";
import type {
  AgencyApplicationDocumentDto,
  AgencyApplicationDocumentType,
} from "@/lib/types/agency.types";
import { cn } from "@/lib/utils";

/**
 * Every paper on the application, with the one being read marked.
 *
 * ⚠ **A new component rather than a reuse of `FilesRail`.** That rail is coupled
 * to KYC all the way down — `hasCompany` picks a required set, `approved` swaps
 * the pinned sentence, and `verdictCounts` / `verdictOf` draw a **per-document
 * verdict** in three places (the segment bar, the tile tint, the trailing dot).
 * An agency application has no per-document verdict: there is one decision and
 * one reason, on the whole of it. Dressing this data in that rail would invent
 * three verdicts per row out of `status: null`.
 *
 * ⚠ **Read-only, always.** There is no upload door an admin can open on an
 * application they did not just create: the upload token is minted once, by
 * intake, and never crosses a route (spec §9). So the empty state states the
 * fact and offers nothing — a disabled Upload button here would be a promise
 * this screen cannot keep.
 */
export function DocumentRail({
  documents,
  selectedId,
  onSelect,
}: {
  documents: AgencyApplicationDocumentDto[] | null;
  selectedId: string | null;
  onSelect: (doc: AgencyApplicationDocumentDto) => void;
}) {
  const t = useTranslations("agencyRequests.docs");
  const docs = documents ?? [];
  const summary = docSummary(documents);

  /**
   * The order is the required set first, in the order it is required, then
   * everything else — so an admin checking whether the papers are here reads down
   * two fixed rows rather than hunting an upload order they did not choose.
   */
  const ordered = [
    ...docs.filter((d) => d.type === "RegistrationCertificate"),
    ...docs.filter((d) => d.type === "Licence"),
    ...docs.filter(
      (d) => d.type !== "RegistrationCertificate" && d.type !== "Licence",
    ),
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/10 lg:w-56">
      <div className="flex flex-col gap-2 border-b border-border/60 px-3.5 pb-2.5 pt-3.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("heading")}
          </span>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {summary.total}
          </span>
        </div>
        <p className="text-[11px] leading-snug text-ink-soft">
          {t("count", { count: summary.total })}
        </p>
      </div>

      <div className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-2.5">
        {ordered.length === 0 ? (
          <p className="px-1.5 py-6 text-center text-[11.5px] leading-snug text-muted-foreground text-pretty">
            {t("none")}
          </p>
        ) : (
          ordered.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              label={docTypeLabel(t, doc.type)}
              selected={doc.id === selectedId}
              onSelect={() => onSelect(doc)}
            />
          ))
        )}
      </div>

      {/*
        Pinned to the bottom, and the whole point of it is the second sentence:
        missing papers are a fact to weigh, not a gate. The applicant has no
        account and no returning session, so there was never a "finish your
        application" door for the server to hold shut.
      */}
      <div className="mt-auto flex flex-col gap-1 border-t border-border/60 bg-muted/40 px-3.5 py-3">
        {summary.missing.length === 0 ? (
          <span className="text-[11px] font-semibold text-foreground">
            {t("allPresent")}
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-status-pending-deep">
              <FileWarning aria-hidden className="size-3.5 shrink-0" />
              {t("missing")}
            </span>
            <span className="text-[10.5px] leading-snug text-ink-soft">
              {summary.missing
                .map((type) => t("missingOne", { name: docTypeLabel(t, type) }))
                .join(" · ")}
            </span>
            <span className="text-[10.5px] leading-snug text-ink-soft text-pretty">
              {t("warningHint")}
            </span>
          </>
        )}
      </div>
    </aside>
  );
}

/**
 * ⚠ `t.has` guard, not a bare lookup: `AgencyApplicationDocumentType` is widened,
 * so a fourth type added server-side prints its own raw name instead of throwing
 * a missing-message error across the whole rail.
 */
export function docTypeLabel(
  t: ReturnType<typeof useTranslations<"agencyRequests.docs">>,
  type: AgencyApplicationDocumentType,
): string {
  return t.has(`type.${type}`) ? t(`type.${type}`) : type;
}

function DocumentRow({
  doc,
  label,
  selected,
  onSelect,
}: {
  doc: AgencyApplicationDocumentDto;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-[11px] p-2 text-left transition-colors",
        selected
          ? "bg-accent/50 ring-[1.5px] ring-inset ring-primary"
          : "hover:bg-accent/30",
      )}
    >
      {/*
        One neutral tile, deliberately. `FilesRail` tints this by verdict; there
        is no verdict here, and a green or red tile would be one invented.
      */}
      <span className="flex h-8 w-[26px] shrink-0 items-center justify-center rounded-[4px] bg-muted text-muted-foreground ring-1 ring-inset ring-foreground/10">
        <FileText className="size-3.5" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "truncate text-[12.5px] leading-tight",
            selected ? "font-semibold" : "font-medium",
          )}
        >
          {label}
        </span>
        <span
          className="truncate font-mono text-[10.5px] leading-tight text-muted-foreground"
          title={doc.fileName}
        >
          {doc.fileName}
        </span>
      </span>
    </button>
  );
}
