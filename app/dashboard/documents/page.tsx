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
  type: string
  owner: string
  status: string
  date: string
  icon: LucideIcon
}[] = [
  { id: 1, name: "Jasur_Toshmatov_ID.pdf",   type: "ID Card",  owner: "Jasur T.",   status: "Verified", date: "Apr 10, 2026", icon: FileText  },
  { id: 2, name: "Sunrise_LLC_Contract.pdf",  type: "Contract", owner: "Sunrise LLC",status: "Signed",   date: "Mar 22, 2026", icon: FileText  },
  { id: 3, name: "Villa_Sunrise_Photos.zip",  type: "Property", owner: "Akbar M.",   status: "Pending",  date: "May 1, 2026",  icon: FileImage },
  { id: 4, name: "GrandBuild_License.pdf",    type: "License",  owner: "GrandBuild", status: "Verified", date: "Feb 14, 2026", icon: FileText  },
  { id: 5, name: "Malika_Saidova_KYC.pdf",    type: "KYC",      owner: "Malika S.",  status: "Expired",  date: "Jan 5, 2026",  icon: File      },
  { id: 6, name: "Office_B_Inspection.pdf",   type: "Report",   owner: "Admin",      status: "Verified", date: "Apr 30, 2026", icon: FileText  },
]

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Verified: "default",
  Signed:   "default",
  Pending:  "secondary",
  Expired:  "destructive",
}

export default function DocumentsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">KYC files, contracts, and reports.</p>
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
            <TabsTrigger value="kyc">KYC</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search documents..." className="pl-8" />
          </div>
        </div>

        <TabsContent value="all" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <doc.icon className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.owner} · {doc.date}</p>
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
        </TabsContent>

        <TabsContent value="kyc">
          <p className="text-muted-foreground text-sm mt-4">KYC documents filtered view.</p>
        </TabsContent>
        <TabsContent value="contracts">
          <p className="text-muted-foreground text-sm mt-4">Contracts filtered view.</p>
        </TabsContent>
        <TabsContent value="reports">
          <p className="text-muted-foreground text-sm mt-4">Reports filtered view.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
