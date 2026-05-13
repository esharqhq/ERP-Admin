import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Download, Search} from "lucide-react";

const logs = [
    {
        id: "LOG-001",
        user: "Super Admin",
        action: "User Created",
        target: "Jasur Toshmatov",
        ip: "192.168.1.1",
        time: "2026-05-05 09:14",
        type: "Create",
    },
    {
        id: "LOG-002",
        user: "Admin",
        action: "Status Changed",
        target: "TXN-003 → Completed",
        ip: "10.0.0.4",
        time: "2026-05-05 09:02",
        type: "Update",
    },
    {
        id: "LOG-003",
        user: "Super Admin",
        action: "User Deleted",
        target: "Sardor Xolmatov",
        ip: "192.168.1.1",
        time: "2026-05-04 17:45",
        type: "Delete",
    },
    {
        id: "LOG-004",
        user: "Admin",
        action: "Document Verified",
        target: "GrandBuild_License",
        ip: "10.0.0.4",
        time: "2026-05-04 14:30",
        type: "Update",
    },
    {
        id: "LOG-005",
        user: "Finance",
        action: "Payout Processed",
        target: "Worker Payout $2.1k",
        ip: "10.0.0.7",
        time: "2026-05-03 11:20",
        type: "Payment",
    },
    {
        id: "LOG-006",
        user: "Dispatcher",
        action: "Task Assigned",
        target: "T-004 → Jasur T.",
        ip: "10.0.0.9",
        time: "2026-05-03 10:05",
        type: "Create",
    },
];

const typeVariant: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
> = {
    Create: "default",
    Update: "secondary",
    Delete: "destructive",
    Payment: "outline",
};

export default function AuditPage() {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
                    <p className="text-muted-foreground">
                        Full history of system actions and changes.
                    </p>
                </div>
                <Button variant="outline">
                    <Download className="mr-2 size-4"/>
                    Export CSV
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground"/>
                            <Input placeholder="Search logs..." className="pl-8"/>
                        </div>
                        <Select defaultValue="all">
                            <SelectTrigger className="w-32">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="create">Create</SelectItem>
                                <SelectItem value="update">Update</SelectItem>
                                <SelectItem value="delete">Delete</SelectItem>
                                <SelectItem value="payment">Payment</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>IP</TableHead>
                                <TableHead>Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {log.id}
                                    </TableCell>
                                    <TableCell className="font-medium text-sm">
                                        {log.user}
                                    </TableCell>
                                    <TableCell className="text-sm">{log.action}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                                        {log.target}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={typeVariant[log.type]} className="text-xs">
                                            {log.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {log.ip}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {log.time}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
