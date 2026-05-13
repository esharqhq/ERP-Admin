import {notFound} from "next/navigation"
import {getPropertyById} from "@/lib/properties"
import {ActionBar} from "@/components/properties/action-bar"
import {PropertyHero} from "@/components/properties/property-hero"
import {PropertyInfo} from "@/components/properties/property-info"
import {PropertyOwnerCard} from "@/components/properties/property-owner-card"
import {PropertyStatusCard} from "@/components/properties/property-status-card"

export default async function PropertyDetailPage({
                                                     params,
                                                 }: {
    params: Promise<{ id: string }>
}) {
    const {id} = await params
    const property = getPropertyById(Number(id))
    if (!property) notFound()

    return (
        <div className="flex flex-col gap-6">
            <ActionBar/>
            <PropertyHero property={property}/>
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <PropertyInfo property={property}/>
                </div>
                <div className="flex flex-col gap-6">
                    <PropertyOwnerCard property={property}/>
                    <PropertyStatusCard property={property}/>
                </div>
            </div>
        </div>
    )
}


