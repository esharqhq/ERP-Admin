"use client";

import { use } from "react";
import { FileText, ShieldCheck, CalendarDays, MessageSquare } from "lucide-react";
import {
  useOwnerFromList,
  useApproveOwnerKyc,
  useRejectOwnerKyc,
  useDeleteOwner,
  useOwnerByUserId,
  useOwnerProperties,
  useOwnerTaskGroups,
} from "@/hooks/use-owners";
import { ActionBar } from "@/components/owners/action-bar";
import { HeroCard } from "@/components/owners/hero-card";
import { StatCard } from "@/components/owners/stat-card";
import { PropertyList } from "@/components/owners/property-list";
import { ActivityTimeline } from "@/components/owners/activity-timeline";
import { ContactCard } from "@/components/owners/contact-card";
import { KYCDocuments } from "@/components/owners/kyc-documents";
import { Skeleton } from "@/components/ui/skeleton";

function formatReviewedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" });
}

export default function OwnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: owner, isLoading } = useOwnerFromList(id);
  const { mutate: approve, isPending: isApproving } = useApproveOwnerKyc();
  const { mutate: reject, isPending: isRejecting } = useRejectOwnerKyc();
  const { mutate: deleteOwner, isPending: isDeleting } = useDeleteOwner();

  const ownerUserId = owner?.ownerUserId ?? "";
  const { data: ownerFull } = useOwnerByUserId(ownerUserId);
  const { data: ownerProperties = [] } = useOwnerProperties(ownerUserId);
  const { data: ownerTaskGroups = [] } = useOwnerTaskGroups(ownerUserId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <ActionBar />
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="flex flex-col gap-6">
        <ActionBar />
        <p className="text-sm text-destructive">Owner topilmadi yoki xatolik yuz berdi.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ActionBar
        owner={owner}
        onApprove={() => approve(owner.ownerProfileId)}
        onReject={(reason) => reject({ ownerProfileId: owner.ownerProfileId, reason })}
        onDelete={() => deleteOwner(owner.ownerUserId)}
        isApproving={isApproving}
        isRejecting={isRejecting}
        isDeleting={isDeleting}
      />
      <HeroCard owner={owner} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Hujjatlar"
          value={owner.documentCount}
          hint="Yuklangan fayllar"
          icon={<FileText className="size-4" />}
          tone="blue"
        />
        <StatCard
          label="KYC holati"
          value={owner.isApproved ? "Tasdiqlangan" : "Kutilmoqda"}
          hint={owner.isApproved ? "Faol mulkdor" : "Ko'rib chiqilmoqda"}
          icon={<ShieldCheck className="size-4" />}
          tone={owner.isApproved ? "emerald" : "amber"}
        />
        <StatCard
          label="Tekshirildi"
          value={formatReviewedAt(owner.kycReviewedAt)}
          hint="Ko'rib chiqilgan sana"
          icon={<CalendarDays className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Rad sababi"
          value={owner.kycRejectReason ? "Mavjud" : "Yo'q"}
          hint={owner.kycRejectReason ?? "Rad etilmagan"}
          icon={<MessageSquare className="size-4" />}
          tone={owner.kycRejectReason ? "amber" : "emerald"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <PropertyList properties={ownerProperties} />
          <ActivityTimeline taskGroups={ownerTaskGroups} />
        </div>

        <div className="flex flex-col gap-6">
          <ContactCard owner={owner} />
          <KYCDocuments documents={ownerFull?.documents ?? []} />
        </div>
      </div>
    </div>
  );
}
