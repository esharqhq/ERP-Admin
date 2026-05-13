import { notFound } from "next/navigation"
import { CreditCard, FileText, Home, Receipt } from "lucide-react"
import { getOwnerById } from "@/lib/owners"
import { ActionBar } from "@/components/owners/action-bar"
import { HeroCard } from "@/components/owners/hero-card"
import { StatCard } from "@/components/owners/stat-card"
import { PropertyList } from "@/components/owners/property-list"
import { ActivityTimeline } from "@/components/owners/activity-timeline"
import { ContactCard } from "@/components/owners/contact-card"
import { KYCDocuments } from "@/components/owners/kyc-documents"

export default async function OwnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const owner = getOwnerById(Number(id))
  if (!owner) notFound()

  return (
    <div className="flex flex-col gap-6">
      <ActionBar />
      <HeroCard owner={owner} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Mulklar"
          value={owner.properties}
          hint={`${owner.propertiesList.filter((p) => p.status === "Active").length} ta faol`}
          icon={<Home className="size-4" />}
          tone="blue"
        />
        <StatCard
          label="Faol shartnomalar"
          value={owner.activeContracts}
          hint={owner.activeContracts > 0 ? "Joriy yil" : "Hozircha yo'q"}
          icon={<FileText className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Umumiy daromad"
          value={owner.totalRevenue}
          hint="So'nggi 12 oy"
          icon={<CreditCard className="size-4" />}
          tone="emerald"
        />
        <StatCard
          label="Kutilayotgan to'lov"
          value={owner.pendingPayments}
          hint={owner.pendingPayments === "0 so'm" ? "Qarzdorlik yo'q" : "E'tibor talab qiladi"}
          icon={<Receipt className="size-4" />}
          tone={owner.pendingPayments === "0 so'm" ? "emerald" : "amber"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <PropertyList owner={owner} />
          <ActivityTimeline owner={owner} />
        </div>

        <div className="flex flex-col gap-6">
          <ContactCard owner={owner} />
          <KYCDocuments owner={owner} />
        </div>
      </div>
    </div>
  )
}
