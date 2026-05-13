import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Search, MapPin, Camera, CheckCircle2, XCircle, Clock as ClockIcon } from "lucide-react"

const stats = [
  { label: "Bugun keldi",        value: 18, accent: "text-emerald-600" },
  { label: "Kelmadi",            value: 3,  accent: "text-rose-600"    },
  { label: "Kechikkan",          value: 4,  accent: "text-amber-600"   },
  { label: "Hali kelmagan",      value: 7,  accent: "text-muted-foreground" },
]

type Status = "On Time" | "Late" | "Absent" | "Checked Out"

const records: {
  id: number
  name: string
  role: string
  checkIn: string
  checkOut: string
  location: string
  geofence: boolean
  selfie: boolean
  status: Status
  reason?: string
}[] = [
  { id: 1, name: "Jasur Toshmatov",   role: "Senior",       checkIn: "08:02", checkOut: "—",     location: "Villa Sunrise",       geofence: true,  selfie: true,  status: "On Time" },
  { id: 2, name: "Malika Saidova",    role: "Professional", checkIn: "08:45", checkOut: "—",     location: "GrandBuild Tower B",  geofence: true,  selfie: true,  status: "Late",      reason: "Transport kechikishi" },
  { id: 3, name: "Bobur Karimov",     role: "Junior",       checkIn: "—",     checkOut: "—",     location: "—",                   geofence: false, selfie: false, status: "Absent" },
  { id: 4, name: "Zulfiya Rahimova",  role: "Junior",       checkIn: "07:55", checkOut: "17:10", location: "Sunrise Hotel",       geofence: true,  selfie: true,  status: "Checked Out" },
  { id: 5, name: "Sherzod Aliyev",    role: "Professional", checkIn: "09:25", checkOut: "—",     location: "Office Block B",      geofence: false, selfie: true,  status: "Late",      reason: "Geofence tashqarida" },
  { id: 6, name: "Nodira Yusupova",   role: "Senior",       checkIn: "07:58", checkOut: "—",     location: "Feruza Apartments",   geofence: true,  selfie: true,  status: "On Time" },
  { id: 7, name: "Akmal Xolmatov",    role: "Junior",       checkIn: "—",     checkOut: "—",     location: "—",                   geofence: false, selfie: false, status: "Absent" },
]

const statusVariant: Record<Status, "default" | "secondary" | "destructive" | "outline"> = {
  "On Time":     "default",
  "Late":        "secondary",
  "Absent":      "destructive",
  "Checked Out": "outline",
}

export default function AttendancePage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">Workerlar keldi-ketdi nazorati, GPS va selfi tasdiqlash.</p>
        </div>
        <Button variant="outline">
          <ClockIcon className="mr-2 size-4" />
          Bugungi sana
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${s.accent}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Worker ismi bo'yicha qidirish..." className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Lokatsiya</TableHead>
                <TableHead className="text-center">Geofence</TableHead>
                <TableHead className="text-center">Selfi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback>{r.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.name}</span>
                        <span className="text-xs text-muted-foreground">{r.role}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{r.checkIn}</TableCell>
                  <TableCell className="font-mono text-sm">{r.checkOut}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {r.location}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {r.geofence ? (
                      <CheckCircle2 className="mx-auto size-4 text-emerald-600" />
                    ) : (
                      <XCircle className="mx-auto size-4 text-rose-600" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.selfie ? (
                      <Camera className="mx-auto size-4 text-emerald-600" />
                    ) : (
                      <XCircle className="mx-auto size-4 text-muted-foreground/50" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Badge variant={statusVariant[r.status]} className="w-fit">{r.status}</Badge>
                      {r.reason && (
                        <span className="text-xs text-muted-foreground">{r.reason}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Ko'rish</Button>
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
