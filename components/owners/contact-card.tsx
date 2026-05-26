import { Mail, Phone, MapPin, Hash, CalendarDays, User, Languages } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { InfoRow } from "./info-row"
import { formatDate, languageLabel } from "@/lib/owner-utils"
import type { Owner } from "@/lib/owners"

export function ContactCard({ owner }: { owner: Owner }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="font-heading text-base font-semibold tracking-tight">{"Aloqa ma'lumotlari"}</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        <InfoRow icon={<Mail className="size-3.5" />} label="Email" value={owner.email} />
        <InfoRow icon={<Phone className="size-3.5" />} label="Telefon" value={owner.phone} />
        <InfoRow
          icon={<MapPin className="size-3.5" />}
          label="Manzil"
          value={`${owner.address}, ${owner.city}, ${owner.country}`}
        />
        <Separator />
        <InfoRow icon={<Hash className="size-3.5" />} label="STIR" value={owner.taxId} mono />
        <InfoRow icon={<CalendarDays className="size-3.5" />} label="Ro'yxatga olingan" value={formatDate(owner.joinedAt)} />
        {owner.contactPerson && (
          <InfoRow icon={<User className="size-3.5" />} label="Kontakt shaxs" value={owner.contactPerson} />
        )}
        <InfoRow icon={<Languages className="size-3.5" />} label="Til" value={languageLabel[owner.language]} />
      </CardContent>
    </Card>
  )
}
