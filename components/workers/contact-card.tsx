// components/workers/contact-card.tsx
import { Mail, Phone, MapPin, CalendarDays } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { InfoRow } from "@/components/owners/info-row"
import { formatDate } from "@/lib/worker-utils"
import type { Worker } from "@/lib/workers"

export function ContactCard({ worker }: { worker: Worker }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">{"Aloqa ma'lumotlari"}</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        <InfoRow icon={<Mail className="size-3.5" />}        label="Email"              value={worker.email} />
        <InfoRow icon={<Phone className="size-3.5" />}       label="Telefon"            value={worker.phone} />
        <InfoRow icon={<MapPin className="size-3.5" />}      label="Manzil"             value={`${worker.address}, ${worker.city}`} />
        <Separator />
        <InfoRow icon={<CalendarDays className="size-3.5" />} label="Ro'yxatga olingan" value={formatDate(worker.joinedAt)} />
      </CardContent>
    </Card>
  )
}
