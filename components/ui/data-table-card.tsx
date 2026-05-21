import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Search, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

export type DataTableColumn = {
  label: string
  className?: string
}

type DataTableCardProps<T> = {
  title: string
  count: number
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  columns: DataTableColumn[]
  data: T[]
  renderRow: (item: T, index: number) => React.ReactNode
  action?: React.ReactNode
}

export function DataTableCard<T>({
  title,
  count,
  searchPlaceholder = "Qidirish...",
  searchValue,
  onSearchChange,
  columns,
  data,
  renderRow,
  action,
}: DataTableCardProps<T>) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{count} ta natija topildi</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                className="h-9 w-full pl-9 sm:w-64"
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange?.(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="size-4" />
              <span className="hidden sm:inline">Filtr</span>
            </Button>
            {action}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.label}
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
                    col.className,
                  )}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => renderRow(item, index))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
