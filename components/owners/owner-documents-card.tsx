"use client";

import { FileText, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { KycDocDto } from "@/lib/types/kyc.types";

function statusTone(status: string | null): string {
  switch ((status ?? "").toLowerCase()) {
    case "approved":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "rejected":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }
}

/**
 * What the owner submitted, read-only.
 *
 * Approve and reject deliberately live only on `/dashboard/owner-documents/
 * {ownerProfileId}`, which carries the whole review workspace — identity block,
 * company block, per-document verdicts, onboarding stepper. Rebuilding those
 * actions here would put the same rules in two places, and two copies of a rule
 * drift apart.
 */
export function OwnerDocumentsCard({
  ownerProfileId,
  documents,
}: {
  /** `null` when the KYC read 404'd or was refused — the card then says which. */
  ownerProfileId: string | null;
  documents: KycDocDto[] | null;
}) {
  const t = useTranslations("owners");
  const tDoc = useTranslations("onboarding");
  const tDocs = useTranslations("docsWorkspace");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          {t("documents.title")}
        </h2>
        {ownerProfileId ? (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            className="gap-1 text-[12px] text-muted-foreground hover:text-foreground"
            render={<Link href={`/dashboard/owner-documents/${ownerProfileId}`} />}
          >
            {t("documents.openAll")}
            <ExternalLink className="size-3.5" />
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {!ownerProfileId ? (
          <p className="text-sm text-muted-foreground">{t("documents.unavailable")}</p>
        ) : !documents || documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("documents.empty")}</p>
        ) : (
          documents.map((doc) => {
            // The wire value is PascalCase and the i18n keys are camelCase;
            // `has()` guards the case where the server enum grew and falls back
            // to the raw name rather than throwing. Same shape the review
            // workspace uses — these two lists must read alike.
            const raw = doc.type ?? "other";
            const typeKey = raw.charAt(0).toLowerCase() + raw.slice(1);

            return (
              <a
                key={doc.id}
                href={doc.fileUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 transition-colors",
                  doc.fileUrl ? "hover:bg-accent/40" : "pointer-events-none opacity-70",
                )}
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium">
                    {tDoc.has(`docType.${typeKey}`)
                      ? tDoc(`docType.${typeKey}` as Parameters<typeof tDoc>[0])
                      : (doc.type ?? "—")}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {doc.fileName ?? "—"}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className={cn("shrink-0", statusTone(doc.status))}
                >
                  {tDocs(
                    `docStatus.${(doc.status ?? "pending").toLowerCase()}` as Parameters<
                      typeof tDocs
                    >[0],
                  )}
                </Badge>
              </a>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
