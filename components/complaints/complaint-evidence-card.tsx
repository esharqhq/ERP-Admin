"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoGrid } from "@/components/complaints/photo-grid";
import type { TaskComplaintDto } from "@/lib/types/task.types";

function fmt(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/** The owner's side: when, why, and the photos they attached (1–8 by contract). */
export function ComplaintEvidenceCard({ complaint }: { complaint: TaskComplaintDto }) {
  const t = useTranslations("complaints.owner");
  const locale = useLocale();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("raisedAt", { time: fmt(complaint.raisedAt, locale) })}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="whitespace-pre-wrap text-sm">{complaint.reason}</p>
        <PhotoGrid
          emptyText={t("noPhotos")}
          photos={complaint.photos.map((p) => ({
            id: p.id,
            url: p.url,
            name: p.originalFileName,
            mimeType: p.mimeType,
          }))}
        />
      </CardContent>
    </Card>
  );
}
