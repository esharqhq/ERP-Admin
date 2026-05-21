"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye } from "lucide-react";

type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
type TicketPriority = "Low" | "Medium" | "High" | "Critical";
type TicketCategory =
  | "Technical"
  | "Billing"
  | "KYC"
  | "Property"
  | "Worker"
  | "Account"
  | "General";

interface Ticket {
  id: string;
  subject: string;
  category: TicketCategory;
  submittedBy: string;
  submittedByRole: "Owner" | "Worker" | "Admin";
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  description: string;
}

const mockTickets: Ticket[] = [
  {
    id: "TKT-001",
    subject: "Worker ilovasida login ishlamayapti",
    category: "Technical",
    submittedBy: "Jasur Toshmatov",
    submittedByRole: "Worker",
    priority: "High",
    status: "Open",
    createdAt: "2026-05-20T09:15:00Z",
    description:
      "Login qilganda 'Invalid credentials' xatosi chiqyapti, parol to'g'ri kiritilgan.",
  },
  {
    id: "TKT-002",
    subject: "KYC hujjatim noto'g'ri rad etilgan",
    category: "KYC",
    submittedBy: "Sunrise LLC",
    submittedByRole: "Owner",
    priority: "High",
    status: "In Progress",
    createdAt: "2026-05-19T14:30:00Z",
    description:
      "Pasportim amal qiladi, lekin tizim rad etdi. Qayta ko'rib chiqishni so'rayman.",
  },
  {
    id: "TKT-003",
    subject: "Mulk qo'shishda xato chiqmoqda",
    category: "Property",
    submittedBy: "GrandBuild Co.",
    submittedByRole: "Owner",
    priority: "Medium",
    status: "Open",
    createdAt: "2026-05-19T10:00:00Z",
    description:
      "Yangi mulk qo'shganda '500 Internal Server Error' chiqadi. 3 martadan ortiq urinib ko'rdim.",
  },
  {
    id: "TKT-004",
    subject: "Ish haqi hisob-kitobida farq bor",
    category: "Billing",
    submittedBy: "Akbar Mirzayev",
    submittedByRole: "Worker",
    priority: "Medium",
    status: "Resolved",
    createdAt: "2026-05-18T16:45:00Z",
    description: "May oyida 40 soat ishladim, lekin 35 soat ko'rsatilgan.",
  },
  {
    id: "TKT-005",
    subject: "Parolni unutdim, email kelmayapti",
    category: "Account",
    submittedBy: "Malika Saidova",
    submittedByRole: "Owner",
    priority: "Low",
    status: "Resolved",
    createdAt: "2026-05-17T11:20:00Z",
    description: "Parol tiklash havolasi emailga kelmayapti. Spam papkasini ham tekshirdim.",
  },
  {
    id: "TKT-006",
    subject: "Worker hujjatlarini yuklab bo'lmayapti",
    category: "Technical",
    submittedBy: "Feruza Alimova",
    submittedByRole: "Worker",
    priority: "Critical",
    status: "In Progress",
    createdAt: "2026-05-20T07:00:00Z",
    description:
      "PDF hujjatlarni yuklashda 'File too large' deydi, holbuki hajmi 2MB dan kam.",
  },
  {
    id: "TKT-007",
    subject: "Shartnoma muddati tugagan, lekin faol ko'rinmoqda",
    category: "Billing",
    submittedBy: "AlphaGroup LLC",
    submittedByRole: "Owner",
    priority: "High",
    status: "Open",
    createdAt: "2026-05-18T09:30:00Z",
    description:
      "Shartnoma aprel oyida tugagan, lekin tizim hali ham aktiv deb ko'rsatmoqda.",
  },
  {
    id: "TKT-008",
    subject: "Profil rasmi o'zgarmayapti",
    category: "Account",
    submittedBy: "Bobur Rashidov",
    submittedByRole: "Worker",
    priority: "Low",
    status: "Closed",
    createdAt: "2026-05-15T13:00:00Z",
    description: "Yangi rasm yuklaganda eski rasm qolaverayapti.",
  },
  {
    id: "TKT-009",
    subject: "Mulk egasini o'zgartirish imkoni yo'q",
    category: "Property",
    submittedBy: "Zilola Yusupova",
    submittedByRole: "Owner",
    priority: "Medium",
    status: "Open",
    createdAt: "2026-05-20T12:10:00Z",
    description:
      "Mulkni boshqa egaga o'tkazmoqchiman, lekin 'Transfer' tugmasi yo'q.",
  },
  {
    id: "TKT-010",
    subject: "Ishchi lavozimi noto'g'ri ko'rsatilmoqda",
    category: "Worker",
    submittedBy: "Sardor Nazarov",
    submittedByRole: "Worker",
    priority: "Low",
    status: "Closed",
    createdAt: "2026-05-14T08:00:00Z",
    description: "Mening lavozimim 'Santexnik' bo'lishi kerak, lekin 'Elektrik' deb ko'rsatilgan.",
  },
  {
    id: "TKT-011",
    subject: "Dispatch ekranida joylashuv yangilanmayapti",
    category: "Technical",
    submittedBy: "Nodira Karimova",
    submittedByRole: "Admin",
    priority: "Critical",
    status: "In Progress",
    createdAt: "2026-05-20T08:45:00Z",
    description:
      "Xarita real vaqtda ishchilar joylashuvini ko'rsatmayapti, 30 daqiqada bir yangilanadi.",
  },
  {
    id: "TKT-012",
    subject: "Hisobot eksporti ishlamayapti",
    category: "General",
    submittedBy: "Timur Ergashev",
    submittedByRole: "Admin",
    priority: "Medium",
    status: "Open",
    createdAt: "2026-05-19T17:00:00Z",
    description: "Excel formatida hisobot yuklab olmoqchiman, lekin fayl 0 KB bo'lib tushyapti.",
  },
];

