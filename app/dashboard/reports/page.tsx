import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, BarChart3, TrendingUp, Users, Wallet } from "lucide-react"
import { type LucideIcon } from "lucide-react"

const reportCards: { title: string; description: string; icon: LucideIcon; color: string }[] = [
  { title: "Worker Performance", description: "KPI scores and task completion rates", icon: Users,     color: "text-blue-500"   },
  { title: "Revenue Report",     description: "Monthly and weekly income breakdown",  icon: Wallet,    color: "text-green-500"  },
  { title: "Task Analytics",     description: "Completion, rejection, SLA stats",     icon: BarChart3, color: "text-orange-500" },
  { title: "Growth Trend",       description: "Owner and worker acquisition trend",   icon: TrendingUp,color: "text-purple-500" },
]

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Analytics, insights, and PDF exports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="this-month">
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 size-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reportCards.map((r) => (
          <Card key={r.title} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <r.icon className={`size-5 ${r.color} mb-1`} />
              <CardTitle className="text-sm">{r.title}</CardTitle>
              <CardDescription className="text-xs">{r.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" size="sm" className="w-full text-xs">
                View Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Task Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] flex items-center justify-center rounded-md border border-dashed">
                  <span className="text-sm text-muted-foreground">Bar chart — monthly tasks</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] flex items-center justify-center rounded-md border border-dashed">
                  <span className="text-sm text-muted-foreground">Line chart — revenue</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workers">
          <p className="text-muted-foreground text-sm mt-4">Worker-specific analytics.</p>
        </TabsContent>
        <TabsContent value="finance">
          <p className="text-muted-foreground text-sm mt-4">Finance-specific analytics.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
