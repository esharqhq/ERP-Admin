import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin, Navigation } from "lucide-react"

const activeWorkers = [
  { id: 1, name: "Jasur T.",   location: "Yunusobod, Tashkent", task: "HVAC Repair",  status: "On Task"   },
  { id: 2, name: "Malika S.",  location: "Mirzo Ulugbek, TSH",  task: "Transit",       status: "Moving"    },
  { id: 3, name: "Otabek N.",  location: "Chilanzar, Tashkent", task: "Electrical",    status: "On Task"   },
  { id: 4, name: "Zulfiya R.", location: "Sergeli, Tashkent",   task: "—",             status: "Available" },
]

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  "On Task":   "default",
  "Moving":    "secondary",
  "Available": "outline",
}

export default function MapPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Map</h1>
        <p className="text-muted-foreground">Real-time worker locations and status.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="h-[520px] rounded-lg flex flex-col items-center justify-center gap-3 bg-muted/30 border border-dashed">
              <Navigation className="size-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Google Maps / Mapbox integration</p>
              <p className="text-xs text-muted-foreground">Worker pins update via Supabase Realtime</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Workers ({activeWorkers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[460px]">
              <div className="flex flex-col">
                {activeWorkers.map((w, i) => (
                  <div key={w.id}>
                    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                      <Avatar className="size-9 mt-0.5">
                        <AvatarFallback>{w.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{w.name}</p>
                          <Badge variant={statusVariant[w.status]} className="text-xs">{w.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="size-3 shrink-0" /> {w.location}
                        </p>
                        {w.task !== "—" && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">Task: {w.task}</p>
                        )}
                      </div>
                    </div>
                    {i < activeWorkers.length - 1 && <div className="mx-4 border-b" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
