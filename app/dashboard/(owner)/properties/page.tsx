import Link from "next/link"
import { MapPin, Search } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { properties } from "@/lib/properties"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Active:             "default",
  "Pending Approval": "secondary",
  Inactive:           "destructive",
}

export default function PropertiesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">
            Registered villas, hotels, offices, and business centers.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search properties..." className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.type}</TableCell>
                  <TableCell className="text-sm">{p.ownerName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {p.address}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/dashboard/properties/${p.id}`} />}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