type FilterTab = "all" | TicketStatus;

const statusVariant: Record<
  TicketStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Open: "outline",
  "In Progress": "secondary",
  Resolved: "default",
  Closed: "destructive",
};

const statusLabel: Record<TicketStatus, string> = {
  Open: "Ochiq",
  "In Progress": "Jarayonda",
  Resolved: "Hal qilindi",
  Closed: "Yopiq",
};

const priorityVariant: Record<
  TicketPriority,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Low: "outline",
  Medium: "secondary",
  High: "default",
  Critical: "destructive",
};

const priorityLabel: Record<TicketPriority, string> = {
  Low: "Past",
  Medium: "O'rta",
  High: "Yuqori",
  Critical: "Kritik",
};

const categoryLabel: Record<TicketCategory, string> = {
  Technical: "Texnik",
  Billing: "To'lov",
  KYC: "KYC",
  Property: "Mulk",
  Worker: "Ishchi",
  Account: "Akkaunt",
  General: "Umumiy",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function RoleBadge({ role }: { role: Ticket["submittedByRole"] }) {
  const map: Record<Ticket["submittedByRole"], string> = {
    Owner: "Mulkdor",
    Worker: "Ishchi",
    Admin: "Admin",
  };
  return (
    <span className="text-[11px] text-muted-foreground">({map[role]})</span>
  );
}

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Barchasi" },
  { key: "Open", label: "Ochiq" },
  { key: "In Progress", label: "Jarayonda" },
  { key: "Resolved", label: "Hal qilindi" },
  { key: "Closed", label: "Yopiq" },
];

const ALL_CATEGORIES: TicketCategory[] = [
  "Technical",
  "Billing",
  "KYC",
  "Property",
  "Worker",
  "Account",
  "General",
];

export default function SupportTicketsPage() {
  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const filtered = mockTickets.filter((t) => {
    if (tab !== "all" && t.status !== tab) return false;
    if (category !== "all" && t.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        t.submittedBy.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          Support Tickets
        </h1>
        <p className="text-sm text-muted-foreground">
          Foydalanuvchilarning murojaat va shikoyatlarini boshqaring.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.key !== "all" && (
                <span className="ml-1.5 tabular-nums text-xs opacity-60">
                  {mockTickets.filter((x) => x.status === t.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <Select value={category} onValueChange={(v) => setCategory(v ?? "all")}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Kategoriya" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha turlar</SelectItem>
            {ALL_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {categoryLabel[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Mavzu, yuboruvchi yoki #ID..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {filtered.length} ta ticket
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Mavzu</TableHead>
                <TableHead>Kategoriya</TableHead>
                <TableHead>Yuboruvchi</TableHead>
                <TableHead>Prioritet</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Ticketlar topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-accent/40">
                    <TableCell className="py-3 font-mono text-xs text-muted-foreground">
                      {ticket.id}
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-sm font-medium leading-tight">
                        {ticket.subject}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {ticket.description}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {categoryLabel[ticket.category]}
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-sm font-medium">{ticket.submittedBy}</p>
                      <RoleBadge role={ticket.submittedByRole} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={priorityVariant[ticket.priority]} className="text-xs">
                        {priorityLabel[ticket.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[ticket.status]} className="text-xs">
                        {statusLabel[ticket.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(ticket.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-muted-foreground"
                      >
                        <Eye className="size-3.5" />
                        Ko&apos;rish
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
