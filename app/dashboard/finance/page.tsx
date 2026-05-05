import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Download, TrendingUp, TrendingDown, Wallet, ArrowUpRight } from "lucide-react"

const stats = [
  { title: "Total Revenue",  value: "$124,500", change: "+12.5%",     up: true  as boolean | null, icon: Wallet      },
  { title: "This Month",     value: "$18,240",  change: "+8.3%",      up: true  as boolean | null, icon: TrendingUp  },
  { title: "Pending Payout", value: "$4,320",   change: "12 workers", up: null  as boolean | null, icon: ArrowUpRight},
  { title: "Expenses",       value: "$6,810",   change: "-3.2%",      up: false as boolean | null, icon: TrendingDown},
]

const transactions = [
  { id: "TXN-001", owner: "Sunrise LLC",        amount: "$1,200", type: "Payment", status: "Completed", date: "May 5, 2026" },
  { id: "TXN-002", owner: "Akbar Mirzayev",     amount: "$450",   type: "Payment", status: "Completed", date: "May 4, 2026" },
  { id: "TXN-003", owner: "GrandBuild Corp",    amount: "$3,800", type: "Invoice", status: "Pending",   date: "May 4, 2026" },
  { id: "TXN-004", owner: "Worker Payout",      amount: "$2,100", type: "Payout",  status: "Completed", date: "May 3, 2026" },
  { id: "TXN-005", owner: "Feruza Abdullayeva", amount: "$600",   type: "Payment", status: "Failed",    date: "May 3, 2026" },
]

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Completed: "default",
  Pending:   "secondary",
  Failed:    "destructive",
}

export default function FinancePage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
          <p className="text-muted-foreground">Payments, invoices, and payouts.</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 size-4" />
          Export
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
              <s.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className={`text-xs mt-1 ${s.up === true ? "text-green-500" : s.up === false ? "text-red-500" : "text-muted-foreground"}`}>
                {s.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>All payment and payout activity</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.id}</TableCell>
                  <TableCell className="font-medium">{t.owner}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{t.type}</TableCell>
                  <TableCell className="font-semibold">{t.amount}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[t.status]}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{t.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
