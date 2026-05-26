"use client";

import Link from "next/link"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {TableCell, TableRow} from "@/components/ui/table"
import {DataTableCard} from "@/components/ui/data-table-card"
import {MapPin} from "lucide-react"
import {properties} from "@/lib/properties"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    Active: "default",
    "Pending Approval": "secondary",
    Inactive: "destructive",
}

const columns = [
    {label: "Mulk nomi"},
    {label: "Tur"},
    {label: "Mulkdor"},
    {label: "Manzil"},
    {label: "Holat"},
    {label: "Amallar", className: "text-right"},
]

export default function PropertiesPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">Properties</h1>
                <p className="text-sm text-muted-foreground">{`Ro'yxatdagi villa, mehmonxona, ofis va biznes-markazlar.`}</p>
            </div>

            <DataTableCard
                title="Mulklar ro'yxati"
                count={properties.length}
                searchPlaceholder="Mulk qidirish..."
                columns={columns}
                data={properties}
                renderRow={(p) => (
                    <TableRow key={p.id} className="group/row transition-colors duration-150 hover:bg-accent/40">
                        <TableCell className="py-3 font-medium">{p.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.type}</TableCell>
                        <TableCell className="text-sm">{p.ownerName}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="size-3.5 shrink-0"/>
                                {p.address}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="sm" nativeButton={false}
                                    render={<Link href={`/dashboard/properties/${p.id}`}/>}>
                                {`Ko'rish`}
                            </Button>
                        </TableCell>
                    </TableRow>
                )}
            />
        </div>
    )
}
