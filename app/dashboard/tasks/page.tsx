import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Search, Clock, MapPin } from "lucide-react"

type TaskStatus = "To Do" | "In Progress" | "Review" | "Done" | "Rejected"

const columns: { status: TaskStatus; color: string }[] = [
  { status: "To Do",       color: "text-slate-500"  },
  { status: "In Progress", color: "text-blue-500"   },
  { status: "Review",      color: "text-yellow-500" },
  { status: "Done",        color: "text-green-500"  },
  { status: "Rejected",    color: "text-red-500"    },
]

const tasks: {
  id: string
  title: string
  status: TaskStatus
  priority: "High" | "Medium" | "Low"
  property: string
  deadline: string
}[] = [
  { id: "T-001", title: "HVAC Repair",       status: "In Progress", priority: "High",   property: "Villa Sunrise",   deadline: "Today 14:00" },
  { id: "T-002", title: "Deep Cleaning",     status: "To Do",       priority: "Medium", property: "Hotel Grand 3F",  deadline: "Tomorrow"    },
  { id: "T-003", title: "Security Audit",    status: "Review",      priority: "High",   property: "Amir Biz Center", deadline: "May 7"       },
  { id: "T-004", title: "Plumbing Fix",      status: "Done",        priority: "Low",    property: "Office Block B",  deadline: "Completed"   },
  { id: "T-005", title: "Window Replace",    status: "Rejected",    priority: "Medium", property: "Villa Sunrise",   deadline: "—"           },
  { id: "T-006", title: "Electrical Check",  status: "To Do",       priority: "High",   property: "Residence North", deadline: "May 6"       },
  { id: "T-007", title: "Paint Interior",    status: "In Progress", priority: "Low",    property: "Office Block A",  deadline: "May 8"       },
]

const priorityVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  High:   "destructive",
  Medium: "secondary",
  Low:    "outline",
}

export default function TasksPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage and track all service tasks.</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          New Task
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input placeholder="Search tasks..." className="pl-8" />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status)
          return (
            <div key={col.status} className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className={`text-sm font-semibold ${col.color}`}>{col.status}</h3>
                <Badge variant="outline" className="text-xs">{colTasks.length}</Badge>
              </div>
              <ScrollArea className="h-[480px]">
                <div className="flex flex-col gap-2 pr-1">
                  {colTasks.map((task) => (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-xs font-medium leading-snug">{task.title}</p>
                          <Badge variant={priorityVariant[task.priority]} className="text-[10px] shrink-0">
                            {task.priority}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3" /> {task.property}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" /> {task.deadline}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )
        })}
      </div>
    </div>
  )
}
