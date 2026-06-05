"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Clock, MapPin } from "lucide-react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import { useDroppable } from "@dnd-kit/core"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

type TaskStatus = "To Do" | "In Progress" | "Review" | "Done" | "Rejected"

type Task = {
  id: string
  title: string
  status: TaskStatus
  priority: "High" | "Medium" | "Low"
  property: string
  deadline: string
}

const COLUMNS: { status: TaskStatus; color: string; dot: string }[] = [
  { status: "To Do",       color: "text-slate-500",  dot: "bg-slate-400"  },
  { status: "In Progress", color: "text-blue-500",   dot: "bg-blue-500"   },
  { status: "Review",      color: "text-yellow-500", dot: "bg-yellow-500" },
  { status: "Done",        color: "text-green-500",  dot: "bg-green-500"  },
  { status: "Rejected",    color: "text-red-500",    dot: "bg-red-500"    },
]

const INITIAL_TASKS: Task[] = [
  { id: "T-001", title: "HVAC Repair",       status: "In Progress", priority: "High",   property: "Sunrise Villa",   deadline: "Today 14:00" },
  { id: "T-002", title: "Deep Cleaning",     status: "To Do",       priority: "Medium", property: "Hotel Grand 3F",  deadline: "Tomorrow"    },
  { id: "T-003", title: "Security Audit",    status: "Review",      priority: "High",   property: "Empire Business Center", deadline: "May 7"       },
  { id: "T-004", title: "Plumbing Fix",      status: "Done",        priority: "Low",    property: "Office Block B",  deadline: "Completed"   },
  { id: "T-005", title: "Window Replace",    status: "Rejected",    priority: "Medium", property: "Sunrise Villa",   deadline: "—"           },
  { id: "T-006", title: "Electrical Check",  status: "To Do",       priority: "High",   property: "Residence North", deadline: "May 6"       },
  { id: "T-007", title: "Paint Interior",    status: "In Progress", priority: "Low",    property: "Office Block A",  deadline: "May 8"       },
]

const priorityVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  High:   "destructive",
  Medium: "secondary",
  Low:    "outline",
}

function TaskCard({ task, isDragging = false }: { task: Task; isDragging?: boolean }) {
  return (
    <Card className={`cursor-grab active:cursor-grabbing transition-all ${isDragging ? "shadow-xl rotate-1 opacity-90" : "hover:shadow-md"}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-medium leading-snug">{task.title}</p>
          <Badge variant={priorityVariant[task.priority]} className="text-[10px] shrink-0">
            {task.priority}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MapPin className="size-3 shrink-0" /> {task.property}
        </p>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Clock className="size-3 shrink-0" /> {task.deadline}
        </p>
      </CardContent>
    </Card>
  )
}

function DraggableCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0 : 1 }
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard task={task} />
    </div>
  )
}

function DroppableColumn({
  status,
  label,
  color,
  dot,
  tasks,
  isOver,
  emptyColumnText,
}: {
  status: TaskStatus
  label: string
  color: string
  dot: string
  tasks: Task[]
  isOver: boolean
  emptyColumnText: string
}) {
  const { setNodeRef } = useDroppable({ id: status })
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className={`size-2 rounded-full shrink-0 ${dot}`} />
        <h3 className={`text-sm font-semibold flex-1 truncate ${color}`}>{label}</h3>
        <Badge variant="outline" className="text-xs shrink-0">{tasks.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-24 rounded-lg p-1.5 transition-colors ${isOver ? "bg-muted/60 ring-1 ring-border" : "bg-transparent"}`}
      >
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-border/50">
            <p className="text-[11px] text-muted-foreground/50">{emptyColumnText}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TasksPage() {
  const t = useTranslations("tasks")
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const statusLabels: Record<TaskStatus, string> = {
    "To Do": t("statuses.todo"),
    "In Progress": t("statuses.inProgress"),
    "Review": t("statuses.review"),
    "Done": t("statuses.done"),
    "Rejected": t("statuses.rejected"),
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((task) => task.id === event.active.id)
    setActiveTask(task ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over?.id ? String(event.over.id) : null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    setOverId(null)
    if (!over) return
    const newStatus = String(over.id) as TaskStatus
    if (!COLUMNS.find((c) => c.status === newStatus)) return
    setTasks((prev) =>
      prev.map((task) => (task.id === active.id ? { ...task, status: newStatus } : task))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          {t("newTask")}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input placeholder={t("searchPlaceholder")} className="pl-8" />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          {COLUMNS.map((col) => (
            <DroppableColumn
              key={col.status}
              status={col.status}
              label={statusLabels[col.status]}
              color={col.color}
              dot={col.dot}
              tasks={tasks.filter((task) => task.status === col.status)}
              isOver={overId === col.status}
              emptyColumnText={t("emptyColumn")}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
