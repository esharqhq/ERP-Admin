import { Mail, Hash, CalendarDays, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InfoRow } from "./info-row";
import type { KycProfileSummaryDto } from "@/lib/types/kyc.types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" });
}

export function ContactCard({ owner }: { owner: KycProfileSummaryDto }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          {"Aloqa ma'lumotlari"}
        </h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        <InfoRow
          icon={<Mail className="size-3.5" />}
          label="Email"
          value={owner.ownerEmail ?? "—"}
        />
        <Separator />
        <InfoRow
          icon={<Hash className="size-3.5" />}
          label="Foydalanuvchi ID"
          value={owner.ownerUserId}
          mono
        />
        <InfoRow
          icon={<CalendarDays className="size-3.5" />}
          label="Ko'rib chiqilgan"
          value={formatDate(owner.kycReviewedAt)}
        />
        {owner.kycRejectReason && (
          <InfoRow
            icon={<MessageSquare className="size-3.5" />}
            label="Rad sababi"
            value={owner.kycRejectReason}
          />
        )}
      </CardContent>
    </Card>
  );
}
