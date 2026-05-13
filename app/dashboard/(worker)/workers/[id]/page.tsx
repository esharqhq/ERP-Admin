// app/dashboard/(worker)/workers/[id]/page.tsx
import { notFound } from "next/navigation"
import { ClipboardList, Star, CheckCircle2, BadgeCheck } from "lucide-react"
import { getWorkerById } from "@/lib/workers"
import { ActionBar } from "@/components/workers/action-bar"
import { HeroCard } from "@/components/workers/hero-card"
import { StatCard } from "@/components/workers/stat-card"
import { AssignmentsCard } from "@/components/workers/assignments-card"
import { ContactCard } from "@/components/workers/contact-card"
import { ActivityTimeline } from "@/components/workers/activity-timeline"

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const worker = getWorkerById(Number(id))
  if (!worker) notFound()

  return (
    <div className="flex flex-col gap-6">
      <ActionBar />
      <HeroCard worker={worker} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Faol ishlar"
          value={worker.tasks}
          hint={worker.tasks > 0 ? "Hozirda bajarilmoqda" : "Hozircha yo'q"}
          icon={<ClipboardList className="size-4" />}
          tone="blue"
        />
        <StatCard
          label="Reyting"
          value={worker.rating.toFixed(1)}
          hint="Mijozlar bahosi"
          icon={<Star className="size-4" />}
          tone="amber"
        />
        <StatCard
          label="Bajarilgan"
          value={worker.completedTasks}
          hint="Jami vazifalar"
          icon={<CheckCircle2 className="size-4" />}
          tone="emerald"
        />
        <StatCard
          label="Holat"
          value={worker.status}
          hint={worker.status === "Verified" ? "Faol xodim" : "Tekshirilmoqda"}
          icon={<BadgeCheck className="size-4" />}
          tone={worker.status === "Verified" ? "emerald" : "amber"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <AssignmentsCard worker={worker} />
          <ActivityTimeline worker={worker} />
        </div>
        <div className="flex flex-col gap-6">
          <ContactCard worker={worker} />
        </div>
      </div>
    </div>
  )
}
