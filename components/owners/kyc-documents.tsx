import { FileText, Download } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { docStatusStyle, formatDate } from "@/lib/owner-utils"
import type { Owner } from "@/lib/owners"

export function KYCDocuments({ owner }: { owner: Owner }) {
  const docsValid = owner.documents.filter((d) => d.status === "Valid").length
  const kycPct = Math.round((docsValid / Math.max(owner.documents.length, 1)) * 100)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-base font-semibold tracking-tight">KYC hujjatlari</h2>
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
            {docsValid}/{owner.documents.length}
          </span>
        </div>
        <Progress value={kycPct} className="mt-2 h-1.5" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {owner.documents.map((d) => {
          const s = docStatusStyle[d.status]
          return (
            <div
              key={d.id}
              className="group/doc flex items-start gap-3 rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-foreground/15 hover:bg-muted/30"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <FileText className="size-3.5" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium leading-tight">{d.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", s.dot)} />
                  <span className={cn("text-[11px] font-medium", s.text)}>{s.label}</span>
                  {d.expiresAt && (
                    <>
                      <span className="text-border">·</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {formatDate(d.expiresAt)} gacha
                      </span>
                    </>
                  )}
                </div>
              </div>
              {d.status !== "Missing" && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 transition-opacity group-hover/doc:opacity-100"
                  aria-label="Yuklab olish"
                >
                  <Download className="size-3.5" />
                </Button>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
