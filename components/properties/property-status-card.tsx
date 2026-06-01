import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { PropertyDto } from "@/lib/types/property.types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PropertyStatusCard({ property }: { property: PropertyDto }) {
  const t = useTranslations("properties");

  const docsStatusStyle: Record<
    string,
    { ring: string; bg: string; text: string; icon: React.ReactNode; label: string; hint: string }
  > = {
    Approved: {
      ring: "ring-emerald-500/25",
      bg: "bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: <CheckCircle2 className="size-4" />,
      label: t("docsStatus.approved"),
      hint: t("docsStatus.docsApproved"),
    },
    Pending: {
      ring: "ring-amber-500/25",
      bg: "bg-amber-500/10",
      text: "text-amber-700 dark:text-amber-400",
      icon: <Clock className="size-4" />,
      label: t("docsStatus.pending"),
      hint: t("docsStatus.docsPending"),
    },
    Rejected: {
      ring: "ring-rose-500/30",
      bg: "bg-rose-500/10",
      text: "text-rose-700 dark:text-rose-400",
      icon: <XCircle className="size-4" />,
      label: t("docsStatus.rejected"),
      hint: t("docsStatus.docsRejected"),
    },
  };

  const fallbackStyle = {
    ring: "ring-border",
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    icon: <Clock className="size-4" />,
    label: t("docsStatus.unknown"),
    hint: "",
  };

  const s =
    property.docsStatus !== null
      ? (docsStatusStyle[property.docsStatus] ?? fallbackStyle)
      : fallbackStyle;

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">{t("docsStatus.title")}</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg p-3 ring-1 ring-inset",
            s.ring,
            s.bg,
          )}
        >
          <span className={cn("shrink-0", s.text)}>{s.icon}</span>
          <div className="flex flex-col gap-0.5">
            <span className={cn("text-sm font-semibold", s.text)}>{s.label}</span>
            <span className="text-[11px] text-muted-foreground">{s.hint}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-[12px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t("docsStatus.reviewedAt")}</span>
            <span className="font-medium tabular-nums">{formatDate(property.docsReviewedAt)}</span>
          </div>
          {property.docsStatus === "Rejected" && property.docsRejectReason && (
            <div className="flex flex-col gap-0.5 rounded-md bg-destructive/5 px-2.5 py-2 text-destructive">
              <span className="font-semibold text-[11px] uppercase tracking-wide">{t("docsStatus.rejectReason")}</span>
              <span>{property.docsRejectReason}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
