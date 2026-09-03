"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  groupDocuments,
  requiredSet,
  verdictCounts,
  verdictOf,
  type DocGroup,
} from "@/lib/onboarding/doc-set";
import type { DocVerdict } from "@/lib/onboarding/queue-detail";
import type { KycDocDto } from "@/lib/types/kyc.types";
import { cn } from "@/lib/utils";

/**
 * Every file in the bundle, grouped, with the one being read marked.
 *
 * The left rail of the detail — narrow on purpose. It is an index, not a working
 * surface: the work happens in the centre column, and anything this rail takes is
 * taken from the file being read.
 */

const DOT: Record<DocVerdict, string> = {
  approved: "bg-status-active",
  pending: "bg-muted-foreground/25",
  rejected: "bg-status-cancelled",
};

const BAR: Record<DocVerdict, string> = {
  approved: "bg-status-active",
  pending: "bg-border",
  rejected: "bg-status-cancelled",
};

const GROUP_KEY: Record<DocGroup, "groupIdentity" | "groupCompany" | "groupOther"> = {
  identity: "groupIdentity",
  company: "groupCompany",
  other: "groupOther",
};

export function FilesRail({
  docs,
  hasCompany,
  approved,
  selectedId,
  onSelect,
}: {
  docs: KycDocDto[];
  /** Drives which required set applies — a natural person owes no company file. */
  hasCompany: boolean;
  /**
   * The submission has been approved, so the required-set line has done its job.
   * The rail itself does not move — design §04's *"Nothing moves."* — only the
   * sentence pinned under it changes.
   */
  approved: boolean;
  selectedId: string | null;
  onSelect: (doc: KycDocDto) => void;
}) {
  const t = useTranslations("docsWorkspace.detail");
  const counts = verdictCounts(docs);
  const groups = groupDocuments(docs);
  const required = requiredSet(docs, hasCompany);

  /**
   * Composed from parts rather than one message with three plural blocks. A
   * single ICU string keys its separators on one of the counts and renders
   * "1 approved · " the moment another is zero — a bug this codebase has already
   * shipped once, in the worker attention strip.
   */
  const summary =
    counts.total > 0 && counts.approved === counts.total
      ? t("allApproved", { count: counts.total })
      : [
          counts.approved > 0 ? t("countApproved", { count: counts.approved }) : null,
          counts.pending > 0 ? t("countPending", { count: counts.pending }) : null,
          counts.rejected > 0 ? t("countRejected", { count: counts.rejected }) : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/10 lg:w-56">
      <div className="flex flex-col gap-2 border-b border-border/60 px-3.5 pb-2.5 pt-3.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("filesTitle")}
          </span>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {counts.total}
          </span>
        </div>

        {/* One segment per file, so the shape of the bundle is readable before
            any of it is. Not a progress bar — these are verdicts, not steps. */}
        {counts.total > 0 && (
          <div className="flex gap-1" aria-hidden>
            {docs.map((doc) => (
              <span
                key={doc.id}
                className={cn("h-[5px] flex-1 rounded-full", BAR[verdictOf(doc.status)])}
              />
            ))}
          </div>
        )}

        {summary && (
          <p className="text-[11px] leading-snug text-ink-soft">{summary}</p>
        )}
      </div>

      <div className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 py-2.5">
        {groups.map(({ group, docs: groupDocs }) => (
          <div key={group} className="flex flex-col gap-1">
            <span className="px-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
              {t(GROUP_KEY[group])}
            </span>
            {groupDocs.map((doc) => (
              <FileRow
                key={doc.id}
                doc={doc}
                selected={doc.id === selectedId}
                onSelect={() => onSelect(doc)}
                label={t(`type.${doc.type ?? "Other"}` as "type.Passport")}
              />
            ))}
          </div>
        ))}
      </div>

      {/*
        Pinned to the bottom. This is the one thing in the rail that is not a
        file, and it answers the question an admin new to the queue actually has:
        not "did the server check" — it did, at submit — but "what am I supposed
        to be looking at".

        After approval that question is settled, and a different one takes its
        place: the centre column now holds the contract, so the rail says in words
        that the files are still there and that re-deciding one is still silent.
      */}
      <div className="mt-auto flex flex-col gap-1 border-t border-border/60 bg-muted/40 px-3.5 py-3">
        <span
          className={cn(
            "text-[11px] font-semibold",
            approved || required.complete ? "text-foreground" : "text-destructive",
          )}
        >
          {approved
            ? t("stillOpenableTitle")
            : required.complete
              ? t("requiredComplete")
              : t("requiredIncomplete")}
        </span>
        <span className="text-[10.5px] leading-snug text-ink-soft text-pretty">
          {approved
            ? t("stillOpenableBody")
            : hasCompany
              ? t("requiredBodyCompany")
              : t("requiredBodyPerson")}
        </span>
      </div>
    </aside>
  );
}

function FileRow({
  doc,
  selected,
  onSelect,
  label,
}: {
  doc: KycDocDto;
  selected: boolean;
  onSelect: () => void;
  label: string;
}) {
  const verdict = verdictOf(doc.status);

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
      <span
        className={cn(
          "flex h-8 w-[26px] shrink-0 items-center justify-center rounded-[4px] ring-1 ring-inset ring-foreground/10",
          verdict === "approved" && "bg-status-active-tint text-status-active",
          verdict === "rejected" && "bg-status-cancelled-tint text-status-cancelled",
          verdict === "pending" && "bg-muted text-muted-foreground",
        )}
      >
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
          title={doc.fileName ?? undefined}
        >
          {doc.fileName ?? "—"}
        </span>
      </span>

      <span className={cn("mt-1 size-2 shrink-0 rounded-full", DOT[verdict])} />
    </button>
  );
}
