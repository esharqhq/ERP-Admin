import { FileText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { KycDocDto } from "@/lib/types/kyc.types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" });
}

export function KYCDocuments({ documents }: { documents: KycDocDto[] }) {
  const docsWithUrl = documents.filter((d) => d.fileUrl !== null).length;
  const kycPct = Math.round((docsWithUrl / Math.max(documents.length, 1)) * 100);

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <h2 className="font-heading text-base font-semibold tracking-tight">KYC hujjatlari</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Hujjatlar topilmadi</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-base font-semibold tracking-tight">KYC hujjatlari</h2>
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
            {docsWithUrl}/{documents.length}
          </span>
        </div>
        <Progress value={kycPct} className="mt-2 h-1.5" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {documents.map((d) => (
          <div
            key={d.id}
            className="group/doc flex items-start gap-3 rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-foreground/15 hover:bg-muted/30"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FileText className="size-3.5" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[13px] font-medium leading-tight">
                {d.fileName ?? d.type ?? "Hujjat"}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {formatDate(d.createdAt)}
              </span>
            </div>
            {d.fileUrl && (
              <a
                href={d.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-0 transition-opacity group-hover/doc:opacity-100"
                aria-label="Ochish"
              >
                <ExternalLink className="size-3.5 text-muted-foreground hover:text-foreground" />
              </a>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
