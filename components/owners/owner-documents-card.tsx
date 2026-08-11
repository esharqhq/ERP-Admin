"use client";

import { FileText } from "lucide-react";
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
 * Built to the shape of `PropertyList`, which sits directly beneath it in the
 * same column — same header, same row treatment, same empty state. Two sibling
 * cards listing an owner's things should not look like they came from different
 * screens.
 *
 * Approve and reject deliberately live only on `/dashboard/owner-documents/
 * {ownerProfileId}`, which carries the whole review workspace: identity block,
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

  const docs = documents ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">
            {t("documents.title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("documents.subtitle")}
          </p>
        </div>
        {ownerProfileId ? (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={`/dashboard/owner-documents/${ownerProfileId}`} />}
            className="text-primary"
          >
            {t("documents.openAll")}
          </Button>
        ) : null}
      </CardHeader>

      {!ownerProfileId || docs.length === 0 ? (
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
          <FileText className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {ownerProfileId ? t("documents.empty") : t("documents.unavailable")}
          </p>
        </CardContent>
      ) : (
        <CardContent className="flex flex-col gap-2.5">
          {docs.map((doc) => {
            // The wire value is PascalCase and the i18n keys are camelCase;
            // `has()` guards the case where the server enum grew and falls back
            // to the raw name rather than throwing. Same derivation the review
            // workspace uses — these two lists must read alike.
            const raw = doc.type ?? "other";
            const typeKey = raw.charAt(0).toLowerCase() + raw.slice(1);

            const body = (
              <>
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FileText className="size-3.5" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] font-medium leading-tight">
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
                  className={cn("shrink-0 text-[10px] font-normal", statusTone(doc.status))}
                >
                  {tDocs(
                    `docStatus.${(doc.status ?? "pending").toLowerCase()}` as Parameters<
                      typeof tDocs
                    >[0],
                  )}
                </Badge>
              </>
            );

            const shell =
              "group flex items-start gap-3 rounded-lg border border-border bg-card p-2.5 transition-colors";

            // A document with no file is still worth listing — its status is the
            // point — but it must not look like a link to nowhere.
            return doc.fileUrl ? (
              <a
                key={doc.id}
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(shell, "hover:border-foreground/15 hover:bg-muted/30")}
              >
                {body}
              </a>
            ) : (
              <div key={doc.id} className={cn(shell, "opacity-70")}>
                {body}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
