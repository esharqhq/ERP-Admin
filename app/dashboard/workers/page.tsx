import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { UserPlus, Search, Filter } from "lucide-react"

const workers = [
  { id: 1, name: "Jasur Toshmatov",   role: "Senior",       status: "Verified",  tasks: 12, rating: 4.8 },
  { id: 2, name: "Dilnoza Yusupova",  role: "Professional", status: "Verified",  tasks: 8,  rating: 4.5 },
  { id: 3, name: "Bobur Karimov",     role: "Junior",       status: "Pending",   tasks: 3,  rating: 3.9 },
  { id: 4, name: "Malika Saidova",    role: "Professional", status: "Verified",  tasks: 10, rating: 4.7 },
  { id: 5, name: "Otabek Nazarov",    role: "Senior",       status: "Expired",   tasks: 0,  rating: 4.2 },
  { id: 6, name: "Zulfiya Rakhimova", role: "Junior",       status: "Rejected",  tasks: 0,  rating: 3.1 },
]

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Verified:  "default",
  Pending:   "secondary",
  Expired:   "outline",
  Rejected:  "destructive",
}

const roleColors: Record<string, string> = {
  Senior:       "text-blue-500",
  Professional: "text-green-500",
  Junior:       "text-orange-500",
}

export default function WorkersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workers</h1>
          <p className="text-muted-foreground">Manage and monitor all workers.</p>
        </div>
        <Button>
          <UserPlus className="mr-2 size-4" />
          Add Worker
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Search workers..." className="pl-8" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Active Tasks</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback>{w.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{w.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${roleColors[w.role]}`}>{w.role}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[w.status]}>{w.status}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{w.tasks}</TableCell>
                  <TableCell className="text-center">{w.rating} ⭐</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
