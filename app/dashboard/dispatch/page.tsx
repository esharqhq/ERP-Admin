import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, MapPin, Clock } from "lucide-react"

const pendingTasks = [
  { id: "T-001", title: "HVAC Repair",        property: "Villa Sunrise, #12",  priority: "High",   time: "2h" },
  { id: "T-002", title: "Plumbing Fix",        property: "Amir Business Center",priority: "Medium", time: "4h" },
  { id: "T-003", title: "Electrical Check",    property: "Hotel Grand, floor 3",priority: "Low",    time: "1h" },
  { id: "T-004", title: "Window Replacement",  property: "Office Block B",      priority: "High",   time: "3h" },
]

const availableWorkers = [
  { id: 1, name: "Jasur T.",   role: "Senior",       status: "Available" },
  { id: 2, name: "Malika S.",  role: "Professional", status: "Available" },
  { id: 3, name: "Bobur K.",   role: "Junior",       status: "On Task"   },
  { id: 4, name: "Zulfiya R.", role: "Junior",       status: "Available" },
]

const priorityVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  High:   "destructive",
  Medium: "secondary",
  Low:    "outline",
}

export default function DispatchPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dispatching</h1>
          <p className="text-muted-foreground">Assign tasks to available workers.</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          New Task
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
            <CardDescription>Assign to a worker</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-3">
              <div className="flex flex-col gap-3">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border p-3 space-y-2 hover:bg-muted/50 cursor-grab transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{task.title}</span>
                      <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" /> {task.property}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {task.time}
                      </span>
                    </div>
                    <Button size="sm" variant="secondary" className="h-7 text-xs w-full">
                      Assign
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Workers</CardTitle>
            <CardDescription>Current availability status</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-3">
              <div className="flex flex-col gap-3">
                {availableWorkers.map((worker) => (
                  <div key={worker.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback>{worker.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{worker.name}</p>
                        <p className="text-xs text-muted-foreground">{worker.role}</p>
                      </div>
                    </div>
                    <Badge variant={worker.status === "Available" ? "default" : "secondary"}>
                      {worker.status}
                    </Badge>
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
