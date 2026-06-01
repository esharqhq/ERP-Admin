"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
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
    subject: "Login not working in worker app",
    category: "Technical",
    submittedBy: "Jasur Toshmatov",
    submittedByRole: "Worker",
    priority: "High",
    status: "Open",
    createdAt: "2026-05-20T09:15:00Z",
    description:
      "Getting 'Invalid credentials' error when logging in, even though the password is correct.",
  },
  {
    id: "TKT-002",
    subject: "My KYC document was incorrectly rejected",
    category: "KYC",
    submittedBy: "Sunrise LLC",
    submittedByRole: "Owner",
    priority: "High",
    status: "In Progress",
    createdAt: "2026-05-19T14:30:00Z",
    description:
      "My passport is valid, but the system rejected it. Requesting a re-review.",
  },
  {
    id: "TKT-003",
    subject: "Error when adding a property",
    category: "Property",
    submittedBy: "GrandBuild Co.",
    submittedByRole: "Owner",
    priority: "Medium",
    status: "Open",
    createdAt: "2026-05-19T10:00:00Z",
    description:
      "Getting '500 Internal Server Error' when adding a new property. Tried more than 3 times.",
  },
  {
    id: "TKT-004",
    subject: "Discrepancy in salary calculation",
    category: "Billing",
    submittedBy: "Akbar Mirzayev",
    submittedByRole: "Worker",
    priority: "Medium",
    status: "Resolved",
    createdAt: "2026-05-18T16:45:00Z",
    description: "I worked 40 hours in May, but only 35 hours are shown.",
  },
  {
    id: "TKT-005",
    subject: "Forgot password, reset email not arriving",
    category: "Account",
    submittedBy: "Malika Saidova",
    submittedByRole: "Owner",
    priority: "Low",
    status: "Resolved",
    createdAt: "2026-05-17T11:20:00Z",
    description: "Password reset link is not arriving by email. Also checked spam folder.",
  },
  {
    id: "TKT-006",
    subject: "Unable to upload worker documents",
    category: "Technical",
    submittedBy: "Feruza Alimova",
    submittedByRole: "Worker",
    priority: "Critical",
    status: "In Progress",
    createdAt: "2026-05-20T07:00:00Z",
    description:
      "Shows 'File too large' when uploading PDF documents, even though the size is under 2MB.",
  },
  {
    id: "TKT-007",
    subject: "Contract expired but still showing as active",
    category: "Billing",
    submittedBy: "AlphaGroup LLC",
    submittedByRole: "Owner",
    priority: "High",
    status: "Open",
    createdAt: "2026-05-18T09:30:00Z",
    description:
      "Contract expired in April, but the system still shows it as active.",
  },
  {
    id: "TKT-008",
    subject: "Profile picture not updating",
    category: "Account",
    submittedBy: "Bobur Rashidov",
    submittedByRole: "Worker",
    priority: "Low",
    status: "Closed",
    createdAt: "2026-05-15T13:00:00Z",
    description: "Old picture remains after uploading a new one.",
  },
  {
    id: "TKT-009",
    subject: "Cannot change property owner",
    category: "Property",
    submittedBy: "Zilola Yusupova",
    submittedByRole: "Owner",
    priority: "Medium",
    status: "Open",
    createdAt: "2026-05-20T12:10:00Z",
    description:
      "I want to transfer the property to another owner, but there is no 'Transfer' button.",
  },
  {
    id: "TKT-010",
    subject: "Worker job title displayed incorrectly",
    category: "Worker",
    submittedBy: "Sardor Nazarov",
    submittedByRole: "Worker",
    priority: "Low",
    status: "Closed",
    createdAt: "2026-05-14T08:00:00Z",
    description: "My job title should be 'Plumber', but it shows 'Electrician'.",
  },
  {
    id: "TKT-011",
    subject: "Location not updating on dispatch screen",
    category: "Technical",
    submittedBy: "Nodira Karimova",
    submittedByRole: "Admin",
    priority: "Critical",
    status: "In Progress",
    createdAt: "2026-05-20T08:45:00Z",
    description:
      "The map does not show worker locations in real time — it only updates every 30 minutes.",
  },
  {
    id: "TKT-012",
    subject: "Report export not working",
    category: "General",
    submittedBy: "Timur Ergashev",
    submittedByRole: "Admin",
    priority: "Medium",
    status: "Open",
    createdAt: "2026-05-19T17:00:00Z",
    description: "Trying to download a report in Excel format, but the file downloads as 0 KB.",
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

const priorityVariant: Record<
  TicketPriority,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Low: "outline",
  Medium: "secondary",
  High: "default",
  Critical: "destructive",
};

const ALL_CATEGORIES: TicketCategory[] = [
  "Technical",
  "Billing",
  "KYC",
  "Property",
  "Worker",
  "Account",
  "General",
];

function RoleBadge({
  role,
  t,
}: {
  role: Ticket["submittedByRole"];
  t: ReturnType<typeof useTranslations<"support">>;
}) {
  const map: Record<Ticket["submittedByRole"], string> = {
    Owner: t("roles.owner"),
    Worker: t("roles.worker"),
    Admin: t("roles.admin"),
  };
  return (
    <span className="text-[11px] text-muted-foreground">({map[role]})</span>
  );
}

export default function SupportTicketsPage() {
  const t = useTranslations("support");
  const locale = useLocale();

  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const statusLabel: Record<TicketStatus, string> = {
    Open: t("statuses.open"),
    "In Progress": t("statuses.inProgress"),
    Resolved: t("statuses.resolved"),
    Closed: t("statuses.closed"),
  };

  const priorityLabel: Record<TicketPriority, string> = {
    Low: t("priorities.low"),
    Medium: t("priorities.medium"),
    High: t("priorities.high"),
    Critical: t("priorities.critical"),
  };

  const categoryLabel: Record<TicketCategory, string> = {
    Technical: t("categories.technical"),
    Billing: t("categories.billing"),
    KYC: t("categories.kyc"),
    Property: t("categories.property"),
    Worker: t("categories.worker"),
    Account: t("categories.account"),
    General: t("categories.general"),
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: t("tabs.all") },
    { key: "Open", label: t("tabs.open") },
    { key: "In Progress", label: t("tabs.inProgress") },
    { key: "Resolved", label: t("tabs.resolved") },
    { key: "Closed", label: t("tabs.closed") },
  ];

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  const filtered = mockTickets.filter((ticket) => {
    if (tab !== "all" && ticket.status !== tab) return false;
    if (category !== "all" && ticket.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        ticket.subject.toLowerCase().includes(q) ||
        ticket.submittedBy.toLowerCase().includes(q) ||
        ticket.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
          {tabs.map((tab_item) => (
            <button
              key={tab_item.key}
              onClick={() => setTab(tab_item.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === tab_item.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab_item.label}
              {tab_item.key !== "all" && (
                <span className="ml-1.5 tabular-nums text-xs opacity-60">
                  {mockTickets.filter((x) => x.status === tab_item.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <Select value={category} onValueChange={(v) => setCategory(v ?? "all")}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder={t("categories.general")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tabs.all")}</SelectItem>
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
            placeholder={t("searchPlaceholder")}
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {t("ticketCount", { count: filtered.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24">ID</TableHead>
                <TableHead>{t("columns.subject")}</TableHead>
                <TableHead>{t("columns.category")}</TableHead>
                <TableHead>{t("columns.submittedBy")}</TableHead>
                <TableHead>{t("columns.priority")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.date")}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {t("noResults")}
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
                      <RoleBadge role={ticket.submittedByRole} t={t} />
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
                        View
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
