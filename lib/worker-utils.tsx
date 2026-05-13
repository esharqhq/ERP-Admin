// lib/worker-utils.tsx
import { CheckCircle2, XCircle, Clock, ClipboardList, CreditCard, FileText, StickyNote } from "lucide-react"
import type { WorkerActivity } from "@/lib/workers"

export const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Verified: "default",
  Pending:  "secondary",
  Expired:  "outline",
  Rejected: "destructive",
}

export const roleColors: Record<string, string> = {
  Senior:       "text-blue-600 dark:text-blue-400",
  Professional: "text-emerald-600 dark:text-emerald-400",
  Junior:       "text-amber-600 dark:text-amber-400",
}

export const assignmentStatusStyle: Record<string, { dot: string; text: string; label: string; icon: React.ReactNode }> = {
  Active:   { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", label: "Faol",      icon: <CheckCircle2 className="size-3.5" /> },
  Upcoming: { dot: "bg-blue-500",    text: "text-blue-700 dark:text-blue-400",       label: "Rejalangan", icon: <Clock className="size-3.5" /> },
  Done:     { dot: "bg-zinc-400",    text: "text-muted-foreground",                  label: "Bajarilgan", icon: <XCircle className="size-3.5" /> },
}

export const activityIcon: Record<WorkerActivity["kind"], { icon: React.ReactNode; ring: string; bg: string; text: string }> = {
  task:     { icon: <ClipboardList className="size-3.5" />, ring: "ring-cyan-500/25",    bg: "bg-cyan-500/10",    text: "text-cyan-700 dark:text-cyan-400" },
  payment:  { icon: <CreditCard className="size-3.5" />,    ring: "ring-emerald-500/25", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400" },
  document: { icon: <FileText className="size-3.5" />,      ring: "ring-violet-500/25",  bg: "bg-violet-500/10",  text: "text-violet-700 dark:text-violet-400" },
  note:     { icon: <StickyNote className="size-3.5" />,    ring: "ring-amber-500/25",   bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400" },
}

export const STAT_TONES: Record<string, { ring: string; bg: string; text: string }> = {
  blue:    { ring: "ring-blue-500/20",    bg: "bg-blue-500/10",    text: "text-blue-600 dark:text-blue-400" },
  emerald: { ring: "ring-emerald-500/20", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  violet:  { ring: "ring-violet-500/20",  bg: "bg-violet-500/10",  text: "text-violet-600 dark:text-violet-400" },
  amber:   { ring: "ring-amber-500/20",   bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400" },
}

export function formatDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const d = new Date(iso)
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" })
}
