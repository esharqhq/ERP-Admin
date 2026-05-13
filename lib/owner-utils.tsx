import { ShieldCheck, ShieldAlert, AlertTriangle, FileText, CreditCard, Receipt, CheckCircle2, XCircle, Clock, ClipboardList, StickyNote } from "lucide-react"
import type { Owner, OwnerDocument, OwnerActivity } from "@/lib/owners"

export const statusVariant: Record<Owner["status"], "default" | "secondary" | "destructive"> = {
  Verified: "default",
  Pending: "secondary",
  Rejected: "destructive",
}

export const riskTone: Record<Owner["risk"], { ring: string; bg: string; text: string; icon: React.ReactNode; label: string }> = {
  Low:    { ring: "ring-emerald-500/25", bg: "bg-emerald-500/10",  text: "text-emerald-700 dark:text-emerald-400", icon: <ShieldCheck className="size-4" />, label: "Past xavf" },
  Medium: { ring: "ring-amber-500/25",   bg: "bg-amber-500/10",    text: "text-amber-700 dark:text-amber-400",     icon: <ShieldAlert className="size-4" />, label: "O'rta xavf" },
  High:   { ring: "ring-rose-500/30",    bg: "bg-rose-500/10",     text: "text-rose-700 dark:text-rose-400",       icon: <AlertTriangle className="size-4" />, label: "Yuqori xavf" },
}

export const propStatusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  Active: "default",
  "Pending Approval": "secondary",
  Inactive: "destructive",
}

export const docStatusStyle: Record<OwnerDocument["status"], { dot: string; text: string; label: string; icon: React.ReactNode }> = {
  Valid:    { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", label: "Amal qiladi", icon: <CheckCircle2 className="size-3.5" /> },
  Expiring: { dot: "bg-amber-500",   text: "text-amber-700 dark:text-amber-400",     label: "Muddati tugayapti", icon: <Clock className="size-3.5" /> },
  Expired:  { dot: "bg-rose-500",    text: "text-rose-700 dark:text-rose-400",       label: "Muddati tugagan", icon: <XCircle className="size-3.5" /> },
  Missing:  { dot: "bg-zinc-400",    text: "text-muted-foreground",                  label: "Yuklanmagan", icon: <XCircle className="size-3.5" /> },
}

export const activityIcon: Record<OwnerActivity["kind"], { icon: React.ReactNode; ring: string; bg: string; text: string }> = {
  contract: { icon: <FileText className="size-3.5" />,      ring: "ring-blue-500/25",    bg: "bg-blue-500/10",    text: "text-blue-700 dark:text-blue-400" },
  payment:  { icon: <CreditCard className="size-3.5" />,    ring: "ring-emerald-500/25", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400" },
  document: { icon: <Receipt className="size-3.5" />,       ring: "ring-violet-500/25",  bg: "bg-violet-500/10",  text: "text-violet-700 dark:text-violet-400" },
  task:     { icon: <ClipboardList className="size-3.5" />, ring: "ring-cyan-500/25",    bg: "bg-cyan-500/10",    text: "text-cyan-700 dark:text-cyan-400" },
  note:     { icon: <StickyNote className="size-3.5" />,    ring: "ring-amber-500/25",   bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400" },
}

export const languageLabel: Record<Owner["language"], string> = {
  uz: "O'zbek",
  ru: "Русский",
  en: "English",
}

export function formatDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const d = new Date(iso)
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" })
}

export const STAT_TONES: Record<string, { ring: string; bg: string; text: string }> = {
  blue:    { ring: "ring-blue-500/20",    bg: "bg-blue-500/10",    text: "text-blue-600 dark:text-blue-400" },
  emerald: { ring: "ring-emerald-500/20", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  violet:  { ring: "ring-violet-500/20",  bg: "bg-violet-500/10",  text: "text-violet-600 dark:text-violet-400" },
  amber:   { ring: "ring-amber-500/20",   bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400" },
}
