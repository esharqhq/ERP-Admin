import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Search, FileText, FileImage, File, Download } from "lucide-react"
import { type LucideIcon } from "lucide-react"

const documents: {
  id: number
  name: string
  type: "ID" | "Contract" | "Report" | "Other"
  worker: string
  status: string
  date: string
  icon: LucideIcon
}[] = [
  { id: 1, name: "Jasur_Toshmatov_WorkContract.pdf", type: "Contract", worker: "Jasur T.",   status: "Signed",   date: "Jan 15, 2026", icon: FileText  },
  { id: 2, name: "Malika_Saidova_ID.pdf",             type: "ID",       worker: "Malika S.",  status: "Verified", date: "Feb 10, 2026", icon: File      },
  { id: 3, name: "Sardor_X_PerformanceReport.pdf",    type: "Report",   worker: "Sardor X.",  status: "Pending",  date: "Apr 30, 2026", icon: FileText  },
  { id: 4, name: "Office_B_Inspection.pdf",           type: "Report",   worker: "Admin",      status: "Verified", date: "Apr 30, 2026", icon: FileText  },
  { id: 5, name: "Villa_Sunrise_Photos.zip",          type: "Other",    worker: "Akbar M.",   status: "Pending",  date: "May 1, 2026",  icon: FileImage },
  { id: 6, name: "Dilshod_I_Contract.pdf",            type: "Contract", worker: "Dilshod I.", status: "Signed",   date: "Mar 5, 2026",  icon: FileText  },
]

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Verified: "default",
  Signed:   "default",
  Pending:  "secondary",
  Expired:  "destructive",
}

const typeGroups = {
  ids:       (d: typeof documents[0]) => d.type === "ID",
  contracts: (d: typeof documents[0]) => d.type === "Contract",
  reports:   (d: typeof documents[0]) => d.type === "Report",
}

function DocGrid({ docs }: { docs: typeof documents }) {
  if (docs.length === 0) {
    return <p className="text-sm text-muted-foreground mt-4">Hujjatlar topilmadi.</p>
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
      {docs.map((doc) => (
        <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <doc.icon className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.name}</p>
              <p className="text-xs text-muted-foreground">{doc.worker} · {doc.date}</p>
              <div className="flex items-center justify-between mt-2">
                <Badge variant={statusVariant[doc.status]} className="text-xs">{doc.status}</Badge>
                <Button variant="ghost" size="icon" className="size-6">
                  <Download className="size-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function WorkerDocumentsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Worker Documents</h1>
          <p className="text-muted-foreground">ID cards, work contracts, and reports for workers.</p>
        </div>
        <Button>
          <Upload className="mr-2 size-4" />
          Upload
        </Button>
      </div>

      <Tabs defaultValue="all">
        <div className="flex items-center gap-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="ids">ID Cards</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search documents..." className="pl-8" />
          </div>
        </div>

        <TabsContent value="all">
          <DocGrid docs={documents} />
        </TabsContent>
        <TabsContent value="ids">
          <DocGrid docs={documents.filter(typeGroups.ids)} />
        </TabsContent>
        <TabsContent value="contracts">
          <DocGrid docs={documents.filter(typeGroups.contracts)} />
        </TabsContent>
        <TabsContent value="reports">
          <DocGrid docs={documents.filter(typeGroups.reports)} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
