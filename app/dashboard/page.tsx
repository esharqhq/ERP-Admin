import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, ClipboardList, Wallet, Clock, ShieldCheck } from "lucide-react"

const kpiCards = [
  { title: "Total Workers",         value: "248",    change: "+12 this month",    icon: Users,         color: "text-blue-500"    },
  { title: "Total Owners",          value: "134",    change: "+5 this month",     icon: Building2,     color: "text-green-500"   },
  { title: "Active Tasks",          value: "57",     change: "12 high priority",  icon: ClipboardList, color: "text-orange-500"  },
  { title: "Today's Revenue",       value: "$8,420", change: "+18% vs yesterday", icon: Wallet,        color: "text-emerald-500" },
  { title: "Pending Verifications", value: "23",     change: "Needs review",      icon: Clock,         color: "text-yellow-500"  },
  { title: "Properties",            value: "312",    change: "8 pending approval",icon: ShieldCheck,   color: "text-purple-500"  },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Admin. Here&apos;s what&apos;s happening.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`size-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Task & Revenue Trend</CardTitle>
            <CardDescription>Weekly overview — last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] flex items-center justify-center rounded-md border border-dashed">
              <span className="text-sm text-muted-foreground">Line chart — Recharts / ApexCharts</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Task Status</CardTitle>
            <CardDescription>Done / In Progress / Rejected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] flex items-center justify-center rounded-md border border-dashed">
              <span className="text-sm text-muted-foreground">Donut chart</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live Worker Map</CardTitle>
            <CardDescription>Active workers right now</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center rounded-md border border-dashed">
              <span className="text-sm text-muted-foreground">Google Maps / Mapbox embed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Worker Performance</CardTitle>
            <CardDescription>Top 5 workers this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center rounded-md border border-dashed">
              <span className="text-sm text-muted-foreground">Bar chart</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
