import Link from "next/link"
import { ArrowLeft, Pencil, MessageSquare, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ActionBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href="/dashboard/owners" />}
        className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Owners ro'yxatiga qaytish
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <MessageSquare className="size-4" />
          Xabar yuborish
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="size-4" />
          Tahrirlash
        </Button>
        <Button variant="ghost" size="icon-sm">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Qo'shimcha</span>
        </Button>
      </div>
    </div>
  )
}
